// Lightweight cart system using localStorage
(function(){
  const STORAGE_KEY = 'tasty_cart_v1';
  const USER_KEY = 'tasty_user_v1';
  const USERS_KEY = 'tasty_users_v1';
  const ORDERS_KEY = 'tasty_orders_v1';
  const PROMO_KEY = 'tasty_promo_v1';
  const PENDING_PROMO_KEY = 'tasty_pending_promo_v1';
  const SUBSCRIPTION_KEY = 'tasty_subscription_v1';

  const qs = (s, r=document) => r.querySelector(s);
  const qsa = (s, r=document) => Array.from(r.querySelectorAll(s));

  function loadCart(){
    try{ return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
    catch(e){ return []; }
  }

  function saveCart(cart){ localStorage.setItem(STORAGE_KEY, JSON.stringify(cart)); }

  function loadUser(){
    try{ return JSON.parse(localStorage.getItem(USER_KEY)) || null; }
    catch(e){ return null; }
  }

  function loadUsers(){
    try{ return JSON.parse(localStorage.getItem(USERS_KEY)) || []; }
    catch(e){ return []; }
  }

  function saveUsers(users){ localStorage.setItem(USERS_KEY, JSON.stringify(users)); }

  function loadOrders(){
    try{ return JSON.parse(localStorage.getItem(ORDERS_KEY)) || []; }
    catch(e){ return []; }
  }

  function saveOrders(orders){ localStorage.setItem(ORDERS_KEY, JSON.stringify(orders)); }

  function loadPromo(){
    try{ return JSON.parse(localStorage.getItem(PROMO_KEY)) || null; }
    catch(e){ return null; }
  }

  function loadPendingPromo(){
    try{ return JSON.parse(localStorage.getItem(PENDING_PROMO_KEY)) || null; }
    catch(e){ return null; }
  }

  function savePendingPromo(promo){ localStorage.setItem(PENDING_PROMO_KEY, JSON.stringify(promo)); }

  function clearPendingPromo(){ localStorage.removeItem(PENDING_PROMO_KEY); }

  function savePromo(promo){
    localStorage.setItem(PROMO_KEY, JSON.stringify(promo));
    renderCartPreview();
    renderCartPage();
    populateCheckoutSummary();
  }

  function loadSubscription(){
    try{ return JSON.parse(localStorage.getItem(SUBSCRIPTION_KEY)) || null; }
    catch(e){ return null; }
  }

  function saveSubscription(subscription){
    localStorage.setItem(SUBSCRIPTION_KEY, JSON.stringify(subscription));
    renderAccountStatus();
  }

  function saveUser(user){
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    updateAccountNav();
    renderAccountStatus();
  }

  function logoutUser(){
    localStorage.removeItem(USER_KEY);
    updateAccountNav();
    renderAccountStatus();
  }

  function isLoggedIn(){
    return Boolean(loadUser());
  }

  function isNewCustomer(){
    const user = loadUser();
    if(!user) return false;
    return !loadOrders().some(order=>order.customer?.email?.toLowerCase() === user.email.toLowerCase());
  }

  function uidFromTitle(title){ return title.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,''); }

  function parsePrice(text){
    if(!text) return 0;
    const n = text.replace(/[^0-9.\-]/g,'');
    return Number(n) || 0;
  }

  function escapeHtml(value){
    return String(value || '').replace(/[&<>"']/g, (char)=>({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[char]));
  }

  function updateCartCount(){
    const cart = loadCart();
    const count = cart.reduce((s,i)=>s + (i.qty||0), 0);
    let badge = document.getElementById('cart-count-badge');
    if(!badge){
      const link = Array.from(document.querySelectorAll('.nav-links a')).find(a=>/cart/i.test(a.textContent));
      if(link){
        badge = document.createElement('span');
        badge.id = 'cart-count-badge';
        badge.className = 'cart-badge';
        link.appendChild(badge);
      }
    }
    if(badge) badge.textContent = count>0? `(${count})` : '';
  }

  function addToCart(item){
    const cart = loadCart();
    const existing = cart.find(i=>i.id===item.id);
    if(existing){ existing.qty = Math.max(1, existing.qty + item.qty); }
    else cart.push(item);
    saveCart(cart);
    updateCartCount();
    renderCartPreview();
    requestAuthAfterCartAdd();
  }

  function removeFromCart(id){
    let cart = loadCart();
    cart = cart.filter(i=>i.id !== id);
    saveCart(cart);
    updateCartCount();
    renderCartPreview();
  }

  function changeQty(id, qty){
    const cart = loadCart();
    const it = cart.find(i=>i.id===id);
    if(!it) return;
    it.qty = Math.max(0, Math.floor(qty));
    const filtered = cart.filter(i=>i.qty>0);
    saveCart(filtered);
    updateCartCount();
    renderCartPreview();
  }

  function getTotal(cart){
    return cart.reduce((sum,it)=>sum + (it.price * it.qty), 0);
  }

  function getPromoDiscount(subtotal, delivery){
    const promo = loadPromo();
    if(!promo) return 0;
    if(subtotal < (promo.min || 0)) return 0;
    if(promo.type === 'percent') return Math.min(Math.round(subtotal * (promo.value / 100)), 150);
    if(promo.type === 'flat') return Math.min(promo.value, subtotal);
    if(promo.type === 'delivery') return delivery;
    return 0;
  }

  function closeAuthPrompt(){
    const existing = qs('#auth-required-modal');
    if(existing) existing.remove();
  }

  function requestAuthAfterCartAdd(){
    if(isLoggedIn() || qs('#auth-required-modal')) return;

    const overlay = document.createElement('div');
    overlay.id = 'auth-required-modal';
    overlay.className = 'modal-overlay auth-modal-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'auth-required-title');

    const box = document.createElement('div');
    box.className = 'modal-box auth-modal-box';
    box.innerHTML = `
      <button class="auth-modal-close" type="button" aria-label="Close login prompt">&times;</button>
      <span class="eyebrow">Account required</span>
      <h3 id="auth-required-title">Login or register to continue.</h3>
      <p>Your item has been added to the cart. Please login or create an account before checkout.</p>
      <div class="auth-modal-actions">
        <a class="button primary" href="account.html?mode=login&next=checkout">Login</a>
        <a class="button ghost" href="account.html?mode=register&next=checkout">Register</a>
      </div>
    `;

    overlay.addEventListener('click', (event)=>{
      if(event.target === overlay) closeAuthPrompt();
    });
    box.querySelector('.auth-modal-close').addEventListener('click', closeAuthPrompt);
    document.addEventListener('keydown', function closeOnEscape(event){
      if(event.key !== 'Escape') return;
      closeAuthPrompt();
      document.removeEventListener('keydown', closeOnEscape);
    });

    overlay.appendChild(box);
    document.body.appendChild(overlay);
    box.querySelector('.button').focus();
  }

  function showCheckoutLoginPrompt(){
    if(qs('#auth-required-modal')) return;

    const overlay = document.createElement('div');
    overlay.id = 'auth-required-modal';
    overlay.className = 'modal-overlay auth-modal-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'checkout-auth-title');

    const box = document.createElement('div');
    box.className = 'modal-box auth-modal-box';
    box.innerHTML = `
      <button class="auth-modal-close" type="button" aria-label="Close login prompt">&times;</button>
      <span class="eyebrow">Checkout login</span>
      <h3 id="checkout-auth-title">Please login before placing your order.</h3>
      <p>Your cart is ready. Sign in or register so we can attach this order to your account.</p>
      <div class="auth-modal-actions">
        <a class="button primary" href="account.html?mode=login&next=checkout">Login</a>
        <a class="button ghost" href="account.html?mode=register&next=checkout">Register</a>
      </div>
    `;
    overlay.addEventListener('click', (event)=>{
      if(event.target === overlay) closeAuthPrompt();
    });
    box.querySelector('.auth-modal-close').addEventListener('click', closeAuthPrompt);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    box.querySelector('.button').focus();
  }

  function showOfferLoginPrompt(promo){
    if(qs('#auth-required-modal')) return;
    savePendingPromo(promo);

    function closePendingOfferPrompt(){
      clearPendingPromo();
      closeAuthPrompt();
    }

    const overlay = document.createElement('div');
    overlay.id = 'auth-required-modal';
    overlay.className = 'modal-overlay auth-modal-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'offer-auth-title');

    const box = document.createElement('div');
    box.className = 'modal-box auth-modal-box';
    box.innerHTML = `
      <button class="auth-modal-close" type="button" aria-label="Close login prompt">&times;</button>
      <span class="eyebrow">New customer offer</span>
      <h3 id="offer-auth-title">Login or register to unlock this offer.</h3>
      <p>WELCOME20 is only available for new customers, so we need your account details before applying it.</p>
      <div class="auth-modal-actions">
        <a class="button primary" href="account.html?mode=login&next=offers">Login</a>
        <a class="button ghost" href="account.html?mode=register&next=offers">Register</a>
      </div>
    `;

    overlay.addEventListener('click', (event)=>{
      if(event.target === overlay) closePendingOfferPrompt();
    });
    box.querySelector('.auth-modal-close').addEventListener('click', closePendingOfferPrompt);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    box.querySelector('.button').focus();
  }

  function updateAccountNav(){
    const accountLink = qs('.nav-account');
    if(!accountLink) return;
    const user = loadUser();
    accountLink.textContent = user ? `Hi, ${user.name || 'Foodie'}` : 'Login / Register';
    accountLink.href = 'account.html';
  }

  function getAccountRedirect(){
    const next = new URLSearchParams(window.location.search).get('next');
    if(next === 'offers') return 'index.html#offers';
    return next === 'checkout' ? 'checkout.html' : 'cart.html';
  }

  function renderAccountStatus(){
    const accountSection = qs('.account-section');
    if(!accountSection) return;

    let status = qs('#account-status');
    const user = loadUser();
    const orders = user ? loadOrders().filter(order=>order.customer.email === user.email) : [];
    const subscription = loadSubscription();

    if(!status){
      status = document.createElement('div');
      status.id = 'account-status';
      status.className = 'account-status';
      accountSection.insertBefore(status, accountSection.firstElementChild);
    }

    if(!user){
      status.innerHTML = `
        <strong>Not logged in</strong>
        <span>Login or register below to continue checkout and save your orders.</span>
      `;
      return;
    }

    const latestOrder = orders[0];
    status.innerHTML = `
      <div>
        <span class="eyebrow">Signed in</span>
        <strong>${escapeHtml(user.name)}</strong>
        <span>${escapeHtml(user.email)}${user.phone ? ` | ${escapeHtml(user.phone)}` : ''}</span>
        ${subscription ? `<span>Monthly pack: ${escapeHtml(subscription.plan)} - ${formatCurrency(subscription.price)}/month</span>` : '<span>No monthly pack selected.</span>'}
        ${latestOrder ? `<span>Last order: ${latestOrder.id} - ${formatCurrency(latestOrder.total)}</span>` : '<span>No orders placed yet.</span>'}
      </div>
      <button class="button ghost" type="button" id="logout-button">Logout</button>
    `;

    qs('#logout-button', status).addEventListener('click', logoutUser);
  }

  function wireAccountForms(){
    const loginCard = qs('.account-card--login');
    const registerCard = qs('.account-card--register');

    if(loginCard){
      const loginForm = loginCard.querySelector('form');
      const loginButton = loginCard.querySelector('.button');
      const loginHandler = (event)=>{
          if(event) event.preventDefault();
          const email = qs('#login-email')?.value.trim();
          const password = qs('#login-password')?.value;
          if(!email || !password){ alert('Please enter your email and password to login.'); return; }
          const existing = loadUsers().find(user=>user.email.toLowerCase() === email.toLowerCase());
          if(!existing){ alert('No account found with this email. Please register first.'); return; }
          if(existing.password !== password){ alert('Incorrect password. Please try again.'); return; }
          saveUser({ name: existing.name, email: existing.email, phone: existing.phone, loggedInAt: new Date().toISOString() });
          alert('Login successful. You can continue your order.');
          window.location.href = getAccountRedirect();
        };
      if(loginForm) loginForm.addEventListener('submit', loginHandler);
      if(loginButton) loginButton.type = 'submit';
    }

    if(registerCard){
      const registerForm = registerCard.querySelector('form');
      const registerButton = registerCard.querySelector('.button');
      const registerHandler = (event)=>{
          if(event) event.preventDefault();
          const name = qs('#register-name')?.value.trim();
          const email = qs('#register-email')?.value.trim();
          const phone = qs('#register-phone')?.value.trim();
          const password = qs('#register-password')?.value;
          const terms = qs('.account-card--register input[name="terms"]')?.checked;
          if(!name || !email || !password){ alert('Please enter your name, email, and password to register.'); return; }
          if(password.length < 6){ alert('Password must be at least 6 characters.'); return; }
          if(!terms){ alert('Please agree to the Terms of Service and Privacy Policy.'); return; }
          const users = loadUsers();
          if(users.some(user=>user.email.toLowerCase() === email.toLowerCase())){ alert('An account already exists with this email. Please login.'); return; }
          const newUser = { name, email, phone, password, registeredAt: new Date().toISOString() };
          users.push(newUser);
          saveUsers(users);
          saveUser({ name, email, phone, registeredAt: newUser.registeredAt });
          alert('Registration successful. You can continue your order.');
          window.location.href = getAccountRedirect();
        };
      if(registerForm) registerForm.addEventListener('submit', registerHandler);
      if(registerButton) registerButton.type = 'submit';
    }

    const mode = new URLSearchParams(window.location.search).get('mode');
    const target = mode === 'register' ? registerCard : mode === 'login' ? loginCard : null;
    if(target){
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      target.classList.add('account-card-highlight');
      const input = target.querySelector('input');
      if(input) setTimeout(()=> input.focus(), 350);
    }

    renderAccountStatus();
  }

  function renderCartPreview(){
    const aside = qs('.cart-box');
    if(!aside) return;
    const cart = loadCart();
    aside.innerHTML = '';
    const h3 = document.createElement('h3'); h3.textContent = 'Your Cart'; aside.appendChild(h3);

    if(cart.length===0){
      const emptyState = document.createElement('div');
      emptyState.className = 'cart-empty-state';
      emptyState.innerHTML = `
        <div class="cart-empty-icon" aria-hidden="true">+</div>
        <strong>Your cart is empty</strong>
        <span>Add dishes from the menu and they will appear here.</span>
        <a href="#menu" class="button primary">Browse Menu</a>
      `;
      aside.appendChild(emptyState);

      const totalRow = document.createElement('div');
      totalRow.className='cart-total cart-total-compact';
      totalRow.innerHTML = '<span>Total</span><strong>₹0</strong>';
      aside.appendChild(totalRow);
      return;
    }

    cart.forEach(item=>{
      const row = document.createElement('div'); row.className='cart-item';
      const left = document.createElement('div'); left.className = 'cart-item-info';
      if(item.image){
        const img = document.createElement('img'); img.src = item.image; img.alt = item.title; img.className = 'cart-item-thumb'; left.appendChild(img);
      }
      const meta = document.createElement('div'); meta.className = 'cart-item-meta';
      const title = document.createElement('strong'); title.textContent = item.title; meta.appendChild(title);
      const qty = document.createElement('span'); qty.textContent = `Quantity: ${item.qty}`; meta.appendChild(qty);
      left.appendChild(meta);

      const right = document.createElement('div'); right.className = 'cart-item-price';
      const price = document.createElement('strong'); price.textContent = `₹${item.price * item.qty}`; right.appendChild(price);
      row.appendChild(left);
      row.appendChild(right);
      aside.appendChild(row);
    });

    const totalRow = document.createElement('div'); totalRow.className='cart-total';
    const totalLabel = document.createElement('strong'); totalLabel.textContent = 'Total';
    const totalValue = document.createElement('strong'); totalValue.textContent = `₹${getTotal(cart)}`;
    totalRow.appendChild(totalLabel); totalRow.appendChild(totalValue);
    aside.appendChild(totalRow);
    const checkoutWrap = document.createElement('div'); checkoutWrap.className = 'cart-actions'; checkoutWrap.innerHTML = '<a href="cart.html" class="button primary">View Cart</a>';
    aside.appendChild(checkoutWrap);
  }

  /* Checkout wiring -------------------------------------------------- */
  function formatCurrency(n){ return `₹${n}`; }

  function populateCheckoutSummary(){
    const summaryEl = qs('#checkout-summary');
    if(!summaryEl) return;
    const cart = loadCart();
    summaryEl.innerHTML = '';
    const heading = document.createElement('div');
    heading.className = 'summary-heading';
    heading.innerHTML = '<span class="eyebrow">Order summary</span><h3>Your bag</h3>';
    summaryEl.appendChild(heading);
    if(cart.length===0){
      const empty = document.createElement('div');
      empty.className = 'cart-empty-state';
      empty.innerHTML = `
        <div class="cart-empty-icon" aria-hidden="true">+</div>
        <strong>Your cart is empty</strong>
        <span>Add a few favorites before placing an order.</span>
        <a href="index.html#menu" class="button primary">Browse Menu</a>
      `;
      summaryEl.appendChild(empty);
      return;
    }
    const list = document.createElement('div'); list.className = 'checkout-list';
    cart.forEach(it=>{
      const row = document.createElement('div'); row.className = 'checkout-summary-item';
      const left = document.createElement('div'); left.className = 'checkout-summary-info';
      if(it.image){ const im = document.createElement('img'); im.src=it.image; im.alt=it.title; left.appendChild(im); }
      const t = document.createElement('div'); t.innerHTML = `<strong>${it.title}</strong><span>Qty: ${it.qty}</span>`; left.appendChild(t);
      const right = document.createElement('strong'); right.textContent = formatCurrency(it.price * it.qty);
      row.appendChild(left); row.appendChild(right); list.appendChild(row);
    });
    summaryEl.appendChild(list);
    const subtotal = getTotal(cart);
    const delivery = 49;
    const discount = getPromoDiscount(subtotal, delivery);
    const promo = loadPromo();
    const subRow = document.createElement('div'); subRow.className = 'summary-line'; subRow.innerHTML = `<span>Subtotal</span><strong>${formatCurrency(subtotal)}</strong>`;
    const delRow = document.createElement('div'); delRow.className = 'summary-line'; delRow.innerHTML = `<span>Delivery</span><strong>${formatCurrency(delivery)}</strong>`;
    summaryEl.appendChild(subRow); summaryEl.appendChild(delRow);
    if(promo){
      const discountRow = document.createElement('div');
      discountRow.className = 'summary-line promo-summary-line';
      discountRow.innerHTML = `<span>Promo ${escapeHtml(promo.code)}</span><strong>-${formatCurrency(discount)}</strong>`;
      summaryEl.appendChild(discountRow);
    }
    const totRow = document.createElement('div'); totRow.className='summary-total'; totRow.innerHTML = `<strong>Total</strong><strong>${formatCurrency(Math.max(0, subtotal + delivery - discount))}</strong>`;
    summaryEl.appendChild(totRow);
  }

  function clearCart(){ saveCart([]); updateCartCount(); renderCartPreview(); renderCartPage(); populateCheckoutSummary(); }

  function showOrderConfirmationModal(orderPayload){
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay auth-modal-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');

    const box = document.createElement('div');
    box.className = 'modal-box order-success-modal';
    box.innerHTML = `
      <span class="eyebrow">Order placed</span>
      <h3>Thanks, ${escapeHtml(orderPayload.customer.name)}.</h3>
      <p>Your order ${escapeHtml(orderPayload.id)} has been saved. Delivery preference: ${escapeHtml(orderPayload.delivery.time)}.</p>
      <div class="summary-line"><span>Total paid on delivery</span><strong>${formatCurrency(orderPayload.total)}</strong></div>
      <a class="button primary" href="index.html#menu">Order More Food</a>
    `;

    overlay.appendChild(box);
    document.body.appendChild(overlay);
  }

  function prefillCheckoutForm(){
    const form = qs('.checkout-form');
    const user = loadUser();
    if(!form || !user) return;
    if(qs('#full-name') && !qs('#full-name').value) qs('#full-name').value = user.name || '';
    if(qs('#phone') && !qs('#phone').value) qs('#phone').value = user.phone || '';
  }

  function wireCheckoutForm(){
    const placeBtn = qs('#place-order');
    if(!placeBtn) return;
    const form = placeBtn.closest('form');
    const submitOrder = async (event)=>{
      if(event) event.preventDefault();
      if(!isLoggedIn()){ showCheckoutLoginPrompt(); return; }
      if(form && !form.reportValidity()) return;
      const cart = loadCart();
      if(cart.length===0){ alert('Your cart is empty. Add items before checkout.'); return; }
      const user = loadUser();
      const name = qs('#full-name')? qs('#full-name').value.trim() : '';
      const phone = qs('#phone')? qs('#phone').value.trim() : '';
      const address = qs('#address')? qs('#address').value.trim() : '';
      const payment = qs('#payment')? qs('#payment').value : '';
      const time = qs('#time')? qs('#time').value : '';
      const notes = qs('#notes')? qs('#notes').value.trim() : '';
      if(!name || !phone || !address){ if(!confirm('Some contact details are empty. Continue anyway?')) return; }
      const subtotal = getTotal(cart);
      const deliveryFee = 49;
      const promo = loadPromo();
      const discount = getPromoDiscount(subtotal, deliveryFee);
      const orderPayload = { id: `TT-${Date.now().toString().slice(-6)}`, customer: { name, email: user.email, phone, address }, delivery: { time, notes }, payment, items: cart, promo, discount, subtotal, deliveryFee, total: Math.max(0, subtotal + deliveryFee - discount), placedAt: new Date().toISOString() };
      const orders = loadOrders();
      orders.unshift(orderPayload);
      saveOrders(orders);
      localStorage.removeItem(PROMO_KEY);
      clearCart();
      showOrderConfirmationModal(orderPayload);
    };

    if(form) form.addEventListener('submit', submitOrder);
    else placeBtn.addEventListener('click', submitOrder);
  }


  function attachAddButtons(){
    const cards = qsa('.menu-card');
    cards.forEach(card=>{
      if(card.querySelector('.add-to-cart')) return; // already added
      const titleEl = card.querySelector('.card-body h3');
      const priceEl = card.querySelector('.price');
      const imgEl = card.querySelector('img');
      if(!titleEl || !priceEl) return;
      const title = titleEl.textContent.trim();
      const price = parsePrice(priceEl.textContent.trim());
      const body = card.querySelector('.card-body');

      const controls = document.createElement('div'); controls.style.display='flex'; controls.style.gap='8px'; controls.style.alignItems='center';
      const qtyInput = document.createElement('input'); qtyInput.type='number'; qtyInput.min='1'; qtyInput.value='1'; qtyInput.className='qty-input'; qtyInput.style.width='68px';
      const btn = document.createElement('button');
      btn.className = 'button add-to-cart';
      btn.textContent = 'Add to cart';
      btn.addEventListener('click', ()=>{
        const qty = Math.max(1, Math.floor(Number(qtyInput.value) || 1));
        addToCart({ id: uidFromTitle(title), title, price, qty, image: imgEl? imgEl.src: null });
        btn.textContent = 'Added ✓';
        setTimeout(()=> btn.textContent = 'Add to cart', 900);
      });
      controls.appendChild(qtyInput); controls.appendChild(btn);
      body.appendChild(controls);
    });
  }

  function attachPromoButtons(){
    function promoFromCard(card){
      return {
        code: card.dataset.code,
        type: card.dataset.type,
        value: Number(card.dataset.value) || 0,
        min: Number(card.dataset.min) || 0,
        newCustomerOnly: card.dataset.newCustomer === 'true',
        appliedAt: new Date().toISOString()
      };
    }

    function applyPromo(promo, button){
      if(promo.newCustomerOnly && !isNewCustomer()){
        alert('This offer is only for new customers placing their first order.');
        return false;
      }
      savePromo(promo);
      qsa('.apply-promo').forEach(item=>item.textContent = isLoggedIn() ? 'Apply Offer' : 'Login to Apply Offer');
      if(button) button.textContent = 'Offer Applied';
      alert(`${promo.code} applied to your cart.`);
      return true;
    }

    qsa('.apply-promo').forEach(button=>{
      button.textContent = isLoggedIn() ? 'Apply Offer' : 'Login to Apply Offer';
      button.addEventListener('click', ()=>{
        const card = button.closest('.promo-card');
        if(!card) return;
        const promo = promoFromCard(card);
        if(!isLoggedIn()){
          showOfferLoginPrompt(promo);
          return;
        }
        applyPromo(promo, button);
      });
    });

    const pendingPromo = loadPendingPromo();
    if(pendingPromo && isLoggedIn()){
      const matchingButton = qs(`.promo-card[data-code="${pendingPromo.code}"] .apply-promo`);
      const applied = applyPromo({ ...pendingPromo, appliedAt: new Date().toISOString() }, matchingButton);
      clearPendingPromo();
      if(!applied && matchingButton) matchingButton.textContent = 'Apply Offer';
    }
  }

  function attachSubscriptionButtons(){
    qsa('.choose-plan').forEach(button=>{
      button.addEventListener('click', ()=>{
        if(!isLoggedIn()){
          window.location.href = 'account.html?mode=login&next=cart';
          return;
        }
        const card = button.closest('.subscription-card');
        if(!card) return;
        const subscription = {
          plan: card.dataset.plan,
          price: Number(card.dataset.price) || 0,
          selectedAt: new Date().toISOString()
        };
        saveSubscription(subscription);
        qsa('.choose-plan').forEach(item=>item.textContent = 'Choose Pack');
        button.textContent = 'Pack Selected';
        alert(`${subscription.plan} monthly pack selected.`);
      });
    });
  }

  function initMenuFilters(){
    const cards = qsa('.menu-card');
    const buttons = qsa('.filter-button');
    const search = qs('#menu-search');
    const empty = qs('.menu-empty');
    if(cards.length===0 || buttons.length===0) return;

    let activeCategory = 'all';

    function searchableText(card){
      return [
        card.dataset.keywords || '',
        card.querySelector('h3')?.textContent || '',
        card.querySelector('p')?.textContent || '',
        card.querySelector('.tag')?.textContent || ''
      ].join(' ').toLowerCase();
    }

    function applyFilters(){
      const query = search ? search.value.trim().toLowerCase() : '';
      let visibleCount = 0;

      cards.forEach(card=>{
        const matchesCategory = activeCategory === 'all' || card.dataset.category === activeCategory;
        const matchesSearch = !query || searchableText(card).includes(query);
        const shouldShow = matchesCategory && matchesSearch;
        card.classList.toggle('is-hidden', !shouldShow);
        if(shouldShow) visibleCount += 1;
      });

      if(empty) empty.hidden = visibleCount !== 0;
    }

    buttons.forEach(button=>{
      button.addEventListener('click', ()=>{
        activeCategory = button.dataset.filter || 'all';
        buttons.forEach(item=>{
          const isActive = item === button;
          item.classList.toggle('active', isActive);
          item.setAttribute('aria-pressed', String(isActive));
        });
        applyFilters();
      });
    });

    if(search) search.addEventListener('input', applyFilters);

    applyFilters();
  }

  // Cart page renderer
  function renderCartPage(){
    const root = qs('#cart-root');
    if(!root) return;
    const cart = loadCart();
    root.innerHTML = '';
    const shell = document.createElement('div');
    shell.className = 'cart-page-layout row g-4 align-items-start';

    if(cart.length===0){
      const empty = document.createElement('div');
      empty.className = 'cart-page-empty';
      empty.innerHTML = `
        <div class="cart-empty-icon" aria-hidden="true">+</div>
        <h2>Your cart is waiting.</h2>
        <p>Add dishes from the menu and come back here to review your order.</p>
        <a href="index.html#menu" class="button primary">Browse Menu</a>
      `;
      root.appendChild(empty);
      return;
    }

    const listPanel = document.createElement('section');
    listPanel.className = 'cart-list-panel h-100';
    listPanel.innerHTML = '<div class="panel-heading"><span class="eyebrow">Cart items</span><h2>Your selected dishes</h2></div>';

    const list = document.createElement('div'); list.className = 'cart-page-list';
    cart.forEach(item=>{
      const row = document.createElement('article'); row.className='cart-page-item';
      const left = document.createElement('div'); left.className = 'cart-page-item-main';
      if(item.image){
        const img = document.createElement('img'); img.src = item.image; img.alt = item.title; left.appendChild(img);
      }
      const meta = document.createElement('div'); meta.className = 'cart-page-item-meta';
      const name = document.createElement('strong'); name.textContent = item.title; meta.appendChild(name);
      const unit = document.createElement('span'); unit.textContent = `${formatCurrency(item.price)} each`; meta.appendChild(unit);
      const controls = document.createElement('div'); controls.className = 'quantity-controls';
      const dec = document.createElement('button'); dec.textContent='-'; dec.className='quantity-button'; dec.type = 'button'; dec.setAttribute('aria-label', `Decrease ${item.title}`);
      const qty = document.createElement('span'); qty.textContent = item.qty; qty.className = 'quantity-value';
      const inc = document.createElement('button'); inc.textContent='+'; inc.className='quantity-button'; inc.type = 'button'; inc.setAttribute('aria-label', `Increase ${item.title}`);
      const remove = document.createElement('button'); remove.textContent='Remove'; remove.className='button ghost remove-button'; remove.type = 'button';
      dec.addEventListener('click', ()=>{ changeQty(item.id, item.qty - 1); renderCartPage(); });
      inc.addEventListener('click', ()=>{ changeQty(item.id, item.qty + 1); renderCartPage(); });
      remove.addEventListener('click', ()=>{ removeFromCart(item.id); renderCartPage(); });
      controls.appendChild(dec); controls.appendChild(qty); controls.appendChild(inc); controls.appendChild(remove);
      meta.appendChild(controls);
      left.appendChild(meta);

      const right = document.createElement('div'); right.className = 'cart-page-item-price';
      const price = document.createElement('strong'); price.textContent = `₹${item.price * item.qty}`; right.appendChild(price);
      const label = document.createElement('span'); label.textContent = 'Item total'; right.appendChild(label);
      row.appendChild(left); row.appendChild(right);
      list.appendChild(row);
    });
    listPanel.appendChild(list);

    const subtotal = getTotal(cart);
    const delivery = 49;
    const discount = getPromoDiscount(subtotal, delivery);
    const promo = loadPromo();
    const summary = document.createElement('aside');
    summary.className = 'cart-order-summary';
    summary.innerHTML = `
      <div class="summary-heading">
        <span class="eyebrow">Payment</span>
        <h3>Order Summary</h3>
      </div>
      <div class="summary-line"><span>Subtotal</span><strong>${formatCurrency(subtotal)}</strong></div>
      <div class="summary-line"><span>Delivery</span><strong>${formatCurrency(delivery)}</strong></div>
      ${promo ? `<div class="summary-line promo-summary-line"><span>Promo ${escapeHtml(promo.code)}</span><strong>-${formatCurrency(discount)}</strong></div>` : ''}
      <div class="summary-total"><strong>Total</strong><strong>${formatCurrency(Math.max(0, subtotal + delivery - discount))}</strong></div>
      <a href="checkout.html" class="button primary">Proceed to Checkout</a>
      <a href="index.html#menu" class="button ghost">Add More Items</a>
    `;

    const listCol = document.createElement('div');
    listCol.className = 'col-12 col-lg-8';
    listCol.appendChild(listPanel);

    const summaryCol = document.createElement('div');
    summaryCol.className = 'col-12 col-lg-4';
    summaryCol.appendChild(summary);

    shell.appendChild(listCol);
    shell.appendChild(summaryCol);
    root.appendChild(shell);
  }

  document.addEventListener('DOMContentLoaded', ()=>{
    initMenuFilters();
    attachAddButtons();
    attachPromoButtons();
    attachSubscriptionButtons();
    updateCartCount();
    updateAccountNav();
    prefillCheckoutForm();
    renderCartPreview();
    renderCartPage();
    populateCheckoutSummary();
    wireCheckoutForm();
    wireAccountForms();
  });

  // Expose for debugging
  window.TastyCart = { loadCart, saveCart, addToCart, removeFromCart, changeQty, loadUser, saveUser, logoutUser, loadOrders, loadPromo, savePromo, loadSubscription };
})();
