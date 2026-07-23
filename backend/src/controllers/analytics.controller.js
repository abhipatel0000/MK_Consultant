const db = require('../config/database');
const response = require('../utils/response');

exports.getVisitorAnalytics = async (req, res, next) => {
  const { startDate, endDate } = req.query;
  let dateFilter = '';
  const params = [];

  if (startDate && endDate) {
    dateFilter = ' WHERE created_at >= ? AND created_at <= ?';
    params.push(startDate, endDate);
  }

  try {
    // 1. Total visitors and Unique visitors
    const [[visitorCount]] = await db.execute(`
      SELECT 
        COUNT(*) as total_visitors,
        COUNT(DISTINCT visitor_uuid) as unique_visitors
      FROM visitors
      ${dateFilter.replace('created_at', 'first_seen_at')}
    `, params);

    // 2. New vs Returning Visitors
    // (A visitor is new if first_seen_at equals last_seen_at, or if they only have 1 session)
    const [[newVsReturning]] = await db.execute(`
      SELECT 
        SUM(CASE WHEN first_seen_at = last_seen_at THEN 1 ELSE 0 END) as new_visitors,
        SUM(CASE WHEN first_seen_at != last_seen_at THEN 1 ELSE 0 END) as returning_visitors
      FROM visitors
      ${dateFilter.replace('created_at', 'first_seen_at')}
    `, params);

    // 3. Sessions and Avg interactions
    const [[sessionStats]] = await db.execute(`
      SELECT 
        COUNT(*) as total_sessions,
        COUNT(e.id) / COUNT(DISTINCT s.id) as avg_interactions
      FROM visitor_sessions s
      LEFT JOIN events e ON s.id = e.session_id
      ${dateFilter ? dateFilter.replace('created_at', 's.created_at') : ''}
    `, params);

    // 4. Top Landing Pages
    const [landingPages] = await db.execute(`
      SELECT landing_page, COUNT(*) as count
      FROM visitor_sessions
      ${dateFilter ? dateFilter.replace('created_at', 'created_at') : ''}
      GROUP BY landing_page
      ORDER BY count DESC
      LIMIT 10
    `, params);

    // 5. Top Referrers
    const [referrers] = await db.execute(`
      SELECT COALESCE(referrer, 'Direct') as referrer, COUNT(*) as count
      FROM visitor_sessions
      ${dateFilter ? dateFilter.replace('created_at', 'created_at') : ''}
      GROUP BY referrer
      ORDER BY count DESC
      LIMIT 10
    `, params);

    // 6. Devices, Browsers, OS
    const [devices] = await db.execute(`
      SELECT COALESCE(device_type, 'Unknown') as device_type, COUNT(*) as count
      FROM visitor_sessions
      ${dateFilter ? dateFilter.replace('created_at', 'created_at') : ''}
      GROUP BY device_type
      ORDER BY count DESC
    `, params);

    const [browsers] = await db.execute(`
      SELECT COALESCE(browser, 'Unknown') as browser, COUNT(*) as count
      FROM visitor_sessions
      ${dateFilter ? dateFilter.replace('created_at', 'created_at') : ''}
      GROUP BY browser
      ORDER BY count DESC
      LIMIT 10
    `, params);

    const [osList] = await db.execute(`
      SELECT COALESCE(operating_system, 'Unknown') as operating_system, COUNT(*) as count
      FROM visitor_sessions
      ${dateFilter ? dateFilter.replace('created_at', 'created_at') : ''}
      GROUP BY operating_system
      ORDER BY count DESC
      LIMIT 10
    `, params);

    return response.success(res, {
      totalVisitors: visitorCount.total_visitors || 0,
      uniqueVisitors: visitorCount.unique_visitors || 0,
      newVisitors: newVsReturning.new_visitors || 0,
      returningVisitors: newVsReturning.returning_visitors || 0,
      totalSessions: sessionStats.total_sessions || 0,
      avgInteractions: parseFloat(parseFloat(sessionStats.avg_interactions || 0).toFixed(2)),
      landingPages,
      referrers,
      devices,
      browsers,
      operatingSystems: osList
    }, 'Visitor analytics retrieved.');
  } catch (err) {
    next(err);
  }
};

exports.getInteractionAnalytics = async (req, res, next) => {
  const { startDate, endDate, eventName } = req.query;
  let filter = ' WHERE 1=1';
  const params = [];

  if (startDate && endDate) {
    filter += ' AND created_at >= ? AND created_at <= ?';
    params.push(startDate, endDate);
  }

  if (eventName) {
    filter += ' AND event_name = ?';
    params.push(eventName);
  }

  try {
    const [[eventStats]] = await db.execute(`
      SELECT 
        COUNT(*) as total_events,
        SUM(CASE WHEN event_name = 'FLOATING_WHATSAPP_CLICK' OR event_name = 'PARTNER_WHATSAPP_CLICK' OR event_name = 'HERO_WHATSAPP_CLICK' THEN 1 ELSE 0 END) as whatsapp_clicks,
        SUM(CASE WHEN event_name LIKE '%CALL%' THEN 1 ELSE 0 END) as call_clicks,
        SUM(CASE WHEN event_name LIKE '%EMAIL%' THEN 1 ELSE 0 END) as email_clicks
      FROM events
      ${filter}
    `, params);

    const [eventsByType] = await db.execute(`
      SELECT event_name, COUNT(*) as count
      FROM events
      ${filter}
      GROUP BY event_name
      ORDER BY count DESC
    `, params);

    return response.success(res, {
      totalEvents: eventStats.total_events || 0,
      whatsappClicks: eventStats.whatsapp_clicks || 0,
      callClicks: eventStats.call_clicks || 0,
      emailClicks: eventStats.email_clicks || 0,
      eventsByType
    }, 'Interaction analytics retrieved.');
  } catch (err) {
    next(err);
  }
};

