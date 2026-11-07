'use strict';

function customer() {
  state.customer ??= {profile:null, signedIn:false, favorites:[], cart:{}, alerts:true, readAt:0};
  return state.customer;
}

function customerHeader() {
  const count = document.querySelector('#cart-count');
  const total = Object.values(customer().cart).reduce((sum, qty) => sum + qty, 0);
  count.hidden = !total;
  count.textContent = total;
}

function customerPage(heading, description, body, className = '') {
  main.innerHTML = title(heading, description) + `<div class="page-body ${className}">${body}</div>`;
}

function makeOrder(lot, qty) {
  const shop = shopFor(lot.shopId);
  const createdAt = Date.now();
  return {
    id:uuid(), lotId:lot.id, shopId:lot.shopId, name:lot.name, qty,
    total:unit(lot)*qty, shop:shop.name, address:shop.address,
    code:'VCH-'+uuid().replaceAll('-','').slice(0,12).toUpperCase(),
    createdAt, until:createdAt+600000, status:null
  };
}

function favoriteButton(lot) {
  const saved = customer().favorites.includes(lot.id);
  return `<button type="button" class="favorite-button${saved ? ' saved' : ''}" data-customer-action="favorite"
    data-id="${lot.id}" aria-label="${saved ? 'Убрать из избранного' : 'В избранное'}: ${escapeHTML(lot.name)}"
    aria-pressed="${saved}">${icons('heart')}</button>`;
}

function welcome() {
  main.innerHTML = `<div class="welcome">
    <div class="welcome-photo"><img src="welcome-bakery.jpg" alt="Витрина с круассанами и слойками">
      <a class="welcome-skip" href="#catalog">В каталог ${icons('arrow')}</a></div>
    <section class="welcome-copy" aria-labelledby="welcome-heading">
      <span class="welcome-icon">${icons('wheat')}</span>
      <h1 id="welcome-heading">О сервисе</h1>
      <p>Забирайте любимые круассаны, булочки и десерты со скидкой в последние часы работы пекарен и кафе.</p>
      <strong class="welcome-discount">До −60%</strong>
      <div class="welcome-steps">
        <p><strong>Найдите выпечку рядом.</strong> На карте видны пекарни с активными предложениями.</p>
        <p><strong>Забронируйте на 10 минут.</strong> Выберите товары и получите QR-код.</p>
        <p><strong>Заберите и оплатите в пекарне.</strong> Покажите QR-код или назовите код на кассе.</p>
      </div>
      <div class="welcome-actions"><a class="btn" href="#catalog">Смотреть предложения</a><a class="btn secondary" href="#account">Создать профиль</a></div>
    </section>
    <img class="welcome-collage" src="welcome-partners.jpg" alt="Витрины пекарен с хлебом, выпечкой и десертами">
    <section class="welcome-partners"><span class="welcome-icon">${icons('shop')}</span>
      <h2>Партнёры</h2><p>Выставляйте вечерние остатки своей пекарни и выдавайте заказы по коду.</p>
      <a class="btn secondary" href="#partner">Для пекарен</a></section>
  </div>`;
}

function favorites() {
  const lots = customer().favorites.map(id => state.lots.find(l => l.id === id)).filter(Boolean);
  customerPage('Избранное','Здесь хранятся предложения, которые вы отметили сердцем.',
    lots.length ? `<div class="grid saved-grid">${lots.map(lot => visible(lot) ? card(lot) : `<article class="card unavailable">
      <div class="photo"><img src="${lot.photo}.jpg" alt=""></div>${favoriteButton(lot)}
      <div class="card-body"><h3>${escapeHTML(lot.name)}</h3><p>Предложение завершилось</p></div></article>`).join('')}</div>` :
      empty('Пока ничего нет','Нажмите на сердце на карточке выпечки.', '<a class="btn" href="#catalog">Открыть каталог</a>'));
}

function cartItems() {
  return Object.entries(customer().cart).map(([id,qty]) => {
    const lot = state.lots.find(l => l.id === id);
    return {id, qty, lot, available:lot && visible(lot) ? remaining(lot) : 0};
  });
}

