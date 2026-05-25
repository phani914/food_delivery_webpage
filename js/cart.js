// Lightweight cart system using localStorage
(function(){
  const STORAGE_KEY = 'tasty_cart_v1';

  const qs = (s, r=document) => r.querySelector(s);
  const qsa = (s, r=document) => Array.from(r.querySelectorAll(s));

  function loadCart(){
    try{ return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
    catch(e){ return []; }
  }

  function saveCart(cart){ localStorage.setItem(STORAGE_KEY, JSON.stringify(cart)); }

  function uidFromTitle(title){ return title.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,''); }

  function parsePrice(text){
    if(!text) return 0;
    const n = text.replace(/[^0-9.\-]/g,'');
    return Number(n) || 0;
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
    const checkoutWrap = document.createElement('div'); checkoutWrap.className = 'cart-actions'; checkoutWrap.innerHTML = '<a href="cart.html" class="button primary">View Cart / Checkout</a>';
    aside.appendChild(checkoutWrap);
  }

  /* Checkout wiring -------------------------------------------------- */
  function formatCurrency(n){ return `₹${n}`; }

  function populateCheckoutSummary(){
    const summaryEl = qs('#checkout-summary');
    if(!summaryEl) return;
    const cart = loadCart();
    summaryEl.innerHTML = '';
    const heading = document.createElement('h4'); heading.textContent = 'Order Summary'; heading.style.marginTop='0'; summaryEl.appendChild(heading);
    if(cart.length===0){
      const p = document.createElement('p'); p.textContent = 'Your cart is empty.'; p.style.color='var(--muted)'; summaryEl.appendChild(p); return;
    }
    const list = document.createElement('div'); list.className = 'checkout-list';
    cart.forEach(it=>{
      const row = document.createElement('div'); row.style.display='flex'; row.style.justifyContent='space-between'; row.style.gap='12px'; row.style.marginBottom='8px';
      const left = document.createElement('div'); left.style.display='flex'; left.style.gap='10px'; left.style.alignItems='center';
      if(it.image){ const im = document.createElement('img'); im.src=it.image; im.alt=it.title; im.style.width='44px'; im.style.height='34px'; im.style.objectFit='cover'; im.style.borderRadius='6px'; left.appendChild(im); }
      const t = document.createElement('div'); t.innerHTML = `<strong>${it.title}</strong><div style="color:var(--muted);font-size:13px">Qty: ${it.qty}</div>`; left.appendChild(t);
      const right = document.createElement('div'); right.innerHTML = `<strong>${formatCurrency(it.price * it.qty)}</strong>`;
      row.appendChild(left); row.appendChild(right); list.appendChild(row);
    });
    summaryEl.appendChild(list);
    const subtotal = getTotal(cart);
    const delivery = 49;
    const subRow = document.createElement('div'); subRow.style.display='flex'; subRow.style.justifyContent='space-between'; subRow.style.marginTop='8px'; subRow.innerHTML = `<div style="color:var(--muted)">Subtotal</div><div>${formatCurrency(subtotal)}</div>`;
    const delRow = document.createElement('div'); delRow.style.display='flex'; delRow.style.justifyContent='space-between'; delRow.innerHTML = `<div style="color:var(--muted)">Delivery</div><div>${formatCurrency(delivery)}</div>`;
    const totRow = document.createElement('div'); totRow.className='cart-total'; totRow.style.display='flex'; totRow.style.justifyContent='space-between'; totRow.style.marginTop='8px'; totRow.innerHTML = `<strong>Total</strong><strong>${formatCurrency(subtotal + delivery)}</strong>`;
    summaryEl.appendChild(subRow); summaryEl.appendChild(delRow); summaryEl.appendChild(totRow);
  }

  function clearCart(){ saveCart([]); updateCartCount(); renderCartPreview(); renderCartPage(); populateCheckoutSummary(); }

  function showOrderPreviewModal(orderPayload){
    // create simple modal
    const overlay = document.createElement('div'); overlay.className='modal-overlay'; overlay.style.position='fixed'; overlay.style.inset='0'; overlay.style.background='rgba(0,0,0,0.45)'; overlay.style.display='flex'; overlay.style.alignItems='center'; overlay.style.justifyContent='center'; overlay.style.zIndex='9999';
    const box = document.createElement('div'); box.className='modal-box'; box.style.background='var(--surface)'; box.style.padding='18px'; box.style.borderRadius='10px'; box.style.maxWidth='520px'; box.style.width='92%';
    const h = document.createElement('h3'); h.textContent = 'Confirm Order'; box.appendChild(h);
    const pre = document.createElement('pre'); pre.style.whiteSpace='pre-wrap'; pre.style.maxHeight='320px'; pre.style.overflow='auto'; pre.textContent = JSON.stringify(orderPayload, null, 2); box.appendChild(pre);
    const actions = document.createElement('div'); actions.style.display='flex'; actions.style.justifyContent='flex-end'; actions.style.gap='8px'; actions.style.marginTop='12px';
    const cancel = document.createElement('button'); cancel.className='button'; cancel.textContent='Cancel';
    const confirm = document.createElement('button'); confirm.className='button primary'; confirm.textContent='Confirm & Place Order';
    cancel.addEventListener('click', ()=> overlay.remove());
    confirm.addEventListener('click', ()=>{ overlay.remove(); clearCart(); alert('Order placed (client-side). Thank you!'); });
    actions.appendChild(cancel); actions.appendChild(confirm); box.appendChild(actions);
    overlay.appendChild(box); document.body.appendChild(overlay);
  }

  function wireCheckoutForm(){
    const placeBtn = qs('#place-order');
    if(!placeBtn) return;
    placeBtn.addEventListener('click', async ()=>{
      const cart = loadCart();
      if(cart.length===0){ alert('Your cart is empty. Add items before checkout.'); return; }
      const name = qs('#full-name')? qs('#full-name').value.trim() : '';
      const phone = qs('#phone')? qs('#phone').value.trim() : '';
      const address = qs('#address')? qs('#address').value.trim() : '';
      if(!name || !phone || !address){ if(!confirm('Some contact details are empty. Continue anyway?')) return; }
      const orderPayload = { customer: { name, phone, address }, items: cart, subtotal: getTotal(cart), delivery: 49, total: getTotal(cart)+49, placedAt: new Date().toISOString() };

      // try POST to server endpoint; fallback to preview modal
      try{
        const res = await fetch('/api/orders', { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify(orderPayload) });
        if(res.ok){ clearCart(); alert('Order submitted to server. Thank you!'); }
        else { showOrderPreviewModal(orderPayload); }
      }catch(e){ showOrderPreviewModal(orderPayload); }
    });
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
    const title = document.createElement('h1'); title.textContent = 'Your Cart'; root.appendChild(title);
    if(cart.length===0){
      const p = document.createElement('p'); p.textContent = 'Your cart is empty.'; root.appendChild(p); return;
    }
    const list = document.createElement('div'); list.className = 'cart-list';
    cart.forEach(item=>{
      const row = document.createElement('div'); row.className='cart-item'; row.style.alignItems='center';
      const left = document.createElement('div'); left.style.display='flex'; left.style.gap='12px'; left.style.alignItems='center';
      if(item.image){
        const img = document.createElement('img'); img.src = item.image; img.alt = item.title; img.style.width='84px'; img.style.height='64px'; img.style.objectFit='cover'; img.style.borderRadius='6px'; left.appendChild(img);
      }
      const meta = document.createElement('div');
      const name = document.createElement('strong'); name.textContent = item.title; meta.appendChild(name);
      const controls = document.createElement('div'); controls.style.marginTop='8px'; controls.style.display='flex'; controls.style.alignItems='center'; controls.style.gap='8px';
      const dec = document.createElement('button'); dec.textContent='-'; dec.className='button'; dec.style.minWidth='36px';
      const qty = document.createElement('span'); qty.textContent = item.qty; qty.style.margin='0 10px'; qty.style.fontWeight='800';
      const inc = document.createElement('button'); inc.textContent='+'; inc.className='button'; inc.style.minWidth='36px';
      const remove = document.createElement('button'); remove.textContent='Remove'; remove.className='button'; remove.style.marginLeft='12px';
      dec.addEventListener('click', ()=>{ changeQty(item.id, item.qty - 1); renderCartPage(); });
      inc.addEventListener('click', ()=>{ changeQty(item.id, item.qty + 1); renderCartPage(); });
      remove.addEventListener('click', ()=>{ removeFromCart(item.id); renderCartPage(); });
      controls.appendChild(dec); controls.appendChild(qty); controls.appendChild(inc); controls.appendChild(remove);
      meta.appendChild(controls);
      left.appendChild(meta);

      const right = document.createElement('div'); right.style.textAlign='right';
      const price = document.createElement('strong'); price.textContent = `₹${item.price * item.qty}`; right.appendChild(price);
      row.appendChild(left); row.appendChild(right);
      list.appendChild(row);
    });
    root.appendChild(list);
    const total = document.createElement('div'); total.className='cart-total'; total.style.marginTop='16px'; total.innerHTML = `<strong>Total</strong><strong>₹${getTotal(cart)}</strong>`;
    root.appendChild(total);
    const checkout = document.createElement('div'); checkout.style.marginTop='12px'; checkout.innerHTML = '<a href="#checkout" class="button primary">Proceed to Checkout</a>';
    root.appendChild(checkout);
  }

  document.addEventListener('DOMContentLoaded', ()=>{
    initMenuFilters();
    attachAddButtons();
    updateCartCount();
    renderCartPreview();
    renderCartPage();
  });

  // Expose for debugging
  window.TastyCart = { loadCart, saveCart, addToCart, removeFromCart, changeQty };
})();