exports.getServiceAnalytics = async (req, res, next) => {
  try {
    // For every service, calculate conversions and conversion rate.
    // Conversions: number of leads for that service.
    // Pricing Views: events where event_name = 'PRICING_SERVICE_CLICK' and entity_id = service_key.
    // Card Clicks: events where event_name = 'SERVICE_CARD_CLICK' and entity_id = service_key.
    // WhatsApp/Call Clicks: events where event_name = 'SERVICE_WHATSAPP_CLICK' or 'SERVICE_CALL_CLICK' and entity_id = service_key.
    // Unique Visitors: count of distinct visitor_id having any event related to service_key.

    const query = `
      SELECT 
        s.id,
        s.service_key,
        s.service_name,
        (
          SELECT COUNT(DISTINCT e.visitor_id) 
          FROM events e 
          WHERE e.entity_id = s.service_key OR (e.event_name = 'LEAD_FORM_SUBMISSION' AND e.entity_id = s.service_key)
        ) as unique_visitors,
        (
          SELECT COUNT(*) 
          FROM events e 
          WHERE e.entity_id = s.service_key
        ) as total_interactions,
        (
          SELECT COUNT(*) 
          FROM events e 
          WHERE e.event_name = 'PRICING_SERVICE_CLICK' AND e.entity_id = s.service_key
        ) as pricing_views,
        (
          SELECT COUNT(*) 
          FROM events e 
          WHERE e.event_name = 'SERVICE_WHATSAPP_CLICK' AND e.entity_id = s.service_key
        ) as whatsapp_clicks,
        (
          SELECT COUNT(*) 
          FROM events e 
          WHERE e.event_name = 'SERVICE_CALL_CLICK' AND e.entity_id = s.service_key
        ) as call_clicks,
        (
          SELECT COUNT(*) 
          FROM leads l 
          WHERE l.service_id = s.id
        ) as enquiries
      FROM services s
      WHERE s.is_active = 1
      ORDER BY s.display_order ASC
    `;
    const [rows] = await db.execute(query);

    // Calculate rates on backend
    const serviceAnalytics = rows.map(row => {
      const uniqueVis = parseInt(row.unique_visitors, 10) || 0;
      const enquiries = parseInt(row.enquiries, 10) || 0;
      const conversionRate = uniqueVis > 0 ? parseFloat(((enquiries / uniqueVis) * 100).toFixed(2)) : 0.00;
      return {
        ...row,
        unique_visitors: uniqueVis,
        total_interactions: parseInt(row.total_interactions, 10) || 0,
        pricing_views: parseInt(row.pricing_views, 10) || 0,
        whatsapp_clicks: parseInt(row.whatsapp_clicks, 10) || 0,
        call_clicks: parseInt(row.call_clicks, 10) || 0,
        enquiries: enquiries,
        conversion_rate: conversionRate
      };
    });

    return response.success(res, { services: serviceAnalytics }, 'Service analytics retrieved.');
  } catch (err) {
    next(err);
  }
};

exports.getPartnerAnalytics = async (req, res, next) => {
  try {
    // Total interactions per partner (Mayank vs Dhaval)
    const query = `
      SELECT 
        entity_id as partner_id,
        COUNT(CASE WHEN event_name LIKE '%WHATSAPP%' THEN 1 END) as whatsapp_clicks,
        COUNT(CASE WHEN event_name LIKE '%CALL%' THEN 1 END) as call_clicks,
        COUNT(CASE WHEN event_name LIKE '%EMAIL%' THEN 1 END) as email_clicks,
        COUNT(*) as total_clicks
      FROM events
      WHERE (event_name LIKE 'PARTNER_%' OR event_name LIKE 'HERO_PARTNER_%') 
        AND entity_id IN ('mayank_kaloliya', 'dhaval')
      GROUP BY entity_id
    `;
    const [rows] = await db.execute(query);

    // Map to friendly object
    const partners = {
      mayank_kaloliya: { name: 'Mayank Kaloliya', whatsapp: 0, call: 0, email: 0, total: 0 },
      dhaval: { name: 'Dhaval', whatsapp: 0, call: 0, email: 0, total: 0 }
    };

    rows.forEach(row => {
      if (partners[row.partner_id]) {
        partners[row.partner_id].whatsapp = parseInt(row.whatsapp_clicks, 10) || 0;
        partners[row.partner_id].call = parseInt(row.call_clicks, 10) || 0;
        partners[row.partner_id].email = parseInt(row.email_clicks, 10) || 0;
        partners[row.partner_id].total = parseInt(row.total_clicks, 10) || 0;
      }
    });

    return response.success(res, { partners }, 'Partner analytics retrieved.');
  } catch (err) {
    next(err);
  }
};

exports.getDocumentAnalytics = async (req, res, next) => {
  try {
    // Aggregates for document accordion opens
    const query = `
      SELECT 
        entity_id as document_category,
        COUNT(*) as total_opens,
        COUNT(DISTINCT visitor_id) as unique_visitors
      FROM events
      WHERE event_name = 'DOCUMENT_ACCORDION_OPEN'
      GROUP BY entity_id
      ORDER BY total_opens DESC
    `;
    const [rows] = await db.execute(query);
    return response.success(res, { documents: rows }, 'Document accordion analytics retrieved.');
  } catch (err) {
    next(err);
  }
};
