const db = require('../config/database');

const AuditLog = {
  // Create an audit log entry
  async create(data) {
    const query = `
      INSERT INTO admin_audit_logs (
        admin_id, action, entity_type, entity_id, details_json, ip_address
      ) VALUES (?, ?, ?, ?, ?, ?)
    `;
    const params = [
      data.admin_id,
      data.action,
      data.entity_type || null,
      data.entity_id || null,
      data.details_json ? JSON.stringify(data.details_json) : null,
      data.ip_address || null
    ];

    const [result] = await db.execute(query, params);
    return { id: result.insertId, ...data };
  },

  // Get recent logs
  async findRecent(limit = 100) {
    const query = `
      SELECT l.*, a.full_name as admin_name
      FROM admin_audit_logs l
      LEFT JOIN admins a ON l.admin_id = a.id
      ORDER BY l.created_at DESC
      LIMIT ?
    `;
    const [rows] = await db.execute(query, [limit]);
    return rows;
  }
};

module.exports = AuditLog;
