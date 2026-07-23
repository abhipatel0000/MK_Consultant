const db = require('../config/database');
const response = require('../utils/response');

exports.getSummary = async (req, res, next) => {
  try {
    // 1. Total & Unique Visitors
    const [[visitorStats]] = await db.execute(`
      SELECT 
        COUNT(*) as total_visitors,
        COUNT(DISTINCT visitor_uuid) as unique_visitors
      FROM visitors
    `);

    // 2. Total Sessions
    const [[sessionStats]] = await db.execute(`
      SELECT COUNT(*) as total_sessions FROM visitor_sessions
    `);

    // 3. Total Events (Interactions)
    const [[eventStats]] = await db.execute(`
      SELECT COUNT(*) as total_events FROM events
    `);

    // 4. Total & New Leads
    const [[leadStats]] = await db.execute(`
      SELECT 
        COUNT(*) as total_leads,
        SUM(CASE WHEN status = 'NEW' THEN 1 ELSE 0 END) as new_leads
      FROM leads
    `);

    // 5. Clicks (WhatsApp, Call, Email)
    const [[clickStats]] = await db.execute(`
      SELECT 
        SUM(CASE WHEN event_name LIKE '%WHATSAPP%' THEN 1 ELSE 0 END) as whatsapp_clicks,
        SUM(CASE WHEN event_name LIKE '%CALL%' THEN 1 ELSE 0 END) as call_clicks,
        SUM(CASE WHEN event_name LIKE '%EMAIL%' THEN 1 ELSE 0 END) as email_clicks
      FROM events
    `);

    // 6. Most Popular Service (based on Lead enquiries)
    const [[popularService]] = await db.execute(`
      SELECT s.service_name, COUNT(l.id) as count
      FROM leads l
      JOIN services s ON l.service_id = s.id
      GROUP BY l.service_id
      ORDER BY count DESC
      LIMIT 1
    `);

    // 7. Most Viewed Document Category
    const [[popularDocument]] = await db.execute(`
      SELECT entity_id as document_category, COUNT(*) as count
      FROM events
      WHERE event_name = 'DOCUMENT_ACCORDION_OPEN'
      GROUP BY entity_id
      ORDER BY count DESC
      LIMIT 1
    `);

    // 8. Top Contacted Partner
    const [[popularPartner]] = await db.execute(`
      SELECT entity_id as partner_id, COUNT(*) as count
      FROM events
      WHERE event_name LIKE 'PARTNER_%' OR event_name LIKE 'HERO_PARTNER_%'
      GROUP BY entity_id
      ORDER BY count DESC
      LIMIT 1
    `);

    // 9. Past 7 days (Weekly) Stats
    const [[weeklyVisitorStats]] = await db.execute(`
      SELECT COUNT(DISTINCT visitor_uuid) as unique_visitors
      FROM visitors
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    `);

    const [[weeklyLeadStats]] = await db.execute(`
      SELECT COUNT(*) as total_leads
      FROM leads
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    `);

    const [[weeklyClickStats]] = await db.execute(`
      SELECT 
        SUM(CASE WHEN event_name LIKE '%WHATSAPP%' THEN 1 ELSE 0 END) as whatsapp_clicks,
        SUM(CASE WHEN event_name LIKE '%CALL%' THEN 1 ELSE 0 END) as call_clicks,
        SUM(CASE WHEN event_name LIKE '%EMAIL%' THEN 1 ELSE 0 END) as email_clicks
      FROM events
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    `);

    // Calculate Conversion Rate
    const uniqueCount = visitorStats.unique_visitors || 1;
    const totalLeads = leadStats.total_leads || 0;
    const conversionRate = parseFloat(((totalLeads / uniqueCount) * 100).toFixed(2));

    const data = {
      totalVisitors: visitorStats.total_visitors || 0,
      uniqueVisitors: visitorStats.unique_visitors || 0,
      totalSessions: sessionStats.total_sessions || 0,
      totalInteractions: eventStats.total_events || 0,
      totalLeads: totalLeads,
      newLeads: leadStats.new_leads || 0,
      whatsappClicks: clickStats.whatsapp_clicks || 0,
      callClicks: clickStats.call_clicks || 0,
      emailClicks: clickStats.email_clicks || 0,
      mostPopularService: popularService?.service_name || 'N/A',
      mostViewedDocument: popularDocument?.document_category || 'N/A',
      topContactedPartner: popularPartner?.partner_id === 'mayank_kaloliya' ? 'Mayank Kaloliya' : (popularPartner?.partner_id === 'dhaval' ? 'Dhaval' : 'N/A'),
      leadConversionRate: conversionRate,
      weeklyStats: {
        uniqueVisitors: weeklyVisitorStats.unique_visitors || 0,
        totalLeads: weeklyLeadStats.total_leads || 0,
        whatsappClicks: parseInt(weeklyClickStats.whatsapp_clicks || 0, 10),
        callClicks: parseInt(weeklyClickStats.call_clicks || 0, 10),
        emailClicks: parseInt(weeklyClickStats.email_clicks || 0, 10)
      }
    };

    return response.success(res, data, 'Dashboard summary statistics retrieved.');
  } catch (err) {
    next(err);
  }
};

