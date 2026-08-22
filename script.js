/* =========================================================
   Famcare - Điều hướng TAB & CUỘN MƯỢT
   - Trang chủ (home): cuộn mượt giữa các vùng
   - 3 TAB riêng: Giới thiệu, Cẩm nang, Bảng kết nối gia đình
   ========================================================= */

function setActiveNav(page) {
  document.querySelectorAll('.nav-link').forEach(function (link) {
    if (link.dataset.nav === page) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });
}

function setPageVisible(page) {
  document.querySelectorAll('[data-page]').forEach(function (sec) {
    var isTarget = sec.dataset.page === page;
    sec.classList.toggle('hidden', !isTarget);
    sec.classList.remove('famcare-page-visible');
    if (isTarget) {
      void sec.offsetWidth;
      sec.classList.add('famcare-page-visible');
    }
  });
}

/* Chuyển sang 1 trong 3 TAB riêng */
function showFamcareTab(tabId) {
  setPageVisible(tabId);
  setActiveNav(tabId);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* Hiện trang chủ rồi cuộn mượt tới vùng chỉ định */
function goFamcareSection(sectionId) {
  setPageVisible('home');
  setActiveNav('home');
  if (sectionId === 'top') {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }
  setTimeout(function () {
    var el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, 60);
}

/* ---------- TAB CẨM NANG: mở / đóng bài đọc ---------- */
function openCamNangArticle(number) {
  document.getElementById('cam-nang-list').classList.add('hidden');
  document.getElementById('cam-nang-article').classList.remove('hidden');
  for (var i = 1; i <= 3; i++) {
    document.getElementById('cam-nang-article-' + i).classList.add('hidden');
  }
  document.getElementById('cam-nang-article-' + number).classList.remove('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function closeCamNangArticle() {
  document.getElementById('cam-nang-list').classList.remove('hidden');
  document.getElementById('cam-nang-article').classList.add('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ---------- HAMBURGER MENU BÊN PHẢI (Side Drawer slide-out) ---------- */
function toggleSideDrawer() {
  const drawer = document.getElementById('sideDrawer');
  const overlay = document.getElementById('sideDrawerOverlay');
  if (!drawer) return;
  const isOpen = drawer.classList.contains('drawer-open');
  drawer.classList.toggle('drawer-open', !isOpen);
  if (overlay) overlay.classList.toggle('visible', !isOpen);
}

function closeSideDrawer() {
  const drawer = document.getElementById('sideDrawer');
  const overlay = document.getElementById('sideDrawerOverlay');
  if (drawer) drawer.classList.remove('drawer-open');
  if (overlay) overlay.classList.remove('visible');
}

/* =========================================================
   2 CHẾ ĐỘ GIAO DIỆN: Ông Bà (elderly) / Con Cháu (family)
   ========================================================= */
function switchMode(mode) {
  const current = document.body.dataset.mode || 'elderly';
  const next = mode || (current === 'family' ? 'elderly' : 'family');
  document.body.dataset.mode = next;
  localStorage.setItem('FAMCARE_MODE', next);

  // Ẩn toàn bộ các trang trước, sau đó hiện đúng trang chủ của chế độ
  document.querySelectorAll('[data-page]').forEach(sec => sec.classList.add('hidden'));
  if (next === 'family') {
    const dash = document.getElementById('family-dashboard');
    if (dash) {
      dash.classList.remove('hidden');
      dash.classList.add('famcare-page-visible');
    }
  } else {
    document.querySelectorAll('[data-page="home"]').forEach(sec => {
      sec.classList.remove('hidden');
      sec.classList.add('famcare-page-visible');
    });
  }
  setActiveNav('home');
  updateModeButtons();
  closeSideDrawer();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function updateModeButtons() {
  const mode = document.body.dataset.mode || 'elderly';
  const btn = document.getElementById('modeSwitchBtn');
  const label = document.getElementById('drawerModeLabel');
  if (btn) {
    btn.innerHTML = mode === 'family'
      ? '<i class="fa-solid fa-person-cane"></i>'
      : '<i class="fa-solid fa-people-roof"></i>';
    btn.title = mode === 'family'
      ? 'Chuyển sang Chế độ Ông bà'
      : 'Chuyển sang Chế độ Con cháu';
  }
  if (label) {
    label.textContent = mode === 'family'
      ? 'Chuyển sang Chế độ Ông bà'
      : 'Chuyển sang Chế độ Con cháu';
  }
}

/* Hiện trang chủ rồi cuộn mượt tới vùng chỉ định */
function goFamcareSection(sectionId) {
  const inFamily = (document.body.dataset.mode || 'elderly') === 'family';
  if (inFamily) {
    switchMode('elderly');
  } else {
    setPageVisible('home');
    setActiveNav('home');
  }
  if (sectionId === 'top') {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }
  setTimeout(function () {
    var el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, 60);
}

/* =========================================================
   PWA: ĐĂNG KÝ SERVICE WORKER + CÀI ĐẶT APP
   ========================================================= */

/* Ẩn banner cài đặt khi app đã chạy dạng standalone (đã cài) */
function hideInstallPromptIfStandalone() {
  if (window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true) {
    var banner = document.getElementById('pwaInstallBanner');
    var btn = document.getElementById('installAppBtn');
    if (banner) banner.classList.add('hidden');
    if (btn) btn.classList.add('hidden');
  }
}

/* Đăng ký Service Worker để app chạy offline & nhanh */
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js?v=13')
        .then(function (reg) {
          console.log('Famcare PWA Service Worker registered:', reg.scope);
        })
        .catch(function (err) {
          console.error('Famcare PWA Service Worker registration failed:', err);
        });
    });
  }
}

/* ---------- WEB PUSH NOTIFICATION (lịch sinh hoạt ông bà) ---------- */
/* Service Worker sw.js đã được đăng ký trong registerServiceWorker() ở trên */
function requestNotification() {
  if (!('Notification' in window)) {
    alert('Trình duyệt này không hỗ trợ thông báo.');
    return;
  }
  Notification.requestPermission().then(function(permission) {
    if (permission === 'granted') {
      alert('Đã bật nhận thông báo lịch sinh hoạt trực tiếp!');
      setTimeout(function () {
        testNotification('Lịch sinh hoạt Famcare', 'Đây là thông báo thử - đã đến giờ sinh hoạt của ông bà!');
      }, 1500);
    }
  });
}

function testNotification(title, body) {
  const t = title || 'Lịch sinh hoạt Famcare';
  const b = body || 'Đã đến giờ sinh hoạt của ông bà!';
  try {
    new Notification(t, { body: b, icon: 'logo.png' });
    console.log('[FAMCARE] testNotification fired:', t);
  } catch (e) {
    console.warn('[FAMCARE] testNotification failed:', e);
  }
}

/* =========================================================
   KÊNH THÔNG BÁO RIÊNG TƯ - GHÉP NỐI QUA GMAIL ID (E2EE)
   - Gmail CHỈ dùng làm khóa ghép nối, KHÔNG lưu nguyên bản
     (chỉ lưu dạng băm rút gọn + tên đã che).
   - Tên kênh push = SHA-256(Gmail + mã ghép nối): không ai
     đoán được kể cả khi biết Gmail.
   - Nội dung tin nhắn được mã hóa đầu-cuối AES-GCM 256:
     máy chủ trung gian chỉ thấy dữ liệu vô nghĩa.
   - Thông báo CHỈ hiển thị trong ứng dụng Famcare (chuông 🔔),
     không gửi qua ứng dụng/email nào khác.
   ========================================================= */
const INBOX_KEY = 'FAMCARE_INBOX';
let famcareNtfySource = null;
let famcarePairKeyCache = null;

function normalizePairKey(email) {
  return String(email || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function maskEmail(email) {
  const parts = String(email || '').trim().split('@');
  if (!parts[0] || !parts[1]) return '(đã ẩn)';
  return parts[0].charAt(0) + '•••@' + parts[1];
}

function escHtml(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function secureCryptoReady() {
  return !!(window.crypto && window.crypto.subtle);
}

async function sha256Hex(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
}

/* Tên kênh push: băm từ Gmail + mã ghép nối -> không đoán được */
async function getPushTopic(email, pin) {
  const hex = await sha256Hex('famcare-topic-v1|' + normalizePairKey(email) + '|' + String(pin || ''));
  return 'fc' + hex.slice(0, 24);
}

/* Khóa mã hóa đầu-cuối sinh từ Gmail + mã ghép nối (PBKDF2 -> AES-GCM) */
async function derivePairKey(email, pin) {
  const baseKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(normalizePairKey(email) + '|' + String(pin || '')),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: new TextEncoder().encode('famcare-e2e-salt-v1'), iterations: 150000, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

function u8ToB64(u8) {
  let s = '';
  for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]);
  return btoa(s);
}
function b64ToU8(str) {
  const raw = atob(str);
  const u8 = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) u8[i] = raw.charCodeAt(i);
  return u8;
}

async function sealPayload(obj, key) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, key, new TextEncoder().encode(JSON.stringify(obj)));
  return u8ToB64(iv) + '.' + u8ToB64(new Uint8Array(ct));
}

async function openPayload(sealed, key) {
  const parts = String(sealed).split('.');
  if (parts.length !== 2) throw new Error('payload lỗi');
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64ToU8(parts[0]) }, key, b64ToU8(parts[1]));
  return JSON.parse(new TextDecoder().decode(pt));
}