function cartPage() {
  const rows = cartItems();
  const total = rows.reduce((sum,row) => sum + (row.lot ? unit(row.lot)*row.qty : 0),0);
  customerPage('Корзина','Товар резервируется на 10 минут после подтверждения брони.',
    rows.length ? `<form data-customer-form="checkout"><div class="stack">${rows.map(({lot,id,qty,available}) => `
      <article class="panel cart-line">
        ${lot ? `<img class="order-photo" src="${lot.photo}.jpg" alt="">` : '<span></span>'}
        <div><h3>${escapeHTML(lot?.name || 'Предложение недоступно')}</h3>
        <p>${lot ? escapeHTML(shopFor(lot.shopId).name) : ''}</p>
        <strong>${lot ? money(unit(lot)*qty) : '—'}</strong> · ${qty} шт.
        ${available < qty ? `<p class="err">${available ? 'Доступно '+available+' шт.' : 'Лот уже недоступен'}</p>` : ''}</div>
        <div class="quantity">
          <button type="button" data-customer-action="cart-minus" data-id="${id}" aria-label="Уменьшить количество">−</button>
          <button type="button" data-customer-action="cart-plus" data-id="${id}" aria-label="Увеличить количество" ${qty >= available ? 'disabled' : ''}>+</button>
          <button type="button" class="remove-line" data-customer-action="cart-remove" data-id="${id}">Удалить</button>
        </div>
      </article>`).join('')}</div>
      <div class="panel cart-summary"><div><h2>Итого ${money(total)}</h2><p>Оплата при самовывозе</p></div>
      <button class="btn">Подтвердить бронь</button><p class="err" role="status"></p></div></form>` :
      '<div class="cart-empty"><img src="bakery-mascot.jpg" alt="Кот с круассаном и кофе"><h2>Корзина пуста</h2><p>Загляните за свежей выпечкой.</p><a class="btn" href="#catalog">Выбрать выпечку</a></div>', 'orange-sheet');
}

function avatar(profile) {
  if (/^data:image\/(?:jpeg|png|webp);base64,[a-z0-9+/=]+$/i.test(profile?.avatar || '')) {
    return `<span class="avatar"><img src="${profile.avatar}" alt=""></span>`;
  }
  const initials = profile?.name.trim().split(/\s+/).slice(0,2).map(word => word[0]).join('').toUpperCase();
  return `<span class="avatar">${initials ? escapeHTML(initials) : icons('person')}</span>`;
}

const menuItems = [
  ['orders','bag','Мои брони'],['account','person','Мой профиль'],['map','pin','Карта пекарен'],
  ['favorites','heart','Избранное'],['notifications','bell','Уведомления'],['help','info','Помощь'],
  ['settings','gear','Настройки'],['partner','shop','Кабинет пекарни']
];

function profilePage() {
  const user = customer();
  const profile = user.signedIn ? user.profile : null;
  main.innerHTML = `<section class="profile-sheet"><a class="sheet-back" href="#catalog" aria-label="Назад в каталог">‹</a>
    <div class="profile-top">${avatar(profile)}<div>
      <h1>${profile ? escapeHTML(profile.name) : 'Личный кабинет'}</h1>
      <p>${profile ? escapeHTML(profile.email) : 'Демо-профиль покупателя'}</p>
      ${profile ? '' : '<a class="btn secondary" href="#account">Войти или создать профиль</a>'}
    </div></div>
    <div class="profile-links">${menuItems.map(([href,icon,label]) => `<a href="#${href}"><span>${icons(icon)}</span>${label}${icons('arrow')}</a>`).join('')}
    ${profile ? `<button type="button" data-customer-action="signout"><span>${icons('exit')}</span>Выйти${icons('arrow')}</button>` : ''}</div></section>`;
}

function accountPage() {
  const user = customer();
  const profile = user.signedIn ? user.profile : null;
  const create = !user.profile;
  const heading = profile ? 'Мой профиль' : create ? 'Добро пожаловать!' : 'Вход в профиль';
  customerPage(heading, profile ? 'Контактные данные покупателя' : 'Демо-профиль сохраняется в этом браузере.',
    `<form class="account-form" data-customer-form="${profile || create ? 'profile' : 'signin'}">
      ${profile || create ? `<div class="account-avatar">${avatar(profile)}
        <label class="upload-photo">Фото профиля<input name="photo" type="file" accept="image/jpeg,image/png,image/webp"></label></div>
        <label>Имя<input name="name" autocomplete="name" maxlength="65" required value="${escapeHTML(profile?.name || '')}"></label>` : ''}
      <label>Электронная почта<input name="email" type="email" autocomplete="email" maxlength="100" required value="${escapeHTML(profile?.email || '')}"></label>
      ${profile || create ? `<label>Телефон<input name="phone" type="tel" autocomplete="tel" maxlength="30" value="${escapeHTML(profile?.phone || '')}"></label>` : ''}
      <p class="err" role="status"></p><button class="btn">${profile ? 'Сохранить профиль' : create ? 'Создать профиль' : 'Войти'}</button>
      <a class="section-link" href="#profile">К меню кабинета</a></form>`, 'account-body');
}

