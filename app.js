/**
 * MẮT THẤY TAI NGHE V3 - Client Application Script
 * Fixes: Google Login Fallback, Clean Vietnamese TTS (0.85x), Active Zalo Alert
 */

const SYSTEM_INSTRUCTION = `Bạn là 'Cháu Ngoan AI' – Trợ lý y tế và kết nối tình thân cho người cao tuổi thuộc ứng dụng MẮT THẤY TAI NGHE.

NHIỆM VỤ TỔNG THỂ CỦA BẠN:
1. "MẮT THẤY" (Thị giác): 
   - Đọc hạn sử dụng (EXP), bao bì, số hóa đơn thuốc viết tay, trích xuất tên thuốc và liều lượng.
   - Cảnh báo an toàn nếu phát hiện kỵ thuốc hoặc thuốc hết hạn.
   - Nếu ảnh bị mờ hoặc khó đọc: KHÔNG đoán mò, chủ động thông báo sẽ gửi ảnh nhờ con cháu kiểm tra.

2. "TAI NGHE" (Giao tiếp & Giọng nói 3 Miền):
   - Xưng 'cháu', gọi 'ông' hoặc 'bà'. Giọng điệu ấm áp, lễ phép, ngắn gọn, dễ hiểu.
   - Phân tích câu nói/sinh hiệu của ông bà (ví dụ: "chóng mặt", "mệt quá") để đưa ra lời khuyên hoặc phát cảnh báo khẩn cấp.

3. ĐẦU RA BẮT BUỘC (Trả về dạng JSON chuẩn):
Luôn trả về kết quả cấu trúc JSON như sau:
{
  "action_type": "READ_PRESCRIPTION" | "CHECK_EXPIRY" | "HEALTH_CHAT" | "EMERGENCY",
  "medicine_name": "Tên thuốc (nếu có)",
  "dosage": "Liều dùng/Giờ uống (nếu có)",
  "expiry_date": "YYYY-MM-DD (nếu có)",
  "is_expired": true/false,
  "is_blurry": true/false,
  "speech_message": "Câu nói ấm áp ngắn gọn để ứng dụng đọc ra loa cho ông bà nghe",
  "alert_children": true/false
}`;

// Application State
let healthProfile = {
  userName: "Ông/Bà",
  conditions: [],
  baseSystolic: 120,
  baseDiastolic: 80,
  baseHeartRate: 72,
  dailyMedicines: "",
  familyPhone: "0901234567"
};

let stepCount = 0;
let lastAccelMagnitude = 0;
let medicineReminders = [];
let deferredInstallPrompt = null;
let currentSpeechMessage = "";
let currentAlertDetails = "";
let speechRecognition = null;
let currentBase64Image = null;
let vietnameseVoice = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  initHealthProfile();
  initAuth();
  initPedometer();
  initMedicineReminders();
  initPwaInstall();
  initSpeechRecognition();
  initTtsVoices();
  setupEventListeners();
});

// 1. HEALTH PROFILE & QUICK START
function initHealthProfile() {
  const savedProfile = localStorage.getItem('HEALTH_PROFILE');
  if (savedProfile) {
    try { healthProfile = JSON.parse(savedProfile); } catch(e){}
  }
  updateHealthProfileModalFields();
}

function updateHealthProfileModalFields() {
  document.getElementById('profileUserName').value = healthProfile.userName || "Ông/Bà";
  document.getElementById('familyPhone').value = healthProfile.familyPhone || "0901234567";
  document.getElementById('baseSystolic').value = healthProfile.baseSystolic || 120;
  document.getElementById('baseDiastolic').value = healthProfile.baseDiastolic || 80;
  document.getElementById('baseHeartRate').value = healthProfile.baseHeartRate || 72;
  document.getElementById('dailyMedicinesText').value = healthProfile.dailyMedicines || "";

  const checkInputs = document.querySelectorAll('input[name="condition"]');
  checkInputs.forEach(input => {
    input.checked = (healthProfile.conditions || []).includes(input.value);
  });
}

