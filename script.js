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
      navigator.serviceWorker.register('sw.js')
        .then(function (reg) {
          console.log('Famcare PWA Service Worker registered:', reg.scope);
        })
        .catch(function (err) {
          console.error('Famcare PWA Service Worker registration failed:', err);
        });
    });
  }
}

/* Khởi tạo PWA khi trang đã sẵn sàng */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function () {
    registerServiceWorker();
    hideInstallPromptIfStandalone();
  });
} else {
  registerServiceWorker();
  hideInstallPromptIfStandalone();
}