exports.getVisitorTrends = async (req, res, next) => {
  try {
    // Past 30 days visitor, session and event counts grouped by date
    const query = `
      SELECT 
        DATE(created_at) as date,
        COUNT(DISTINCT visitor_id) as visitors,
        COUNT(DISTINCT session_id) as sessions,
        COUNT(*) as events
      FROM events
      WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `;
    const [rows] = await db.execute(query);
    return response.success(res, { trends: rows }, 'Visitor trends retrieved.');
  } catch (err) {
    next(err);
  }
};

exports.getInteractionTrends = async (req, res, next) => {
  try {
    // Breakdown of interaction types
    const [types] = await db.execute(`
      SELECT event_name, COUNT(*) as count
      FROM events
      GROUP BY event_name
      ORDER BY count DESC
    `);
    return response.success(res, { interactionTypes: types }, 'Interaction trends retrieved.');
  } catch (err) {
    next(err);
  }
};

exports.getLeadTrends = async (req, res, next) => {
  try {
    // 1. Leads over time (past 30 days)
    const [leadTrends] = await db.execute(`
      SELECT DATE(created_at) as date, COUNT(*) as count
      FROM leads
      WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `);

    // 2. Lead status distribution
    const [statusDist] = await db.execute(`
      SELECT status, COUNT(*) as count
      FROM leads
      GROUP BY status
      ORDER BY count DESC
    `);

    // 3. Top services by lead count
    const [serviceDist] = await db.execute(`
      SELECT s.service_name, COUNT(l.id) as count
      FROM leads l
      JOIN services s ON l.service_id = s.id
      GROUP BY l.service_id
      ORDER BY count DESC
    `);

    // 4. Partner comparison (Mayank vs Dhaval clicks)
    const [partnerDist] = await db.execute(`
      SELECT 
        CASE 
          WHEN entity_id = 'mayank_kaloliya' THEN 'Mayank Kaloliya'
          WHEN entity_id = 'dhaval' THEN 'Dhaval'
          ELSE 'Unknown'
        END as partner_name,
        COUNT(*) as count
      FROM events
      WHERE (event_name LIKE 'PARTNER_%' OR event_name LIKE 'HERO_PARTNER_%') 
        AND entity_id IN ('mayank_kaloliya', 'dhaval')
      GROUP BY entity_id
    `);

    // 5. Device distribution
    const [deviceDist] = await db.execute(`
      SELECT device_type, COUNT(*) as count
      FROM visitor_sessions
      GROUP BY device_type
      ORDER BY count DESC
    `);

    // 6. Traffic Source distribution
    const [trafficDist] = await db.execute(`
      SELECT COALESCE(utm_source, referrer, 'Direct') as source, COUNT(*) as count
      FROM visitor_sessions
      GROUP BY source
      ORDER BY count DESC
      LIMIT 10
    `);

    return response.success(res, {
      leadsOverTime: leadTrends,
      leadStatusDistribution: statusDist,
      serviceDistribution: serviceDist,
      partnerDistribution: partnerDist,
      deviceDistribution: deviceDist,
      trafficSources: trafficDist
    }, 'Lead trends and distribution data retrieved.');
  } catch (err) {
    next(err);
  }
};

exports.getRecentActivity = async (req, res, next) => {
  try {
    // Get recent leads and recent events combined
    const [recentLeads] = await db.execute(`
      SELECT 'lead' as activity_type, l.id, l.full_name as subject, 
             s.service_name as details, l.status as status, l.created_at as timestamp
      FROM leads l
      JOIN services s ON l.service_id = s.id
      ORDER BY l.created_at DESC
      LIMIT 5
    `);

    const [recentEvents] = await db.execute(`
      SELECT 'event' as activity_type, e.id, e.event_name as subject,
             COALESCE(e.entity_id, e.page_url) as details, NULL as status, e.created_at as timestamp
      FROM events e
      ORDER BY e.created_at DESC
      LIMIT 10
    `);

    // Combine and sort
    const activities = [...recentLeads, ...recentEvents].sort(
      (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
    ).slice(0, 15);

    return response.success(res, { activities }, 'Recent activity log retrieved.');
  } catch (err) {
    next(err);
  }
};