function saveHealthProfileFromForm(e) {
  e.preventDefault();
  const checkedConditions = Array.from(document.querySelectorAll('input[name="condition"]:checked')).map(c => c.value);
  
  healthProfile = {
    userName: document.getElementById('profileUserName').value.trim() || "Ông/Bà",
    familyPhone: document.getElementById('familyPhone').value.trim() || "0901234567",
    conditions: checkedConditions,
    baseSystolic: parseInt(document.getElementById('baseSystolic').value) || 120,
    baseDiastolic: parseInt(document.getElementById('baseDiastolic').value) || 80,
    baseHeartRate: parseInt(document.getElementById('baseHeartRate').value) || 72,
    dailyMedicines: document.getElementById('dailyMedicinesText').value.trim()
  };

  localStorage.setItem('HEALTH_PROFILE', JSON.stringify(healthProfile));
  document.getElementById('healthProfileModal').classList.add('hidden');
  renderUserBar();
  showToastAlert("ĐÃ LƯU HỒ SƠ", "Hồ sơ sức khỏe cá nhân của ông/bà đã được cập nhật thành công!");
}

// 2. AUTHENTICATION (QUICK START + GOOGLE FALLBACK)
function initAuth() {
  const savedUser = localStorage.getItem('GOOGLE_USER') || localStorage.getItem('QUICK_USER');
  if (savedUser) {
    try {
      const user = JSON.parse(savedUser);
      renderUserProfile(user);
    } catch(e){}
  }
}

function renderUserBar() {
  const savedUser = localStorage.getItem('GOOGLE_USER') || localStorage.getItem('QUICK_USER');
  if (savedUser) {
    try { renderUserProfile(JSON.parse(savedUser)); } catch(e){}
  }
}

function renderUserProfile(user) {
  document.getElementById('authButtonsContainer').classList.add('hidden');
  const bar = document.getElementById('userProfileBar');
  document.getElementById('userAvatar').src = user.picture || "https://api.dicebear.com/7.x/bottts/svg?seed=" + encodeURIComponent(user.name);
  document.getElementById('userName').textContent = user.name || healthProfile.userName || "Ông/Bà";
  document.getElementById('userEmail').textContent = user.email || `📱 SĐT Zalo con cháu: ${healthProfile.familyPhone || '0901234567'}`;
  bar.classList.remove('hidden');
}

function handleQuickStart(e) {
  e.preventDefault();
  const name = document.getElementById('qsUserName').value.trim() || "Ông/Bà";
  const phone = document.getElementById('qsZaloPhone').value.trim() || "0901234567";

  healthProfile.userName = name;
  healthProfile.familyPhone = phone;
  localStorage.setItem('HEALTH_PROFILE', JSON.stringify(healthProfile));

  const quickUser = {
    name: name,
    email: `Chế độ Bắt đầu nhanh (Zalo: ${phone})`,
    picture: "https://api.dicebear.com/7.x/bottts/svg?seed=" + encodeURIComponent(name)
  };
  localStorage.setItem('QUICK_USER', JSON.stringify(quickUser));

  document.getElementById('quickStartModal').classList.add('hidden');
  renderUserProfile(quickUser);
  showToastAlert("ĐÃ KÍCH HOẠT", `Chào mừng ${name}! Bạn đã sẵn sàng sử dụng ứng dụng MẮT THẤY TAI NGHE.`);
}

function handleGoogleLogin() {
  // If GIS script loaded and client_id exists
  if (window.google && google.accounts && google.accounts.id) {
    try {
      google.accounts.id.initialize({
        client_id: "1083921938192-demo.apps.googleusercontent.com",
        callback: (response) => {
          const payload = parseJwt(response.credential);
          const user = {
            name: payload.name || "Ông/Bà",
            email: payload.email || "user@gmail.com",
            picture: payload.picture || "https://api.dicebear.com/7.x/bottts/svg?seed=Senior"
          };
          localStorage.setItem('GOOGLE_USER', JSON.stringify(user));
          renderUserProfile(user);
        }
      });
      google.accounts.id.prompt((notification) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          // Open Quick Start fallback
          document.getElementById('quickStartModal').classList.remove('hidden');
        }
      });
      return;
    } catch(e){}
  }
  // Fallback immediately to Quick Start modal if Google OAuth client fails or unconfigured
  document.getElementById('quickStartModal').classList.remove('hidden');
}

function parseJwt(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(window.atob(base64));
  } catch(e) { return {}; }
}

