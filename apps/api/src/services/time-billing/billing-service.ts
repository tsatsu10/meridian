/**
 * Billing Service
 * Invoice generation and expense management
 * Phase 3.5 - Advanced Time Tracking & Billing
 */

import { getDatabase } from '../../database/connection';
import { invoice, invoiceLineItem, expenseEntry, timesheet, billingRate } from '../../database/schema/time-billing';
import { eq, and, desc } from 'drizzle-orm';
import { logger } from '../logging/logger';

interface InvoiceData {
  workspaceId: string;
  projectId: string;
  clientId?: string;
  issueDate: Date;
  dueDate: Date;
  paymentTerms?: string;
  notes?: string;
  createdBy: string;
}

interface InvoiceLineItemData {
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate?: number;
}

export class BillingService {
  private getDb() {
    return getDatabase();
  }

  /**
   * Generate invoice number
   */
  private async generateInvoiceNumber(workspaceId: string): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');

    // Get count of invoices this month
    const count = await this.getDb()
      .select()
      .from(invoice)
      .where(eq(invoice.workspaceId, workspaceId));

    const sequence = String(count.length + 1).padStart(4, '0');
    return `INV-${year}${month}-${sequence}`;
  }

  /**
   * Create invoice from timesheet
   */
  async createInvoiceFromTimesheet(
    data: InvoiceData,
    timesheetId: string,
    taxRate: number = 0
  ): Promise<any> {
    try {
      // Get timesheet
      const [sheet] = await this.getDb().select().from(timesheet).where(eq(timesheet.id, timesheetId));

      if (!sheet) {
        throw new Error('Timesheet not found');
      }

      if (sheet.status !== 'approved') {
        throw new Error('Timesheet must be approved before invoicing');
      }

      const invoiceNumber = await this.generateInvoiceNumber(data.workspaceId);
      const subtotal = parseFloat(sheet.totalAmount?.toString() || '0');
      const taxAmount = subtotal * (taxRate / 100);
      const totalAmount = subtotal + taxAmount;

      // Create invoice
      const [newInvoice] = await this.getDb()
        .insert(invoice)
        .values({
          ...data,
          invoiceNumber,
          status: 'draft',
          subtotal: subtotal.toString(),
          taxRate: taxRate.toString(),
          taxAmount: taxAmount.toString(),
          totalAmount: totalAmount.toString(),
        })
        .returning();

      // Create line item for timesheet
      await this.getDb().insert(invoiceLineItem).values({
        invoiceId: newInvoice.id,
        timesheetId,
        description: `Professional services for ${new Date(sheet.periodStart).toLocaleDateString()} - ${new Date(sheet.periodEnd).toLocaleDateString()}`,
        quantity: parseFloat(sheet.billableHours?.toString() || '0'),
        unitPrice: (subtotal / parseFloat(sheet.billableHours?.toString() || '1')).toString(),
        amount: subtotal.toString(),
        taxRate: taxRate.toString(),
      });

      logger.info('Invoice created from timesheet', { invoiceId: newInvoice.id, timesheetId });
      return newInvoice;
    } catch (error: any) {
      logger.error('Failed to create invoice from timesheet', { error: error.message });
      throw error;
    }
  }

  /**
   * Create custom invoice
   */
  async createInvoice(
    data: InvoiceData,
    lineItems: InvoiceLineItemData[],
    taxRate: number = 0
  ): Promise<any> {
    try {
      const invoiceNumber = await this.generateInvoiceNumber(data.workspaceId);

      // Calculate totals
      let subtotal = 0;
      lineItems.forEach((item) => {
        subtotal += item.quantity * item.unitPrice;
      });

      const taxAmount = subtotal * (taxRate / 100);
      const totalAmount = subtotal + taxAmount;

      // Create invoice
      const [newInvoice] = await this.getDb()
        .insert(invoice)
        .values({
          ...data,
          invoiceNumber,
          status: 'draft',
          subtotal: subtotal.toString(),
          taxRate: taxRate.toString(),
          taxAmount: taxAmount.toString(),
          totalAmount: totalAmount.toString(),
        })
        .returning();

      // Create line items
      for (const item of lineItems) {
        const amount = item.quantity * item.unitPrice;
        await this.getDb().insert(invoiceLineItem).values({
          invoiceId: newInvoice.id,
          description: item.description,
          quantity: item.quantity.toString(),
          unitPrice: item.unitPrice.toString(),
          amount: amount.toString(),
          taxRate: (item.taxRate || taxRate).toString(),
        });
      }

      logger.info('Custom invoice created', { invoiceId: newInvoice.id });
      return newInvoice;
    } catch (error: any) {
      logger.error('Failed to create invoice', { error: error.message });
      throw error;
    }
  }

  /**
   * Update invoice status
   */
  async updateInvoiceStatus(invoiceId: string, status: string): Promise<any> {
    try {
      const updates: any = { status, updatedAt: new Date() };

      if (status === 'sent') {
        updates.sentAt = new Date();
      } else if (status === 'paid') {
        updates.paidAt = new Date();
      }

      const [updated] = await this.getDb()
        .update(invoice)
        .set(updates)
        .where(eq(invoice.id, invoiceId))
        .returning();

      logger.info('Invoice status updated', { invoiceId, status });
      return updated;
    } catch (error: any) {
      logger.error('Failed to update invoice status', { error: error.message });
      throw error;
    }
  }

  /**
   * Get invoice with line items
   */
  async getInvoice(invoiceId: string): Promise<any> {
    try {
      const [inv] = await this.getDb().select().from(invoice).where(eq(invoice.id, invoiceId));

      if (!inv) {
        throw new Error('Invoice not found');
      }

      const items = await this.getDb().select().from(invoiceLineItem).where(eq(invoiceLineItem.invoiceId, invoiceId));

      return {
        ...inv,
        lineItems: items,
      };
    } catch (error: any) {
      logger.error('Failed to get invoice', { error: error.message });
      throw error;
    }
  }

  /**
   * List invoices
   */
  async listInvoices(filters: {
    workspaceId: string;
    projectId?: string;
    status?: string;
  }): Promise<any[]> {
    try {
      let query = this.getDb().select().from(invoice).where(eq(invoice.workspaceId, filters.workspaceId));

      if (filters.projectId) {
        query = query.where(eq(invoice.projectId, filters.projectId));
      }
      if (filters.status) {
        query = query.where(eq(invoice.status, filters.status));
      }

      const invoices = await query.orderBy(desc(invoice.createdAt));
      return invoices;
    } catch (error: any) {
      logger.error('Failed to list invoices', { error: error.message });
      throw error;
    }
  }

  /**
   * Create expense entry
   */
  async createExpense(data: {
    workspaceId: string;
    projectId: string;
    userId: string;
    category: string;
    description: string;
    amount: number;
    currency?: string;
    expenseDate: Date;
    receiptUrl?: string;
    isBillable?: boolean;
    isReimbursable?: boolean;
    notes?: string;
  }): Promise<any> {
    try {
      const [expense] = await this.getDb()
        .insert(expenseEntry)
        .values({
          ...data,
          amount: data.amount.toString(),
          currency: data.currency || 'USD',
          isBillable: data.isBillable ?? false,
          isReimbursable: data.isReimbursable ?? true,
          status: 'pending',
        })
        .returning();

      logger.info('Expense entry created', { expenseId: expense.id });
      return expense;
    } catch (error: any) {
      logger.error('Failed to create expense', { error: error.message });
      throw error;
    }
  }

  /**
   * Approve/reject expense
   */
  async processExpense(
    expenseId: string,
    approvedBy: string,
    approved: boolean,
    reason?: string
  ): Promise<any> {
    try {
      const [updated] = await this.getDb()
        .update(expenseEntry)
        .set({
          status: approved ? 'approved' : 'rejected',
          approvedBy: approved ? approvedBy : null,
          approvedAt: approved ? new Date() : null,
          rejectionReason: approved ? null : reason,
          updatedAt: new Date(),
        })
        .where(eq(expenseEntry.id, expenseId))
        .returning();

      logger.info('Expense processed', { expenseId, approved });
      return updated;
    } catch (error: any) {
      logger.error('Failed to process expense', { error: error.message });
      throw error;
    }
  }

  /**
   * List expenses
   */
  async listExpenses(filters: {
    workspaceId: string;
    projectId?: string;
    userId?: string;
    status?: string;
  }): Promise<any[]> {
    try {
      let query = this.getDb().select().from(expenseEntry).where(eq(expenseEntry.workspaceId, filters.workspaceId));

      if (filters.projectId) {
        query = query.where(eq(expenseEntry.projectId, filters.projectId));
      }
      if (filters.userId) {
        query = query.where(eq(expenseEntry.userId, filters.userId));
      }
      if (filters.status) {
        query = query.where(eq(expenseEntry.status, filters.status));
      }

      const expenses = await query.orderBy(desc(expenseEntry.expenseDate));
      return expenses;
    } catch (error: any) {
      logger.error('Failed to list expenses', { error: error.message });
      throw error;
    }
  }

  /**
   * Set billing rate
   */
  async setBillingRate(data: {
    workspaceId: string;
    projectId?: string;
    userId?: string;
    roleId?: string;
    hourlyRate: number;
    currency?: string;
    effectiveFrom: Date;
    effectiveTo?: Date;
    isDefault?: boolean;
    createdBy: string;
  }): Promise<any> {
    try {
      const [rate] = await this.getDb()
        .insert(billingRate)
        .values({
          ...data,
          hourlyRate: data.hourlyRate.toString(),
          currency: data.currency || 'USD',
          isDefault: data.isDefault || false,
        })
        .returning();

      logger.info('Billing rate set', { rateId: rate.id });
      return rate;
    } catch (error: any) {
      logger.error('Failed to set billing rate', { error: error.message });
      throw error;
    }
  }

  /**
   * Get billing summary for project
   */
  async getProjectBillingSummary(projectId: string): Promise<any> {
    try {
      const invoices = await this.getDb().select().from(invoice).where(eq(invoice.projectId, projectId));

      let totalBilled = 0;
      let totalPaid = 0;
      let totalOutstanding = 0;

      invoices.forEach((inv) => {
        const amount = parseFloat(inv.totalAmount?.toString() || '0');
        totalBilled += amount;

        if (inv.status === 'paid') {
          totalPaid += amount;
        } else if (inv.status !== 'cancelled') {
          totalOutstanding += amount;
        }
      });

      return {
        projectId,
        totalInvoices: invoices.length,
        totalBilled: Math.round(totalBilled * 100) / 100,
        totalPaid: Math.round(totalPaid * 100) / 100,
        totalOutstanding: Math.round(totalOutstanding * 100) / 100,
        invoices,
      };
    } catch (error: any) {
      logger.error('Failed to get billing summary', { error: error.message });
      throw error;
    }
  }
}

export default BillingService;



