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
      navigator.serviceWorker.register('sw.js?v=12')
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

/* ---------- GHÉP NỐI THÔNG BÁO QUA GMAIL ID (ntfy.sh) ---------- */
function getPushTopic(email) {
  return 'famcare-' + String(email || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

let famcareNtfySource = null;

function connectChildPush(email) {
  if (famcareNtfySource) {
    famcareNtfySource.close();
    famcareNtfySource = null;
  }
  const statusEl = document.getElementById('childNotiStatus');
  const topic = getPushTopic(email);
  try {
    famcareNtfySource = new EventSource('https://ntfy.sh/' + topic + '/sse');
    famcareNtfySource.onopen = function () {
      if (statusEl) {
        statusEl.textContent = '🟢 Đang nhận thông báo trực tiếp cho Gmail: ' + email;
        statusEl.style.color = '#047857';
      }
    };
    famcareNtfySource.onmessage = function (e) {
      try {
        const ev = JSON.parse(e.data);
        if (ev.event !== 'message') return;
        showChildNotification(ev.title || 'FAMCARE', ev.message || '');
      } catch (err) { /* bỏ qua gói tin lỗi */ }
    };
    famcareNtfySource.onerror = function () {
      if (statusEl) {
        statusEl.textContent = '🟡 Mất kết nối, đang tự thử lại...';
        statusEl.style.color = '#B45309';
      }
    };
  } catch (e) {
    console.warn('[FAMCARE] Không tạo được kết nối EventSource:', e);
  }
}

function showChildNotification(title, body) {
  try {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body: body, icon: 'logo.png' });
    }
  } catch (e) { /* một số trình duyệt chặn new Notification */ }
  if (typeof showToastAlert === 'function') showToastAlert(title, body);
}

/* Phía CON CHÁU: lưu Gmail + mở kênh nghe SSE */
function subscribeChildNotifications() {
  const input = document.getElementById('childEmailInput');
  const email = ((input && input.value) || '').trim();
  if (!email || !email.includes('@')) {
    alert('Vui lòng nhập đúng địa chỉ Gmail của con cháu.');
    return;
  }
  localStorage.setItem('child_email', email);
  const start = function () { connectChildPush(email); };
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission().then(function (p) {
      if (p === 'granted') alert('Đã bật nhận thông báo lịch sinh hoạt trực tiếp!');
      start();
    });
  } else {
    start();
  }
}

/* Phía ÔNG BÀ: lưu Gmail con cháu + gửi tin kiểm tra kết nối */
function saveLinkedChildEmail() {
  const input = document.getElementById('linkedChildEmailInput');
  const email = ((input && input.value) || '').trim();
  if (!email || !email.includes('@')) {
    alert('Vui lòng nhập đúng Gmail của con cháu để nối thông báo.');
    return;
  }
  localStorage.setItem('linked_child_email', email);
  if (typeof showToastAlert === 'function') showToastAlert('✅ ĐÃ NỐI THÔNG BÁO', 'Mọi hoạt động của ông bà sẽ được gửi tới ' + email);
  sendNotificationToChild('🔗 FAMCARE - Đã nối thông báo thành công', 'Từ giờ mỗi hoạt động của ông bà sẽ được nhắn trực tiếp tới Gmail: ' + email);
}

/* Khởi động lại kênh push đã lưu khi mở lại trang */
document.addEventListener('DOMContentLoaded', function () {
  const savedChild = localStorage.getItem('child_email');
  if (savedChild) {
    const input = document.getElementById('childEmailInput');
    if (input) input.value = savedChild;
    connectChildPush(savedChild);
  }
  const savedLinked = localStorage.getItem('linked_child_email');
  const linkedInput = document.getElementById('linkedChildEmailInput');
  if (savedLinked && linkedInput) linkedInput.value = savedLinked;
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