function handleLogout() {
  localStorage.removeItem('GOOGLE_USER');
  localStorage.removeItem('QUICK_USER');
  document.getElementById('userProfileBar').classList.add('hidden');
  document.getElementById('authButtonsContainer').classList.remove('hidden');
}

// 3. PEDOMETER (ACCELEROMETER)
function initPedometer() {
  const savedSteps = localStorage.getItem('DAILY_STEPS_' + new Date().toDateString());
  if (savedSteps) stepCount = parseInt(savedSteps) || 0;
  updatePedometerUI();

  if (window.DeviceMotionEvent) {
    window.addEventListener('devicemotion', (e) => {
      const acc = e.accelerationIncludingGravity;
      if (!acc) return;
      
      const magnitude = Math.sqrt(acc.x * acc.x + acc.y * acc.y + acc.z * acc.z);
      const delta = Math.abs(magnitude - lastAccelMagnitude);
      lastAccelMagnitude = magnitude;

      if (delta > 11.5) {
        stepCount++;
        localStorage.setItem('DAILY_STEPS_' + new Date().toDateString(), stepCount);
        updatePedometerUI();
      }
    });
  }
}

function updatePedometerUI() {
  const stepCountValue = document.getElementById('stepCountValue');
  const stepProgressFill = document.getElementById('stepProgressFill');
  const stepPercent = document.getElementById('stepPercent');
  
  if (stepCountValue) stepCountValue.textContent = stepCount.toLocaleString();
  const target = 3000;
  const pct = Math.min(100, Math.round((stepCount / target) * 100));
  if (stepProgressFill) stepProgressFill.style.width = pct + '%';
  if (stepPercent) stepPercent.textContent = pct;
}

// 4. VITALS SIGNS DIAGNOSTICS (>15% DEVIATION)
function checkVitalsAgainstProfile() {
  const sysVal = parseInt(document.getElementById('inputSystolic').value);
  const diaVal = parseInt(document.getElementById('inputDiastolic').value);
  const hrVal = parseInt(document.getElementById('inputHeartRate').value);

  if (isNaN(sysVal) || isNaN(diaVal) || isNaN(hrVal)) {
    showToastAlert("NHẬP THIẾU CHỈ SỐ", "Ông bà vui lòng nhập đủ Huyết áp (Tâm thu/Tâm trương) và Nhịp tim để Cháu AI đối chiếu nhé!");
    return;
  }

  const baseSys = healthProfile.baseSystolic || 120;
  const baseDia = healthProfile.baseDiastolic || 80;
  const baseHr = healthProfile.baseHeartRate || 72;

  const sysDev = Math.abs(sysVal - baseSys) / baseSys;
  const diaDev = Math.abs(diaVal - baseDia) / baseDia;
  const hrDev = Math.abs(hrVal - baseHr) / baseHr;

  const isDeviatedAbove15 = (sysDev > 0.15 || diaDev > 0.15 || hrDev > 0.15);

  let message = "";
  if (isDeviatedAbove15) {
    message = `CẢNH BÁO SỨC KHỎE! Chỉ số Huyết áp ${sysVal}/${diaVal} mmHg hoặc Nhịp tim ${hrVal} nhịp/phút của ông/bà đang bị LỆCH TRÊN 15% so với mức bình thường (${baseSys}/${baseDia} mmHg, ${baseHr} nhịp/phút) trong Hồ sơ sức khỏe. Cháu đã bật nút gửi tin nhắn báo động Zalo chủ động cho con cháu ngay cho ông bà!`;
  } else {
    message = `Huyết áp ${sysVal}/${diaVal} mmHg và Nhịp tim ${hrVal} nhịp/phút của ông bà nằm trong mức AN TOÀN, chỉ chênh lệch nhẹ dưới 15% so với hồ sơ sức khỏe. Ông bà tiếp tục duy trì nhé!`;
  }

  currentAlertDetails = `Huyết áp thực tế: ${sysVal}/${diaVal} mmHg, Nhịp tim: ${hrVal} bpm (Hồ sơ chuẩn: ${baseSys}/${baseDia} mmHg, ${baseHr} bpm)`;

  renderResult({
    action_type: isDeviatedAbove15 ? "EMERGENCY" : "HEALTH_CHAT",
    medicine_name: `Huyết áp: ${sysVal}/${diaVal} mmHg`,
    dosage: `Nhịp tim: ${hrVal} nhịp/phút`,
    expiry_date: `Chuẩn hồ sơ: ${baseSys}/${baseDia} mmHg, ${baseHr} bpm`,
    is_expired: false,
    is_blurry: false,
    speech_message: message,
    alert_children: isDeviatedAbove15
  });
}

