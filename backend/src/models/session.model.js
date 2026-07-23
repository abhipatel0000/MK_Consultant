const db = require('../config/database');

const Session = {
  // Find session by UUID
  async findByUuid(uuid) {
    const [rows] = await db.execute('SELECT * FROM visitor_sessions WHERE session_uuid = ?', [uuid]);
    return rows[0] || null;
  },

  // Create a new session record
  async create(data) {
    const query = `
      INSERT INTO visitor_sessions (
        session_uuid, visitor_id, landing_page, referrer,
        utm_source, utm_medium, utm_campaign, utm_term, utm_content,
        device_type, browser, operating_system, country, region, city
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      data.session_uuid,
      data.visitor_id,
      data.landing_page || '/',
      data.referrer || null,
      data.utm_source || null,
      data.utm_medium || null,
      data.utm_campaign || null,
      data.utm_term || null,
      data.utm_content || null,
      data.device_type || 'Unknown',
      data.browser || 'Unknown',
      data.operating_system || 'Unknown',
      data.country || 'Unknown',
      data.region || 'Unknown',
      data.city || 'Unknown'
    ];

    const [result] = await db.execute(query, params);
    return { id: result.insertId, ...data };
  },

  // Update session's last activity
  async updateLastActivity(id) {
    await db.execute('UPDATE visitor_sessions SET last_activity_at = NOW() WHERE id = ?', [id]);
  }
};

module.exports = Session;
