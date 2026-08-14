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