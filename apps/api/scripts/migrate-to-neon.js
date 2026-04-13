#!/usr/bin/env node

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

/**
 * Neon PostgreSQL Migration Script
 * 
 * This script safely migrates your existing Meridian database to Neon PostgreSQL
 * with optimized schema and indexes for production performance.
 */

class NeonMigrator {
  constructor() {
    this.client = null;
    this.migrationsDir = path.join(__dirname, '..', 'database/migrations');
    this.backupDir = path.join(__dirname, '..', 'database/backups');
  }

  log(message, type = 'info') {
    const colors = {
      info: '\x1b[36m',
      success: '\x1b[32m',
      warning: '\x1b[33m',
      error: '\x1b[31m',
      reset: '\x1b[0m'
    };
    
    const prefix = {
      info: 'ℹ️',
      success: '✅',
      warning: '⚠️',
      error: '❌'
    };
    
    console.log(`${colors[type]}${prefix[type]} ${message}${colors.reset}`);
  }

  async connect() {
    try {
      const connectionString = process.env.DATABASE_URL;
      
      if (!connectionString) {
        throw new Error('DATABASE_URL environment variable not set');
      }

      if (!connectionString.includes('neon.tech')) {
        this.log('Warning: DATABASE_URL does not appear to be a Neon connection string', 'warning');
      }

      this.client = new Client({
        connectionString,
        ssl: {
          rejectUnauthorized: true
        }
      });

      await this.client.connect();
      this.log('Connected to Neon PostgreSQL successfully', 'success');

      // Test connection
      const result = await this.client.query('SELECT version(), current_database(), current_user');
      this.log(`Database: ${result.rows[0].current_database}`, 'info');
      this.log(`User: ${result.rows[0].current_user}`, 'info');

    } catch (error) {
      this.log(`Connection failed: ${error.message}`, 'error');
      throw error;
    }
  }

  async disconnect() {
    if (this.client) {
      await this.client.end();
      this.log('Disconnected from database', 'info');
    }
  }

  async checkExistingSchema() {
    this.log('Checking existing database schema...', 'info');

    const tablesQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `;

    const result = await this.client.query(tablesQuery);
    const existingTables = result.rows.map(row => row.table_name);

    this.log(`Found ${existingTables.length} existing tables:`, 'info');
    existingTables.forEach(table => {
      console.log(`  - ${table}`);
    });

    return existingTables;
  }

  async createMigrationTable() {
    const createMigrationTable = `
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        migration_name VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        checksum VARCHAR(64)
      );
    `;

    await this.client.query(createMigrationTable);
    this.log('Migration tracking table ready', 'success');
  }

  async getAppliedMigrations() {
    const result = await this.client.query(
      'SELECT migration_name FROM schema_migrations ORDER BY executed_at'
    );
    return result.rows.map(row => row.migration_name);
  }

  async applyMigration(migrationName, sql) {
    this.log(`Applying migration: ${migrationName}`, 'info');

    try {
      await this.client.query('BEGIN');
      
      // Execute the migration SQL
      await this.client.query(sql);
      
      // Record the migration
      await this.client.query(
        'INSERT INTO schema_migrations (migration_name) VALUES ($1)',
        [migrationName]
      );
      
      await this.client.query('COMMIT');
      this.log(`Migration ${migrationName} applied successfully`, 'success');
      
    } catch (error) {
      await this.client.query('ROLLBACK');
      this.log(`Migration ${migrationName} failed: ${error.message}`, 'error');
      throw error;
    }
  }

  async createOptimizedSchema() {
    const schemaMigration = `
      -- Meridian Optimized Schema for Neon PostgreSQL
      -- Applied: ${new Date().toISOString()}

      -- Enable required extensions
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
      CREATE EXTENSION IF NOT EXISTS "pg_trgm";
      CREATE EXTENSION IF NOT EXISTS "btree_gin";

