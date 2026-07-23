/**
 * Admin Leads Controller
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
  // LEAD LIST VIEW ENGINE (leads.html)
  // =========================================================================
  const leadsTableBody = document.getElementById('leadsTableBody');
  if (leadsTableBody) {
    let currentPage = 1;
    const limit = 10;
    let search = '';
    let serviceId = '';
    let status = '';
    let sortBy = 'created_at';
    const sortOrder = 'DESC';

    const searchField = document.getElementById('searchField');
    const filterService = document.getElementById('filterService');
    const filterStatus = document.getElementById('filterStatus');
    const filterSort = document.getElementById('filterSort');
    const resetFiltersBtn = document.getElementById('resetFiltersBtn');
    const prevPageBtn = document.getElementById('prevPageBtn');
    const nextPageBtn = document.getElementById('nextPageBtn');
    const paginationStats = document.getElementById('paginationStats');
    const exportCsvBtn = document.getElementById('exportCsvBtn');

    async function loadLeads() {
      leadsTableBody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-muted); padding: 40px 0;">Loading leads list...</td></tr>`;

      try {
        const queryParams = new URLSearchParams({
          page: currentPage,
          limit,
          search,
          service_id: serviceId,
          status,
          sortBy,
          sortOrder
        });

        const response = await fetch(`/api/admin/leads?${queryParams.toString()}`);
        if (!response.ok) throw new Error('Failed to fetch leads');
        const res = await response.json();

        if (res.success && res.data) {
          const leads = res.data.leads || [];
          const pag = res.data.pagination || { total: 0, page: 1, pages: 1 };

          if (leads.length === 0) {
            leadsTableBody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-muted); padding: 40px 0;">No leads found matching current filters.</td></tr>`;
            prevPageBtn.disabled = true;
            nextPageBtn.disabled = true;
            paginationStats.innerText = 'Showing 0-0 of 0 leads';
            return;
          }

          leadsTableBody.innerHTML = '';
          leads.forEach(lead => {
            const time = new Date(lead.created_at).toLocaleDateString('en-IN', {
              day: 'numeric', month: 'short', year: 'numeric'
            }) + ' ' + new Date(lead.created_at).toLocaleTimeString('en-IN', {
              hour: '2-digit', minute: '2-digit'
            });

            const statusClass = `badge-${lead.status.toLowerCase()}`;

            leadsTableBody.innerHTML += `
              <tr>
                <td>${lead.id}</td>
                <td><strong>${lead.full_name}</strong></td>
                <td>${lead.phone}</td>
                <td><span style="color: var(--accent-cyan); font-weight: 500;">${lead.service_name}</span></td>
                <td>${lead.preferred_contact_method}</td>
                <td><span class="badge ${statusClass}">${lead.status}</span></td>
                <td style="color: var(--text-muted); font-size: 0.8rem;">${time}</td>
                <td>
                  <a href="lead-details.html?id=${lead.id}" class="btn btn-secondary" style="padding: 4px 10px; font-size: 0.8rem;">Details</a>
                </td>
              </tr>
            `;
          });

          // Pagination stats
          const startIdx = (pag.page - 1) * pag.limit + 1;
          const endIdx = Math.min(pag.page * pag.limit, pag.total);
          paginationStats.innerText = `Showing ${startIdx}-${endIdx} of ${pag.total} leads`;

          // Button states
          prevPageBtn.disabled = pag.page <= 1;
          nextPageBtn.disabled = pag.page >= pag.pages;
        }
      } catch (err) {
        console.error('Error loading leads:', err);
        leadsTableBody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--accent-red); padding: 40px 0;">Error loading leads data from server.</td></tr>`;
      }
    }

    // Input hooks
    let searchTimeout = null;
    searchField.addEventListener('input', function () {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        search = this.value;
        currentPage = 1;
        loadLeads();
      }, 400); // Debounce typing
    });

    filterService.addEventListener('change', function () {
      serviceId = this.value;
      currentPage = 1;
      loadLeads();
    });

    filterStatus.addEventListener('change', function () {
      status = this.value;
      currentPage = 1;
      loadLeads();
    });

    filterSort.addEventListener('change', function () {
      sortBy = this.value;
      currentPage = 1;
      loadLeads();
    });

    resetFiltersBtn.addEventListener('click', function () {
      searchField.value = '';
      filterService.value = '';
      filterStatus.value = '';
      filterSort.value = 'created_at';
      search = '';
      serviceId = '';
      status = '';
      sortBy = 'created_at';
      currentPage = 1;
      loadLeads();
    });

    prevPageBtn.addEventListener('click', function () {
      if (currentPage > 1) {
        currentPage--;
        loadLeads();
      }
    });

    nextPageBtn.addEventListener('click', function () {
      currentPage++;
      loadLeads();
    });

    exportCsvBtn.addEventListener('click', function () {
      // Direct file trigger redirection
      window.location.href = '/api/admin/leads/export';
    });

    // Run first load
    loadLeads();
  }

  // =========================================================================
  // LEAD DETAILS VIEW ENGINE (lead-details.html)
  // =========================================================================
  const leadDetailsContainer = document.getElementById('leadDetailsContainer');
  if (leadDetailsContainer) {
    const urlParams = new URLSearchParams(window.location.search);
    const leadId = urlParams.get('id');

    if (!leadId) {
      document.getElementById('detailsAlert').innerHTML = `<div class="alert alert-danger">Invalid Lead ID parameter. <a href="leads.html">Go back to list</a></div>`;
      return;
    }

    const changeStatusSelect = document.getElementById('changeStatusSelect');
    const noteInputText = document.getElementById('noteInputText');
    const addNoteForm = document.getElementById('addNoteForm');
    const saveNoteBtn = document.getElementById('saveNoteBtn');
    const cancelEditNoteBtn = document.getElementById('cancelEditNoteBtn');
    const editingNoteId = document.getElementById('editingNoteId');
    const notesListContainer = document.getElementById('notesListContainer');
    const timelineContainer = document.getElementById('timelineContainer');

    function getStatusBadgeClass(status) {
      return `badge badge-${status.toLowerCase()}`;
    }

    async function loadDetails() {
      try {
        const response = await fetch(`/api/admin/leads/${leadId}`);
        if (!response.ok) throw new Error('Lead not found');
        const res = await response.json();

        if (res.success && res.data) {
          const lead = res.data.lead;

          // Header
          document.getElementById('headerLeadName').innerText = `${lead.full_name}`;

          // Profile fields
          document.getElementById('valName').innerText = lead.full_name;
          document.getElementById('valPhone').innerText = lead.phone;
          document.getElementById('valEmail').innerText = lead.email || 'N/A';
          document.getElementById('valService').innerText = lead.service_name;
          document.getElementById('valMethod').innerText = lead.preferred_contact_method;
          document.getElementById('valSource').innerText = lead.source;
          document.getElementById('valMessage').innerText = lead.message || 'No description provided.';

          // Statuses
          document.getElementById('valStatusBadge').outerHTML = `<div style="margin-top: 4px;" id="valStatusBadge"><span class="${getStatusBadgeClass(lead.status)}">${lead.status}</span></div>`;
          changeStatusSelect.value = lead.status;

          // Tech Details
          document.getElementById('valDevice').innerText = lead.device_type || 'Unknown';
          document.getElementById('valBrowser').innerText = `${lead.browser || 'Unknown'} / ${lead.operating_system || 'Unknown'}`;
          document.getElementById('valLocation').innerText = `${lead.city || 'Unknown'}, ${lead.region || 'Unknown'}, ${lead.country || 'Unknown'}`;

          // UTMs
          document.getElementById('valUtmSource').innerText = lead.utm_source || 'N/A';
          document.getElementById('valUtmMedium').innerText = lead.utm_medium || 'N/A';
          document.getElementById('valUtmCampaign').innerText = lead.utm_campaign || 'N/A';

          // Link Hooks
          document.getElementById('btnCallPhone').setAttribute('href', `tel:${lead.phone}`);
          document.getElementById('btnWaPhone').setAttribute('href', `https://wa.me/${lead.phone.replace('+', '')}?text=Hi%20${encodeURIComponent(lead.full_name)},%20this%20is%20M%20K%20Consultant`);
          
          if (lead.email) {
            document.getElementById('btnEmailLink').setAttribute('href', `mailto:${lead.email}`);
            document.getElementById('emailLinkContainer').style.display = 'block';
          } else {
            document.getElementById('emailLinkContainer').style.display = 'none';
          }
        }
      } catch (err) {
        console.error('Error loading lead details:', err);
        document.getElementById('detailsAlert').innerHTML = `<div class="alert alert-danger">Error loading lead details from server. <a href="leads.html">Return to leads</a></div>`;
      }
    }

    async function loadNotes() {
      try {
        const response = await fetch(`/api/admin/leads/${leadId}/notes`);
        if (!response.ok) throw new Error('Failed to load notes');
        const res = await response.json();

        if (res.success && res.data) {
          const notes = res.data.notes || [];
          if (notes.length === 0) {
            notesListContainer.innerHTML = `<p style="color: var(--text-muted); font-size: 0.9rem; text-align: center; padding: 20px 0;">No notes written for this lead yet.</p>`;
            return;
          }

          notesListContainer.innerHTML = '';
          notes.forEach(note => {
            const time = new Date(note.created_at).toLocaleDateString('en-IN', {
              day: 'numeric', month: 'short'
            }) + ' ' + new Date(note.created_at).toLocaleTimeString('en-IN', {
              hour: '2-digit', minute: '2-digit'
            });

            notesListContainer.innerHTML += `
              <div class="note-item" data-note-id="${note.id}">
                <div class="note-meta">
                  <span>✍️ Written by <strong>${note.admin_name}</strong></span>
                  <span>${time} &nbsp; <a href="#" class="edit-note-btn" style="color: var(--accent-cyan);" data-id="${note.id}" data-text="${note.note.replace(/"/g, '&quot;')}">Edit</a></span>
                </div>
                <div class="note-text">${note.note}</div>
              </div>
            `;
          });

          // Wire up edit buttons
          document.querySelectorAll('.edit-note-btn').forEach(btn => {
            btn.addEventListener('click', function (e) {
              e.preventDefault();
              const id = this.getAttribute('data-id');
              const text = this.getAttribute('data-text');

              editingNoteId.value = id;
              noteInputText.value = text;
              saveNoteBtn.innerText = 'Update Note';
              cancelEditNoteBtn.style.display = 'inline-flex';
              noteInputText.focus();
            });
          });
        }
      } catch (err) {
        console.error('Error loading notes:', err);
      }
    }

    async function loadTimeline() {
      try {
        const response = await fetch(`/api/admin/leads/${leadId}/timeline`);
        if (!response.ok) throw new Error('Failed to load timeline');
        const res = await response.json();

        if (res.success && res.data) {
          const timeline = res.data.timeline || [];
          if (timeline.length === 0) {
            timelineContainer.innerHTML = `<p style="color: var(--text-muted); font-size: 0.85rem; text-align: center;">No activity logged yet.</p>`;
            return;
          }

          timelineContainer.innerHTML = '';
          timeline.forEach(item => {
            const date = new Date(item.timestamp);
            const timeStr = date.toLocaleTimeString('en-IN', {
              hour: '2-digit', minute: '2-digit'
            }) + ' ' + date.toLocaleDateString('en-IN', {
              day: 'numeric', month: 'short'
            });

            let iconClass = 'timeline-dot';
            let title = '';
            let desc = '';

            if (item.type === 'status_change') {
              iconClass += ' status_change';
              title = `Lead Status updated to ${item.newStatus}`;
              desc = `Changed by Admin: ${item.adminName} (from: ${item.oldStatus})`;
            } else {
              // Custom visitor event logs
              if (item.name === 'LEAD_FORM_SUBMISSION') {
                iconClass += ' lead_form_submission';
                title = 'Enquiry Form Submitted';
                desc = `Requested service: ${item.entityId}`;
              } else if (item.name.includes('WHATSAPP')) {
                title = 'WhatsApp Button Clicked';
                desc = `Visitor initiated WhatsApp chat for: ${item.entityId || 'General Enquiry'}`;
              } else if (item.name.includes('CALL')) {
                title = 'Call Button Clicked';
                desc = `Visitor clicked to call: ${item.entityId || 'General Contact'}`;
              } else if (item.name.includes('ACCORDION')) {
                const action = item.name.includes('OPEN') ? 'opened' : 'closed';
                title = `Document Section Toggled`;
                desc = `Visitor ${action} required documents for: ${item.entityId}`;
              } else if (item.name === 'SESSION_START') {
                title = 'Visitor Landed on Site';
                desc = `Visitor opened page: ${item.pageUrl || '/'}`;
              } else {
                // Hide technical developer-only "Category / Entity Type" text
                title = item.name.replace(/_/g, ' ');
                desc = `Action details: ${item.entityId || 'General'}`;
              }
            }

            timelineContainer.innerHTML += `
              <div class="timeline-item">
                <div class="${iconClass}"></div>
                <div class="timeline-time">${timeStr}</div>
                <div class="timeline-title">${title}</div>
                <div class="timeline-desc">${desc}</div>
              </div>
            `;
          });
        }
      } catch (err) {
        console.error('Error loading timeline:', err);
      }
    }

    // Status change listener
    changeStatusSelect.addEventListener('change', async function () {
      const newStatus = this.value;
      try {
        const response = await fetch(`/api/admin/leads/${leadId}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus })
        });
        const resData = await response.json();

        if (response.ok) {
          // Success alerts
          document.getElementById('detailsAlert').innerHTML = `<div class="alert alert-success">Status updated successfully to ${newStatus}.</div>`;
          // Reload
          loadDetails();
          loadTimeline();
        } else {
          document.getElementById('detailsAlert').innerHTML = `<div class="alert alert-danger">Failed to change status: ${resData.message}</div>`;
        }
      } catch (err) {
        console.error('Status change error:', err);
      }
    });

    // Notes form submit
    addNoteForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      const noteVal = noteInputText.value.trim();

      if (!noteVal) return;

      const idToEdit = editingNoteId.value;
      const isEditing = idToEdit !== '';

      try {
        let response;
        if (isEditing) {
          response = await fetch(`/api/admin/leads/${leadId}/notes/${idToEdit}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ note: noteVal })
          });
        } else {
          response = await fetch(`/api/admin/leads/${leadId}/notes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ note: noteVal })
          });
        }

        const resData = await response.json();

        if (response.ok) {
          noteInputText.value = '';
          resetNoteForm();
          loadNotes();
        } else {
          alert(resData.message || 'Failed to save note.');
        }
      } catch (err) {
        console.error('Note submission error:', err);
      }
    });

    cancelEditNoteBtn.addEventListener('click', function () {
      resetNoteForm();
    });

    function resetNoteForm() {
      editingNoteId.value = '';
      noteInputText.value = '';
      saveNoteBtn.innerText = 'Save Note';
      cancelEditNoteBtn.style.display = 'none';
    }

    // Run first load
    loadDetails();
    loadNotes();
    loadTimeline();
  }
});
