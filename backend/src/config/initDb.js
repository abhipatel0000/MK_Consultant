const db = require('./database');
const logger = require('../utils/logger');

const initDb = async () => {
  try {
    // 1. Admins Table
    await db.query(`
      CREATE TABLE IF NOT EXISTS \`admins\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`full_name\` VARCHAR(100) NOT NULL,
        \`email\` VARCHAR(100) NOT NULL UNIQUE,
        \`password_hash\` VARCHAR(255) NOT NULL,
        \`role\` VARCHAR(50) DEFAULT 'admin',
        \`is_active\` TINYINT(1) DEFAULT 1,
        \`last_login_at\` DATETIME NULL,
        \`password_changed_at\` DATETIME NULL,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 2. Visitors Table
    await db.query(`
      CREATE TABLE IF NOT EXISTS \`visitors\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`visitor_uuid\` VARCHAR(36) NOT NULL UNIQUE,
        \`first_seen_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`last_seen_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`first_landing_page\` VARCHAR(255) NOT NULL,
        \`first_referrer\` VARCHAR(255) NULL,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_visitor_uuid (\`visitor_uuid\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 3. Visitor Sessions Table
    await db.query(`
      CREATE TABLE IF NOT EXISTS \`visitor_sessions\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`session_uuid\` VARCHAR(36) NOT NULL UNIQUE,
        \`visitor_id\` INT NOT NULL,
        \`started_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`last_activity_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        \`landing_page\` VARCHAR(255) NOT NULL,
        \`referrer\` VARCHAR(255) NULL,
        \`utm_source\` VARCHAR(100) NULL,
        \`utm_medium\` VARCHAR(100) NULL,
        \`utm_campaign\` VARCHAR(100) NULL,
        \`utm_term\` VARCHAR(100) NULL,
        \`utm_content\` VARCHAR(100) NULL,
        \`device_type\` VARCHAR(50) NULL,
        \`browser\` VARCHAR(100) NULL,
        \`operating_system\` VARCHAR(100) NULL,
        \`country\` VARCHAR(100) NULL,
        \`region\` VARCHAR(100) NULL,
        \`city\` VARCHAR(100) NULL,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (\`visitor_id\`) REFERENCES \`visitors\`(\`id\`) ON DELETE CASCADE,
        INDEX idx_session_uuid (\`session_uuid\`),
        INDEX idx_visitor_id (\`visitor_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 4. Services Table
    await db.query(`
      CREATE TABLE IF NOT EXISTS \`services\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`service_key\` VARCHAR(100) NOT NULL UNIQUE,
        \`service_name\` VARCHAR(255) NOT NULL,
        \`display_order\` INT NOT NULL,
        \`is_active\` TINYINT(1) DEFAULT 1,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_service_key (\`service_key\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 5. Events Table
    await db.query(`
      CREATE TABLE IF NOT EXISTS \`events\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`visitor_id\` INT NOT NULL,
        \`session_id\` INT NOT NULL,
        \`event_name\` VARCHAR(100) NOT NULL,
        \`entity_type\` VARCHAR(50) NULL,
        \`entity_id\` VARCHAR(100) NULL,
        \`page_url\` VARCHAR(255) NOT NULL,
        \`metadata_json\` TEXT NULL,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (\`visitor_id\`) REFERENCES \`visitors\`(\`id\`) ON DELETE CASCADE,
        FOREIGN KEY (\`session_id\`) REFERENCES \`visitor_sessions\`(\`id\`) ON DELETE CASCADE,
        INDEX idx_event_name (\`event_name\`),
        INDEX idx_entity_type (\`entity_type\`),
        INDEX idx_entity_id (\`entity_id\`),
        INDEX idx_created_at (\`created_at\`),
        INDEX idx_visitor_id (\`visitor_id\`),
        INDEX idx_session_id (\`session_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 6. Leads Table
    await db.query(`
      CREATE TABLE IF NOT EXISTS \`leads\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`lead_uuid\` VARCHAR(36) NOT NULL UNIQUE,
        \`visitor_id\` INT NOT NULL,
        \`session_id\` INT NOT NULL,
        \`full_name\` VARCHAR(100) NOT NULL,
        \`phone\` VARCHAR(20) NOT NULL,
        \`email\` VARCHAR(100) NULL,
        \`service_id\` INT NOT NULL,
        \`preferred_contact_method\` VARCHAR(50) NOT NULL,
        \`message\` TEXT NULL,
        \`source\` VARCHAR(100) DEFAULT 'Web Form',
        \`utm_source\` VARCHAR(100) NULL,
        \`utm_medium\` VARCHAR(100) NULL,
        \`utm_campaign\` VARCHAR(100) NULL,
        \`status\` VARCHAR(50) DEFAULT 'NEW',
        \`assigned_to\` INT NULL,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (\`visitor_id\`) REFERENCES \`visitors\`(\`id\`) ON DELETE RESTRICT,
        FOREIGN KEY (\`session_id\`) REFERENCES \`visitor_sessions\`(\`id\`) ON DELETE RESTRICT,
        FOREIGN KEY (\`service_id\`) REFERENCES \`services\`(\`id\`) ON DELETE RESTRICT,
        FOREIGN KEY (\`assigned_to\`) REFERENCES \`admins\`(\`id\`) ON DELETE SET NULL,
        INDEX idx_lead_uuid (\`lead_uuid\`),
        INDEX idx_status (\`status\`),
        INDEX idx_created_at (\`created_at\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 7. Lead Notes Table
    await db.query(`
      CREATE TABLE IF NOT EXISTS \`lead_notes\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`lead_id\` INT NOT NULL,
        \`admin_id\` INT NOT NULL,
        \`note\` TEXT NOT NULL,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (\`lead_id\`) REFERENCES \`leads\`(\`id\`) ON DELETE CASCADE,
        FOREIGN KEY (\`admin_id\`) REFERENCES \`admins\`(\`id\`) ON DELETE CASCADE,
        INDEX idx_lead_id (\`lead_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 8. Lead Status History Table
    await db.query(`
      CREATE TABLE IF NOT EXISTS \`lead_status_history\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`lead_id\` INT NOT NULL,
        \`old_status\` VARCHAR(50) NOT NULL,
        \`new_status\` VARCHAR(50) NOT NULL,
        \`changed_by\` INT NOT NULL,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (\`lead_id\`) REFERENCES \`leads\`(\`id\`) ON DELETE CASCADE,
        FOREIGN KEY (\`changed_by\`) REFERENCES \`admins\`(\`id\`) ON DELETE CASCADE,
        INDEX idx_lead_id (\`lead_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 9. Admin Audit Logs Table
    await db.query(`
      CREATE TABLE IF NOT EXISTS \`admin_audit_logs\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`admin_id\` INT NOT NULL,
        \`action\` VARCHAR(100) NOT NULL,
        \`entity_type\` VARCHAR(50) NULL,
        \`entity_id\` VARCHAR(100) NULL,
        \`details_json\` TEXT NULL,
        \`ip_address\` VARCHAR(45) NULL,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (\`admin_id\`) REFERENCES \`admins\`(\`id\`) ON DELETE CASCADE,
        INDEX idx_admin_id (\`admin_id\`),
        INDEX idx_action (\`action\`),
        INDEX idx_created_at (\`created_at\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 10. Login Attempts Table
    await db.query(`
      CREATE TABLE IF NOT EXISTS \`login_attempts\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`email\` VARCHAR(100) NOT NULL,
        \`ip_address\` VARCHAR(45) NOT NULL,
        \`attempt_time\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`was_successful\` TINYINT(1) DEFAULT 0,
        INDEX idx_email (\`email\`),
        INDEX idx_attempt_time (\`attempt_time\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Seed Services
    await db.query(`
      INSERT INTO \`services\` (\`service_key\`, \`service_name\`, \`display_order\`, \`is_active\`) VALUES
      ('gst_registration', 'GST Registration', 1, 1),
      ('msme_registration', 'MSME Registration', 2, 1),
      ('iec_registration', 'IEC Registration', 3, 1),
      ('icegate_registration', 'ICEGATE Registration', 4, 1),
      ('fssai_registration', 'FSSAI Registration', 5, 1),
      ('pan_card', 'PAN Card', 6, 1),
      ('passport_registration', 'Passport Registration', 7, 1),
      ('trademark_registration', 'Trademark Registration', 8, 1),
      ('digital_signature', 'Digital Signature (DSC)', 9, 1),
      ('partnership_deed', 'Partnership Deed', 10, 1),
      ('accounting_work', 'Accounting Work & Compliance', 11, 1),
      ('other_services', 'Other Services / General Enquiry', 12, 1)
      ON DUPLICATE KEY UPDATE \`service_name\` = VALUES(\`service_name\`), \`display_order\` = VALUES(\`display_order\`);
    `);

    logger.info('Database schema and services auto-initialized successfully.');
  } catch (err) {
    logger.error('Failed to auto-initialize database schema:', err);
  }
};

module.exports = initDb;
