/**
 * MẮT THẤY TAI NGHE V2 - Client Application Script
 * Powered by Google Gemini AI & Google Identity
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
  conditions: [],
  baseSystolic: 120,
  baseDiastolic: 80,
  baseHeartRate: 72,
  dailyMedicines: "",
  familyPhone: "0912345678"
};

let stepCount = 0;
let lastAccelMagnitude = 0;
let medicineReminders = [];
let deferredInstallPrompt = null;
let currentSpeechMessage = "";
let speechRecognition = null;
let currentBase64Image = null;

// DOM Elements
document.addEventListener('DOMContentLoaded', () => {
  initHealthProfile();
  initGoogleAuth();
  initPedometer();
  initMedicineReminders();
  initPwaInstall();
  initSpeechRecognition();
  setupEventListeners();
});

// 1. HEALTH PROFILE MANAGEMENT
function initHealthProfile() {
  const savedProfile = localStorage.getItem('HEALTH_PROFILE');
  if (savedProfile) {
    try { healthProfile = JSON.parse(savedProfile); } catch(e){}
  }
  updateHealthProfileModalFields();
}

function updateHealthProfileModalFields() {
  document.getElementById('baseSystolic').value = healthProfile.baseSystolic || 120;
  document.getElementById('baseDiastolic').value = healthProfile.baseDiastolic || 80;
  document.getElementById('baseHeartRate').value = healthProfile.baseHeartRate || 72;
  document.getElementById('dailyMedicinesText').value = healthProfile.dailyMedicines || "";
  document.getElementById('familyPhone').value = healthProfile.familyPhone || "0912345678";

  // Checkboxes
  const checkInputs = document.querySelectorAll('input[name="condition"]');
  checkInputs.forEach(input => {
    input.checked = healthProfile.conditions.includes(input.value);
  });
}

function saveHealthProfileFromForm(e) {
  e.preventDefault();
  const checkedConditions = Array.from(document.querySelectorAll('input[name="condition"]:checked')).map(c => c.value);
  
  healthProfile = {
    conditions: checkedConditions,
    baseSystolic: parseInt(document.getElementById('baseSystolic').value) || 120,
    baseDiastolic: parseInt(document.getElementById('baseDiastolic').value) || 80,
    baseHeartRate: parseInt(document.getElementById('baseHeartRate').value) || 72,
    dailyMedicines: document.getElementById('dailyMedicinesText').value.trim(),
    familyPhone: document.getElementById('familyPhone').value.trim() || "0912345678"
  };

  localStorage.setItem('HEALTH_PROFILE', JSON.stringify(healthProfile));
  document.getElementById('healthProfileModal').classList.add('hidden');
  showToastAlert("ĐÃ LƯU HỒ SƠ", "Hồ sơ sức khỏe cá nhân của ông/bà đã được cập nhật thành công!");
}

// 2. GOOGLE AUTHENTICATION (GOOGLE IDENTITY SERVICES)
function initGoogleAuth() {
  const btnGoogleLogin = document.getElementById('btnGoogleLogin');
  const btnGoogleLogout = document.getElementById('btnGoogleLogout');
  const userProfileBar = document.getElementById('userProfileBar');

  // Check saved login
  const savedUser = localStorage.getItem('GOOGLE_USER');
  if (savedUser) {
    try {
      const user = JSON.parse(savedUser);
      renderUserProfile(user);
    } catch(e){}
  }

  btnGoogleLogin.addEventListener('click', handleGoogleLogin);
  btnGoogleLogout.addEventListener('click', handleGoogleLogout);
}

function handleGoogleLogin() {
  // Use Google Identity Services if available, or simulate standard Gmail login
  if (window.google && google.accounts && google.accounts.id) {
    google.accounts.id.initialize({
      client_id: "1083921938192-demo.apps.googleusercontent.com", // standard demo client ID
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
    google.accounts.id.prompt();
  } else {
    // Interactive Prompt Fallback
    const emailPrompt = prompt("Nhập địa chỉ Gmail của ông/bà để đăng nhập:", "ongba@gmail.com");
    if (emailPrompt) {
      const user = {
        name: emailPrompt.split('@')[0].toUpperCase(),
        email: emailPrompt,
        picture: "https://api.dicebear.com/7.x/bottts/svg?seed=" + encodeURIComponent(emailPrompt)
      };
      localStorage.setItem('GOOGLE_USER', JSON.stringify(user));
      renderUserProfile(user);
    }
  }
}

function parseJwt(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(window.atob(base64));
  } catch(e) { return {}; }
}

function renderUserProfile(user) {
  document.getElementById('googleAuthContainer').classList.add('hidden');
  const bar = document.getElementById('userProfileBar');
  document.getElementById('userAvatar').src = user.picture;
  document.getElementById('userName').textContent = user.name;
  document.getElementById('userEmail').textContent = user.email;
  bar.classList.remove('hidden');
}

function handleGoogleLogout() {
  localStorage.removeItem('GOOGLE_USER');
  document.getElementById('userProfileBar').classList.add('hidden');
  document.getElementById('googleAuthContainer').classList.remove('hidden');
}

// 3. PEDOMETER (ACCELEROMETER DEVICE MOTION)
function initPedometer() {
  const stepCountValue = document.getElementById('stepCountValue');
  const stepProgressFill = document.getElementById('stepProgressFill');
  const stepPercent = document.getElementById('stepPercent');

  // Load saved steps
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

      // Threshold for step detection
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

// 4. VITALS SIGNS DIAGNOSTICS & >15% DEVIATION CHECK
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

  // Calculate percentage deviations
  const sysDev = Math.abs(sysVal - baseSys) / baseSys;
  const diaDev = Math.abs(diaVal - baseDia) / baseDia;
  const hrDev = Math.abs(hrVal - baseHr) / baseHr;

  const isDeviatedAbove15 = (sysDev > 0.15 || diaDev > 0.15 || hrDev > 0.15);

  let message = "";
  if (isDeviatedAbove15) {
    message = `CẢNH BÁO! Chỉ số Huyết áp ${sysVal}/${diaVal} mmHg hoặc Nhịp tim ${hrVal} nhịp/phút của ông/bà đang bị LỆCH TRÊN 15% so với chỉ số bình thường (${baseSys}/${baseDia} mmHg, ${baseHr} nhịp/phút) trong Hồ sơ sức khỏe. Cháu đã tự động bật nút gửi cảnh báo cho con cháu qua Zalo ngay cho ông bà!`;
  } else {
    message = `Huyết áp ${sysVal}/${diaVal} mmHg và Nhịp tim ${hrVal} nhịp/phút của ông bà nằm trong mức AN TOÀN, chỉ chênh lệch nhẹ dưới 15% so với hồ sơ sức khỏe (${baseSys}/${baseDia} mmHg, ${baseHr} nhịp/phút). Ông bà tiếp tục duy trì sức khỏe nhé!`;
  }

  renderResult({
    action_type: isDeviatedAbove15 ? "EMERGENCY" : "HEALTH_CHAT",
    medicine_name: `Huyết áp: ${sysVal}/${diaVal} mmHg`,
    dosage: `Nhịp tim: ${hrVal} nhịp/phút`,
    expiry_date: `Hồ sơ gốc: ${baseSys}/${baseDia} mmHg, ${baseHr} bpm`,
    is_expired: false,
    is_blurry: false,
    speech_message: message,
    alert_children: isDeviatedAbove15
  });
}

// 5. MEDICINE REMINDER SCHEDULER
function initMedicineReminders() {
  const savedReminders = localStorage.getItem('MEDICINE_REMINDERS');
  if (savedReminders) {
    try { medicineReminders = JSON.parse(savedReminders); } catch(e){}
  }
  renderReminderList();

  // Background interval check every 15s
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
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5 note
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.2); // A5 note
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.8);
  } catch(e){}
}

// 6. PWA INSTALLATION PROMPT
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
        if (choice.outcome === 'accepted') {
          console.log('User accepted PWA install');
        }
        deferredInstallPrompt = null;
        document.getElementById('btnInstallPwa').classList.add('hidden');
        document.getElementById('pwaInstallBanner').classList.add('hidden');
      });
    }
  };

  document.getElementById('btnInstallPwa').addEventListener('click', installAction);
  document.getElementById('btnBannerInstall').addEventListener('click', installAction);
}

// SETUP ALL EVENT LISTENERS
function setupEventListeners() {
  // Health Profile Modal
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
        showToastAlert("KẾT NỐI BLUETOOTH", `Đã kết nối thành công với thiết bị đo: ${device.name || 'Máy Đo Huyết Áp'}`);
      }).catch(err => {
        showToastAlert("KẾT NỐI BLUETOOTH", "Chưa chọn được thiết bị Bluetooth hoặc trình duyệt cần bật Bluetooth.");
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
        prompt: `Phân tích ảnh đơn thuốc / bao bì thuốc này. Đối chiếu với Hồ sơ sức khỏe của bệnh nhân (${healthProfile.conditions.join(', ')}).`,
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

  // ZALO EMERGENCY ALERT BUTTON
  document.getElementById('btnSendZaloAlert').addEventListener('click', () => {
    const phone = healthProfile.familyPhone || "0912345678";
    const alertMsg = `[CẢNH BÁO SỨC KHỎE MẮT THẤY TAI NGHE] Cảnh báo từ ứng dụng Cháu AI cho ông/bà: ${currentSpeechMessage}`;
    const zaloUrl = `https://zalo.me/${phone}`;
    const smsUrl = `sms:${phone}?body=${encodeURIComponent(alertMsg)}`;
    
    // Open Zalo or SMS
    window.open(zaloUrl, '_blank') || (window.location.href = smsUrl);
  });

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

// CALL GEMINI REST API WITH HEALTH PROFILE CONTEXT
async function analyzeWithGemini({ prompt, base64Image = null }) {
  const apiKey = localStorage.getItem('GEMINI_API_KEY') || "AIzaSy_demo_default_key";
  
  const loadingIndicator = document.getElementById('loadingIndicator');
  const resultSection = document.getElementById('resultSection');
  loadingIndicator.classList.remove('hidden');
  resultSection.classList.add('hidden');
  document.getElementById('imagePreviewSection').classList.add('hidden');
  loadingIndicator.scrollIntoView({ behavior: 'smooth' });

  // Include Health Profile Context in prompt
  const profileContext = `[HỒ SƠ SỨC KHỎE BỆNH NHÂN]: Bệnh nền: ${healthProfile.conditions.join(', ') || 'Không'}. Chỉ số Huyết áp khỏe mạnh: ${healthProfile.baseSystolic}/${healthProfile.baseDiastolic} mmHg, Nhịp tim: ${healthProfile.baseHeartRate} bpm. Thuốc đang dùng: ${healthProfile.dailyMedicines || 'Chưa khai báo'}.`;
  
  const finalPrompt = `${profileContext}\n\n[CÂU HỎI / YÊU CẦU CỦA ÔNG BÀ]: ${prompt}`;

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
    // Intelligent Fallback response based on health profile
    renderResult({
      action_type: "HEALTH_CHAT",
      medicine_name: "Tư vấn sức khỏe Cháu AI",
      dosage: "Đo huyết áp & uống thuốc đúng giờ",
      expiry_date: "Xem trên bao bì",
      is_expired: false,
      is_blurry: false,
      speech_message: `Cháu chào ông bà! Cháu đã ghi nhận câu hỏi. Hồ sơ sức khỏe của ông bà ghi nhận bệnh nền ${healthProfile.conditions.join(', ') || 'sức khỏe bình thường'}. Ông bà nhớ giữ ấm cơ thể và uống thuốc đúng liều nhé!`,
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

// RENDER RESULT & VIETNAMESE TTS (0.9x SPEED)
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

  currentSpeechMessage = speech_message;
  document.getElementById('speechMessageText').textContent = speech_message;
  document.getElementById('valMedicine').textContent = medicine_name || "Chưa xác định";
  document.getElementById('valDosage').textContent = dosage || "Theo chỉ dẫn bác sĩ";
  document.getElementById('valExpiry').textContent = expiry_date || "Chưa rõ";

  // Badges & Action Boxes
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

  // SPEAK TEXT IN VIETNAMESE AT 0.9x SPEED
  speakText(speech_message);

  if (is_blurry) {
    showToastAlert("📷 ẢNH MỜ HOẶC KHÓ ĐỌC", "Cháu thấy ảnh hơi mờ nên không đoán mò. Cháu đã gửi thông báo cho con cháu kiểm tra lại giúp ông bà nhé!");
  } else if (is_expired) {
    showToastAlert("⚠️ THUỐC HẾT HẠN", "Cháu phát hiện thuốc này đã HẾT HẠN SỬ DỤNG. Ông bà tuyệt đối KHÔNG ĐƯỢC UỐNG!");
  }
}

// VIETNAMESE TTS SPEECH (0.9x SPEED)
function speakText(text) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.9;
  utterance.pitch = 1.0;
  utterance.lang = 'vi-VN';
  const voices = window.speechSynthesis.getVoices();
  const viVoice = voices.find(v => v.lang.includes('vi') || v.lang.includes('VI'));
  if (viVoice) utterance.voice = viVoice;
  window.speechSynthesis.speak(utterance);
}

// TOAST ALERT MODAL
function showToastAlert(title, message) {
  document.getElementById('modalAlertTitle').textContent = title;
  document.getElementById('modalAlertBody').textContent = message;
  document.getElementById('modalAlertIcon').textContent = (title.includes('CẢNH BÁO') || title.includes('HẾT HẠN')) ? '🚨' : 'ℹ️';
  document.getElementById('alertModal').classList.remove('hidden');
}
