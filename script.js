/* =========================================================
   Artificial Vision: site script (plain JavaScript, no frameworks)

   1. Settings (form service links)
   2. GA4 event helper
   3. Navigation, back-to-top and footer year
   4. Scroll reveal animation
   5. Products: filters, "View Details" clicks (select_item) and pop-up
   6. Contact form: validation, demo_form_submit or generate_lead
   7. Newsletter: validation, demo_form_submit or sign_up
   ========================================================= */

'use strict';

// Tells style.css that JavaScript is running (used for the scroll animation).
document.documentElement.classList.add('js');

/* ---------- 1. SETTINGS ----------
   Leave both values empty ('') for DEMONSTRATION MODE.
   In demonstration mode nothing is sent anywhere, and GA4 receives
   the event "demo_form_submit" instead of "generate_lead" or "sign_up".

   If you later connect a real form service (for example Formspree),
   paste its endpoint link between the quotes. Then the real events
   "generate_lead" and "sign_up" are sent ONLY after the service
   confirms that the message or subscription was received. */
const CONTACT_FORM_ENDPOINT = '';
const NEWSLETTER_ENDPOINT = '';

/* ---------- 2. GA4 EVENT HELPER ----------
   Sends an event to Google Analytics 4 if the Google tag has loaded.
   It also prints the event in the browser console (press F12 > Console)
   so you can check it while testing. No personal data (names, emails,
   messages) is ever sent to GA4. */
function trackEvent(eventName, params) {
  const data = params || {};
  if (typeof window.gtag === 'function') {
    window.gtag('event', eventName, data);
  }
  console.info('[GA4 event]', eventName, data);
}

document.addEventListener('DOMContentLoaded', function () {
  initNavigation();
  initBackToTop();
  initYear();
  initReveal();
  initProducts();
  initModal();
  initContactForm();
  initNewsletter();
});

/* ---------- 3. NAVIGATION, BACK-TO-TOP AND YEAR ---------- */
function initNavigation() {
  const toggle = document.querySelector('.nav-toggle');
  const menu = document.querySelector('#nav-menu');
  const header = document.querySelector('.site-header');

  if (toggle && menu) {
    toggle.addEventListener('click', function () {
      const isOpen = menu.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(isOpen));
      toggle.setAttribute('aria-label', isOpen ? 'Close menu' : 'Open menu');
    });

    // Close the mobile menu after a link is chosen or Escape is pressed.
    menu.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () { closeMenu(toggle, menu); });
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && menu.classList.contains('open')) {
        closeMenu(toggle, menu);
        toggle.focus();
      }
    });
  }

  if (header) {
    const onScroll = function () { header.classList.toggle('scrolled', window.scrollY > 10); };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }
}

function closeMenu(toggle, menu) {
  menu.classList.remove('open');
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-label', 'Open menu');
}

function initBackToTop() {
  const button = document.querySelector('.back-to-top');
  if (!button) return;
  window.addEventListener('scroll', function () {
    button.classList.toggle('show', window.scrollY > 500);
  }, { passive: true });
  button.addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

function initYear() {
  const year = document.querySelector('#year');
  if (year) year.textContent = new Date().getFullYear();
}

/* ---------- 4. SCROLL REVEAL ANIMATION ---------- */
function initReveal() {
  const items = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window)) {
    items.forEach(function (el) { el.classList.add('visible'); });
    return;
  }
  const observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  items.forEach(function (el) { observer.observe(el); });
}

/* ---------- 5. PRODUCTS ---------- */
function initProducts() {
  // "View Details" buttons on the Home page and the Products page.
  document.querySelectorAll('.js-select-item').forEach(function (button) {
    button.addEventListener('click', onSelectItem);
  });

  // Category filters (Products page only).
  const filterButtons = document.querySelectorAll('.filter-btn');
  if (!filterButtons.length) return;

  filterButtons.forEach(function (button) {
    button.addEventListener('click', function () { applyFilter(button.dataset.filter); });
  });

  // Support links like products.html?category=audio from the Home page tiles.
  const params = new URLSearchParams(window.location.search);
  const category = params.get('category');
  if (category && document.querySelector('.filter-btn[data-filter="' + CSS.escape(category) + '"]')) {
    applyFilter(category);
  }
}

