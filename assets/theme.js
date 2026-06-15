/* ============================================
   FIREBORN — THEME JAVASCRIPT
   Handles: Header, Cart Drawer, Animations,
            Cursor Glow, Filter Tabs,
            Add to Cart, Mobile Menu
============================================ */

'use strict';

/* ── Utility ─────────────────────────────── */
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

/* ── DOM Ready ───────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  initHeader();
  initMobileMenu();
  initCartDrawer();
  initCursorGlow();
  initScrollReveal();
  initFilterTabs();
  initProductCards();
  initNewsletter();
  updateCartCount();
});


/* ════════════════════════════════════════════
   HEADER — Scroll effect
═════════════════════════════════════════════ */
function initHeader() {
  const header = $('#siteHeader');
  if (!header) return;

  const handleScroll = () => {
    header.classList.toggle('scrolled', window.scrollY > 60);
  };

  window.addEventListener('scroll', handleScroll, { passive: true });
  handleScroll(); // init state
}


/* ════════════════════════════════════════════
   MOBILE MENU
═════════════════════════════════════════════ */
function initMobileMenu() {
  const hamburger  = $('#hamburger');
  const mobileMenu = $('#mobileMenu');
  const closeMobile = $('#closeMobile');
  if (!hamburger || !mobileMenu) return;

  const openMenu = () => {
    mobileMenu.classList.add('open');
    mobileMenu.setAttribute('aria-hidden', 'false');
    hamburger.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  };

  const closeMenu = () => {
    mobileMenu.classList.remove('open');
    mobileMenu.setAttribute('aria-hidden', 'true');
    hamburger.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  };

  hamburger.addEventListener('click', openMenu);
  closeMobile && closeMobile.addEventListener('click', closeMenu);

  // Close on escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeMenu();
  });

  // Close on link click
  $$('.mobile-nav-link', mobileMenu).forEach(link => {
    link.addEventListener('click', closeMenu);
  });
}


/* ════════════════════════════════════════════
   CART DRAWER
═════════════════════════════════════════════ */
function initCartDrawer() {
  const cartBtn    = $('#cartBtn');
  const cartDrawer = $('#cartDrawer');
  const cartOverlay = $('#cartOverlay');
  const closeCart  = $('#closeCart');
  if (!cartBtn || !cartDrawer) return;

  const openCart = () => {
    cartDrawer.classList.add('open');
    cartOverlay.classList.add('open');
    cartDrawer.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    fetchCart();
  };

  const closeCartFn = () => {
    cartDrawer.classList.remove('open');
    cartOverlay.classList.remove('open');
    cartDrawer.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  };

  cartBtn.addEventListener('click', openCart);
  closeCart && closeCart.addEventListener('click', closeCartFn);
  cartOverlay && cartOverlay.addEventListener('click', closeCartFn);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeCartFn();
  });
}

/* Fetch cart from Shopify AJAX API */
async function fetchCart() {
  try {
    const res  = await fetch('/cart.js');
    const cart = await res.json();
    renderCart(cart);
  } catch (err) {
    console.error('Cart fetch error:', err);
  }
}

