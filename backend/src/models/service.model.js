const db = require('../config/database');

const Service = {
  // Find all active services sorted by display_order
  async findAllActive() {
    const [rows] = await db.execute(
      'SELECT id, service_key, service_name, display_order FROM services WHERE is_active = 1 ORDER BY display_order ASC'
    );
    return rows;
  },

  // Find a service by key
  async findByKey(key) {
    const [rows] = await db.execute('SELECT * FROM services WHERE service_key = ?', [key]);
    return rows[0] || null;
  },

  // Find a service by ID
  async findById(id) {
    const [rows] = await db.execute('SELECT * FROM services WHERE id = ?', [id]);
    return rows[0] || null;
  }
};

module.exports = Service;
