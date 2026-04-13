/**
 * Base CRUD Controller
 * Eliminates duplication in standard CRUD operations across modules
 */

import { Context } from 'hono';
import { eq, and, desc, asc } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import { getDatabase } from "../database/connection";
import { handleError, successResponse, validateRequired, CommonErrors } from './error-handlers';

export interface CrudOptions {
  tableName: string;
  idField?: string;
  userField?: string;
  workspaceField?: string;
  timestampFields?: {
    createdAt?: string;
    updatedAt?: string;
  };
  requiredFields?: string[];
  searchableFields?: string[];
}

export interface ListOptions {
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  filters?: Record<string, any>;
}

export abstract class BaseCrudController {
  protected table: any;
  protected options: CrudOptions;

  constructor(table: any, options: CrudOptions) {
    this.table = table;
    this.options = {
      idField: 'id',
      userField: 'userEmail',
      timestampFields: {
        createdAt: 'createdAt',
        updatedAt: 'updatedAt'
      },
      ...options
    };
  }

  protected getDb() {
    return getDatabase();
  }

  /**
   * Create new record
   */
  async create(c: Context) {
    try {
      const db = this.getDb();
      const userId = c.get("userId");
      const body = await c.req.json();

      // Validate required fields
      if (this.options.requiredFields) {
        validateRequired(body, this.options.requiredFields);
      }

      // Prepare data
      const data = {
        [this.options.idField!]: createId(),
        ...body,
        ...(this.options.userField && { [this.options.userField]: userId }),
        ...(this.options.timestampFields?.createdAt && {
          [this.options.timestampFields.createdAt]: new Date()
        }),
        ...(this.options.timestampFields?.updatedAt && {
          [this.options.timestampFields.updatedAt]: new Date()
        })
      };

      // Apply custom data processing
      const processedData = await this.processCreateData(data, c);

      // Insert record
      const [created] = await db
        .insert(this.table)
        .values(processedData)
        .returning();

      // Post-creation processing
      await this.afterCreate(created, c);

      return successResponse(c, created, 201);
    } catch (error) {
      return handleError(c, error);
    }
  }

  /**
   * Get single record by ID
   */
  async getById(c: Context) {
    try {
      const db = this.getDb();
      const id = c.req.param('id');
      
      if (!id) {
        throw CommonErrors.BadRequest('ID parameter is required');
      }

      const record = await db
        .select()
        .from(this.table)
        .where(eq(this.table[this.options.idField!], id))
        .limit(1);

      if (!record.length) {
        throw CommonErrors.NotFound(this.options.tableName);
      }

      // Apply custom data processing
      const processedRecord = await this.processGetData(record[0], c);

      return successResponse(c, processedRecord);
    } catch (error) {
      return handleError(c, error);
    }
  }

  /**
   * List records with filtering and pagination
   */
  async list(c: Context) {
    try {
      const db = this.getDb();
      const options: ListOptions = {
        limit: Number(c.req.query('limit')) || 50,
        offset: Number(c.req.query('offset')) || 0,
        sortBy: c.req.query('sortBy') || this.options.timestampFields?.createdAt || this.options.idField,
        sortOrder: (c.req.query('sortOrder') as 'asc' | 'desc') || 'desc',
        search: c.req.query('search')
      };

      let query = db.select().from(this.table);

      // Apply workspace filtering if configured
      if (this.options.workspaceField) {
        const workspaceId = c.req.param('workspaceId') || c.req.query('workspaceId');
        if (workspaceId) {
          query = query.where(eq(this.table[this.options.workspaceField], workspaceId));
        }
      }

      // Apply custom filtering
      query = await this.applyCustomFilters(query, options, c);

      // Apply search
      if (options.search && this.options.searchableFields) {
        query = this.applySearch(query, options.search);
      }

      // Apply sorting
      if (options.sortBy && this.table[options.sortBy]) {
        const sortFn = options.sortOrder === 'asc' ? asc : desc;
        query = query.orderBy(sortFn(this.table[options.sortBy]));
      }

      // Apply pagination
      const records = await query
        .limit(options.limit!)
        .offset(options.offset!);

      // Process records
      const processedRecords = await Promise.all(
        records.map(record => this.processListData(record, c))
      );

      return successResponse(c, {
        data: processedRecords,
        pagination: {
          limit: options.limit,
          offset: options.offset,
          total: records.length // Note: This is just current page size, implement total count if needed
        }
      });
    } catch (error) {
      return handleError(c, error);
    }
  }

  /**
   * Update record
   */
  async update(c: Context) {
    try {
      const db = this.getDb();
      const id = c.req.param('id');
      const body = await c.req.json();

      if (!id) {
        throw CommonErrors.BadRequest('ID parameter is required');
      }

      // Check if record exists
      const existing = await db
        .select()
        .from(this.table)
        .where(eq(this.table[this.options.idField!], id))
        .limit(1);

      if (!existing.length) {
        throw CommonErrors.NotFound(this.options.tableName);
      }

      // Prepare update data
      const updateData = {
        ...body,
        ...(this.options.timestampFields?.updatedAt && {
          [this.options.timestampFields.updatedAt]: new Date()
        })
      };

      // Apply custom data processing
      const processedData = await this.processUpdateData(updateData, existing[0], c);

      // Update record
      const [updated] = await db
        .update(this.table)
        .set(processedData)
        .where(eq(this.table[this.options.idField!], id))
        .returning();

      // Post-update processing
      await this.afterUpdate(updated, existing[0], c);

      return successResponse(c, updated);
    } catch (error) {
      return handleError(c, error);
    }
  }

  /**
   * Delete record
   */
  async delete(c: Context) {
    try {
      const db = this.getDb();
      const id = c.req.param('id');

      if (!id) {
        throw CommonErrors.BadRequest('ID parameter is required');
      }

      // Check if record exists
      const existing = await db
        .select()
        .from(this.table)
        .where(eq(this.table[this.options.idField!], id))
        .limit(1);

      if (!existing.length) {
        throw CommonErrors.NotFound(this.options.tableName);
      }

      // Pre-deletion processing
      await this.beforeDelete(existing[0], c);

      // Delete record
      await db
        .delete(this.table)
        .where(eq(this.table[this.options.idField!], id));

      // Post-deletion processing
      await this.afterDelete(existing[0], c);

      return successResponse(c, { message: `${this.options.tableName} deleted successfully` });
    } catch (error) {
      return handleError(c, error);
    }
  }

  // Abstract methods for customization
  protected async processCreateData(data: any, c: Context): Promise<any> {
    return data;
  }

  protected async processGetData(record: any, c: Context): Promise<any> {
    return record;
  }

  protected async processListData(record: any, c: Context): Promise<any> {
    return record;
  }

  protected async processUpdateData(data: any, existing: any, c: Context): Promise<any> {
    return data;
  }

  protected async applyCustomFilters(query: any, options: ListOptions, c: Context): Promise<any> {
    return query;
  }

  protected applySearch(query: any, searchTerm: string): any {
    // Basic search implementation - can be overridden
    return query;
  }

  protected async afterCreate(record: any, c: Context): Promise<void> {
    // Override in subclasses for post-creation logic
  }

  protected async afterUpdate(updated: any, original: any, c: Context): Promise<void> {
    // Override in subclasses for post-update logic
  }

  protected async beforeDelete(record: any, c: Context): Promise<void> {
    // Override in subclasses for pre-deletion logic
  }

  protected async afterDelete(record: any, c: Context): Promise<void> {
    // Override in subclasses for post-deletion logic
  }
}