function notificationPage() {
  const user = customer();
  const list = user.alerts ? [...state.orders].reverse() : [];
  customerPage('Уведомления','Здесь видно, что происходит с вашими бронями.',
    list.length ? `<div class="section-head"><h2>Брони</h2><button class="btn secondary" data-customer-action="read-alerts">Прочитать все</button></div>
    <div class="stack">${list.map(o => `<article class="panel alert-row">
    ${icons('bell')}<div><strong>${escapeHTML(o.name)} · ${orderStatus(o)}</strong><p>${escapeHTML(o.shop)}</p></div>
    ${(o.createdAt || o.until-600000) > user.readAt ? '<span class="unread" aria-label="Новое уведомление"></span>' : ''}</article>`).join('')}</div>` :
    empty(user.alerts ? 'Уведомлений пока нет' : 'Уведомления выключены', user.alerts ? 'Они появятся после первой брони.' : 'Включите их в настройках кабинета.',
      user.alerts ? '<a class="btn" href="#catalog">К каталогу</a>' : '<a class="btn" href="#settings">В настройки</a>'), 'orange-sheet');
}

function settingsPage() {
  customerPage('Настройки','Настройки этой версии сохраняются в браузере.',
    `<section class="panel settings-list"><label><span><strong>Уведомления о бронях</strong><small>Показывать события в личном кабинете</small></span>
    <input type="checkbox" data-customer-setting="alerts" ${customer().alerts ? 'checked' : ''}></label>
    <a href="#launch"><span><strong>О сервисе</strong><small>Открыть заставку ещё раз</small></span>${icons('arrow')}</a></section>`);
}

function helpPage() {
  const questions = [
    ['Как забронировать выпечку?', 'Откройте карточку, выберите количество и подтвердите бронь. Товары из нескольких пекарен можно собрать в корзину.'],
    ['Сколько действует бронь?', '10 минут с момента подтверждения. Оставшееся время видно в разделе «Мои брони».'],
    ['Как получить заказ?', 'Придите по адресу из брони, покажите QR-код или назовите код на кассе. Оплата при получении.'],
    ['Как отменить бронь?', 'Откройте QR-код в разделе «Мои брони» и нажмите «Отменить бронь».'],
    ['Как добавить предложение пекарни?', 'Создайте демо-профиль в кабинете пекарни, добавьте товар и нажмите «Выставить на вечерку».']
  ];
  customerPage('Помощь','Ответы на частые вопросы о самовывозе и бронировании.',
    `<section class="panel faq">${questions.map(([q,a]) => `<details><summary>${q}</summary><p>${a}</p></details>`).join('')}</section>`);
}

function launch() {
  main.innerHTML = `<section class="launch-screen" aria-labelledby="launch-heading">
    <div class="launch-art"><h1 id="launch-heading"><img src="brand-mark.png" alt="Вечёрка"></h1></div>
    <p>Сервис скидок последнего часа</p>
    <a class="btn" href="#welcome">Перейти ${icons('arrow')}</a>
    <a class="launch-catalog" href="#catalog">Сразу к предложениям</a>
  </section>`;
}

function filtersDialog() {
  modal('Фильтры', `<form data-customer-form="filters" class="filter-form">
    <label>Цена до, ₽<input name="max" type="number" min="1" max="100000" placeholder="Любая цена" value="${maxPrice || ''}"></label>
    <label>Сортировка<select name="sort">
      <option value="featured">По умолчанию</option>
      <option value="price" ${sortBy === 'price' ? 'selected' : ''}>Сначала дешевле</option>
      <option value="discount" ${sortBy === 'discount' ? 'selected' : ''}>Сначала больше скидка</option>
    </select></label>
    <div class="actions"><button class="btn">Применить</button>
    <button type="button" class="btn secondary" data-customer-action="reset-filters">Сбросить</button></div></form>`, 'filters');
}