function applyFilter(category) {
  const cards = document.querySelectorAll('#product-grid .product-card');
  let shown = 0;

  cards.forEach(function (card) {
    const match = category === 'all' || card.dataset.category === category;
    card.hidden = !match;
    if (match) {
      shown += 1;
      card.classList.add('visible');
    }
  });

  document.querySelectorAll('.filter-btn').forEach(function (button) {
    const active = button.dataset.filter === category;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });

  const count = document.querySelector('#result-count');
  if (count) count.textContent = 'Showing ' + shown + ' product' + (shown === 1 ? '' : 's');
  const empty = document.querySelector('#empty-state');
  if (empty) empty.hidden = shown !== 0;
}

/* GA4 recommended event: select_item
   Sent every time a visitor clicks "View Details" on a product. */
function onSelectItem(event) {
  const card = event.currentTarget.closest('.product-card');
  if (!card) return;

  const listId = card.dataset.list || 'product_catalog';
  const listName = listId === 'home_featured' ? 'Home Featured Products' : 'Product Catalog';
  const siblings = Array.prototype.slice.call(card.parentElement.children);

  trackEvent('select_item', {
    item_list_id: listId,
    item_list_name: listName,
    items: [{
      item_id: card.dataset.id,
      item_name: card.dataset.name,
      item_category: card.dataset.categoryLabel,
      item_brand: 'Artificial Vision',
      price: Number(card.dataset.price),
      index: siblings.indexOf(card)
    }]
  });

  if (document.querySelector('#product-modal')) {
    // Products page: open the pop-up straight away.
    openModal(card);
  } else {
    // Home page: give GA4 a moment to send the event, then open the product on the Products page.
    const target = 'products.html?item=' + encodeURIComponent(card.dataset.id);
    setTimeout(function () { window.location.href = target; }, 300);
  }
}

/* ---------- Product details pop-up (modal) ---------- */
let lastFocusedElement = null;

function initModal() {
  const modal = document.querySelector('#product-modal');
  if (!modal) return;

  modal.querySelectorAll('[data-close-modal]').forEach(function (el) {
    el.addEventListener('click', closeModal);
  });

  document.addEventListener('keydown', function (e) {
    if (modal.hidden) return;
    if (e.key === 'Escape') closeModal();
    if (e.key === 'Tab') trapFocus(e, modal);
  });

  // Open a product directly from a link like products.html?item=av-nova-14
  // (the click was already tracked on the Home page, so no second event is sent).
  const itemId = new URLSearchParams(window.location.search).get('item');
  if (itemId) {
    const card = document.querySelector('.product-card[data-id="' + CSS.escape(itemId) + '"]');
    if (card) {
      card.scrollIntoView({ block: 'center' });
      openModal(card);
    }
  }
}

function openModal(card) {
  const modal = document.querySelector('#product-modal');
  const cardImage = card.querySelector('img');

  const modalImage = modal.querySelector('#modal-img');
  modalImage.src = cardImage ? cardImage.currentSrc || cardImage.src : 'images/placeholder.svg';
  modalImage.alt = cardImage ? cardImage.alt : '';
  modal.querySelector('#modal-category').textContent = card.dataset.categoryLabel || '';
  modal.querySelector('#modal-title').textContent = card.dataset.name || '';
  modal.querySelector('#modal-price').textContent = textOf(card, '.price-now');
  modal.querySelector('#modal-mrp').textContent = textOf(card, '.mrp');
  modal.querySelector('#modal-desc').textContent = card.dataset.details || textOf(card, '.product-desc');

  const specList = modal.querySelector('#modal-specs');
  specList.innerHTML = '';
  (card.dataset.specs || '').split('|').filter(Boolean).forEach(function (spec) {
    const li = document.createElement('li');
    li.textContent = spec;
    specList.appendChild(li);
  });

  modal.querySelector('#modal-enquire').href = 'contact.html?product=' + encodeURIComponent(card.dataset.name || '');

  lastFocusedElement = document.activeElement;
  modal.hidden = false;
  document.body.classList.add('modal-open');
  modal.querySelector('.modal-close').focus();
}