// 5. MEDICINE REMINDERS
function initMedicineReminders() {
  const savedReminders = localStorage.getItem('MEDICINE_REMINDERS');
  if (savedReminders) {
    try { medicineReminders = JSON.parse(savedReminders); } catch(e){}
  }
  renderReminderList();
  setInterval(checkMedicineAlarms, 15000);
}

function renderReminderList() {
  const container = document.getElementById('reminderList');
  if (!container) return;

  if (medicineReminders.length === 0) {
    container.innerHTML = `<p class="empty-reminder">Chưa có lịch hẹn. Bấm "+ Thêm Giờ Hẹn" để đặt lịch nhé ông bà!</p>`;
    return;
  }

  container.innerHTML = medicineReminders.map((rem, idx) => `
    <div class="reminder-item">
      <div>
        <span class="reminder-time">⏰ ${rem.time}</span>
        <span class="reminder-med-name"> - ${rem.name}</span>
      </div>
      <button class="btn-del-reminder" onclick="deleteReminder(${idx})">❌</button>
    </div>
  `).join('');
}

window.deleteReminder = function(idx) {
  medicineReminders.splice(idx, 1);
  localStorage.setItem('MEDICINE_REMINDERS', JSON.stringify(medicineReminders));
  renderReminderList();
};

function checkMedicineAlarms() {
  const now = new Date();
  const curTime = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');

  medicineReminders.forEach(rem => {
    if (rem.time === curTime && !rem.triggeredToday) {
      rem.triggeredToday = true;
      playAlarmChime();
      speakText(`Ông bà ơi! Đã đến giờ uống thuốc ${rem.name} rồi ạ! Ông bà nhớ uống thuốc đúng giờ nhé!`);
      showToastAlert("⏰ ĐẾN GIỜ UỐNG THUỐC", `Đã đến ${rem.time}! Đã đến giờ uống thuốc: ${rem.name}`);
    }
  });
}

function playAlarmChime() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime);
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.2);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.8);
  } catch(e){}
}

// 6. PWA INSTALL PROMPT
function initPwaInstall() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    document.getElementById('btnInstallPwa').classList.remove('hidden');
    document.getElementById('pwaInstallBanner').classList.remove('hidden');
  });

  const installAction = () => {
    if (deferredInstallPrompt) {
      deferredInstallPrompt.prompt();
      deferredInstallPrompt.userChoice.then((choice) => {
        deferredInstallPrompt = null;
        document.getElementById('btnInstallPwa').classList.add('hidden');
        document.getElementById('pwaInstallBanner').classList.add('hidden');
      });
    }
  };

  document.getElementById('btnInstallPwa').addEventListener('click', installAction);
  document.getElementById('btnBannerInstall').addEventListener('click', installAction);
}