function orderDetails(order) {
  if (!order) return;
  const photo = state.lots.find(l => l.id === order.lotId)?.photo || 'baguette';
  const date = new Intl.DateTimeFormat('ru-RU',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Yekaterinburg'})
    .format(order.createdAt || order.until-600000);
  modal('Детали брони', `<div class="booking-detail"><img src="${photo}.jpg" alt="">
    <div><h3>${escapeHTML(order.name)}</h3><p>${order.qty} шт. · ${money(order.total)}</p>
    <span class="booking-status ${activeOrder(order) ? 'current' : ''}">${orderStatus(order)}</span></div></div>
    <dl class="pickup-detail"><dt>Пекарня</dt><dd>${escapeHTML(order.shop)}</dd><dt>Адрес</dt><dd>${escapeHTML(order.address)}</dd>
    <dt>Дата брони</dt><dd>${date}</dd><dt>Оплата</dt><dd>На кассе при самовывозе</dd></dl>
    ${order.review ? `<p class="review-summary">${'★'.repeat(order.review.stars)}${'☆'.repeat(5-order.review.stars)} <span>Твоя оценка</span></p>
    <p>${escapeHTML(order.review.comment)}</p>` : ''}
    <div class="actions">${activeOrder(order) ? `<button class="btn" data-action="ticket" data-id="${order.id}">Открыть QR-код</button>` : ''}
    ${order.status === 'picked' ? `<button class="btn" data-customer-action="review" data-id="${order.id}">${order.review ? 'Изменить отзыв' : 'Оставить отзыв'}</button>` : ''}
    <a href="#map" class="btn secondary">Карта пекарен</a></div>`, 'details', order.id);
}

function reviewDialog(order) {
  if (order?.status !== 'picked') return;
  const photo = state.lots.find(l => l.id === order.lotId)?.photo || 'baguette';
  modal('Отзыв о покупке', `<form data-customer-form="review" data-id="${order.id}" class="review-form">
    <img src="${photo}.jpg" alt=""><h3>${escapeHTML(order.name)}</h3>
    <fieldset><legend>Оценка</legend><div class="rating">${[1,2,3,4,5].map(n =>
      `<label><input type="radio" name="stars" value="${n}" ${n === order.review?.stars ? 'checked' : ''} required>
      ${icons('star')}<span class="sr-only">${n} из 5</span></label>`).join('')}</div></fieldset>
    <label>Комментарий<textarea name="comment" maxlength="280" rows="3" placeholder="Расскажите, как прошёл самовывоз">${escapeHTML(order.review?.comment || '')}</textarea></label>
    <p class="err" role="status"></p><div class="actions"><button class="btn">Сохранить отзыв</button>
    <button type="button" class="btn secondary" data-customer-action="order-details" data-id="${order.id}">Назад</button></div></form>`, 'review', order.id);
}

const customerPages = {
  launch, welcome, favorites, cart:cartPage, profile:profilePage, account:accountPage,
  notifications:notificationPage, settings:settingsPage, help:helpPage
};

function refreshFavorites(id, saved) {
  document.querySelectorAll('[data-customer-action="favorite"]').forEach(button => {
    if (button.dataset.id !== id) return;
    const name = state.lots.find(l => l.id === id)?.name || 'предложение';
    button.classList.toggle('saved', saved);
    button.setAttribute('aria-pressed', saved);
    button.setAttribute('aria-label', `${saved ? 'Убрать из избранного' : 'В избранное'}: ${name}`);
  });
}

document.addEventListener('click', event => {
  const button = event.target.closest('[data-customer-action]');
  if (!button) return;
  state = read();
  const user = customer();
  const {customerAction:action, id} = button.dataset;
  const lot = state.lots.find(l => l.id === id);
  switch (action) {
    case 'filters':
      return filtersDialog();
    case 'reset-filters':
      maxPrice = 0;
      sortBy = 'featured';
      dialog.close();
      return render();
    case 'order-details':
      return orderDetails(state.orders.find(o => o.id === id));
    case 'review':
      return reviewDialog(state.orders.find(o => o.id === id));
    case 'favorite': {
      if (!lot) return;
      const saved = !user.favorites.includes(id);
      user.favorites = saved ? [...user.favorites,id] : user.favorites.filter(item => item !== id);
      commit(saved ? 'Добавлено в избранное' : 'Удалено из избранного', false, page() === 'favorites' && !saved);
      return refreshFavorites(id,saved);
    }
    case 'add-cart': {
      const qty = dialog.querySelector('[name="qty"]');
      if (!qty.reportValidity()) return;
      const total = (user.cart[id] || 0) + Number(qty.value);
      if (!lot || !visible(lot) || total > remaining(lot)) {
        dialog.querySelector('.err').textContent = 'Проверьте доступный остаток и количество в корзине.';
        return;
      }
      user.cart[id] = total;
      return commit('Выпечка добавлена в корзину',true);
    }
    case 'cart-minus':
      if (user.cart[id] > 1) user.cart[id]--;
      else delete user.cart[id];
      return commit('Корзина обновлена');
    case 'cart-plus':
      if (lot && visible(lot) && user.cart[id] < remaining(lot)) user.cart[id]++;
      return commit('Корзина обновлена');
    case 'cart-remove':
      delete user.cart[id];
      return commit('Товар убран из корзины');
    case 'order-filter':
      orderFilter = id;
      orders();
      document.querySelector('[data-customer-action="order-filter"][aria-pressed="true"]')?.focus();
      return;
    case 'read-alerts':
      user.readAt = Date.now();
      return commit('Уведомления прочитаны');
    case 'signout':
      user.signedIn = false;
      return commit('Вы вышли из демо-профиля');
  }
});

document.addEventListener('change', event => {
  if (event.target.dataset.customerSetting !== 'alerts') return;
  state = read();
  customer().alerts = event.target.checked;
  commit('Настройки сохранены',false,false);
});

document.addEventListener('submit', async event => {
  const form = event.target;
  const type = form.dataset.customerForm;
  if (!type) return;
  event.preventDefault();
  state = read();
  const values = new FormData(form);
  const str = name => String(values.get(name) || '').trim();
  const error = message => form.querySelector('.err').textContent = message;
  if (type === 'filters') {
    maxPrice = Number(values.get('max')) || 0;
    sortBy = str('sort');
    dialog.close();
    render();
    document.querySelector('.filter-open')?.focus();
    return;
  }
  if (type === 'review') {
    const order = state.orders.find(o => o.id === form.dataset.id);
    const stars = Number(values.get('stars'));
    if (order?.status !== 'picked' || ![1,2,3,4,5].includes(stars)) return error('Выберите оценку от 1 до 5.');
    order.review = {stars,comment:str('comment').slice(0,280)};
    commit('Отзыв сохранён',false,false);
    return orderDetails(order);
  }
  if (type === 'checkout') {
    const rows = cartItems();
    if (!rows.length || rows.some(row => row.qty > row.available)) return error('Измените количество или удалите недоступные товары.');
    const booked = rows.map(row => makeOrder(row.lot,row.qty));
    state.orders.push(...booked);
    customer().cart = {};
    save(state);
    location.hash = 'orders';
    toast(booked.length === 1 ? 'Бронь подтверждена' : 'Брони подтверждены');
    return;
  }
  if (type === 'signin') {
    const user = customer();
    if (user.profile?.email.toLowerCase() !== str('email').toLowerCase()) return error('Профиль с таким адресом в этом браузере не найден.');
    user.signedIn = true;
    commit('Вы вошли в демо-профиль',false,false);
    location.hash = 'profile';
    return;
  }
  if (type === 'profile') {
    const name = str('name');
    if (!name) return error('Укажите имя.');
    const photo = values.get('photo');
    let avatarData = customer().profile?.avatar || '';
    if (photo?.size) {
      if (!['image/jpeg','image/png','image/webp'].includes(photo.type) || photo.size > 512000) {
        return error('Выберите JPG, PNG или WebP до 500 КБ.');
      }
      const reader = new FileReader();
      try {
        avatarData = await new Promise((resolve,reject) => {
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(photo);
        });
      } catch {
        return error('Не удалось прочитать фото.');
      }
      state = read();
    }
    const user = customer();
    user.profile = {name, email:str('email'), phone:str('phone'), avatar:avatarData};
    user.signedIn = true;
    commit('Профиль сохранён',false,false);
    location.hash = 'profile';
  }
});