/* ---------- HỘP THÔNG BÁO TRONG ỨNG DỤNG ---------- */
function inboxAll() {
  try { return JSON.parse(localStorage.getItem(INBOX_KEY) || '[]'); } catch (e) { return []; }
}

function renderNotifBadge() {
  const badge = document.getElementById('notifBadge');
  if (!badge) return;
  const unread = inboxAll().filter(function (m) { return !m.read; }).length;
  badge.textContent = unread > 9 ? '9+' : String(unread);
  badge.style.display = unread > 0 ? 'flex' : 'none';
}

function renderNotifList() {
  const box = document.getElementById('notifList');
  if (!box) return;
  const list = inboxAll();
  if (list.length === 0) {
    box.innerHTML = '<p class="notif-empty">🔔 Chưa có thông báo nào. Khi ông bà xác nhận sinh hoạt, thông báo sẽ hiện tại đây.</p>';
    return;
  }
  box.innerHTML = list.map(function (m) {
    return '<div class="notif-item' + (m.read ? '' : ' unread') + '">' +
      '<p class="notif-title">' + escHtml(m.title) + '</p>' +
      '<p class="notif-body">' + escHtml(m.body) + '</p>' +
      '<p class="notif-time">⏰ ' + escHtml(m.time) + '</p>' +
      '</div>';
  }).join('');
}