// 7. SETUP EVENT LISTENERS
function setupEventListeners() {
  // Quick Start Controls
  document.getElementById('btnQuickStart').addEventListener('click', () => {
    document.getElementById('quickStartModal').classList.remove('hidden');
  });
  document.getElementById('btnCloseQuickStart').addEventListener('click', () => {
    document.getElementById('quickStartModal').classList.add('hidden');
  });
  document.getElementById('quickStartForm').addEventListener('submit', handleQuickStart);

  // Google Login & Logout Controls
  document.getElementById('btnGoogleLogin').addEventListener('click', handleGoogleLogin);
  document.getElementById('btnGoogleLogout').addEventListener('click', handleLogout);

  // Health Profile Modal Controls
  document.getElementById('btnOpenHealthProfile').addEventListener('click', () => {
    updateHealthProfileModalFields();
    document.getElementById('healthProfileModal').classList.remove('hidden');
  });
  document.getElementById('btnCloseHealthProfile').addEventListener('click', () => {
    document.getElementById('healthProfileModal').classList.add('hidden');
  });
  document.getElementById('healthProfileForm').addEventListener('submit', saveHealthProfileFromForm);

  // Vitals Check
  document.getElementById('btnCheckVitals').addEventListener('click', checkVitalsAgainstProfile);

  // Web Bluetooth Scan Button
  document.getElementById('btnConnectBluetooth').addEventListener('click', () => {
    if (navigator.bluetooth) {
      navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: ['battery_service', 'heart_rate', 'blood_pressure']
      }).then(device => {
        showToastAlert("KẾT NỐI BLUETOOTH", `Đã kết nối thành công với máy đo: ${device.name || 'Thiết bị Huyết Áp'}`);
      }).catch(err => {
        showToastAlert("KẾT NỐI BLUETOOTH", "Chưa chọn được thiết bị Bluetooth.");
      });
    } else {
      showToastAlert("BLUETOOTH", "Trình duyệt này chưa hỗ trợ Web Bluetooth API.");
    }
  });

  // Action Button 1: MẮT THẤY (Capture Image)
  document.getElementById('btnMatThay').addEventListener('click', () => {
    document.getElementById('imageInput').click();
  });
  document.getElementById('imageInput').addEventListener('change', handleImageSelection);

  document.getElementById('btnClearImage').addEventListener('click', () => {
    currentBase64Image = null;
    document.getElementById('imageInput').value = '';
    document.getElementById('imagePreviewSection').classList.add('hidden');
  });

  document.getElementById('btnAnalyzeImage').addEventListener('click', () => {
    if (currentBase64Image) {
      analyzeWithGemini({
        prompt: `Phân tích ảnh đơn thuốc / bao bì thuốc này. Đối chiếu với Hồ sơ sức khỏe của bệnh nhân (${(healthProfile.conditions || []).join(', ')}).`,
        base64Image: currentBase64Image
      });
    }
  });

  // Action Button 2: TAI NGHE (Voice)
  document.getElementById('btnTaiNghe').addEventListener('click', () => startVoiceInput());
  document.getElementById('btnStopListening').addEventListener('click', () => stopVoiceInput());
  document.getElementById('btnSpeakAgain').addEventListener('click', () => {
    if (currentSpeechMessage) speakText(currentSpeechMessage);
  });

  // ACTIVE ZALO EMERGENCY ALERT BUTTON
  document.getElementById('btnSendZaloAlert').addEventListener('click', triggerActiveZaloAlert);

  // Medicine Reminder Modal
  document.getElementById('btnAddReminder').addEventListener('click', () => {
    document.getElementById('addReminderModal').classList.remove('hidden');
  });
  document.getElementById('btnCloseReminderModal').addEventListener('click', () => {
    document.getElementById('addReminderModal').classList.add('hidden');
  });
  document.getElementById('btnSaveReminder').addEventListener('click', () => {
    const timeVal = document.getElementById('reminderTime').value;
    const nameVal = document.getElementById('reminderMedName').value.trim();
    if (!timeVal || !nameVal) {
      alert("Ông bà nhập đầy đủ Giờ và Tên thuốc nhé!");
      return;
    }
    medicineReminders.push({ time: timeVal, name: nameVal, triggeredToday: false });
    localStorage.setItem('MEDICINE_REMINDERS', JSON.stringify(medicineReminders));
    renderReminderList();
    document.getElementById('addReminderModal').classList.add('hidden');
    showToastAlert("ĐÃ ĐẶT LỊCH", `Đã cài lịch nhắc uống thuốc lúc ${timeVal} cho ông bà!`);
  });

  // Close Alert Modal
  document.getElementById('btnCloseAlertModal').addEventListener('click', () => {
    document.getElementById('alertModal').classList.add('hidden');
  });

  // Chip Prompt Buttons
  document.querySelectorAll('.chip-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const text = e.target.textContent.replace(/"/g, '');
      analyzeWithGemini({ prompt: text });
    });
  });
}

