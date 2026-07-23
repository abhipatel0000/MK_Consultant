const Lead = require('../models/lead.model');
const Service = require('../models/service.model');
const Visitor = require('../models/visitor.model');
const Session = require('../models/session.model');
const Event = require('../models/event.model');
const Note = require('../models/note.model');
const AuditLog = require('../models/audit.model');
const response = require('../utils/response');

// Helper to escape HTML to prevent XSS
const sanitizeString = (str) => {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

exports.submitLead = async (req, res, next) => {
  const {
    fullName,
    phone,
    email,
    serviceKey,
    preferredContactMethod,
    message,
    consent,
    visitorUuid,
    sessionUuid,
    utmSource,
    utmMedium,
    utmCampaign
  } = req.body;

  try {
    // 1. Validation
    if (!fullName || fullName.trim().length < 2 || fullName.length > 100) {
      return response.error(res, 'Full Name is required (2-100 characters).', 400);
    }
    // Indian mobile number validation (10 digits, optionally starting with +91 or 0)
    const phoneRegex = /^(?:\+91|0)?[6-9]\d{9}$/;
    if (!phone || !phoneRegex.test(phone.replace(/[\s-]/g, ''))) {
      return response.error(res, 'Please provide a valid Indian 10-digit mobile number.', 400);
    }
    if (email && (email.length > 100 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
      return response.error(res, 'Please provide a valid email address.', 400);
    }
    if (!serviceKey) {
      return response.error(res, 'Preferred service is required.', 400);
    }
    if (!['Call', 'WhatsApp', 'Email'].includes(preferredContactMethod)) {
      return response.error(res, 'Preferred contact method is required (Call, WhatsApp, or Email).', 400);
    }
    if (message && message.length > 2000) {
      return response.error(res, 'Message cannot exceed 2000 characters.', 400);
    }
    if (!consent) {
      return response.error(res, 'You must consent to be contacted.', 400);
    }
    if (!visitorUuid || !sessionUuid) {
      return response.error(res, 'Tracking parameters (visitorUuid, sessionUuid) are required.', 400);
    }

    // 2. Resolve Service ID
    const service = await Service.findByKey(serviceKey);
    if (!service) {
      return response.error(res, 'Invalid service selection.', 400);
    }

    // 3. Resolve Visitor (Find or Create)
    let visitor = await Visitor.findByUuid(visitorUuid);
    if (!visitor) {
      visitor = await Visitor.create(visitorUuid, '/', req.get('Referer'));
    }

    // 4. Resolve Session (Find or Create)
    let session = await Session.findByUuid(sessionUuid);
    if (!session) {
      session = await Session.create({
        session_uuid: sessionUuid,
        visitor_id: visitor.id,
        landing_page: '/',
        referrer: req.get('Referer'),
        utm_source: utmSource,
        utm_medium: utmMedium,
        utm_campaign: utmCampaign,
        device_type: 'Unknown',
        browser: 'Unknown',
        operating_system: 'Unknown'
      });
    }

    // 5. Create Lead with Sanitized Input
    const lead = await Lead.create({
      visitor_id: visitor.id,
      session_id: session.id,
      full_name: sanitizeString(fullName.trim()),
      phone: phone.trim(),
      email: email ? sanitizeString(email.trim().toLowerCase()) : null,
      service_id: service.id,
      preferred_contact_method: preferredContactMethod,
      message: message ? sanitizeString(message.trim()) : null,
      source: 'Web Form',
      utm_source: utmSource ? sanitizeString(utmSource) : null,
      utm_medium: utmMedium ? sanitizeString(utmMedium) : null,
      utm_campaign: utmCampaign ? sanitizeString(utmCampaign) : null
    });

    // 6. Log Form Submission Event in analytics log
    await Event.create({
      visitor_id: visitor.id,
      session_id: session.id,
      event_name: 'LEAD_FORM_SUBMISSION',
      entity_type: 'service',
      entity_id: serviceKey,
      page_url: '/',
      metadata_json: { lead_uuid: lead.lead_uuid }
    });

    return response.success(res, { lead_uuid: lead.lead_uuid }, 'Your enquiry has been submitted. We will contact you soon.', 201);
  } catch (err) {
    next(err);
  }
};

exports.getLeads = async (req, res, next) => {
  try {
    const { page, limit, search, service_id, status, source, startDate, endDate, sortBy, sortOrder } = req.query;
    
    const results = await Lead.findAll({
      page,
      limit,
      search,
      service_id,
      status,
      source,
      startDate,
      endDate,
      sortBy,
      sortOrder
    });

    return response.success(res, results, 'Leads list retrieved.');
  } catch (err) {
    next(err);
  }
};

exports.getLeadById = async (req, res, next) => {
  const { id } = req.params;
  const adminId = req.session.admin.id;

  try {
    const lead = await Lead.findById(id);
    if (!lead) {
      return response.error(res, 'Lead not found.', 404);
    }

    // Log the audit event
    await AuditLog.create({
      admin_id: adminId,
      action: 'LEAD_VIEWED',
      entity_type: 'lead',
      entity_id: id,
      details_json: { lead_name: lead.full_name },
      ip_address: req.ip
    });

    return response.success(res, { lead }, 'Lead details retrieved.');
  } catch (err) {
    next(err);
  }
};

exports.updateLeadStatus = async (req, res, next) => {
  const { id } = req.params;
  const { status } = req.body;
  const adminId = req.session.admin.id;

  const validStatuses = [
    'NEW', 'CONTACTED', 'FOLLOW_UP', 'INTERESTED', 
    'DOCUMENTS_PENDING', 'IN_PROGRESS', 'COMPLETED', 
    'NOT_INTERESTED', 'CLOSED'
  ];

  try {
    if (!status || !validStatuses.includes(status)) {
      return response.error(res, 'Invalid lead status.', 400);
    }

    const updateDetails = await Lead.updateStatus(id, status, adminId);

    // Audit log
    await AuditLog.create({
      admin_id: adminId,
      action: 'LEAD_STATUS_CHANGED',
      entity_type: 'lead',
      entity_id: id,
      details_json: { old_status: updateDetails.oldStatus, new_status: updateDetails.newStatus },
      ip_address: req.ip
    });

    return response.success(res, updateDetails, 'Lead status updated successfully.');
  } catch (err) {
    next(err);
  }
};

exports.getLeadNotes = async (req, res, next) => {
  const { id } = req.params;
  try {
    const notes = await Note.findByLeadId(id);
    return response.success(res, { notes }, 'Lead notes retrieved.');
  } catch (err) {
    next(err);
  }
};

exports.addLeadNote = async (req, res, next) => {
  const { id } = req.params;
  const { note } = req.body;
  const adminId = req.session.admin.id;

  try {
    if (!note || note.trim().length === 0) {
      return response.error(res, 'Note content cannot be empty.', 400);
    }

    const newNote = await Note.create({
      lead_id: id,
      admin_id: adminId,
      note: sanitizeString(note.trim())
    });

    // Audit log
    await AuditLog.create({
      admin_id: adminId,
      action: 'LEAD_NOTE_CREATED',
      entity_type: 'lead',
      entity_id: id,
      details_json: { note_id: newNote.id },
      ip_address: req.ip
    });

    return response.success(res, { note: newNote }, 'Note added successfully.', 201);
  } catch (err) {
    next(err);
  }
};

exports.getLeadTimeline = async (req, res, next) => {
  const { id } = req.params;
  try {
    const timeline = await Lead.getTimeline(id);
    const history = await Lead.getStatusHistory(id);
    
    // Combine events and status updates into a chronological timeline
    const unifiedTimeline = [
      ...timeline.map(item => ({
        type: 'event',
        name: item.event_name,
        entityType: item.entity_type,
        entityId: item.entity_id,
        pageUrl: item.page_url,
        timestamp: item.created_at,
        metadata: item.metadata_json ? JSON.parse(item.metadata_json) : {}
      })),
      ...history.map(item => ({
        type: 'status_change',
        name: 'STATUS_CHANGE',
        oldStatus: item.old_status,
        newStatus: item.new_status,
        adminName: item.admin_name,
        timestamp: item.created_at,
        metadata: {}
      }))
    ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return response.success(res, { timeline: unifiedTimeline }, 'Lead timeline retrieved.');
  } catch (err) {
    next(err);
  }
};

exports.exportLeads = async (req, res, next) => {
  const adminId = req.session.admin.id;
  try {
    const data = await Lead.getExportData();

    if (data.length === 0) {
      // Return empty file headers
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=leads.csv');
      return res.send('');
    }

    // Convert JSON to CSV
    const headers = Object.keys(data[0]);
    const csvRows = [];
    csvRows.push(headers.map(h => `"${h.replace(/"/g, '""')}"`).join(','));

    for (const row of data) {
      const values = headers.map(header => {
        let val = row[header];
        if (val === null || val === undefined) val = '';
        if (val instanceof Date) val = val.toISOString();
        return `"${String(val).replace(/"/g, '""')}"`;
      });
      csvRows.push(values.join(','));
    }

    const csvString = csvRows.join('\r\n');

    // Audit log
    await AuditLog.create({
      admin_id: adminId,
      action: 'LEAD_EXPORTED',
      entity_type: 'leads',
      entity_id: null,
      details_json: { count: data.length },
      ip_address: req.ip
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=leads_export.csv');
    return res.status(200).send(csvString);
  } catch (err) {
    next(err);
  }
};

exports.updateLeadNote = async (req, res, next) => {
  const { noteId } = req.params;
  const { note } = req.body;
  const adminId = req.session.admin.id;

  try {
    if (!note || note.trim().length === 0) {
      return response.error(res, 'Note content cannot be empty.', 400);
    }

    const updatedNote = await Note.update(noteId, sanitizeString(note.trim()), adminId);
    if (!updatedNote) {
      return response.error(res, 'Note not found.', 404);
    }

    // Audit log
    await AuditLog.create({
      admin_id: adminId,
      action: 'LEAD_NOTE_UPDATED',
      entity_type: 'note',
      entity_id: noteId,
      details_json: {},
      ip_address: req.ip
    });

    return response.success(res, { note: updatedNote }, 'Note updated successfully.');
  } catch (err) {
    next(err);
  }
};