function toggleNotifPanel() {
  const panel = document.getElementById('notifPanel');
  if (!panel) return;
  panel.classList.toggle('open');
  if (panel.classList.contains('open')) {
    markInboxRead();
  }
}

function markInboxRead() {
  localStorage.setItem(INBOX_KEY, JSON.stringify(inboxAll().map(function (m) { m.read = true; return m; })));
  renderNotifList();
  renderNotifBadge();
}

function clearInbox() {
  localStorage.removeItem(INBOX_KEY);
  renderNotifList();
  renderNotifBadge();
}

function showChildNotification(title, body) {
  const timeStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  const list = inboxAll();
  list.unshift({ title: title, body: body, time: timeStr, read: false });
  localStorage.setItem(INBOX_KEY, JSON.stringify(list.slice(0, 30)));
  renderNotifList();
  renderNotifBadge();
  try {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body: body, icon: 'logo.png' });
    }
  } catch (e) { /* một số trình duyệt chặn new Notification */ }
  if (typeof showToastAlert === 'function') showToastAlert(title, body);
}

/* ---------- PHÍA CON CHÁU: tạo kết nối bảo mật và lắng nghe ---------- */
async function connectChildPush(pair) {
  if (!pair || !pair.topic) return;
  if (!secureCryptoReady()) {
    const statusEl = document.getElementById('childNotiStatus');
    if (statusEl) {
      statusEl.textContent = '⚠️ Trình duyệt không hỗ trợ mã hóa bảo mật (cần truy cập qua HTTPS).';
      statusEl.style.color = '#B91C1C';
    }
    return;
  }
  if (famcareNtfySource) {
    famcareNtfySource.close();
    famcareNtfySource = null;
  }
  const statusEl = document.getElementById('childNotiStatus');
  try {
    famcarePairKeyCache = await derivePairKey(pair.en, pair.pin);
    famcareNtfySource = new EventSource('https://ntfy.sh/' + pair.topic + '/sse');
    famcareNtfySource.onopen = function () {
      if (statusEl) {
        statusEl.textContent = '🟢 Đã bảo mật kết nối (' + pair.masked + ') - thông báo hiện ngay trong app Famcare.';
        statusEl.style.color = '#047857';
      }
    };
    famcareNtfySource.onmessage = function (e) {
      try {
        const ev = JSON.parse(e.data);
        if (ev.event !== 'message' || typeof ev.message !== 'string') return;
        openPayload(ev.message, famcarePairKeyCache)
          .then(function (data) {
            showChildNotification(data.t || 'FAMCARE', data.m || '');
          })
          .catch(function () { /* tin không giải mã được (sai khóa) -> bỏ qua */ });
      } catch (err) { /* bỏ qua gói tin lỗi */ }
    };
    famcareNtfySource.onerror = function () {
      if (statusEl) {
        statusEl.textContent = '🟡 Mất kết nối, đang tự thử lại...';
        statusEl.style.color = '#B45309';
      }
    };
  } catch (e) {
    console.warn('[FAMCARE] Không tạo được kênh bảo mật:', e);
  }
}