function renderCart(cart) {
  const itemsEl = $('#cartItems');
  const totalEl = $('#cartTotal');
  const countEl = $('#cartCount');
  if (!itemsEl) return;

  // Update count
  if (countEl) countEl.textContent = cart.item_count;

  // Update total
  if (totalEl) {
    totalEl.textContent = formatMoney(cart.total_price);
  }

  if (cart.item_count === 0) {
    itemsEl.innerHTML = `
      <div style="
        display:flex;flex-direction:column;align-items:center;
        justify-content:center;height:100%;gap:1rem;
        padding:3rem 1rem;text-align:center;
      ">
        <span style="font-size:3rem;opacity:0.3;">🛒</span>
        <p style="color:var(--steel);font-size:0.9rem;">Your cart is empty</p>
        <a href="/collections/all" class="btn btn-primary"
           style="margin-top:0.5rem;">Shop Now</a>
      </div>`;
    return;
  }

  itemsEl.innerHTML = cart.items.map(item => `
    <div class="cart-item" data-line="${item.key}">
      <img
        src="${item.featured_image?.url || ''}"
        alt="${item.title}"
        class="cart-item__img"
        loading="lazy">
      <div>
        <div class="cart-item__title">${item.product_title}</div>
        <div class="cart-item__variant">${item.variant_title !== 'Default Title' ? item.variant_title : ''}</div>
        <div class="cart-item__qty">
          <button class="qty-btn"
            onclick="updateQty('${item.key}', ${item.quantity - 1})"
            aria-label="Decrease quantity">−</button>
          <span class="qty-num">${item.quantity}</span>
          <button class="qty-btn"
            onclick="updateQty('${item.key}', ${item.quantity + 1})"
            aria-label="Increase quantity">+</button>
        </div>
      </div>
      <div class="cart-item__price">${formatMoney(item.final_line_price)}</div>
    </div>
  `).join('');
}

/* Add to cart */
window.addToCart = async function(variantId, btn) {
  if (!variantId) return;
  const originalText = btn.innerHTML;

  btn.innerHTML = `<span style="display:inline-block;animation:spin 1s linear infinite">◌</span> Adding...`;
  btn.disabled = true;

  try {
    const res = await fetch('/cart/add.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: variantId, quantity: 1 })
    });

    if (!res.ok) throw new Error('Add to cart failed');

    btn.innerHTML = `✓ Added!`;
    btn.style.background = '#22c55e';
    updateCartCount();

    setTimeout(() => {
      btn.innerHTML = originalText;
      btn.style.background = '';
      btn.disabled = false;
    }, 2000);

  } catch (err) {
    console.error('Add to cart error:', err);
    btn.innerHTML = `✗ Error`;
    btn.style.background = '#ef4444';
    setTimeout(() => {
      btn.innerHTML = originalText;
      btn.style.background = '';
      btn.disabled = false;
    }, 2000);
  }
};

/* Update cart quantity */
window.updateQty = async function(key, qty) {
  try {
    const res = await fetch('/cart/change.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: key, quantity: qty })
    });
    const cart = await res.json();
    renderCart(cart);
  } catch (err) {
    console.error('Update qty error:', err);
  }
};

async function updateCartCount() {
  try {
    const res  = await fetch('/cart.js');
    const cart = await res.json();
    const countEl = $('#cartCount');
    if (countEl) countEl.textContent = cart.item_count;
  } catch (err) {}
}

/* Format money (cents → display) */
function formatMoney(cents) {
  return `$${(cents / 100).toFixed(2)}`;
}


/* ════════════════════════════════════════════
   CURSOR GLOW
═════════════════════════════════════════════ */
function initCursorGlow() {
  const glow = $('#cursorGlow');
  if (!glow || window.matchMedia('(pointer:coarse)').matches) {
    if (glow) glow.remove();
    return;
  }

  // Inject CSS
  const style = document.createElement('style');
  style.textContent = `
    .cursor-glow {
      position: fixed;
      width: 300px;
      height: 300px;
      border-radius: 50%;
      background: radial-gradient(circle,
        rgba(255,69,0,0.07) 0%,
        transparent 70%);
      pointer-events: none;
      z-index: 9998;
      transform: translate(-50%, -50%);
      transition: opacity 0.3s ease;
    }
  `;
  document.head.appendChild(style);

  let mx = -999, my = -999;
  let cx = -999, cy = -999;
  let rafId;

  document.addEventListener('mousemove', (e) => {
    mx = e.clientX;
    my = e.clientY;
  });

  document.addEventListener('mouseleave', () => {
    glow.style.opacity = '0';
  });

  document.addEventListener('mouseenter', () => {
    glow.style.opacity = '1';
  });

  const lerp = (a, b, t) => a + (b - a) * t;

  const animate = () => {
    cx = lerp(cx, mx, 0.1);
    cy = lerp(cy, my, 0.1);
    glow.style.left = `${cx}px`;
    glow.style.top  = `${cy}px`;
    rafId = requestAnimationFrame(animate);
  };

  animate();
}