function closeModal() {
  const modal = document.querySelector('#product-modal');
  if (!modal || modal.hidden) return;
  modal.hidden = true;
  document.body.classList.remove('modal-open');
  if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') lastFocusedElement.focus();
}

function trapFocus(e, modal) {
  const focusable = modal.querySelectorAll('a[href], button:not([disabled]), input, textarea, [tabindex]:not([tabindex="-1"])');
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
}

function textOf(parent, selector) {
  const el = parent.querySelector(selector);
  return el ? el.textContent.trim() : '';
}

/* ---------- Shared form helpers ---------- */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function setFieldError(input, errorEl, message) {
  if (!input || !errorEl) return;
  errorEl.textContent = message;
  if (message) input.setAttribute('aria-invalid', 'true');
  else input.removeAttribute('aria-invalid');
}

function showStatus(box, type, message) {
  if (!box) return;
  box.className = 'form-status ' + type;
  box.textContent = message;
  box.hidden = false;
}

function setLoading(button, isLoading, loadingText) {
  if (!button) return;
  if (isLoading) {
    button.dataset.originalHtml = button.innerHTML;
    button.textContent = loadingText;
    button.disabled = true;
  } else {
    if (button.dataset.originalHtml) button.innerHTML = button.dataset.originalHtml;
    button.disabled = false;
  }
}

// Sends form data to a real form service and resolves only if the service confirms success.
function sendToFormService(endpoint, formData) {
  return fetch(endpoint, {
    method: 'POST',
    body: formData,
    headers: { Accept: 'application/json' }
  }).then(function (response) {
    if (!response.ok) throw new Error('Form service returned status ' + response.status);
    return response;
  });
}

/* ---------- 6. CONTACT FORM ---------- */
function initContactForm() {
  const form = document.querySelector('#contact-form');
  if (!form) return;

  const fields = {
    name: form.querySelector('#name'),
    email: form.querySelector('#email'),
    subject: form.querySelector('#subject'),
    message: form.querySelector('#message')
  };
  const status = form.querySelector('.form-status');
  const submitButton = form.querySelector('button[type="submit"]');

  // Pre-fill the subject when coming from "Enquire About This Product".
  const product = new URLSearchParams(window.location.search).get('product');
  if (product && fields.subject) fields.subject.value = 'Enquiry about ' + product;

  // Clear an error as soon as the visitor starts fixing the field.
  Object.keys(fields).forEach(function (key) {
    const input = fields[key];
    input.addEventListener('input', function () {
      setFieldError(input, document.getElementById(key + '-error'), '');
    });
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    if (!validateContactForm(fields)) {
      showStatus(status, 'error', 'Please correct the highlighted fields and try again.');
      const firstInvalid = form.querySelector('[aria-invalid="true"]');
      if (firstInvalid) firstInvalid.focus();
      return;
    }

    // DEMONSTRATION MODE: no form service connected, so nothing is sent.
    if (!CONTACT_FORM_ENDPOINT) {
      trackEvent('demo_form_submit', { form_name: 'contact_form', form_mode: 'demo' });
      showStatus(status, 'info', 'Demo mode: your enquiry passed all checks, but it was NOT sent because no form service is connected to this website yet.');
      form.reset();
      return;
    }

    // REAL MODE: send to the form service, then track generate_lead only after success.
    setLoading(submitButton, true, 'Sending...');
    sendToFormService(CONTACT_FORM_ENDPOINT, new FormData(form))
      .then(function () {
        trackEvent('generate_lead', { form_name: 'contact_form', lead_source: 'contact_page' });
        showStatus(status, 'success', 'Thank you! Your enquiry has been sent. Our team will reply by email.');
        form.reset();
      })
      .catch(function () {
        showStatus(status, 'error', 'Sorry, your enquiry could not be sent right now. Please try again later or email us directly.');
      })
      .finally(function () { setLoading(submitButton, false); });
  });
}

