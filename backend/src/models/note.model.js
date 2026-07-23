const db = require('../config/database');

const Note = {
  // Find notes by lead ID
  async findByLeadId(leadId) {
    const query = `
      SELECT n.*, a.full_name as admin_name
      FROM lead_notes n
      JOIN admins a ON n.admin_id = a.id
      WHERE n.lead_id = ?
      ORDER BY n.created_at DESC
    `;
    const [rows] = await db.execute(query, [leadId]);
    return rows;
  },

  // Create a new note
  async create(data) {
    const query = 'INSERT INTO lead_notes (lead_id, admin_id, note) VALUES (?, ?, ?)';
    const params = [data.lead_id, data.admin_id, data.note];
    const [result] = await db.execute(query, params);
    
    // Fetch and return the newly created note with admin details
    const [rows] = await db.execute(`
      SELECT n.*, a.full_name as admin_name
      FROM lead_notes n
      JOIN admins a ON n.admin_id = a.id
      WHERE n.id = ?
    `, [result.insertId]);
    
    return rows[0];
  },

  // Update an existing note
  async update(id, note, adminId) {
    // Only update if it belongs to the admin (or superadmin checks in controller)
    await db.execute('UPDATE lead_notes SET note = ? WHERE id = ?', [note, id]);
    
    const [rows] = await db.execute(`
      SELECT n.*, a.full_name as admin_name
      FROM lead_notes n
      JOIN admins a ON n.admin_id = a.id
      WHERE n.id = ?
    `, [id]);
    
    return rows[0] || null;
  }
};

module.exports = Note;
