const db = require('../config/database');

const Visitor = {
  // Find a visitor by UUID
  async findByUuid(uuid) {
    const [rows] = await db.execute('SELECT * FROM visitors WHERE visitor_uuid = ?', [uuid]);
    return rows[0] || null;
  },

  // Create a new visitor
  async create(uuid, landingPage, referrer) {
    const [result] = await db.execute(
      'INSERT INTO visitors (visitor_uuid, first_landing_page, first_referrer) VALUES (?, ?, ?)',
      [uuid, landingPage || '/', referrer || null]
    );
    return {
      id: result.insertId,
      visitor_uuid: uuid,
      first_landing_page: landingPage,
      first_referrer: referrer
    };
  },

  // Update last seen timestamp
  async updateLastSeen(id) {
    await db.execute('UPDATE visitors SET last_seen_at = NOW() WHERE id = ?', [id]);
  }
};

module.exports = Visitor;