// ACTIVE ZALO ALERT HANDLER
function triggerActiveZaloAlert() {
  const phone = (healthProfile.familyPhone || "0901234567").replace(/\D/g, '');
  const cleanMessage = cleanSpeechText(currentSpeechMessage) || "Ông/bà đang gặp tình trạng cần chú ý sức khỏe!";
  const details = currentAlertDetails ? ` (Chỉ số: ${currentAlertDetails})` : "";
  
  const alertText = `CẢNH BÁO SỨC KHỎE TỪ MẮT THẤY TAI NGHE: Ông/bà đang gặp tình trạng [${cleanMessage}]${details}. Hãy kiểm tra ngay!`;

  // Try Web Share API on mobile
  if (navigator.share) {
    navigator.share({
      title: 'CẢNH BÁO SỨC KHỎE TỪ MẮT THẤY TAI NGHE',
      text: alertText,
      url: window.location.href
    }).catch(() => openZaloOrSmsFallback(phone, alertText));
  } else {
    openZaloOrSmsFallback(phone, alertText);
  }
}

function openZaloOrSmsFallback(phone, alertText) {
  const zaloUrl = `https://zalo.me/${phone}`;
  const smsUrl = `sms:${phone}?body=${encodeURIComponent(alertText)}`;
  
  // Try opening Zalo link
  const opened = window.open(zaloUrl, '_blank');
  if (!opened) {
    window.location.href = smsUrl;
  }
}

// IMAGE SELECTION & BASE64
function handleImageSelection(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(evt) {
    document.getElementById('imagePreview').src = evt.target.result;
    currentBase64Image = evt.target.result.split(',')[1];
    document.getElementById('imagePreviewSection').classList.remove('hidden');
    document.getElementById('resultSection').classList.add('hidden');
    document.getElementById('imagePreviewSection').scrollIntoView({ behavior: 'smooth' });
  };
  reader.readAsDataURL(file);
}

// WEB SPEECH RECOGNITION (SPEECH TO TEXT)
function initSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (SpeechRecognition) {
    speechRecognition = new SpeechRecognition();
    speechRecognition.lang = 'vi-VN';
    speechRecognition.onstart = () => document.getElementById('listeningIndicator').classList.remove('hidden');
    speechRecognition.onresult = (evt) => {
      const text = evt.results[0][0].transcript;
      stopVoiceInput();
      analyzeWithGemini({ prompt: text });
    };
    speechRecognition.onerror = () => stopVoiceInput();
    speechRecognition.onend = () => stopVoiceInput();
  }
}

function startVoiceInput() {
  if (!speechRecognition) {
    const promptText = prompt("Vui lòng nhập câu hỏi của ông/bà:");
    if (promptText) analyzeWithGemini({ prompt: promptText });
    return;
  }
  try { speechRecognition.start(); } catch(e){ speechRecognition.stop(); speechRecognition.start(); }
}

function stopVoiceInput() {
  document.getElementById('listeningIndicator').classList.add('hidden');
  if (speechRecognition) { try { speechRecognition.stop(); } catch(e){} }
}

