/**
 * Admin Analytics Controller
 */

document.addEventListener('DOMContentLoaded', async function () {
  // 1. Auth Guard and Logout Setup
  async function checkAuth() {
    try {
      const response = await fetch('/api/admin/auth/me');
      if (!response.ok) {
        window.location.href = 'login.html';
      }
    } catch (err) {
      window.location.href = 'login.html';
    }
  }

  await checkAuth();

  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async function () {
      try {
        const response = await fetch('/api/admin/auth/logout', { method: 'POST' });
        if (response.ok) {
          window.location.href = 'login.html';
        }
      } catch (err) {
        console.error('Logout failed:', err);
      }
    });
  }

  // =========================================================================
  // VISITOR TRAFFIC ENGINE (visitor-analytics.html)
  // =========================================================================
  const kpiNewVisitors = document.getElementById('kpiNewVisitors');
  if (kpiNewVisitors) {
    async function loadVisitorAnalytics() {
      try {
        const response = await fetch('/api/admin/analytics/visitors');
        if (!response.ok) throw new Error('Failed to fetch visitor analytics');
        const res = await response.json();

        if (res.success && res.data) {
          const data = res.data;

          // KPI Cards
          kpiNewVisitors.innerText = data.newVisitors.toLocaleString();
          document.getElementById('kpiReturningVisitors').innerText = data.returningVisitors.toLocaleString();
          document.getElementById('kpiTotalSessions').innerText = data.totalSessions.toLocaleString();
          document.getElementById('kpiAvgInteractions').innerText = data.avgInteractions.toLocaleString();

          // Device Chart
          const devices = data.devices || [];
          const ctxDevice = document.getElementById('deviceChart').getContext('2d');
          new Chart(ctxDevice, {
            type: 'doughnut',
            data: {
              labels: devices.map(d => d.device_type),
              datasets: [{
                data: devices.map(d => d.count),
                backgroundColor: ['#06b6d4', '#6366f1', '#10b981', '#f59e0b'],
                borderWidth: 0
              }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { position: 'bottom', labels: { color: '#f8fafc' } }
              }
            }
          });

          // OS Chart
          const osList = data.operatingSystems || [];
          const ctxOS = document.getElementById('osChart').getContext('2d');
          new Chart(ctxOS, {
            type: 'bar',
            data: {
              labels: osList.map(o => o.operating_system),
              datasets: [{
                label: 'Visits',
                data: osList.map(o => o.count),
                backgroundColor: '#6366f1',
                borderRadius: 4
              }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              scales: {
                y: { grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#94a3b8' } },
                x: { grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#94a3b8' } }
              },
              plugins: {
                legend: { display: false }
              }
            }
          });

          // Browser Chart
          const browsers = data.browsers || [];
          const ctxBrowser = document.getElementById('browserChart').getContext('2d');
          new Chart(ctxBrowser, {
            type: 'bar',
            data: {
              labels: browsers.map(b => b.browser),
              datasets: [{
                label: 'Visits',
                data: browsers.map(b => b.count),
                backgroundColor: '#06b6d4',
                borderRadius: 4
              }]
            },
            options: {
              indexAxis: 'y', // Horizontal bars
              responsive: true,
              maintainAspectRatio: false,
              scales: {
                y: { grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#94a3b8' } },
                x: { grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#94a3b8' } }
              },
              plugins: {
                legend: { display: false }
              }
            }
          });

          // Referrers List
          const refBody = document.getElementById('referrersTableBody');
          const referrers = data.referrers || [];
          if (referrers.length === 0) {
            refBody.innerHTML = `<tr><td colspan="2" style="text-align: center; color: var(--text-muted);">No referrers logged.</td></tr>`;
          } else {
            refBody.innerHTML = '';
            referrers.forEach(ref => {
              refBody.innerHTML += `
                <tr>
                  <td style="word-break: break-all;">${ref.referrer}</td>
                  <td><strong>${ref.count}</strong></td>
                </tr>
              `;
            });
          }

          // Landing Pages List
          const landBody = document.getElementById('landingPagesTableBody');
          const landingPages = data.landingPages || [];
          if (landingPages.length === 0) {
            landBody.innerHTML = `<tr><td colspan="2" style="text-align: center; color: var(--text-muted); padding: 20px 0;">No landing entries.</td></tr>`;
          } else {
            landBody.innerHTML = '';
            landingPages.forEach(page => {
              landBody.innerHTML += `
                <tr>
                  <td>${page.landing_page}</td>
                  <td><strong>${page.count}</strong></td>
                </tr>
              `;
            });
          }
        }
      } catch (err) {
        console.error('Error loading visitor analytics:', err);
      }
    }

    loadVisitorAnalytics();
  }

  // =========================================================================
  // INTERACTION EVENTS ENGINE (interaction-analytics.html)
  // =========================================================================
  const kpiTotalEvents = document.getElementById('kpiTotalEvents');
  if (kpiTotalEvents) {
    async function loadInteractionAnalytics() {
      try {
        const response = await fetch('/api/admin/analytics/interactions');
        if (!response.ok) throw new Error('Failed to fetch interaction analytics');
        const res = await response.json();

        if (res.success && res.data) {
          const data = res.data;

          kpiTotalEvents.innerText = data.totalEvents.toLocaleString();
          document.getElementById('kpiWhatsapp').innerText = data.whatsappClicks.toLocaleString();
          document.getElementById('kpiCall').innerText = data.callClicks.toLocaleString();
          document.getElementById('kpiEmail').innerText = data.emailClicks.toLocaleString();

          // Helper to map event names to business terms and hide raw jargon
          function getFriendlyEventName(name) {
            const mapping = {
              'WHATSAPP_CLICK': 'WhatsApp Clicks',
              'CALL_CLICK': 'Phone Call Clicks',
              'EMAIL_CLICK': 'Email Link Clicks',
              'DOCUMENT_ACCORDION_OPEN': 'Document Section Opens',
              'DOCUMENT_ACCORDION_CLOSE': 'Document Section Closes',
              'PRICING_VIEW': 'Pricing View Toggles',
              'LEAD_FORM_SUBMISSION': 'Contact Form Submissions',
              'SESSION_START': 'Website Visits'
            };
            return mapping[name] || name.replace(/_/g, ' ');
          }

          // Events by Type Chart
          const types = data.eventsByType || [];
          const ctxTypes = document.getElementById('eventTypeChart').getContext('2d');
          new Chart(ctxTypes, {
            type: 'bar',
            data: {
              labels: types.map(t => getFriendlyEventName(t.event_name)),
              datasets: [{
                label: 'Total Counts',
                data: types.map(t => t.count),
                backgroundColor: '#3b82f6',
                borderRadius: 4
              }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              scales: {
                y: { grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#94a3b8' } },
                x: { grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#94a3b8', font: { size: 10 } } }
              },
              plugins: {
                legend: { display: false }
              }
            }
          });
        }

        // Fetch partner clicks
        const partnerRes = await fetch('/api/admin/analytics/partners');
        if (partnerRes.ok) {
          const partData = await partnerRes.json();
          if (partData.success && partData.data) {
            const partners = partData.data.partners;
            const partBody = document.getElementById('partnersTableBody');
            
            partBody.innerHTML = '';
            Object.keys(partners).forEach(key => {
              const part = partners[key];
              partBody.innerHTML += `
                <tr>
                  <td><strong>${part.name}</strong></td>
                  <td>${part.call}</td>
                  <td>${part.whatsapp}</td>
                  <td>${part.email}</td>
                  <td><span style="color: var(--accent-cyan); font-weight: 600;">${part.total}</span></td>
                </tr>
              `;
            });
          }
        }

        // Fetch document clicks
        const docRes = await fetch('/api/admin/analytics/documents');
        if (docRes.ok) {
          const docData = await docRes.json();
          if (docData.success && docData.data) {
            const documents = docData.data.documents || [];
            const docBody = document.getElementById('documentsTableBody');

            if (documents.length === 0) {
              docBody.innerHTML = `<tr><td colspan="3" style="text-align: center; color: var(--text-muted);">No document clicks logged.</td></tr>`;
              return;
            }

            docBody.innerHTML = '';
            documents.forEach(doc => {
              const catFriendlyName = doc.document_category
                .replace(/_docs/g, '')
                .replace(/_/g, ' ')
                .toUpperCase();

              docBody.innerHTML += `
                <tr>
                  <td><strong>${catFriendlyName} Requirements</strong></td>
                  <td>${doc.unique_visitors}</td>
                  <td><span style="color: var(--accent-cyan); font-weight: 600;">${doc.total_opens}</span></td>
                </tr>
              `;
            });
          }
        }
      } catch (err) {
        console.error('Error loading interaction analytics:', err);
      }
    }

    loadInteractionAnalytics();
  }

  // =========================================================================
  // SERVICE CONVERSIONS ENGINE (service-analytics.html)
  // =========================================================================
  const servicesTableBody = document.getElementById('servicesTableBody');
  if (servicesTableBody) {
    async function loadServiceAnalytics() {
      try {
        const response = await fetch('/api/admin/analytics/services');
        if (!response.ok) throw new Error('Failed to fetch service analytics');
        const res = await response.json();

        if (res.success && res.data) {
          const services = res.data.services || [];
          servicesTableBody.innerHTML = '';

          services.forEach(serv => {
            servicesTableBody.innerHTML += `
              <tr>
                <td><strong>${serv.service_name}</strong></td>
                <td>${serv.unique_visitors}</td>
                <td>${serv.total_interactions}</td>
                <td>${serv.pricing_views}</td>
                <td>${serv.whatsapp_clicks}</td>
                <td>${serv.enquiries}</td>
                <td><span style="color: var(--accent-cyan); font-weight: 700;">${serv.conversion_rate}%</span></td>
              </tr>
            `;
          });
        }
      } catch (err) {
        console.error('Error loading service analytics:', err);
        servicesTableBody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--accent-red); padding: 40px 0;">Error loading service data.</td></tr>`;
      }
    }

    loadServiceAnalytics();
  }
});