/* ════════════════════════════════════════════
   SCROLL REVEAL — Intersection Observer
═════════════════════════════════════════════ */
function initScrollReveal() {
  const elements = $$('.reveal');
  if (!elements.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.12,
    rootMargin: '0px 0px -40px 0px'
  });

  elements.forEach(el => observer.observe(el));
}


/* ════════════════════════════════════════════
   FILTER TABS — Collection section
═════════════════════════════════════════════ */
function initFilterTabs() {
  const tabs = $$('.filter-tab');
  if (!tabs.length) return;

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');

      const filter = tab.dataset.filter;
      filterProducts(filter);
    });
  });
}

function filterProducts(filter) {
  const cards = $$('.product-card');

  cards.forEach(card => {
    if (filter === 'all') {
      card.style.display = '';
      return;
    }
    // Match tag from product — uses data-tags attribute if set
    const tags = (card.dataset.tags || '').toLowerCase();
    card.style.display = tags.includes(filter) ? '' : 'none';
  });
}


/* ════════════════════════════════════════════
   PRODUCT CARDS — Hover & Wishlist
═════════════════════════════════════════════ */
function initProductCards() {
  // Wishlist toggle
  $$(`.product-card__wishlist`).forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const isSaved = btn.dataset.saved === 'true';
      btn.dataset.saved = !isSaved;
      btn.style.background = !isSaved ? 'var(--orange)' : '';
      btn.style.borderColor = !isSaved ? 'var(--orange)' : '';
      btn.style.color = !isSaved ? 'var(--white)' : '';
      btn.style.opacity = '1';
      btn.setAttribute('aria-pressed', String(!isSaved));
    });
  });
}


/* ════════════════════════════════════════════
   NEWSLETTER — Success state
═════════════════════════════════════════════ */
function initNewsletter() {
  const forms = $$('.newsletter-form');

  forms.forEach(form => {
    form.addEventListener('submit', (e) => {
      const submitBtn = form.querySelector('.newsletter-submit');
      if (submitBtn) {
        setTimeout(() => {
          submitBtn.textContent = '✓ You\'re In!';
          submitBtn.style.background = '#22c55e';
          submitBtn.style.borderColor = '#22c55e';
        }, 300);
      }
    });
  });
}


/* ════════════════════════════════════════════
   SEARCH — Toggle (placeholder)
═════════════════════════════════════════════ */
const searchBtn = $('#searchBtn');
if (searchBtn) {
  searchBtn.addEventListener('click', () => {
    // Shopify predictive search injection point
    // Replace with your preferred search modal
    const query = prompt('Search FireBorn:');
    if (query && query.trim()) {
      window.location.href = `/search?q=${encodeURIComponent(query.trim())}`;
    }
  });
}


/* ════════════════════════════════════════════
   LOAD MORE — Products
═════════════════════════════════════════════ */
const loadMoreBtn = $('#loadMoreBtn');
const loadMoreProgress = $('#loadMoreProgress');

if (loadMoreBtn) {
  loadMoreBtn.addEventListener('click', () => {
    // Progress animation
    if (loadMoreProgress) {
      loadMoreProgress.style.width = '0%';
      loadMoreProgress.style.transition = 'none';
      requestAnimationFrame(() => {
        loadMoreProgress.style.transition = 'width 0.8s ease';
        loadMoreProgress.style.width = '100%';
      });
    }

    loadMoreBtn.textContent = 'Loading...';
    loadMoreBtn.disabled = true;

    // Simulate — replace with real pagination/AJAX
    setTimeout(() => {
      loadMoreBtn.textContent = 'Load More Pieces';
      loadMoreBtn.disabled = false;
      if (loadMoreProgress) loadMoreProgress.style.width = '0%';
    }, 1200);
  });
}


/* ════════════════════════════════════════════
   UTILITY — Smooth Anchor Scroll
═════════════════════════════════════════════ */
$$('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', (e) => {
    const target = $(anchor.getAttribute('href'));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});