      -- Users table (if not exists)
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        email VARCHAR(255) UNIQUE NOT NULL,
        username VARCHAR(100),
        password_hash VARCHAR(255),
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        avatar_url TEXT,
        workspace_id UUID,
        role VARCHAR(50) DEFAULT 'member',
        active BOOLEAN DEFAULT true,
        email_verified BOOLEAN DEFAULT false,
        last_login_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Workspaces table
      CREATE TABLE IF NOT EXISTS workspaces (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(100) UNIQUE,
        description TEXT,
        avatar_url TEXT,
        settings JSONB DEFAULT '{}',
        active BOOLEAN DEFAULT true,
        created_by UUID,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Projects table
      CREATE TABLE IF NOT EXISTS projects (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        workspace_id UUID NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        status VARCHAR(50) DEFAULT 'active',
        priority VARCHAR(20) DEFAULT 'medium',
        start_date DATE,
        due_date DATE,
        completed_at TIMESTAMP,
        settings JSONB DEFAULT '{}',
        created_by UUID,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
      );

      -- Tasks table
      CREATE TABLE IF NOT EXISTS tasks (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        project_id UUID NOT NULL,
        title VARCHAR(500) NOT NULL,
        description TEXT,
        status VARCHAR(50) DEFAULT 'todo',
        priority VARCHAR(20) DEFAULT 'medium',
        assignee_id UUID,
        reporter_id UUID,
        due_date TIMESTAMP,
        start_date TIMESTAMP,
        completed_at TIMESTAMP,
        estimated_hours INTEGER,
        actual_hours INTEGER,
        tags TEXT[],
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        FOREIGN KEY (assignee_id) REFERENCES users(id) ON DELETE SET NULL,
        FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE SET NULL
      );

      -- Channels table
      CREATE TABLE IF NOT EXISTS channels (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        workspace_id UUID NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        type VARCHAR(50) DEFAULT 'public',
        settings JSONB DEFAULT '{}',
        active BOOLEAN DEFAULT true,
        created_by UUID,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
      );

      -- Messages table
      CREATE TABLE IF NOT EXISTS messages (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        channel_id UUID NOT NULL,
        author_id UUID NOT NULL,
        content TEXT,
        message_type VARCHAR(50) DEFAULT 'text',
        thread_id UUID,
        reply_count INTEGER DEFAULT 0,
        reactions JSONB DEFAULT '{}',
        attachments JSONB DEFAULT '[]',
        metadata JSONB DEFAULT '{}',
        edited_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE CASCADE,
        FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (thread_id) REFERENCES messages(id) ON DELETE CASCADE
      );

      -- Notifications table
      CREATE TABLE IF NOT EXISTS notifications (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT,
        type VARCHAR(50),
        entity_type VARCHAR(50),
        entity_id UUID,
        read BOOLEAN DEFAULT false,
        data JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      -- Activity table (partitioned)
      CREATE TABLE IF NOT EXISTS activity (
        id UUID DEFAULT uuid_generate_v4(),
        workspace_id UUID NOT NULL,
        user_id UUID,
        action VARCHAR(100) NOT NULL,
        entity_type VARCHAR(50),
        entity_id UUID,
        details JSONB DEFAULT '{}',
        ip_address INET,
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) PARTITION BY RANGE (created_at);

      -- Audit log table (partitioned)
      CREATE TABLE IF NOT EXISTS audit_log (
        id UUID DEFAULT uuid_generate_v4(),
        action VARCHAR(100) NOT NULL,
        entity_type VARCHAR(50),
        entity_id UUID,
        user_id UUID,
        old_values JSONB,
        new_values JSONB,
        details JSONB DEFAULT '{}',
        ip_address INET,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) PARTITION BY RANGE (created_at);

      -- Attachments table
      CREATE TABLE IF NOT EXISTS attachments (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        entity_type VARCHAR(50) NOT NULL,
        entity_id UUID NOT NULL,
        filename VARCHAR(255) NOT NULL,
        original_filename VARCHAR(255),
        file_size BIGINT,
        mime_type VARCHAR(100),
        file_path TEXT,
        metadata JSONB DEFAULT '{}',
        created_by UUID,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
      );

      -- Update triggers for updated_at columns
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql';

      -- Apply triggers
      DROP TRIGGER IF EXISTS update_users_updated_at ON users;
      CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

      DROP TRIGGER IF EXISTS update_workspaces_updated_at ON workspaces;
      CREATE TRIGGER update_workspaces_updated_at BEFORE UPDATE ON workspaces FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

      DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
      CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

      DROP TRIGGER IF EXISTS update_tasks_updated_at ON tasks;
      CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

      DROP TRIGGER IF EXISTS update_channels_updated_at ON channels;
      CREATE TRIGGER update_channels_updated_at BEFORE UPDATE ON channels FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `;

    await this.applyMigration('001_create_optimized_schema', schemaMigration);
  }

  async createPerformanceIndexes() {
    const indexesMigration = `
      -- Performance-optimized indexes for Neon PostgreSQL
      -- Applied: ${new Date().toISOString()}

      -- Users indexes
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email_lower ON users (LOWER(email));
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_workspace_id ON users (workspace_id) WHERE workspace_id IS NOT NULL;
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_created_at ON users (created_at DESC);
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_active ON users (id) WHERE active = true;

      -- Workspaces indexes
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workspaces_created_at ON workspaces (created_at DESC);
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workspaces_active ON workspaces (id) WHERE active = true;
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workspaces_slug ON workspaces (slug);

      -- Projects indexes
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_workspace_id ON projects (workspace_id);
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_status ON projects (status);
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_created_at ON projects (workspace_id, created_at DESC);
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_due_date ON projects (due_date) WHERE due_date IS NOT NULL;

      -- Tasks indexes (high frequency)
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_project_id ON tasks (project_id);
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_assignee_id ON tasks (assignee_id) WHERE assignee_id IS NOT NULL;
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_status_priority ON tasks (status, priority);
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_due_date ON tasks (due_date) WHERE due_date IS NOT NULL;
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_created_at ON tasks (project_id, created_at DESC);
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_updated_at ON tasks (updated_at DESC);
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_full_text ON tasks USING GIN (to_tsvector('english', title || ' ' || COALESCE(description, '')));

      -- Messages indexes (real-time)
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_channel_created ON messages (channel_id, created_at DESC);
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_author_id ON messages (author_id);
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_thread_id ON messages (thread_id) WHERE thread_id IS NOT NULL;

      -- Channels indexes
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_channels_workspace_id ON channels (workspace_id);
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_channels_type ON channels (type);
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_channels_active ON channels (id) WHERE active = true;

      -- Notifications indexes
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_user_created ON notifications (user_id, created_at DESC);
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_unread ON notifications (user_id) WHERE read = false;

      -- Activity indexes
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activity_workspace_created ON activity (workspace_id, created_at DESC);
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activity_user_created ON activity (user_id, created_at DESC);
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activity_entity ON activity (entity_type, entity_id);

      -- Attachments indexes
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_attachments_entity ON attachments (entity_type, entity_id);
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_attachments_created_at ON attachments (created_at DESC);
    `;

    await this.applyMigration('002_create_performance_indexes', indexesMigration);
  }

  async createPartitions() {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    // Create partitions for current year
    const partitionsMigration = `
      -- Create partitions for activity and audit_log tables
      -- Applied: ${new Date().toISOString()}

      -- Activity partitions for ${currentYear}
      CREATE TABLE IF NOT EXISTS activity_y${currentYear}m${currentMonth.toString().padStart(2, '0')} 
        PARTITION OF activity
        FOR VALUES FROM ('${currentYear}-${currentMonth.toString().padStart(2, '0')}-01') 
        TO ('${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}-01');

      -- Audit log partitions for ${currentYear}
      CREATE TABLE IF NOT EXISTS audit_log_y${currentYear}m${currentMonth.toString().padStart(2, '0')} 
        PARTITION OF audit_log
        FOR VALUES FROM ('${currentYear}-${currentMonth.toString().padStart(2, '0')}-01') 
        TO ('${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}-01');

      -- Add primary key constraints to partitions
      ALTER TABLE activity_y${currentYear}m${currentMonth.toString().padStart(2, '0')} 
        ADD CONSTRAINT activity_y${currentYear}m${currentMonth.toString().padStart(2, '0')}_pkey 
        PRIMARY KEY (id, created_at);

      ALTER TABLE audit_log_y${currentYear}m${currentMonth.toString().padStart(2, '0')} 
        ADD CONSTRAINT audit_log_y${currentYear}m${currentMonth.toString().padStart(2, '0')}_pkey 
        PRIMARY KEY (id, created_at);
    `;

    await this.applyMigration('003_create_partitions', partitionsMigration);
  }

  async createMaintenanceFunctions() {
    const functionsMigration = `
      -- Maintenance functions for automated database optimization
      -- Applied: ${new Date().toISOString()}

      -- Cleanup old activity records (keep 1 year)
      CREATE OR REPLACE FUNCTION cleanup_old_activity()
      RETURNS INTEGER AS $$
      DECLARE
        deleted_count INTEGER;
      BEGIN
        DELETE FROM activity 
        WHERE created_at < NOW() - INTERVAL '1 year';
        
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        
        INSERT INTO audit_log (action, entity_type, details, created_at)
        VALUES ('cleanup', 'activity', 
                jsonb_build_object('deleted_records', deleted_count), 
                NOW());
        
        RETURN deleted_count;
      END;
      $$ LANGUAGE plpgsql;

      -- Cleanup old audit logs (keep 2 years, except security)
      CREATE OR REPLACE FUNCTION cleanup_old_audit_logs()
      RETURNS INTEGER AS $$
      DECLARE
        deleted_count INTEGER;
      BEGIN
        DELETE FROM audit_log 
        WHERE created_at < NOW() - INTERVAL '2 years'
          AND details->>'category' != 'security';
        
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        
        RETURN deleted_count;
      END;
      $$ LANGUAGE plpgsql;

      -- Update table statistics
      CREATE OR REPLACE FUNCTION update_table_statistics()
      RETURNS void AS $$
      BEGIN
        ANALYZE users;
        ANALYZE workspaces;
        ANALYZE projects;
        ANALYZE tasks;
        ANALYZE messages;
        ANALYZE channels;
        ANALYZE notifications;
        ANALYZE activity;
      END;
      $$ LANGUAGE plpgsql;

      -- Create materialized view for dashboard stats
      DROP MATERIALIZED VIEW IF EXISTS dashboard_stats;
      CREATE MATERIALIZED VIEW dashboard_stats AS
      SELECT 
        w.id as workspace_id,
        w.name as workspace_name,
        COUNT(DISTINCT p.id) as total_projects,
        COUNT(DISTINCT t.id) as total_tasks,
        COUNT(DISTINCT CASE WHEN t.status = 'completed' THEN t.id END) as completed_tasks,
        COUNT(DISTINCT u.id) as active_users,
        COALESCE(AVG(CASE WHEN t.status = 'completed' AND t.completed_at IS NOT NULL
          THEN EXTRACT(EPOCH FROM (t.completed_at - t.created_at))/86400 
          END), 0) as avg_completion_days,
        MAX(t.updated_at) as last_activity
      FROM workspaces w
      LEFT JOIN projects p ON w.id = p.workspace_id AND p.status != 'archived'
      LEFT JOIN tasks t ON p.id = t.project_id  
      LEFT JOIN users u ON w.id = u.workspace_id AND u.active = true
      WHERE w.active = true
      GROUP BY w.id, w.name;

      CREATE UNIQUE INDEX idx_dashboard_stats_workspace_id ON dashboard_stats (workspace_id);

      -- Refresh dashboard stats function
      CREATE OR REPLACE FUNCTION refresh_dashboard_stats()
      RETURNS void AS $$
      BEGIN
        REFRESH MATERIALIZED VIEW CONCURRENTLY dashboard_stats;
      END;
      $$ LANGUAGE plpgsql;
    `;

    await this.applyMigration('004_create_maintenance_functions', functionsMigration);
  }

  async seedInitialData() {
    this.log('Seeding initial data...', 'info');

    const seedData = `
      -- Insert initial workspace (if none exists)
      INSERT INTO workspaces (id, name, slug, description, created_at)
      SELECT 
        uuid_generate_v4(),
        'Default Workspace',
        'default',
        'Default workspace for Meridian',
        CURRENT_TIMESTAMP
      WHERE NOT EXISTS (SELECT 1 FROM workspaces);

      -- Get or create default workspace ID
      DO $$
      DECLARE
        default_workspace_id UUID;
        admin_user_id UUID;
      BEGIN
        SELECT id INTO default_workspace_id FROM workspaces WHERE slug = 'default' LIMIT 1;
        
        -- Insert admin user (if specified in environment)
        IF current_setting('meridian.admin_email', true) IS NOT NULL THEN
          INSERT INTO users (id, email, username, first_name, last_name, workspace_id, role, active, email_verified)
          VALUES (
            uuid_generate_v4(),
            current_setting('meridian.admin_email'),
            'admin',
            'Admin',
            'User',
            default_workspace_id,
            'admin',
            true,
            true
          ) ON CONFLICT (email) DO NOTHING
          RETURNING id INTO admin_user_id;
        END IF;
        
        -- Create default channels
        INSERT INTO channels (id, workspace_id, name, description, type, created_by)
        SELECT 
          uuid_generate_v4(),
          default_workspace_id,
          channel_name,
          channel_desc,
          'public',
          admin_user_id
        FROM (
          VALUES 
            ('general', 'General discussion'),
            ('announcements', 'Team announcements'),
            ('random', 'Random conversations')
        ) AS channels(channel_name, channel_desc)
        WHERE NOT EXISTS (
          SELECT 1 FROM channels 
          WHERE workspace_id = default_workspace_id 
          AND name = channels.channel_name
        );
        
      END $$;
    `;

    try {
      // Set admin email if provided
      const adminEmail = process.env.ADMIN_EMAIL || 'admin@meridian.app';
      await this.client.query(`SET meridian.admin_email = '${adminEmail}'`);
      
      await this.client.query(seedData);
      this.log('Initial data seeded successfully', 'success');
    } catch (error) {
      this.log(`Seeding failed: ${error.message}`, 'warning');
      // Don't fail the migration for seeding issues
    }
  }

  async validateMigration() {
    this.log('Validating migration...', 'info');

    const validationQueries = [
      {
        name: 'Tables created',
        query: `SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = 'public'`
      },
      {
        name: 'Indexes created', 
        query: `SELECT COUNT(*) as count FROM pg_indexes WHERE schemaname = 'public'`
      },
      {
        name: 'Functions created',
        query: `SELECT COUNT(*) as count FROM pg_proc WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')`
      },
      {
        name: 'Extensions enabled',
        query: `SELECT COUNT(*) as count FROM pg_extension WHERE extname IN ('uuid-ossp', 'pg_trgm', 'btree_gin')`
      }
    ];

