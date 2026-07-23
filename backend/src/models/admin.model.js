const db = require('../config/database');
const bcrypt = require('bcryptjs');
const logger = require('../utils/logger');

const Admin = {
  // Find an admin by email
  async findByEmail(email) {
    const [rows] = await db.execute('SELECT * FROM admins WHERE email = ?', [email]);
    return rows[0] || null;
  },

  // Find an admin by id
  async findById(id) {
    const [rows] = await db.execute('SELECT id, full_name, email, role, is_active, last_login_at, password_changed_at, created_at FROM admins WHERE id = ?', [id]);
    return rows[0] || null;
  },

  // Update last login timestamp
  async updateLastLogin(id) {
    await db.execute('UPDATE admins SET last_login_at = NOW() WHERE id = ?', [id]);
  },

  // Update password
  async updatePassword(id, hashedPassword) {
    await db.execute(
      'UPDATE admins SET password_hash = ?, password_changed_at = NOW() WHERE id = ?',
      [hashedPassword, id]
    );
  },

  // Record login attempts for security auditing and rate limiting check
  async recordLoginAttempt(email, ipAddress, wasSuccessful) {
    await db.execute(
      'INSERT INTO login_attempts (email, ip_address, was_successful) VALUES (?, ?, ?)',
      [email, ipAddress, wasSuccessful ? 1 : 0]
    );
  },

  // Seed default admin if it doesn't exist
  async createDefaultAdminIfNotExist(email, plainTextPassword) {
    try {
      const existingAdmin = await this.findByEmail(email);
      if (!existingAdmin) {
        const hashedPassword = await bcrypt.hash(plainTextPassword, 12);
        const [result] = await db.execute(
          'INSERT INTO admins (full_name, email, password_hash, role, is_active) VALUES (?, ?, ?, ?, ?)',
          ['System Administrator', email, hashedPassword, 'superadmin', 1]
        );
        logger.info(`Default administrator account created with email: ${email}`);
        return result.insertId;
      }
      return null;
    } catch (err) {
      logger.error('Failed to create default admin', err);
      throw err;
    }
  }
};

module.exports = Admin;
