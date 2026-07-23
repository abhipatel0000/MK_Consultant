const db = require('../config/database');
const crypto = require('crypto');

const Lead = {
  // Create a new lead
  async create(data) {
    const leadUuid = crypto.randomUUID();
    const query = `
      INSERT INTO leads (
        lead_uuid, visitor_id, session_id, full_name, phone, email,
        service_id, preferred_contact_method, message, source,
        utm_source, utm_medium, utm_campaign, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'NEW')
    `;
    const params = [
      leadUuid,
      data.visitor_id,
      data.session_id,
      data.full_name,
      data.phone,
      data.email || null,
      data.service_id,
      data.preferred_contact_method,
      data.message || null,
      data.source || 'Web Form',
      data.utm_source || null,
      data.utm_medium || null,
      data.utm_campaign || null
    ];

    const [result] = await db.execute(query, params);
    return { id: result.insertId, lead_uuid: leadUuid, ...data };
  },

  // Get filtered, sorted, paginated leads list
  async findAll(options = {}) {
    const page = parseInt(options.page, 10) || 1;
    const limit = parseInt(options.limit, 10) || 10;
    const offset = (page - 1) * limit;

    let query = `
      SELECT l.*, s.service_name, s.service_key
      FROM leads l
      JOIN services s ON l.service_id = s.id
      WHERE 1=1
    `;
    const params = [];

    // Filter by Search (Name, Phone, Email)
    if (options.search) {
      query += ` AND (l.full_name LIKE ? OR l.phone LIKE ? OR l.email LIKE ?)`;
      const searchWild = `%${options.search}%`;
      params.push(searchWild, searchWild, searchWild);
    }

    // Filter by Service
    if (options.service_id) {
      query += ` AND l.service_id = ?`;
      params.push(options.service_id);
    }

    // Filter by Status
    if (options.status) {
      query += ` AND l.status = ?`;
      params.push(options.status);
    }

    // Filter by Source
    if (options.source) {
      query += ` AND l.source = ?`;
      params.push(options.source);
    }

    // Filter by Date
    if (options.startDate) {
      query += ` AND l.created_at >= ?`;
      params.push(options.startDate);
    }
    if (options.endDate) {
      query += ` AND l.created_at <= ?`;
      params.push(options.endDate);
    }

    // Count total matches before pagination
    const countQuery = `SELECT COUNT(*) as total FROM (${query}) as countTable`;
    const [countRows] = await db.query(countQuery, params);
    const totalLeads = countRows[0]?.total || 0;

    // Sorting
    const allowedSortFields = ['created_at', 'full_name', 'status', 'updated_at'];
    const sortBy = allowedSortFields.includes(options.sortBy) ? options.sortBy : 'created_at';
    const sortOrder = options.sortOrder === 'ASC' ? 'ASC' : 'DESC';
    query += ` ORDER BY l.${sortBy} ${sortOrder}`;

    // Pagination
    query += ` LIMIT ${Number(limit)} OFFSET ${Number(offset)}`;

    const [rows] = await db.query(query, params);

    return {
      leads: rows,
      pagination: {
        total: totalLeads,
        page,
        limit,
        pages: Math.ceil(totalLeads / limit) || 1
      }
    };
  },

  // Get a single lead with details
  async findById(id) {
    const query = `
      SELECT l.*, s.service_name, s.service_key, vs.device_type, vs.browser, vs.operating_system, vs.country, vs.region, vs.city
      FROM leads l
      JOIN services s ON l.service_id = s.id
      JOIN visitor_sessions vs ON l.session_id = vs.id
      WHERE l.id = ?
    `;
    const [rows] = await db.execute(query, [id]);
    return rows[0] || null;
  },

  // Update lead status with transaction history
  async updateStatus(id, newStatus, changedByAdminId) {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      // Get current status
      const [leadRows] = await conn.execute('SELECT status FROM leads WHERE id = ? FOR UPDATE', [id]);
      if (leadRows.length === 0) {
        throw new Error('Lead not found.');
      }
      const oldStatus = leadRows[0].status;

      if (oldStatus !== newStatus) {
        // Update lead status
        await conn.execute('UPDATE leads SET status = ? WHERE id = ?', [newStatus, id]);

        // Insert into history
        await conn.execute(
          'INSERT INTO lead_status_history (lead_id, old_status, new_status, changed_by) VALUES (?, ?, ?, ?)',
          [id, oldStatus, newStatus, changedByAdminId]
        );
      }

      await conn.commit();
      return { id, oldStatus, newStatus };
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  },

  // Get complete lead lifecycle status history
  async getStatusHistory(id) {
    const query = `
      SELECT h.*, a.full_name as admin_name
      FROM lead_status_history h
      JOIN admins a ON h.changed_by = a.id
      WHERE h.lead_id = ?
      ORDER BY h.created_at DESC
    `;
    const [rows] = await db.execute(query, [id]);
    return rows;
  },

  // Get complete event timeline for a lead
  async getTimeline(id) {
    // A lead is associated with a visitor_id. We fetch all events for that visitor_id.
    const [leadRows] = await db.execute('SELECT visitor_id FROM leads WHERE id = ?', [id]);
    if (leadRows.length === 0) return [];
    
    const visitorId = leadRows[0].visitor_id;

    const query = `
      SELECT id, event_name, entity_type, entity_id, page_url, created_at, metadata_json
      FROM events
      WHERE visitor_id = ?
      ORDER BY created_at DESC
    `;
    const [rows] = await db.execute(query, [visitorId]);
    return rows;
  },

  // Get lead data for CSV export
  async getExportData() {
    const query = `
      SELECT l.id as 'Lead ID', l.full_name as 'Name', l.phone as 'Phone', l.email as 'Email', 
             s.service_name as 'Service', l.preferred_contact_method as 'Preferred Contact Method',
             l.source as 'Source', l.utm_source as 'Campaign Source', l.utm_medium as 'Campaign Medium',
             l.utm_campaign as 'Campaign Name', l.status as 'Status', 
             l.created_at as 'Created Date', l.updated_at as 'Last Updated'
      FROM leads l
      JOIN services s ON l.service_id = s.id
      ORDER BY l.created_at DESC
    `;
    const [rows] = await db.execute(query);
    return rows;
  }
};

module.exports = Lead;
