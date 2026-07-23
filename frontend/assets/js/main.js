/**
 * M K Consultant Main UI Logic and Event Tracking Hooks
 */

document.addEventListener('DOMContentLoaded', function () {
  const hamburger = document.getElementById('mobileMenuToggle');
  const navLinksContainer = document.getElementById('navLinks');
  const navLinks = document.querySelectorAll('.nav-link');
  const accordions = document.querySelectorAll('.accordion-header');

  // Helper: check if tracking exists
  function getTracker() {
    return window.MKAnalytics || { trackEvent: () => {} };
  }

  // =========================================================================
  // 1. MOBILE MENU TOGGLE
  // =========================================================================
  if (hamburger && navLinksContainer) {
    hamburger.addEventListener('click', function () {
      navLinksContainer.classList.toggle('active');
      hamburger.classList.toggle('open');
      getTracker().trackEvent('MOBILE_MENU_TOGGLE', 'navigation', navLinksContainer.classList.contains('active') ? 'open' : 'close');
    });
  }

  // Close mobile menu when clicking a link
  navLinks.forEach(link => {
    link.addEventListener('click', function (e) {
      if (navLinksContainer && navLinksContainer.classList.contains('active')) {
        navLinksContainer.classList.remove('active');
        if (hamburger) hamburger.classList.remove('open');
      }

      // Smooth scroll target resolution
      const targetId = this.getAttribute('href');
      if (targetId && targetId.startsWith('#')) {
        const targetSection = document.querySelector(targetId);
        if (targetSection) {
          e.preventDefault();
          const headerHeight = document.querySelector('header').offsetHeight;
          const targetPosition = targetSection.getBoundingClientRect().top + window.pageYOffset - headerHeight;
          window.scrollTo({
            top: targetPosition,
            behavior: 'smooth'
          });
        }
      }

      // Track Nav Click
      const section = this.getAttribute('href').replace('#', '') || 'home';
      getTracker().trackEvent(`NAV_${section.toUpperCase()}_CLICK`, 'navigation', section);
    });
  });

  // Header Call click tracking
  const headerCall = document.getElementById('headerCallBtn');
  if (headerCall) {
    headerCall.addEventListener('click', function () {
      getTracker().trackEvent('HEADER_CALL_CLICK', 'header', 'call');
    });
  }

  // =========================================================================
  // 2. HERO SECTION TRACKING
  // =========================================================================
  const heroWhatsapp = document.getElementById('heroWhatsappBtn');
  if (heroWhatsapp) {
    heroWhatsapp.addEventListener('click', function () {
      getTracker().trackEvent('HERO_WHATSAPP_CLICK', 'hero', 'whatsapp');
    });
  }

  const heroPricing = document.getElementById('heroPricingBtn');
  if (heroPricing) {
    heroPricing.addEventListener('click', function () {
      getTracker().trackEvent('HERO_PRICING_CLICK', 'hero', 'pricing');
    });
  }

  // Hero Partner Contacts
  const heroMayankCall = document.getElementById('heroMayankCall');
  if (heroMayankCall) {
    heroMayankCall.addEventListener('click', function () {
      getTracker().trackEvent('HERO_PARTNER_MAYANK_CALL_CLICK', 'partner', 'mayank_kaloliya');
    });
  }
  const heroDhavalCall = document.getElementById('heroDhavalCall');
  if (heroDhavalCall) {
    heroDhavalCall.addEventListener('click', function () {
      getTracker().trackEvent('HERO_PARTNER_DHAVAL_CALL_CLICK', 'partner', 'dhaval');
    });
  }

  // =========================================================================
  // 3. SERVICES INTERACTION TRACKING
  // =========================================================================
  const serviceCards = document.querySelectorAll('.service-card');
  serviceCards.forEach(card => {
    const serviceKey = card.getAttribute('data-service-key');
    const serviceName = card.querySelector('.service-title')?.innerText || '';

    // Track card clicking (expanding detail or view)
    card.addEventListener('click', function (e) {
      // Don't duplicate if clicked on internal interactive elements
      if (e.target.closest('a') || e.target.closest('button')) return;
      getTracker().trackEvent('SERVICE_CARD_CLICK', 'service', serviceKey, { service_name: serviceName });
    });

    // Track service CTA Enquiry Click
    const enqBtn = card.querySelector('.service-enquiry-btn');
    if (enqBtn) {
      enqBtn.addEventListener('click', function () {
        getTracker().trackEvent('SERVICE_ENQUIRY_CLICK', 'service', serviceKey, { service_name: serviceName });
        // Auto fill form selection
        const formSelect = document.getElementById('serviceInterested');
        if (formSelect) {
          formSelect.value = serviceKey;
          // Smooth scroll to contact form
          const contactSec = document.getElementById('contact');
          if (contactSec) {
            const headerHeight = document.querySelector('header').offsetHeight;
            const targetPos = contactSec.getBoundingClientRect().top + window.pageYOffset - headerHeight;
            window.scrollTo({ top: targetPos, behavior: 'smooth' });
          }
        }
      });
    }

    // Track service WhatsApp Click
    const waBtn = card.querySelector('.service-whatsapp-btn');
    if (waBtn) {
      waBtn.addEventListener('click', function () {
        getTracker().trackEvent('SERVICE_WHATSAPP_CLICK', 'service', serviceKey, { service_name: serviceName });
      });
    }
  });

  // =========================================================================
  // 4. PRICING SECTION TRACKING
  // =========================================================================
  // Viewpricing trigger
  const pricingSection = document.getElementById('pricing');
  if (pricingSection) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          getTracker().trackEvent('PRICING_SECTION_VIEW', 'section', 'pricing');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.2 });
    observer.observe(pricingSection);
  }

  // Price clicks
  const pricingItems = document.querySelectorAll('.pricing-row');
  pricingItems.forEach(item => {
    item.addEventListener('click', function () {
      const serviceKey = this.getAttribute('data-service-key');
      const serviceName = this.querySelector('.pricing-name')?.innerText || '';
      getTracker().trackEvent('PRICING_SERVICE_CLICK', 'service', serviceKey, { service_name: serviceName });
    });
  });

  const pricingCta = document.getElementById('pricingCtaBtn');
  if (pricingCta) {
    pricingCta.addEventListener('click', function () {
      getTracker().trackEvent('PRICING_CTA_CLICK', 'section', 'pricing');
    });
  }

  // =========================================================================
  // 5. ACCORDION / DOCUMENT SECTION
  // =========================================================================
  accordions.forEach(header => {
    header.addEventListener('click', function () {
      const accordion = this.parentElement;
      const category = accordion.getAttribute('data-doc-category');
      const categoryName = this.querySelector('.accordion-title')?.innerText || '';
      
      const isOpen = accordion.classList.contains('active');
      
      // Close all accordions
      document.querySelectorAll('.accordion-item').forEach(item => {
        if (item !== accordion) {
          item.classList.remove('active');
        }
      });

      // Toggle current
      accordion.classList.toggle('active');
      const newStatus = accordion.classList.contains('active');

      if (newStatus) {
        getTracker().trackEvent('DOCUMENT_ACCORDION_OPEN', 'document', category, { category_name: categoryName });
      } else {
        getTracker().trackEvent('DOCUMENT_ACCORDION_CLOSE', 'document', category, { category_name: categoryName });
      }
    });
  });

  // =========================================================================
  // 6. PARTNER INTERACTION TRACKING
  // =========================================================================
  const partnerCards = document.querySelectorAll('.partner-card');
  partnerCards.forEach(card => {
    const partnerId = card.getAttribute('data-partner-id');
    const partnerName = card.querySelector('.partner-name')?.innerText || '';

    const waBtn = card.querySelector('.partner-wa');
    if (waBtn) {
      waBtn.addEventListener('click', function () {
        getTracker().trackEvent('PARTNER_WHATSAPP_CLICK', 'partner', partnerId, { partner_name: partnerName });
      });
    }

    const callBtn = card.querySelector('.partner-call');
    if (callBtn) {
      callBtn.addEventListener('click', function () {
        getTracker().trackEvent('PARTNER_CALL_CLICK', 'partner', partnerId, { partner_name: partnerName });
      });
    }

    const emailBtn = card.querySelector('.partner-email');
    if (emailBtn) {
      emailBtn.addEventListener('click', function () {
        getTracker().trackEvent('PARTNER_EMAIL_CLICK', 'partner', partnerId, { partner_name: partnerName });
      });
    }
  });

  // =========================================================================
  // 7. FLOATING WHATSAPP BUTTON TRACKING
  // =========================================================================
  const floatingWa = document.getElementById('floatingWhatsappBtn');
  if (floatingWa) {
    floatingWa.addEventListener('click', function () {
      getTracker().trackEvent('FLOATING_WHATSAPP_CLICK', 'floating_button', 'whatsapp');
    });
  }
});