    for (const validation of validationQueries) {
      try {
        const result = await this.client.query(validation.query);
        this.log(`${validation.name}: ${result.rows[0].count}`, 'success');
      } catch (error) {
        this.log(`${validation.name} validation failed: ${error.message}`, 'error');
      }
    }
  }

  async run() {
    try {
      this.log('🐘 Starting Neon PostgreSQL Migration', 'info');
      this.log('=====================================', 'info');

      await this.connect();
      await this.checkExistingSchema();
      await this.createMigrationTable();

      const appliedMigrations = await this.getAppliedMigrations();
      this.log(`${appliedMigrations.length} migrations already applied`, 'info');

      // Apply migrations in order
      if (!appliedMigrations.includes('001_create_optimized_schema')) {
        await this.createOptimizedSchema();
      } else {
        this.log('Schema migration already applied', 'info');
      }

      if (!appliedMigrations.includes('002_create_performance_indexes')) {
        await this.createPerformanceIndexes();
      } else {
        this.log('Index migration already applied', 'info');
      }

      if (!appliedMigrations.includes('003_create_partitions')) {
        await this.createPartitions();
      } else {
        this.log('Partition migration already applied', 'info');
      }

      if (!appliedMigrations.includes('004_create_maintenance_functions')) {
        await this.createMaintenanceFunctions();
      } else {
        this.log('Functions migration already applied', 'info');
      }

      await this.seedInitialData();
      await this.validateMigration();

      this.log('', 'info');
      this.log('🎉 Migration completed successfully!', 'success');
      this.log('', 'info');
      this.log('Next steps:', 'info');
      this.log('1. Update your application with DATABASE_URL', 'info');
      this.log('2. Test database connectivity', 'info');
      this.log('3. Run application to verify everything works', 'info');
      this.log('4. Set up monitoring and alerts', 'info');

    } catch (error) {
      this.log(`Migration failed: ${error.message}`, 'error');
      throw error;
    } finally {
      await this.disconnect();
    }
  }
}

// Run if called directly
if (require.main === module) {
  const migrator = new NeonMigrator();
  migrator.run().catch(error => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
}

module.exports = NeonMigrator;