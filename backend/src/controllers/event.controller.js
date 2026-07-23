const Visitor = require('../models/visitor.model');
const Session = require('../models/session.model');
const Event = require('../models/event.model');
const response = require('../utils/response');

exports.trackEvent = async (req, res, next) => {
  const {
    visitorUuid,
    sessionUuid,
    eventName,
    entityType,
    entityId,
    pageUrl,
    metadata,
    sessionData
  } = req.body;

  try {
    if (!visitorUuid || !sessionUuid || !eventName) {
      return response.error(res, 'visitorUuid, sessionUuid, and eventName are required.', 400);
    }

    // 1. Resolve Visitor (Find or Create)
    let visitor = await Visitor.findByUuid(visitorUuid);
    if (!visitor) {
      visitor = await Visitor.create(
        visitorUuid,
        pageUrl,
        sessionData?.referrer || req.get('Referer')
      );
    } else {
      await Visitor.updateLastSeen(visitor.id);
    }

    // 2. Resolve Session (Find or Create)
    let session = await Session.findByUuid(sessionUuid);
    if (!session) {
      session = await Session.create({
        session_uuid: sessionUuid,
        visitor_id: visitor.id,
        landing_page: pageUrl,
        referrer: sessionData?.referrer || req.get('Referer'),
        utm_source: sessionData?.utm_source,
        utm_medium: sessionData?.utm_medium,
        utm_campaign: sessionData?.utm_campaign,
        utm_term: sessionData?.utm_term,
        utm_content: sessionData?.utm_content,
        device_type: sessionData?.device_type,
        browser: sessionData?.browser,
        operating_system: sessionData?.operating_system,
        country: sessionData?.country,
        region: sessionData?.region,
        city: sessionData?.city
      });
    } else {
      await Session.updateLastActivity(session.id);
    }

    // 3. Log Event
    await Event.create({
      visitor_id: visitor.id,
      session_id: session.id,
      event_name: eventName,
      entity_type: entityType,
      entity_id: entityId,
      page_url: pageUrl,
      metadata_json: metadata
    });

    return response.success(res, null, 'Event tracked successfully.', 201);
  } catch (err) {
    next(err);
  }
};
