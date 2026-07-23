/**
 * M K Consultant Enquiry Form Handler
 */

document.addEventListener('DOMContentLoaded', function () {
  const form = document.getElementById('enquiryForm');
  const submitBtn = document.getElementById('submitEnquiryBtn');
  const alertContainer = document.getElementById('enquiryAlert');

  if (!form) return;

  // Validation rules helper
  function showAlert(message, type = 'danger') {
    alertContainer.innerHTML = `<div class="alert alert-${type}">${message}</div>`;
    alertContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function clearAlert() {
    alertContainer.innerHTML = '';
  }

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    clearAlert();

    // 1. Extract values
    const fullName = document.getElementById('fullName').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const email = document.getElementById('email').value.trim();
    const serviceSelect = document.getElementById('serviceInterested');
    const serviceKey = serviceSelect.value;
    const serviceName = serviceSelect.options[serviceSelect.selectedIndex]?.text || '';
    const preferredContactMethod = document.querySelector('input[name="contactMethod"]:checked')?.value;
    const message = document.getElementById('message').value.trim();
    const consent = document.getElementById('consentCheckbox').checked;

    // 2. Client-side validation
    if (!fullName || fullName.length < 2) {
      return showAlert('Full Name must be at least 2 characters.');
    }
    if (fullName.length > 100) {
      return showAlert('Full Name cannot exceed 100 characters.');
    }

    // Clean phone number (remove spaces, hyphens)
    const cleanPhone = phone.replace(/[\s-]/g, '');
    const phoneRegex = /^(?:\+91|0)?[6-9]\d{9}$/;
    if (!phone || !phoneRegex.test(cleanPhone)) {
      return showAlert('Please provide a valid Indian 10-digit mobile number (e.g. 9876543210).');
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return showAlert('Please provide a valid email address.');
    }

    if (!serviceKey) {
      return showAlert('Please select a service of interest.');
    }

    if (!preferredContactMethod) {
      return showAlert('Please select a preferred contact method.');
    }

    if (message.length > 2000) {
      return showAlert('Message cannot exceed 2000 characters.');
    }

    if (!consent) {
      return showAlert('You must consent to be contacted.');
    }

    // 3. Assemble payload
    // Retrieve visitor/session UUIDs and UTMs from window.MKAnalytics
    const tracking = window.MKAnalytics || { visitorUuid: '', sessionUuid: '', getUTMParams: () => ({}) };
    const utms = tracking.getUTMParams();

    const payload = {
      fullName,
      phone: cleanPhone,
      email: email || null,
      serviceKey,
      preferredContactMethod,
      message: message || null,
      consent: consent ? 1 : 0,
      visitorUuid: tracking.visitorUuid,
      sessionUuid: tracking.sessionUuid,
      utmSource: utms.utm_source,
      utmMedium: utms.utm_medium,
      utmCampaign: utms.utm_campaign
    };

    // Disable button and show loading state
    submitBtn.disabled = true;
    submitBtn.innerText = 'Submitting...';

    try {
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const resData = await response.json();

      if (response.ok) {
        // Success
        showAlert(resData.message || 'Thank you! Your enquiry has been submitted.', 'success');
        form.reset();
        
        // Track success event
        if (window.MKAnalytics) {
          window.MKAnalytics.trackEvent('LEAD_SUBMITTED_SUCCESS', 'service', serviceKey, {
            service_name: serviceName
          });
        }
      } else {
        // Validation/server error
        showAlert(resData.message || 'Failed to submit enquiry. Please try again.');
      }
    } catch (err) {
      showAlert('A network error occurred. Please check your connection and try again.');
      console.error('Submission error:', err);
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerText = 'Submit Enquiry';
    }
  });

  // Track field focus events to analyze visitor form behavior
  const formFields = ['fullName', 'phone', 'email', 'serviceInterested', 'message'];
  formFields.forEach(fieldId => {
    const field = document.getElementById(fieldId);
    if (field) {
      field.addEventListener('focus', function () {
        if (window.MKAnalytics) {
          window.MKAnalytics.trackEvent('ENQUIRY_FIELD_FOCUS', 'form_field', fieldId);
        }
      }, { once: true }); // track once per page load
    }
  });
});
