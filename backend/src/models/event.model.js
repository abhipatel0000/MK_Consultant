const db = require('../config/database');

const Event = {
  // Create an interaction event
  async create(data) {
    const query = `
      INSERT INTO events (
        visitor_id, session_id, event_name, entity_type, entity_id, page_url, metadata_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      data.visitor_id,
      data.session_id,
      data.event_name,
      data.entity_type || null,
      data.entity_id || null,
      data.page_url || '/',
      data.metadata_json ? JSON.stringify(data.metadata_json) : null
    ];

    const [result] = await db.execute(query, params);
    return { id: result.insertId, ...data };
  },

  // Get event counts by name
  async getCounts() {
    const [rows] = await db.execute(
      'SELECT event_name, COUNT(*) as count FROM events GROUP BY event_name'
    );
    return rows;
  }
};

module.exports = Event;