function validateContactForm(fields) {
  let valid = true;
  const name = fields.name.value.trim();
  const email = fields.email.value.trim();
  const subject = fields.subject.value.trim();
  const message = fields.message.value.trim();

  if (name.length < 2) {
    setFieldError(fields.name, document.getElementById('name-error'), 'Please enter your full name (at least 2 characters).');
    valid = false;
  } else if (!/^[A-Za-z][A-Za-z .'-]*$/.test(name)) {
    setFieldError(fields.name, document.getElementById('name-error'), 'Please use letters only in your name.');
    valid = false;
  } else {
    setFieldError(fields.name, document.getElementById('name-error'), '');
  }

  if (!email) {
    setFieldError(fields.email, document.getElementById('email-error'), 'Please enter your email address.');
    valid = false;
  } else if (!EMAIL_PATTERN.test(email)) {
    setFieldError(fields.email, document.getElementById('email-error'), 'Please enter a valid email address, for example name@example.com.');
    valid = false;
  } else {
    setFieldError(fields.email, document.getElementById('email-error'), '');
  }

  if (subject.length < 3) {
    setFieldError(fields.subject, document.getElementById('subject-error'), 'Please enter a subject (at least 3 characters).');
    valid = false;
  } else {
    setFieldError(fields.subject, document.getElementById('subject-error'), '');
  }

  if (message.length < 10) {
    setFieldError(fields.message, document.getElementById('message-error'), 'Please write a message of at least 10 characters.');
    valid = false;
  } else {
    setFieldError(fields.message, document.getElementById('message-error'), '');
  }

  return valid;
}

/* ---------- 7. NEWSLETTER ---------- */
function initNewsletter() {
  const form = document.querySelector('#newsletter-form');
  if (!form) return;

  const input = form.querySelector('#newsletter-email');
  const errorEl = document.querySelector('#newsletter-error');
  const status = document.querySelector('#newsletter-status');
  const button = form.querySelector('button[type="submit"]');

  input.addEventListener('input', function () { setFieldError(input, errorEl, ''); });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    const email = input.value.trim();

    if (!email || !EMAIL_PATTERN.test(email)) {
      setFieldError(input, errorEl, 'Please enter a valid email address.');
      if (status) status.hidden = true;
      input.focus();
      return;
    }
    setFieldError(input, errorEl, '');

    // DEMONSTRATION MODE: nothing is stored or sent.
    if (!NEWSLETTER_ENDPOINT) {
      trackEvent('demo_form_submit', { form_name: 'newsletter', form_mode: 'demo' });
      showStatus(status, 'info', 'Demo mode: your email passed the check, but you were NOT subscribed because no newsletter service is connected yet.');
      form.reset();
      return;
    }

    // REAL MODE: track sign_up only after the service confirms the subscription.
    setLoading(button, true, 'Subscribing...');
    sendToFormService(NEWSLETTER_ENDPOINT, new FormData(form))
      .then(function () {
        trackEvent('sign_up', { method: 'newsletter_form' });
        showStatus(status, 'success', 'You are subscribed! Watch your inbox for our next update.');
        form.reset();
      })
      .catch(function () {
        showStatus(status, 'error', 'Sorry, we could not complete your subscription. Please try again later.');
      })
      .finally(function () { setLoading(button, false); });
  });
}
