/**
 * 📁 File Versioning Service
 * 
 * Handles file version management:
 * - Create new versions
 * - Get version history
 * - Restore previous versions
 * - Compare versions
 * - Version cleanup
 */

import { createId } from '@paralleldrive/cuid2';
import { getDatabase } from '../../database/connection';
import { files, fileVersions, fileActivityLog } from '../../database/schema';
import { eq, desc, and } from 'drizzle-orm';
import { winstonLog } from '../../utils/winston-logger';
import { NotFoundError, ValidationError, ForbiddenError } from '../../utils/errors';

export interface CreateVersionOptions {
  fileId: string;
  changedBy: string;
  changeDescription?: string;
  preserveOriginal?: boolean;
}

export interface VersionInfo {
  id: string;
  fileId: string;
  version: number;
  fileName: string;
  url: string;
  size: number;
  changeDescription?: string;
  changedBy: string;
  changedByName?: string;
  createdAt: Date;
}

/**
 * File Versioning Service
 */
export class FileVersioningService {
  /**
   * Create a new version of a file
   */
  static async createVersion(options: CreateVersionOptions): Promise<VersionInfo> {
    const db = getDatabase();

    try {
      // Get current file
      const currentFile = await db.query.files.findFirst({
        where: eq(files.id, options.fileId),
      });

      if (!currentFile) {
        throw new NotFoundError('File', { fileId: options.fileId });
      }

      if (currentFile.isDeleted) {
        throw new ValidationError('Cannot version deleted file', {
          fileId: options.fileId,
        });
      }

      // Get current version number
      const latestVersion = await db
        .select()
        .from(fileVersions)
        .where(eq(fileVersions.fileId, options.fileId))
        .orderBy(desc(fileVersions.version))
        .limit(1);

      const newVersionNumber = latestVersion.length > 0
        ? latestVersion[0].version + 1
        : 1;

      // Create version snapshot
      const [version] = await db.insert(fileVersions).values({
        id: createId(),
        fileId: options.fileId,
        version: newVersionNumber,
        fileName: currentFile.fileName,
        url: currentFile.url,
        size: currentFile.size,
        changeDescription: options.changeDescription || `Version ${newVersionNumber}`,
        changedBy: options.changedBy,
        createdAt: new Date(),
      }).returning();

      // Update file's version number
      await db
        .update(files)
        .set({
          version: newVersionNumber,
          updatedAt: new Date(),
        })
        .where(eq(files.id, options.fileId));

      // Log activity
      await db.insert(fileActivityLog).values({
        id: createId(),
        fileId: options.fileId,
        activityType: 'version_created',
        activityDetails: {
          version: newVersionNumber,
          description: options.changeDescription,
        },
        userId: options.changedBy,
        createdAt: new Date(),
      });

      winstonLog.info('File version created', {
        fileId: options.fileId,
        version: newVersionNumber,
        changedBy: options.changedBy,
      });

      return {
        id: version.id,
        fileId: version.fileId,
        version: version.version,
        fileName: version.fileName,
        url: version.url,
        size: version.size,
        changeDescription: version.changeDescription,
        changedBy: version.changedBy,
        createdAt: version.createdAt,
      };

    } catch (error) {
      winstonLog.error('Failed to create file version', {
        fileId: options.fileId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get version history for a file
   */
  static async getVersionHistory(
    fileId: string,
    limit: number = 50
  ): Promise<VersionInfo[]> {
    const db = getDatabase();

    try {
      const versions = await db
        .select({
          version: fileVersions,
          user: {
            name: db.select({ name: files.uploadedBy }).from(files).where(eq(files.id, fileVersions.changedBy)).limit(1),
          },
        })
        .from(fileVersions)
        .where(eq(fileVersions.fileId, fileId))
        .orderBy(desc(fileVersions.version))
        .limit(limit);

      return versions.map((v) => ({
        id: v.version.id,
        fileId: v.version.fileId,
        version: v.version.version,
        fileName: v.version.fileName,
        url: v.version.url,
        size: v.version.size,
        changeDescription: v.version.changeDescription,
        changedBy: v.version.changedBy,
        createdAt: v.version.createdAt,
      }));

    } catch (error) {
      winstonLog.error('Failed to get version history', {
        fileId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get specific version
   */
  static async getVersion(versionId: string): Promise<VersionInfo | null> {
    const db = getDatabase();

    try {
      const version = await db.query.fileVersions.findFirst({
        where: eq(fileVersions.id, versionId),
      });

      if (!version) {
        return null;
      }

      return {
        id: version.id,
        fileId: version.fileId,
        version: version.version,
        fileName: version.fileName,
        url: version.url,
        size: version.size,
        changeDescription: version.changeDescription,
        changedBy: version.changedBy,
        createdAt: version.createdAt,
      };

    } catch (error) {
      winstonLog.error('Failed to get version', {
        versionId,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Restore a previous version (create new version from old one)
   */
  static async restoreVersion(
    versionId: string,
    restoredBy: string,
    reason?: string
  ): Promise<VersionInfo> {
    const db = getDatabase();

    try {
      // Get version to restore
      const versionToRestore = await db.query.fileVersions.findFirst({
        where: eq(fileVersions.id, versionId),
      });

      if (!versionToRestore) {
        throw new NotFoundError('Version', { versionId });
      }

      // Get current file
      const currentFile = await db.query.files.findFirst({
        where: eq(files.id, versionToRestore.fileId),
      });

      if (!currentFile) {
        throw new NotFoundError('File', { fileId: versionToRestore.fileId });
      }

      // Create version snapshot of current state (before restore)
      const currentVersionNumber = currentFile.version;
      await db.insert(fileVersions).values({
        id: createId(),
        fileId: currentFile.id,
        version: currentVersionNumber,
        fileName: currentFile.fileName,
        url: currentFile.url,
        size: currentFile.size,
        changeDescription: `Pre-restore snapshot (before restoring v${versionToRestore.version})`,
        changedBy: restoredBy,
        createdAt: new Date(),
      });

      // Restore old version as new current file
      const newVersionNumber = currentVersionNumber + 1;
      await db
        .update(files)
        .set({
          fileName: versionToRestore.fileName,
          url: versionToRestore.url,
          size: versionToRestore.size,
          version: newVersionNumber,
          updatedAt: new Date(),
        })
        .where(eq(files.id, currentFile.id));

      // Create new version entry for restored state
      const [restoredVersion] = await db.insert(fileVersions).values({
        id: createId(),
        fileId: currentFile.id,
        version: newVersionNumber,
        fileName: versionToRestore.fileName,
        url: versionToRestore.url,
        size: versionToRestore.size,
        changeDescription: reason || `Restored from version ${versionToRestore.version}`,
        changedBy: restoredBy,
        createdAt: new Date(),
      }).returning();

      // Log activity
      await db.insert(fileActivityLog).values({
        id: createId(),
        fileId: currentFile.id,
        activityType: 'version_restored',
        activityDetails: {
          fromVersion: versionToRestore.version,
          toVersion: newVersionNumber,
          reason,
        },
        userId: restoredBy,
        createdAt: new Date(),
      });

      winstonLog.info('File version restored', {
        fileId: currentFile.id,
        fromVersion: versionToRestore.version,
        toVersion: newVersionNumber,
        restoredBy,
      });

      return {
        id: restoredVersion.id,
        fileId: restoredVersion.fileId,
        version: restoredVersion.version,
        fileName: restoredVersion.fileName,
        url: restoredVersion.url,
        size: restoredVersion.size,
        changeDescription: restoredVersion.changeDescription,
        changedBy: restoredVersion.changedBy,
        createdAt: restoredVersion.createdAt,
      };

    } catch (error) {
      winstonLog.error('Failed to restore version', {
        versionId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Delete old versions (cleanup)
   */
  static async deleteOldVersions(
    fileId: string,
    keepCount: number = 10
  ): Promise<number> {
    const db = getDatabase();

    try {
      // Get all versions sorted by version number
      const allVersions = await db
        .select()
        .from(fileVersions)
        .where(eq(fileVersions.fileId, fileId))
        .orderBy(desc(fileVersions.version));

      // Skip the most recent {keepCount} versions
      const versionsToDelete = allVersions.slice(keepCount);

      if (versionsToDelete.length === 0) {
        return 0;
      }

      // Delete old versions
      const idsToDelete = versionsToDelete.map(v => v.id);
      
      for (const id of idsToDelete) {
        await db
          .delete(fileVersions)
          .where(eq(fileVersions.id, id));
      }

      winstonLog.info('Old file versions deleted', {
        fileId,
        deletedCount: idsToDelete.length,
        keepCount,
      });

      return idsToDelete.length;

    } catch (error) {
      winstonLog.error('Failed to delete old versions', {
        fileId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Compare two versions
   */
  static async compareVersions(
    versionId1: string,
    versionId2: string
  ): Promise<{
    version1: VersionInfo;
    version2: VersionInfo;
    differences: {
      sizeChange: number;
      versionDiff: number;
      timeDiff: number;
    };
  }> {
    const db = getDatabase();

    try {
      const [v1, v2] = await Promise.all([
        this.getVersion(versionId1),
        this.getVersion(versionId2),
      ]);

      if (!v1 || !v2) {
        throw new NotFoundError('Version not found');
      }

      return {
        version1: v1,
        version2: v2,
        differences: {
          sizeChange: v2.size - v1.size,
          versionDiff: v2.version - v1.version,
          timeDiff: v2.createdAt.getTime() - v1.createdAt.getTime(),
        },
      };

    } catch (error) {
      winstonLog.error('Failed to compare versions', {
        versionId1,
        versionId2,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}

export default FileVersioningService;


