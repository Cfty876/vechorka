'use strict';
const main = document.querySelector('#main');
const dialog = document.querySelector('#dialog');
const icons = (name) => `<svg aria-hidden="true"><use href="#${name}"/></svg>`;
const escapeHTML = (value) => String(value).replace(/[&<>"']/g, (c) =>
  ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
const categories = ['Все', 'Хлеб', 'Слойки', 'Сладкое', 'Другое'];
const photos = {Хлеб:'baguette', Слойки:'croissant', Сладкое:'bun', Другое:'hero'};
const shops = [
  {id:'lenina', name:'Пекарня на Ленина', address:'Екатеринбург, проспект Ленина, 50', x:25, y:69},
  {id:'testo', name:'Тёплое тесто', address:'Екатеринбург, ул. Малышева, 51', x:68, y:66},
  {id:'zerno', name:'Зерно и соль', address:'Екатеринбург, ул. 8 Марта, 46', x:49, y:30},
  {id:'utro', name:'Кафе «Утро»', address:'Екатеринбург, ул. Вайнера, 10', x:81, y:28}
];
const key = 'vecherka-beta-v1';
const money = (value) => `${value.toLocaleString('ru-RU')} ₽`;
const uuid = () => crypto.randomUUID ? crypto.randomUUID() : Array.from(crypto.getRandomValues(new Uint32Array(4)), n => n.toString(16)).join('-');
function seed() {
  const start = Date.now();
  return {
    cityVersion:1, owner:null, products:[{id:'bag', name:'Французский багет', category:'Хлеб', price:100}],
    orders:[],
    lots:[
      ['a','lenina','Французский багет','Хлеб','baguette',100,60,5,60],
      ['b','testo','Миндальный круассан','Слойки','croissant',220,50,4,80],
      ['c','zerno','Хлеб на закваске','Хлеб','sourdough',240,50,3,100],
      ['d','utro','Булочка с корицей','Сладкое','bun',150,40,6,90]
    ].map(([id,shopId,name,category,photo,price,discount,qty,mins]) => ({
      id,shopId,name,category,photo,price,discount,qty,until:start+mins*60000
    }))
  };
}
function read() {
  const saved = localStorage.getItem(key);
  if (saved) {
    const data = JSON.parse(saved);
    if (!data.cityVersion) {
      for (const order of data.orders) {
        const shop = shops.find(item => item.id === order.shopId);
        if (shop) order.address = shop.address;
      }
      data.cityVersion = 1;
      save(data);
    }
    return data;
  }
  const initial = seed();
  save(initial);
  return initial;
}
function save(next) { localStorage.setItem(key, JSON.stringify(next)); }
let state = read();
let category = 'Все';
let query = '';
let maxPrice = 0;
let sortBy = 'featured';
let marker = '';
let toastTimer;
let currentDialog;
const routes = ['launch','welcome','catalog','map','favorites','cart','orders','profile','account','settings','notifications','help','partner'];
function page() {
  const route = location.hash.slice(1);
  if (routes.includes(route)) return route;
  return localStorage.getItem('vecherka-welcome-seen') ? 'catalog' : 'launch';
}
const shopFor = (id) => id === 'owner' ? state.owner : shops.find(s => s.id === id);
const unit = (lot) => Math.max(1, Math.round(lot.price * (100-lot.discount)/100));
const activeOrder = (order) => !order.status && order.until > Date.now();
const remaining = (lot) => lot.qty - state.orders
  .filter(o => o.lotId === lot.id && (activeOrder(o) || o.status === 'picked'))
  .reduce((sum,o) => sum + o.qty, 0);
const visible = (lot) => lot.until > Date.now() && remaining(lot) > 0;
const timer = (until) => {
  const seconds = Math.max(0, Math.ceil((until-Date.now())/1000));
  const min = Math.floor(seconds/60);
  return min >= 60 ? `${Math.floor(min/60)} ч ${min%60} мин` : `${min}:${String(seconds%60).padStart(2,'0')}`;
};
function toast(message) {
  const node = document.querySelector('#toast');
  node.textContent = message;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => node.textContent = '', 3200);
}
function header() {
  document.querySelectorAll('[data-nav]').forEach(a => {
    const selected = a.dataset.nav === page() || (a.dataset.nav === 'profile' && ['account','settings','notifications','help','partner'].includes(page()));
    a.classList.toggle('active', selected);
    if (selected) a.setAttribute('aria-current','page');
    else a.removeAttribute('aria-current');
  });
  const count = document.querySelector('#count');
  const total = state.orders.filter(activeOrder).length;
  count.hidden = !total;
  count.textContent = total;
  customerHeader();
}
function card(lot) {
  const shop = shopFor(lot.shopId);
  return `<article class="card">
  <button type="button" class="photo" data-action="reserve" data-id="${lot.id}" aria-label="${escapeHTML(lot.name)} — ${money(unit(lot))}"><img src="${lot.photo}.jpg" alt=""><span class="discount">−${lot.discount}%</span><span class="photo-price">${money(unit(lot))}</span></button>
  ${favoriteButton(lot)}<div class="card-body"><div class="shopline">${icons('shop')}${escapeHTML(shop.name)}</div>
  <h3>${escapeHTML(lot.name)}</h3><div class="meta"><span class="stock">В наличии ${remaining(lot)} шт.</span>
  <span>${icons('clock')}<span data-lot-time="${lot.id}">${timer(lot.until)}</span></span></div>
  <div class="price">${money(unit(lot))} <del>${money(lot.price)}</del></div>
  <button class="btn" data-action="reserve" data-id="${lot.id}">Забронировать</button></div></article>`;
}
const empty = (title, detail, link='') => `<div class="empty"><strong>${title}</strong><p>${detail}</p>${link}</div>`;
const title = (name, detail) => `<div class="page-head"><h1>${name}</h1><p>${detail}</p></div>`;
const mapDrawing = () => `<svg viewBox="0 0 640 420" preserveAspectRatio="none" aria-hidden="true">
    <defs><pattern id="blocks" width="64" height="49" patternUnits="userSpaceOnUse" patternTransform="rotate(-14)"><rect width="64" height="49" fill="#e3e4e2"/><rect x="4" y="4" width="54" height="39" rx="5" fill="#d6d8d5"/><path d="M0 0H64M0 0V49" stroke="#fcfcfc" stroke-width="6"/></pattern></defs>
    <rect width="640" height="420" fill="url(#blocks)"/><path d="M-24 131Q108 205 203 157T359 55 553 40L701 100" stroke="#8ec8e1" stroke-width="40"/>
    <path d="M-40 315Q153 304 264 243T671 208M214-25q-16 120 34 193t59 300M500-20q-79 163-20 460" stroke="#fff" stroke-width="13"/>
    <path d="M0 374Q155 403 281 337T631 312" stroke="#a0cb93" stroke-width="42"/>
  </svg>`;
const categoryIcons = ['grid','bread','pastry','cake','shop'];
function catalog() {
  main.innerHTML = `<section class="catalog-top">
    <div class="catalog-tools"><label class="search-box">
    <input class="search" type="search" aria-label="Поиск выпечки" placeholder="Поиск выпечки" value="${escapeHTML(query)}"><span>${icons('search')}</span></label>
    <button type="button" class="quick filter-open" data-customer-action="filters" aria-label="Фильтры">${icons('filter')}${maxPrice || sortBy !== 'featured' ? '<i></i>' : ''}</button>
    <a class="quick" href="#cart" aria-label="Открыть корзину">${icons('cart')}</a>
    <a class="quick" href="#notifications" aria-label="Открыть уведомления">${icons('bell')}</a>
    <a class="quick" href="#profile" aria-label="Открыть профиль">${icons('person')}</a></div>
    <h1>Вечёрка</h1>
    <p>Вечерние скидки в пекарнях Екатеринбурга</p>
  </section>
  <div class="catalog-body">
    <div class="chips" aria-label="Категории">${categories.map((c,i) => `<button class="chip${category===c?' active':''}" data-action="category" data-id="${c}" aria-pressed="${category===c}"><span>${icons(categoryIcons[i])}</span>${c}</button>`).join('')}</div>
    <section class="section" aria-labelledby="offers-heading"><div class="section-head"><h2 id="offers-heading">Сегодня на витрине</h2>
      <a href="#map" class="section-link">На карте ${icons('arrow')}</a></div><div id="offers"></div></section>
    <a class="promo" href="#map"><div><span>Заберите выпечку<br>с вечерней скидкой</span><strong>До −60%</strong></div><img src="hero.jpg" alt=""></a>
    <div id="recommendations"></div>
  </div>`;
  offers();
}
function offers() {
  const needle = query.trim().toLocaleLowerCase('ru');
  const lots = state.lots.filter(l => visible(l) && (category === 'Все' || l.category === category)
    && (!maxPrice || unit(l) <= maxPrice)
    && `${l.name} ${shopFor(l.shopId).name}`.toLocaleLowerCase('ru').includes(needle));
  if (sortBy === 'price') lots.sort((a,b) => unit(a) - unit(b));
  if (sortBy === 'discount') lots.sort((a,b) => b.discount - a.discount);
  document.querySelector('#offers').innerHTML = lots.length ? `<div class="grid">${lots.map(card).join('')}</div>` :
    empty('Предложений пока нет','Попробуйте другую категорию или измените запрос.');
  recommendations(needle);
}
function recommendations(needle) {
  const section = document.querySelector('#recommendations');
  if (needle || maxPrice || category !== 'Все') {
    section.innerHTML = '';
    return;
  }
  const picks = state.lots.filter(visible).sort((a,b) => b.discount - a.discount || unit(a) - unit(b)).slice(0,2);
  section.innerHTML = picks.length ? `<section class="recommendations" aria-labelledby="picks-heading">
    <h2 id="picks-heading">Рекомендуем</h2>
    <div class="grid">${picks.map(card).join('')}</div></section>` : '';
}
function map() {
  const locations = [...shops, ...(state.owner ? [state.owner] : [])]
    .map(shop => ({...shop, lots:state.lots.filter(l => l.shopId === shop.id && visible(l))}))
    .filter(shop => shop.lots.length);
  const selected = locations.find(s => s.id === marker) || locations[0];
  marker = selected?.id || '';
  main.innerHTML = title('Вечёрка на карте','Выберите пекарню на схеме и забронируйте выпечку для самовывоза.') + '<div class="page-body">' +
  `<div class="layout"><div class="map-board" aria-label="Схема пекарен">
  ${mapDrawing()}
  ${locations.map(s => `<button class="marker${s.id===marker?' active':''}" data-action="marker" data-id="${s.id}" style="left:${s.x}%;top:${s.y}%" aria-pressed="${s.id===marker}" aria-label="${escapeHTML(s.name)}">от ${money(Math.min(...s.lots.map(unit)))}</button>`).join('')}
  <span class="map-note">Екатеринбург · демонстрационная схема</span></div>
  <section class="side">${selected ? `<h2>${escapeHTML(selected.name)}</h2><p class="address">${escapeHTML(selected.address)}</p><div class="grid">${selected.lots.map(card).join('')}</div>` :
  empty('На карте пока пусто','Здесь появятся активные вечерние лоты.')}</section></div>` + '</div>';
}
function orderStatus(order) {
  if (order.status === 'picked') return 'Получено';
  if (order.status === 'cancelled') return 'Отменено';
  return activeOrder(order) ? 'Активна' : 'Время вышло';
}
let orderFilter = 'all';
function orders() {
  const orderFilters = [['all','Все'],['active','Активные'],['finished','Завершённые'],['cancelled','Отменённые']];
  const list = [...state.orders].reverse().filter(o => orderFilter === 'all' ||
    (orderFilter === 'active' && activeOrder(o)) ||
    (orderFilter === 'finished' && !activeOrder(o) && o.status !== 'cancelled') ||
    (orderFilter === 'cancelled' && o.status === 'cancelled'));
  const tabs = `<div class="booking-tabs">${orderFilters.map(([id,label]) => `<button class="btn secondary" aria-pressed="${id === orderFilter}" data-customer-action="order-filter" data-id="${id}">${label}</button>`).join('')}</div>`;
  main.innerHTML = title('Мои брони','Оплата при получении. Активная бронь действует 10 минут.') + '<div class="page-body">' + tabs +
  (list.length ? `<div class="stack">${list.map(o => `
  <article class="panel order"><img class="order-photo" src="${state.lots.find(l => l.id === o.lotId)?.photo || 'baguette'}.jpg" alt=""><div><h3>${escapeHTML(o.name)} × ${o.qty}</h3><p>${escapeHTML(o.shop)} · ${escapeHTML(o.address)}</p>
  <strong>${money(o.total)}</strong> · <span class="booking-status ${activeOrder(o) ? 'current' : ''}">${orderStatus(o)}</span>${activeOrder(o) ? ` · <span data-order-time="${o.id}">${timer(o.until)}</span>` : ''}</div>
  <div class="booking-actions">${activeOrder(o) ? `<button class="btn" data-action="ticket" data-id="${o.id}">Показать QR-код</button>` : ''}
  <button class="btn secondary" data-customer-action="order-details" data-id="${o.id}">Детали</button></div></article>`).join('')}</div>` :
  empty('Здесь пока нет броней','Выберите выпечку из каталога или переключите фильтр.', '<a class="btn" href="#catalog">К предложениям</a>')) + '</div>';
}
function partner() {
  main.innerHTML = title('Кабинет пекарни','Публикуйте остатки выпечки и подтверждайте выдачу по коду брони.') + '<div class="page-body">' +
  '<div class="notice">Демо-режим. Профиль пекарни, лоты и брони сохраняются в этом браузере.</div>' +
  (!state.owner ? `<section class="panel"><h2>Создать профиль пекарни</h2><form data-form="profile"><div class="fields">
    <label>Название<input name="name" maxlength="65" required placeholder="Пекарня на Ленина"></label>
    <label>Адрес самовывоза<input name="address" maxlength="120" required placeholder="Екатеринбург, проспект Ленина, 50"></label></div>
    <p class="err" role="status"></p><button class="btn">Создать демо-профиль</button></form></section>` :
    `<div class="layout"><section class="panel"><h2>${escapeHTML(state.owner.name)}</h2>
    <p>${escapeHTML(state.owner.address)}</p>
    ${state.products.map(p => `<div class="product"><div><strong>${escapeHTML(p.name)}</strong><small>${escapeHTML(p.category)} · ${money(p.price)}</small></div>
    <button class="btn" data-action="publish" data-id="${p.id}">Выставить на вечерку</button></div>`).join('')}
    <details><summary>Добавить товар</summary><form data-form="product"><div class="fields">
    <label>Название<input name="name" required maxlength="65"></label>
    <label>Категория<select name="category">${categories.slice(1).map(c => `<option>${c}</option>`).join('')}</select></label>
    <label>Обычная цена, ₽<input name="price" type="number" min="1" max="100000" required></label></div>
    <p class="err" role="status"></p><button class="btn">Сохранить товар</button></form></details></section>
    <div class="stack"><section class="panel"><h2>Ваши лоты</h2>${state.lots.filter(l => l.shopId === 'owner').map(l =>
      `<div class="product"><div><strong>${escapeHTML(l.name)}</strong><small>${money(unit(l))} · <span data-lot-stock="${l.id}">${remaining(l)}</span> из ${l.qty} шт. · ${l.until > Date.now() ? `<span data-lot-time="${l.id}">${timer(l.until)}</span>` : 'Завершён'}</small></div></div>`).join('') || '<p>Опубликуйте первый лот.</p>'}</section>
    <section class="panel"><h2>Выдача заказа</h2><form data-form="pickup"><div class="fields"><label>Код покупателя<input name="code" required placeholder="VCH-…"></label></div>
    <p class="err" role="status"></p><button class="btn">Подтвердить выдачу</button></form></section></div></div>`) + '</div>';
}
function render() {
  header();
  const route = page();
  main.dataset.page = route;
  document.body.dataset.page = route;
  ({catalog,map,orders,partner,...customerPages})[route]();
}
function modal(name, html, type, id) {
  currentDialog = {type,id};
  dialog.innerHTML = `<button class="close" data-action="close" aria-label="Закрыть">×</button><h2 id="dialog-title">${name}</h2>${html}`;
  if (!dialog.open) dialog.showModal();
}
function reserve(lot) {
  if (!lot || !visible(lot)) return toast('Лот уже недоступен');
  const shop = shopFor(lot.shopId);
  modal(escapeHTML(lot.name), `<p>${escapeHTML(shop.name)} · ${escapeHTML(shop.address)}</p>
  <p>Бронь действует 10 минут с момента подтверждения.</p>
  <form data-form="reserve" data-id="${lot.id}"><div class="fields"><label>Количество, шт.
  <input name="qty" type="number" required min="1" max="${remaining(lot)}" value="1"></label>
  <label>Оплата при получении<output id="total">${money(unit(lot))}</output></label></div>
  <p class="err" role="status"></p><div class="actions reserve-actions"><button class="btn">Подтвердить бронь</button>
  <button type="button" class="btn secondary" data-customer-action="add-cart" data-id="${lot.id}">В корзину</button></div></form>`, 'reserve', lot.id);
}
function ticket(order) {
  if (!order || !activeOrder(order)) return toast('Бронь уже завершилась');
  const qr = qrcode(0, 'M');
  qr.addData(order.code);
  qr.make();
  modal('Бронь активна',`<p>${escapeHTML(order.name)} × ${order.qty} · ${money(order.total)}</p>
  <p>${escapeHTML(order.shop)} · ${escapeHTML(order.address)}</p>
  <p>Покажите QR-код или назовите код при получении. Осталось <strong data-order-time="${order.id}">${timer(order.until)}</strong>.</p>
  <div class="qr" aria-label="QR-код брони">${qr.createSvgTag(4,12)}</div>
  <div class="ticket">${order.code}</div>
  <div class="actions"><button class="btn secondary" data-action="cancel" data-id="${order.id}">Отменить бронь</button></div>`, 'ticket', order.id);
}
function publish(product) {
  modal('Выставить на вечерку',`<p>${escapeHTML(product.name)} · обычная цена ${money(product.price)}</p>
  <form data-form="publish" data-id="${product.id}"><div class="fields">
  <label>Остаток, шт.<input name="qty" type="number" min="1" max="999" value="15" required></label>
  <label>Скидка, %<input name="discount" type="number" min="1" max="99" value="60" required></label>
  <label>Срок лота, минут<input name="duration" type="number" min="1" max="720" value="60" required></label>
  <label>Цена со скидкой<output id="total">${money(unit({...product,discount:60}))}</output></label></div>
  <p class="err" role="status"></p><button class="btn">Опубликовать лот</button></form>`, 'publish', product.id);
}
function commit(message, close = false, rerender = true) {
  save(state);
  if (close) dialog.close();
  if (rerender) render();
  toast(message);
}
document.addEventListener('click', event => {
  const button = event.target.closest('[data-action]');
  if (!button) return;
  const {action,id} = button.dataset;
  state = read();
  if (action === 'close') dialog.close();
  if (action === 'category') {
    category = id;
    document.querySelectorAll('.chip').forEach(chip => {
      const active = chip.dataset.id === id;
      chip.classList.toggle('active', active);
      chip.setAttribute('aria-pressed',active);
    });
    offers();
  }
  if (action === 'marker') { marker = id; map(); document.querySelector('.marker.active')?.focus(); }
  if (action === 'reserve') reserve(state.lots.find(l => l.id === id));
  if (action === 'ticket') ticket(state.orders.find(o => o.id === id));
  if (action === 'publish') publish(state.products.find(p => p.id === id));
  if (action === 'cancel') {
    const order = state.orders.find(o => o.id === id);
    if (!order || !activeOrder(order)) return;
    order.status = 'cancelled';
    commit('Бронь отменена', true);
  }
});
document.addEventListener('input', event => {
  const input = event.target;
  if (input.matches('.search')) { query = input.value; offers(); }
  const form = input.closest('form');
  const id = form?.dataset.id;
  if (form?.dataset.form === 'reserve' && input.name === 'qty') {
    const lot = state.lots.find(l => l.id === id);
    form.querySelector('output').textContent = money(unit(lot) * Number(input.value));
  }
  if (form?.dataset.form === 'publish' && input.name === 'discount') {
    const product = state.products.find(p => p.id === id);
    form.querySelector('output').textContent = money(unit({...product,discount:Number(input.value)}));
  }
});
document.addEventListener('submit', event => {
  const form = event.target;
  if (!form.dataset.form) return;
  event.preventDefault();
  state = read();
  const values = new FormData(form);
  const str = (name) => String(values.get(name) ?? '').trim();
  const num = (name) => Number(values.get(name));
  const error = (message) => form.querySelector('.err').textContent = message;
  const {id} = form.dataset;
  switch (form.dataset.form) {
    case 'profile':
      if (state.owner) return render();
      if (!str('name') || !str('address')) return error('Укажите название и адрес.');
      state.owner = {id:'owner',name:str('name'),address:str('address'),x:42,y:52};
      return commit('Профиль пекарни создан');
    case 'product':
      if (!state.owner || !str('name')) return error('Укажите название товара.');
      state.products.push({id:uuid(),name:str('name'),price:num('price'),category:str('category')});
      return commit('Товар добавлен');
    case 'publish': {
      const product = state.products.find(p => p.id === id);
      if (!state.owner || !product) return error('Товар недоступен.');
      state.lots.unshift({...product,id:uuid(),shopId:'owner',photo:photos[product.category],qty:num('qty'),
        discount:num('discount'),until:Date.now()+num('duration')*60000});
      return commit('Лот появился в каталоге и на карте', true);
    }
    case 'reserve': {
      const lot = state.lots.find(l => l.id === id);
      const qty = num('qty');
      if (!lot || !visible(lot) || qty > remaining(lot)) return error('Такого количества уже нет. Выберите другой лот.');
      const order = makeOrder(lot, qty);
      state.orders.push(order);
      const cart = customer().cart;
      if (cart[id] > qty) cart[id] -= qty;
      else delete cart[id];
      commit('Выпечка забронирована');
      return ticket(order);
    }
    case 'pickup': {
      const order = state.orders.find(o => o.code === str('code').toUpperCase());
      if (!order || order.shopId !== 'owner') return error('Бронь этой пекарни с таким кодом не найдена.');
      if (!activeOrder(order)) return error('Эта бронь уже завершилась.');
      order.status = 'picked';
      return commit('Выдача подтверждена');
    }
  }
});
window.addEventListener('hashchange', () => {
  if (dialog.open) dialog.close();
  if (!['launch','welcome'].includes(page())) localStorage.setItem('vecherka-welcome-seen','1');
  render();
  window.scrollTo(0,0);
});
window.addEventListener('storage', event => {
  if (event.key !== key) return;
  state = read();
  render();
});
function tick() {
  document.querySelectorAll('[data-lot-time]').forEach(node => {
    const lot = state.lots.find(l => l.id === node.dataset.lotTime);
    if (lot) node.textContent = timer(lot.until);
  });
  document.querySelectorAll('[data-order-time]').forEach(node => {
    const order = state.orders.find(o => o.id === node.dataset.orderTime);
    if (order) node.textContent = timer(order.until);
  });
  const now = Date.now();
  const changed = state.lots.some(l => l.until > lastTick && l.until <= now) ||
    state.orders.some(o => !o.status && o.until > lastTick && o.until <= now);
  lastTick = now;
  if (changed) {
    header();
    if (page() === 'catalog') offers();
    if (page() === 'map') map();
    if (page() === 'orders') orders();
    if (['cart','favorites','notifications'].includes(page())) render();
    if (page() === 'partner') document.querySelectorAll('[data-lot-stock]').forEach(node => {
      const lot = state.lots.find(l => l.id === node.dataset.lotStock);
      node.textContent = remaining(lot);
    });
    if (page() === 'partner') document.querySelectorAll('[data-lot-time]').forEach(node => {
      const lot = state.lots.find(l => l.id === node.dataset.lotTime);
      if (lot.until <= now) node.textContent = 'Завершён';
    });
  }
  if (dialog.open && currentDialog.type === 'ticket' &&
      !activeOrder(state.orders.find(o => o.id === currentDialog.id) || {until:0})) {
    dialog.close();
    toast('Бронь завершилась');
  }
}
let lastTick = Date.now();
render();
setInterval(tick,1000);