async function subscribeChildNotifications() {
  const emailEl = document.getElementById('childEmailInput');
  const pinEl = document.getElementById('childPinInput');
  const email = ((emailEl && emailEl.value) || '').trim();
  const pin = ((pinEl && pinEl.value) || '').trim();
  if (!email.includes('@')) {
    alert('Vui lòng nhập đúng địa chỉ Gmail của con cháu.');
    return;
  }
  if (!pin || pin.length < 4) {
    alert('Vui lòng đặt MÃ GHÉP NỐI (tối thiểu 4 ký tự) và thống nhất với phía ông bà.');
    return;
  }
  if (!secureCryptoReady()) {
    alert('Thiết bị/trình duyệt này không hỗ trợ mã hóa bảo mật. Hãy truy cập app qua địa chỉ https.');
    return;
  }

  const masked = maskEmail(email);
  const statusEl = document.getElementById('childNotiStatus');
  if (statusEl) {
    statusEl.textContent = '⏳ Đang tạo kênh bảo mật...';
    statusEl.style.color = '#B45309';
  }

  const pair = {
    en: normalizePairKey(email),
    masked: masked,
    topic: await getPushTopic(email, pin),
    pin: pin
  };
  localStorage.setItem('child_pair_v2', JSON.stringify(pair));

  const start = function () { connectChildPush(pair); };
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission().then(function (p) {
      if (p === 'granted') alert('Đã bật nhận thông báo lịch sinh hoạt trực tiếp trong app!');
      start();
    });
  } else {
    start();
  }
}

/* Phía ÔNG BÀ: lưu cặp khóa ghép nối + gửi tin kiểm tra (được mã hóa) */
async function saveLinkedChildEmail() {
  const emailEl = document.getElementById('linkedChildEmailInput');
  const pinEl = document.getElementById('linkedChildPinInput');
  const email = ((emailEl && emailEl.value) || '').trim();
  const pin = ((pinEl && pinEl.value) || '').trim();
  if (!email.includes('@')) {
    alert('Vui lòng nhập đúng Gmail của con cháu để nối thông báo.');
    return;
  }
  if (!pin || pin.length < 4) {
    alert('Vui lòng nhập MÃ GHÉP NỐI giống hệt mã con cháu đã đặt trên máy của các cháu.');
    return;
  }
  if (!secureCryptoReady()) {
    alert('Thiết bị/trình duyệt này không hỗ trợ mã hóa bảo mật. Hãy truy cập app qua địa chỉ https.');
    return;
  }

  localStorage.setItem('elder_pair_v2', JSON.stringify({
    en: normalizePairKey(email),
    masked: maskEmail(email),
    topic: await getPushTopic(email, pin),
    pin: pin
  }));

  if (typeof showToastAlert === 'function') showToastAlert('✅ ĐÃ GHÉP NỐI AN TOÀN', 'Mọi hoạt động của ông bà sẽ hiện thông báo ngay trong app của con cháu (' + maskEmail(email) + ').');
  sendNotificationToChild('🔗 FAMCARE - Ghép nối thành công', 'Từ giờ mỗi hoạt động của ông bà sẽ báo thẳng vào app Famcare của các cháu. Tin nhắn được mã hóa an toàn.');
}

/* Bấm ra ngoài thì đóng hộp thông báo */
document.addEventListener('click', function (e) {
  const panel = document.getElementById('notifPanel');
  if (!panel || !panel.classList.contains('open')) return;
  if (panel.contains(e.target)) return;
  if (e.target.closest && e.target.closest('#notifBellBtn')) return;
  panel.classList.remove('open');
});

/* Khởi động lại kênh đã lưu khi mở lại trang + dọn dữ liệu Gmail cũ */
document.addEventListener('DOMContentLoaded', function () {
  localStorage.removeItem('child_email');
  localStorage.removeItem('linked_child_email');

  const savedChild = localStorage.getItem('child_pair_v2');
  if (savedChild) {
    try { connectChildPush(JSON.parse(savedChild)); } catch (e) {}
  }
  renderNotifBadge();
  renderNotifList();
});

/* Khởi tạo PWA + chế độ giao diện khi trang đã sẵn sàng */
function initFamcareUi() {
  registerServiceWorker();
  hideInstallPromptIfStandalone();
  switchMode(localStorage.getItem('FAMCARE_MODE') || 'elderly');
  closeSideDrawer();
}

/* Bấm phím ESC để đóng menu */
document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') closeSideDrawer();
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initFamcareUi);
} else {
  initFamcareUi();
}