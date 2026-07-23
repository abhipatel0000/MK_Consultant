/**
 * Admin Dashboard Controller
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
  // 2. FETCH KPI METRICS
  // =========================================================================
  async function loadSummary() {
    try {
      const response = await fetch('/api/admin/dashboard/summary');
      if (!response.ok) throw new Error('Failed to load summary');
      const res = await response.json();
      
      if (res.success && res.data) {
        const data = res.data;
        document.getElementById('kpiTotalVisitors').innerText = data.totalVisitors.toLocaleString();
        document.getElementById('kpiUniqueVisitors').innerText = data.uniqueVisitors.toLocaleString();
        document.getElementById('kpiTotalLeads').innerText = data.totalLeads.toLocaleString();
        document.getElementById('kpiConversionRate').innerText = `${data.leadConversionRate}%`;
        document.getElementById('kpiWhatsapp').innerText = data.whatsappClicks.toLocaleString();
        document.getElementById('kpiCall').innerText = data.callClicks.toLocaleString();
        document.getElementById('kpiEmail').innerText = data.emailClicks.toLocaleString();
        document.getElementById('kpiNewLeads').innerText = data.newLeads.toLocaleString();

        // Weekly summary line generator
        if (data.weeklyStats) {
          const ws = data.weeklyStats;
          let method = '';
          let maxVal = 0;
          if (ws.whatsappClicks > maxVal) { maxVal = ws.whatsappClicks; method = 'WhatsApp'; }
          if (ws.callClicks > maxVal) { maxVal = ws.callClicks; method = 'Phone Call'; }
          if (ws.emailClicks > maxVal) { maxVal = ws.emailClicks; method = 'Email'; }

          let summaryStr = `This week: <strong>${ws.uniqueVisitors}</strong> people visited your site, <strong>${ws.totalLeads}</strong> sent an enquiry`;
          if (maxVal > 0) {
            summaryStr += `, and <strong>${method}</strong> was the most-used contact method.`;
          } else {
            summaryStr += `, and no contact button clicks were recorded yet.`;
          }

          const banner = document.getElementById('summaryBanner');
          const summaryText = document.getElementById('summaryText');
          if (banner && summaryText) {
            summaryText.innerHTML = summaryStr;
            banner.style.display = 'flex';
          }
        }
      }
    } catch (err) {
      console.error('Error loading summary stats:', err);
    }
  }

  // =========================================================================
  // 3. FETCH VISITOR TRENDS & RENDER CHART
  // =========================================================================
  async function loadVisitorTrends() {
    try {
      const response = await fetch('/api/admin/dashboard/visitor-trends');
      if (!response.ok) throw new Error('Failed to load visitor trends');
      const res = await response.json();

      if (res.success && res.data) {
        const trends = res.data.trends || [];
        const labels = trends.map(item => {
          const date = new Date(item.date);
          return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
        });
        const visitors = trends.map(item => item.visitors);
        const sessions = trends.map(item => item.sessions);

        const ctx = document.getElementById('visitorTrendChart').getContext('2d');
        new Chart(ctx, {
          type: 'line',
          data: {
            labels,
            datasets: [
              {
                label: 'Unique Visitors',
                data: visitors,
                borderColor: '#06b6d4',
                backgroundColor: 'rgba(6, 182, 212, 0.05)',
                tension: 0.3,
                fill: true,
                borderWidth: 2
              },
              {
                label: 'Sessions',
                data: sessions,
                borderColor: '#6366f1',
                backgroundColor: 'rgba(99, 102, 241, 0.05)',
                tension: 0.3,
                fill: true,
                borderWidth: 2
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              y: { grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#94a3b8' } },
              x: { grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#94a3b8' } }
            },
            plugins: {
              legend: { labels: { color: '#f8fafc' } }
            }
          }
        });
      }
    } catch (err) {
      console.error('Error loading visitor trends:', err);
    }
  }

  // =========================================================================
  // 4. FETCH LEAD TRENDS & STATUS DISTRIBUTION
  // =========================================================================
  async function loadLeadTrends() {
    try {
      const response = await fetch('/api/admin/dashboard/lead-trends');
      if (!response.ok) throw new Error('Failed to load lead trends');
      const res = await response.json();

      if (res.success && res.data) {
        const data = res.data;

        // Leads over time chart
        const leadsOverTime = data.leadsOverTime || [];
        const labels = leadsOverTime.map(item => {
          const date = new Date(item.date);
          return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
        });
        const leadCounts = leadsOverTime.map(item => item.count);

        const ctxLeads = document.getElementById('leadsTrendChart').getContext('2d');
        new Chart(ctxLeads, {
          type: 'line',
          data: {
            labels,
            datasets: [{
              label: 'Enquiry Leads',
              data: leadCounts,
              borderColor: '#10b981',
              backgroundColor: 'rgba(16, 185, 129, 0.05)',
              tension: 0.3,
              fill: true,
              borderWidth: 2
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              y: { grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#94a3b8', stepSize: 1 } },
              x: { grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#94a3b8' } }
            },
            plugins: {
              legend: { labels: { color: '#f8fafc' } }
            }
          }
        });

        // Status Pie Chart
        const statusDist = data.leadStatusDistribution || [];
        const statusLabels = statusDist.map(item => item.status);
        const statusCounts = statusDist.map(item => item.count);
        const colors = [
          '#3b82f6', // NEW
          '#f97316', // CONTACTED
          '#8b5cf6', // FOLLOW_UP
          '#10b981', // INTERESTED
          '#eab308', // DOCUMENTS_PENDING
          '#06b6d4', // IN_PROGRESS
          '#10b981', // COMPLETED
          '#ef4444', // NOT_INTERESTED
          '#64748b'  // CLOSED
        ];

        const ctxStatus = document.getElementById('statusChart').getContext('2d');
        new Chart(ctxStatus, {
          type: 'doughnut',
          data: {
            labels: statusLabels,
            datasets: [{
              data: statusCounts,
              backgroundColor: colors.slice(0, statusLabels.length),
              borderWidth: 1,
              borderColor: 'rgba(0,0,0,0.1)'
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: 'right',
                labels: { color: '#f8fafc', font: { size: 11 } }
              }
            }
          }
        });
      }
    } catch (err) {
      console.error('Error loading lead trends:', err);
    }
  }

  // =========================================================================
  // 5. FETCH RECENT ACTIVITIES
  // =========================================================================
  async function loadRecentActivity() {
    try {
      const response = await fetch('/api/admin/dashboard/recent-activity');
      if (!response.ok) throw new Error('Failed to load recent activity');
      const res = await response.json();

      if (res.success && res.data) {
        const body = document.getElementById('recentActivityBody');
        const activities = res.data.activities || [];

        if (activities.length === 0) {
          body.innerHTML = `<tr><td colspan="3" style="text-align: center; color: var(--text-muted);">No activity recorded yet.</td></tr>`;
          return;
        }

        body.innerHTML = '';
        activities.forEach(act => {
          const time = new Date(act.timestamp).toLocaleTimeString('en-IN', {
            hour: '2-digit', minute: '2-digit'
          }) + ' ' + new Date(act.timestamp).toLocaleDateString('en-IN', {
            day: 'numeric', month: 'short'
          });

          let actionStr = '';
          let detailStr = act.details || '';

          if (act.activity_type === 'lead') {
            actionStr = `<span class="badge badge-new" style="background-color: rgba(59,130,246,0.1); border-color: rgba(59,130,246,0.2);">Lead Recv</span> <strong>${act.subject}</strong>`;
            detailStr = `Requested: ${act.details}`;
          } else {
            // Event tracker logs
            let badgeColor = 'rgba(6,182,212,0.1)';
            let borderColor = 'rgba(6,182,212,0.2)';
            let label = 'Click';

            if (act.subject.includes('WHATSAPP')) {
              badgeColor = 'rgba(16,185,129,0.1)';
              borderColor = 'rgba(16,185,129,0.2)';
              label = 'WhatsApp';
            } else if (act.subject.includes('CALL')) {
              badgeColor = 'rgba(249,115,22,0.1)';
              borderColor = 'rgba(249,115,22,0.2)';
              label = 'Phone Call';
            } else if (act.subject.includes('ACCORDION')) {
              badgeColor = 'rgba(139,92,246,0.1)';
              borderColor = 'rgba(139,92,246,0.2)';
              label = 'Accordion';
            }

            actionStr = `<span class="badge" style="background-color: ${badgeColor}; border: 1px solid ${borderColor}; color: #fff;">${label}</span> ${act.subject.replace(/_/g, ' ')}`;
          }

          body.innerHTML += `
            <tr>
              <td style="color: var(--text-muted); font-size: 0.8rem; white-space: nowrap;">${time}</td>
              <td>${actionStr}</td>
              <td style="color: var(--text-muted); font-size: 0.85rem;">${detailStr}</td>
            </tr>
          `;
        });
      }
    } catch (err) {
      console.error('Error loading recent activity:', err);
    }
  }

  // Load everything
  loadSummary();
  loadVisitorTrends();
  loadLeadTrends();
  loadRecentActivity();
});