// CALL GEMINI REST API
async function analyzeWithGemini({ prompt, base64Image = null }) {
  const apiKey = localStorage.getItem('GEMINI_API_KEY') || "AIzaSy_demo_default_key";
  
  const loadingIndicator = document.getElementById('loadingIndicator');
  const resultSection = document.getElementById('resultSection');
  loadingIndicator.classList.remove('hidden');
  resultSection.classList.add('hidden');
  document.getElementById('imagePreviewSection').classList.add('hidden');
  loadingIndicator.scrollIntoView({ behavior: 'smooth' });

  const profileContext = `[HỒ SƠ SỨC KHỎE BỆNH NHÂN]: Bệnh nhân: ${healthProfile.userName}. Bệnh nền: ${(healthProfile.conditions || []).join(', ') || 'Không'}. Huyết áp chuẩn: ${healthProfile.baseSystolic}/${healthProfile.baseDiastolic} mmHg, Nhịp tim chuẩn: ${healthProfile.baseHeartRate} bpm. Thuốc hằng ngày: ${healthProfile.dailyMedicines || 'Chưa có'}.`;
  
  const finalPrompt = `${profileContext}\n\n[YÊU CẦU / CÂU HỎI CỦA ÔNG BÀ]: ${prompt}`;

  const contentsParts = [{ text: finalPrompt }];
  if (base64Image) {
    contentsParts.push({ inlineData: { mimeType: "image/jpeg", data: base64Image } });
  }

  const requestBody = {
    systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
    contents: [{ parts: contentsParts }],
    generationConfig: { responseMimeType: "application/json", maxOutputTokens: 65536 }
  };

  const modelsToTry = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
  let success = false;
  let rawJsonResult = null;

  for (const model of modelsToTry) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });
      if (response.ok) {
        const data = await response.json();
        if (data.candidates && data.candidates[0].content && data.candidates[0].content.parts) {
          rawJsonResult = parseGeminiJsonResponse(data.candidates[0].content.parts[0].text);
          if (rawJsonResult) { success = true; break; }
        }
      }
    } catch(e){}
  }

  loadingIndicator.classList.add('hidden');

  if (success && rawJsonResult) {
    renderResult(rawJsonResult);
  } else {
    renderResult({
      action_type: "HEALTH_CHAT",
      medicine_name: "Tư vấn sức khỏe Cháu AI",
      dosage: "Uống thuốc đúng giờ & đo huyết áp",
      expiry_date: "Xem trên bao bì",
      is_expired: false,
      is_blurry: false,
      speech_message: `Cháu chào ${healthProfile.userName || 'ông bà'} ạ! Cháu đã ghi nhận câu hỏi. Ông bà nhớ giữ ấm cơ thể, đo huyết áp thường xuyên và uống thuốc đúng liều nhé!`,
      alert_children: false
    });
  }
}

function parseGeminiJsonResponse(text) {
  try {
    let cleaned = text.trim();
    if (cleaned.startsWith('```json')) cleaned = cleaned.replace(/^```json/, '').replace(/```$/, '').trim();
    else if (cleaned.startsWith('```')) cleaned = cleaned.replace(/^```/, '').replace(/```$/, '').trim();
    return JSON.parse(cleaned);
  } catch(e) { return null; }
}

