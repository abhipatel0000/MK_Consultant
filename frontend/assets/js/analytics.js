/**
 * M K Consultant Analytics Module
 */

(function () {
  const API_URL = '/api/events';

  // 1. Helper to generate UUID v4
  function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  // 2. Client Device Info Parser
  function getDeviceInfo() {
    const ua = navigator.userAgent;
    let browser = 'Unknown';
    let os = 'Unknown';
    let device = 'Desktop';

    // Browser Detection
    if (ua.indexOf('Firefox') > -1) browser = 'Firefox';
    else if (ua.indexOf('SamsungBrowser') > -1) browser = 'Samsung Browser';
    else if (ua.indexOf('Opera') > -1 || ua.indexOf('OPR') > -1) browser = 'Opera';
    else if (ua.indexOf('Trident') > -1) browser = 'Internet Explorer';
    else if (ua.indexOf('Edge') > -1 || ua.indexOf('Edg') > -1) browser = 'Edge';
    else if (ua.indexOf('Chrome') > -1) browser = 'Chrome';
    else if (ua.indexOf('Safari') > -1) browser = 'Safari';

    // OS Detection
    if (ua.indexOf('Windows NT') > -1) os = 'Windows';
    else if (ua.indexOf('Mac OS X') > -1) os = 'macOS';
    else if (ua.indexOf('Android') > -1) os = 'Android';
    else if (ua.indexOf('iPhone') > -1 || ua.indexOf('iPad') > -1) os = 'iOS';
    else if (ua.indexOf('Linux') > -1) os = 'Linux';

    // Device Type Detection
    if (/Mobi|Android|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)) {
      device = 'Mobile';
    } else if (/Tablet|iPad|PlayBook|Silk/i.test(ua)) {
      device = 'Tablet';
    } else if (window.innerWidth <= 768) {
      device = 'Mobile';
    } else if (window.innerWidth <= 1024) {
      device = 'Tablet';
    }

    return { browser, os, device };
  }

  // 3. UTM Parser
  function getUTMParams() {
    const urlParams = new URLSearchParams(window.location.search);
    return {
      utm_source: urlParams.get('utm_source'),
      utm_medium: urlParams.get('utm_medium'),
      utm_campaign: urlParams.get('utm_campaign'),
      utm_term: urlParams.get('utm_term'),
      utm_content: urlParams.get('utm_content')
    };
  }

  // 4. Retrieve or Create Visitor UUID (localStorage for persistence)
  let visitorUuid = localStorage.getItem('mk_visitor_uuid');
  if (!visitorUuid) {
    visitorUuid = generateUUID();
    localStorage.setItem('mk_visitor_uuid', visitorUuid);
  }

  // 5. Retrieve or Create Session UUID (sessionStorage for tab lifecycle)
  let sessionUuid = sessionStorage.getItem('mk_session_uuid');
  let isNewSession = false;
  if (!sessionUuid) {
    sessionUuid = generateUUID();
    sessionStorage.setItem('mk_session_uuid', sessionUuid);
    isNewSession = true;
  }

  // 6. Rate Limiting Cache to prevent duplicate high-frequency events
  const eventCache = {};

  // 7. Track Event Core Function
  function trackEvent(eventName, entityType, entityId, metadata = {}) {
    const cacheKey = `${eventName}_${entityType || ''}_${entityId || ''}`;
    const now = Date.now();

    // Prevent identical events within 1.5 seconds (debouncing clicks/opens)
    if (eventCache[cacheKey] && now - eventCache[cacheKey] < 1500) {
      return;
    }
    eventCache[cacheKey] = now;

    const deviceInfo = getDeviceInfo();
    const utms = getUTMParams();

    const payload = {
      visitorUuid,
      sessionUuid,
      eventName,
      entityType,
      entityId,
      pageUrl: window.location.pathname + window.location.hash,
      metadata,
      sessionData: isNewSession ? {
        referrer: document.referrer,
        utm_source: utms.utm_source,
        utm_medium: utms.utm_medium,
        utm_campaign: utms.utm_campaign,
        utm_term: utms.utm_term,
        utm_content: utms.utm_content,
        device_type: deviceInfo.device,
        browser: deviceInfo.browser,
        operating_system: deviceInfo.os,
        country: 'India', // Optional geoloc
        region: 'Gujarat',
        city: 'Ahmedabad'
      } : null
    };

    // Session has started, mark as initialized after first event payload
    if (isNewSession) {
      isNewSession = false;
    }

    // Use keepalive to ensure request completes even if user navigates away
    fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true
    }).catch(err => {
      // Fail silently to prevent interrupting user actions
      console.warn('Tracking failed silently:', err);
    });
  }

  // Expose trackEvent globally
  window.MKAnalytics = {
    trackEvent,
    visitorUuid,
    sessionUuid,
    getDeviceInfo,
    getUTMParams
  };

  // 8. Auto-Track initial session start
  document.addEventListener('DOMContentLoaded', function () {
    trackEvent('SESSION_START', 'page', 'home', {
      title: document.title,
      screen_resolution: `${window.screen.width}x${window.screen.height}`
    });
  });
})();