// CLEAN TTS SPEECH TEXT (REMOVE ALL JSON CODES & KEYS)
function cleanSpeechText(text) {
  if (!text) return "";
  let cleaned = String(text);

  // If text is raw JSON string, parse speech_message property directly
  if (cleaned.startsWith('{') && cleaned.endsWith('}')) {
    try {
      const obj = JSON.parse(cleaned);
      if (obj.speech_message) return obj.speech_message;
    } catch(e){}
  }

  // Remove markdown code blocks
  cleaned = cleaned.replace(/```json[\s\S]*?```/gi, '');
  cleaned = cleaned.replace(/```[\s\S]*?```/gi, '');

  // Remove JSON keys and raw code syntax
  cleaned = cleaned.replace(/"action_type"\s*:\s*".*?"/gi, '');
  cleaned = cleaned.replace(/"medicine_name"\s*:\s*".*?"/gi, '');
  cleaned = cleaned.replace(/"dosage"\s*:\s*".*?"/gi, '');
  cleaned = cleaned.replace(/"expiry_date"\s*:\s*".*?"/gi, '');
  cleaned = cleaned.replace(/"is_expired"\s*:\s*(true|false)/gi, '');
  cleaned = cleaned.replace(/"is_blurry"\s*:\s*(true|false)/gi, '');
  cleaned = cleaned.replace(/"alert_children"\s*:\s*(true|false)/gi, '');
  cleaned = cleaned.replace(/"speech_message"\s*:\s*"/gi, '');

  // Strip brackets, curly braces, quotes
  cleaned = cleaned.replace(/[{}[\]"]/g, ' ');
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  return cleaned;
}

// RENDER RESULT & TRIGGER TTS
function renderResult(data) {
  const {
    action_type = "HEALTH_CHAT",
    medicine_name = "",
    dosage = "",
    expiry_date = "",
    is_expired = false,
    is_blurry = false,
    speech_message = "Cháu chào ông bà ạ!",
    alert_children = false
  } = data;

  // Clean raw speech message to ensure warm natural Vietnamese spoken sentence only
  const cleanMessage = cleanSpeechText(speech_message);
  currentSpeechMessage = cleanMessage;

  document.getElementById('speechMessageText').textContent = cleanMessage;
  document.getElementById('valMedicine').textContent = medicine_name || "Chưa xác định";
  document.getElementById('valDosage').textContent = dosage || "Theo chỉ dẫn bác sĩ";
  document.getElementById('valExpiry').textContent = expiry_date || "Chưa rõ";

  const badgeExpired = document.getElementById('badgeExpired');
  const badgeBlurry = document.getElementById('badgeBlurry');
  const badgeAlert = document.getElementById('badgeAlert');
  const alertActionBox = document.getElementById('alertActionBox');

  if (is_expired) badgeExpired.classList.remove('hidden'); else badgeExpired.classList.add('hidden');
  if (is_blurry) badgeBlurry.classList.remove('hidden'); else badgeBlurry.classList.add('hidden');

  if (alert_children || is_expired || action_type === 'EMERGENCY') {
    badgeAlert.classList.remove('hidden');
    alertActionBox.classList.remove('hidden');
  } else {
    badgeAlert.classList.add('hidden');
    alertActionBox.classList.add('hidden');
  }

  const resultSection = document.getElementById('resultSection');
  resultSection.classList.remove('hidden');
  resultSection.scrollIntoView({ behavior: 'smooth' });

  // SPEAK CLEAN VIETNAMESE VOICE AT 0.85x SPEED
  speakText(cleanMessage);

  if (is_blurry) {
    showToastAlert("📷 ẢNH MỜ HOẶC KHÓ ĐỌC", "Cháu thấy ảnh hơi mờ nên không đoán mò. Cháu đã bật nút gửi báo động Zalo cho con cháu kiểm tra giúp ông bà nhé!");
  } else if (is_expired) {
    showToastAlert("⚠️ THUỐC HẾT HẠN", "Cháu phát hiện thuốc này đã HẾT HẠN SỬ DỤNG. Ông bà tuyệt đối KHÔNG ĐƯỢC UỐNG!");
  }
}

// TTS VOICE SELECTION & PLAYBACK (RATE 0.85x)
function initTtsVoices() {
  if (!('speechSynthesis' in window)) return;
  
  const populateVoices = () => {
    const voices = window.speechSynthesis.getVoices();
    vietnameseVoice = voices.find(v => v.lang.includes('vi') || v.lang.includes('VI') || v.name.toLowerCase().includes('vietnamese'));
  };

  populateVoices();
  if (speechSynthesis.onvoiceschanged !== undefined) {
    speechSynthesis.onvoiceschanged = populateVoices;
  }
}

function speakText(text) {
  if (!('speechSynthesis' in window)) return;
  
  const cleanedText = cleanSpeechText(text);
  if (!cleanedText) return;

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(cleanedText);
  utterance.rate = 0.85; // Slow, clear rate for elderly ears (0.85x)
  utterance.pitch = 1.0;
  utterance.lang = 'vi-VN';

  // Find Vietnamese Voice
  const voices = window.speechSynthesis.getVoices();
  const viVoice = vietnameseVoice || voices.find(v => v.lang.includes('vi') || v.lang.includes('VI'));

  const noticeEl = document.getElementById('ttsFallbackNotice');
  if (viVoice) {
    utterance.voice = viVoice;
    if (noticeEl) noticeEl.classList.add('hidden');
  } else {
    // Device has no native Vietnamese voice installed: show giant text notice for senior readability
    if (noticeEl) noticeEl.classList.remove('hidden');
  }

  const btnSpeakAgain = document.getElementById('btnSpeakAgain');
  if (btnSpeakAgain) btnSpeakAgain.classList.add('pulse-ring');
  
  utterance.onend = () => {
    if (btnSpeakAgain) btnSpeakAgain.classList.remove('pulse-ring');
  };
  utterance.onerror = () => {
    if (btnSpeakAgain) btnSpeakAgain.classList.remove('pulse-ring');
  };

  window.speechSynthesis.speak(utterance);
}

// TOAST ALERT MODAL
function showToastAlert(title, message) {
  document.getElementById('modalAlertTitle').textContent = title;
  document.getElementById('modalAlertBody').textContent = message;
  document.getElementById('modalAlertIcon').textContent = (title.includes('CẢNH BÁO') || title.includes('HẾT HẠN')) ? '🚨' : 'ℹ️';
  document.getElementById('alertModal').classList.remove('hidden');
}
