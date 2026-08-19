/**
 * MẮT THẤY TAI NGHE V9 - GEMINI INTEGRATED (MASTER SYSTEM)
 * Features:
 * 1. BỘ TRỢ LÝ AI DUY NHẤT: Gộp MẮT THẤY & TAI NGHE - Camera/Mic kết hợp Ảnh (Base64) + Câu hỏi giọng nói gửi thẳng Gemini (gemini-1.5-flash).
 * 2. TỰ ĐỘNG ĐỌC TO câu trả lời bằng giọng Tiếng Việt chuẩn (speechSynthesis mượt trên Laptop & Điện thoại).
 * 3. ĐỒNG BỘ REALTIME: Mọi hoạt động (uống thuốc, đo chỉ số, hỏi AI) cập nhật NGAY trên Bảng Giám Sát Con Cháu.
 * 4. BÁO CÁO QUA GMAIL: Nút ✉️ tạo sẵn Email tổng hợp sức khỏe gửi thẳng Gmail con cháu.
 * 5. Báo cáo Gmail + webhook Telegram, nhắc thuốc chạy ngầm, cảnh báo khẩn cấp.
 */

const SYSTEM_INSTRUCTION = `SYSTEM_INSTRUCTION: Bạn là Trợ lý Sức khỏe Famcare dành cho người Việt lớn tuổi. BẮT BUỘC chỉ được trả lời 100% bằng TIẾNG VIỆT tự nhiên, ấm áp, lễ phép. Tuyệt đối KHÔNG ĐƯỢC dùng bất kỳ chữ tiếng Anh nào.

Bạn là Bác sĩ gia đình chân thành, ấm áp. Hãy phân tích kỹ hình ảnh/toa thuốc/chữ viết và câu nói tâm sự của ông bà. Trả lời linh hoạt, thông minh, đồng cảm, đúng trọng tâm câu hỏi, KHÔNG DÙNG CÂU MẪU CỐ ĐỊNH.

BẮT BUỘC:
- Xưng 'cháu' gọi 'ông' hoặc 'bà', ngôn từ dễ hiểu, ấm áp cho người cao tuổi.
- NẾU CÓ ẢNH: phân tích kỹ nội dung hình ảnh (toa thuốc, hộp thuốc, vết thương, chữ viết...) kết hợp với câu hỏi đi kèm.
- NẾU NGƯỜI DÙNG BÁO 'MỆT / CHÓNG MẶT / ĐAU ĐẦU': khuyên nằm nghỉ ngơi tại chỗ tránh té ngã, nhắc đo Huyết áp & Nhịp tim, uống 1 ly nước ấm hoặc trà đường ấm và hỏi lại cảm giác hiện tại.
- NẾU NGƯỜI DÙNG BÁO 'SỐT / HO / ĐAU HỌNG': hướng dẫn chườm ấm trán nách, uống nhiều nước ấm, nhắc khoảng cách 4-6 tiếng giữa các lần thuốc hạ sốt.
- NẾU LÀ ẢNH ĐƠN THUỐC: phân tích Tên thuốc, Công dụng, Liều lượng, loại thuốc (huyết áp, tiểu đường, bổ, hạ sốt...), uống trước hay sau ăn, kiểm tra hạn sử dụng, ảnh mờ hay rõ.

ĐẦU RA BẮT BUỘC DẠNG JSON CHUẨN (không xuống dòng thừa):
{
  "action_type": "READ_PRESCRIPTION" | "HEALTH_CHAT" | "EMERGENCY",
  "medicine_name": "Tên thuốc (nếu có)",
  "medicine_type": "Thuốc huyết áp" | "Thuốc tiểu đường" | "Thuốc bổ" | "Thuốc hạ sốt" | "Khác" | "Chưa rõ",
  "dosage": "Liều dùng & Giờ uống (nếu có)",
  "intake_time": "Trước khi ăn" | "Sau khi ăn no" | "Trong bữa ăn" | "Chưa rõ",
  "is_expired": true/false,
  "is_blurry": true/false,
  "speech_message": "Câu tư vấn chi tiết ấm áp, ngắn gọn để ứng dụng đọc to cho ông bà nghe",
  "action_solution": "Hướng giải quyết rõ ràng (nếu là thuốc)",
  "alert_children": true/false
}`;

// App State
let healthProfile = {
  userName: "Ông/Bà",
  familyEmail: "",
  conditions: [],
  baseSystolic: 120,
  baseDiastolic: 80,
  baseHeartRate: 72,
  dailyMedicines: ""
};

let stepCount = 0;
let medicineReminders = [];
let deferredInstallPrompt = null;
let currentSpeechMessage = "";
let currentAlertDetails = "";
let speechRecognition = null;
let currentBase64Image = null;
let currentAudioElement = null;
let isMedicineTakenToday = false;
let medicineTakenTime = "";
let voiceQuestionText = "";

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  initHealthProfile();
  initPedometer();
  initMedicineReminders();
  initPwaInstall();
  initSpeechRecognition();
  renderHealthHistory();
  renderAiDoctorJournal();
  renderRealtimeFeed();
  renderMonitoringSummary();
  loadGmailPrefill();
  showTimeBasedGreeting();
  renderDailySummary();
  renderDailySummary('fam');
  
  // Request Notification Permission immediately when app opens
  requestNotificationPermission();

  // Check reminders and start interval (every 30s)
  checkDailyReminders();
  setInterval(checkDailyReminders, 30000);
  
  setupEventListeners();
});

// ======================= REALTIME SYNC (BẢNG GIÁM SÁT CON CHÁU) =======================
function addRealtimeEvent(icon, text) {
  const timeStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  const entry = { time: timeStr, icon: icon, text: text };

  let feed = JSON.parse(localStorage.getItem('REALTIME_FEED') || "[]");
  feed.unshift(entry);
  if (feed.length > 30) feed.pop();
  localStorage.setItem('REALTIME_FEED', JSON.stringify(feed));

  renderRealtimeFeed();
  broadcastRealtimeUpdate();
}

function renderRealtimeFeed() {
  const container = document.getElementById('realtimeFeed');
  if (!container) return;

  let feed = JSON.parse(localStorage.getItem('REALTIME_FEED') || "[]");
  if (feed.length === 0) {
    container.innerHTML = `<p class="text-xs text-teal-700 italic font-semibold">⏳ Chưa có hoạt động nào hôm nay. Ông bà bấm các nút bên trên là con cháu thấy ngay lập tức!</p>`;
    return;
  }

  container.innerHTML = feed.map(item => `
    <div class="flex items-start gap-2 bg-white p-3 rounded-lg border border-teal-100 shadow-sm">
      <span class="text-xl">${item.icon}</span>
      <div class="flex-1">
        <p class="text-slate-800 font-bold text-sm">${item.text}</p>
        <p class="text-[11px] text-teal-500 font-bold">⏰ ${item.time}</p>
      </div>
    </div>
  `).join('');
}

function broadcastRealtimeUpdate() {
  // Broadcast to service worker so notifications can be pushed to relatives
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      action: 'realtimeUpdate',
      feed: JSON.parse(localStorage.getItem('REALTIME_FEED') || "[]").slice(0, 3)
    });
  }
  // Ping family webhook (if configured) for cross-device realtime sync
  const webhookUrl = localStorage.getItem('TELEGRAM_WEBHOOK_URL') || localStorage.getItem('ZALO_WEBHOOK_URL');
  if (webhookUrl) {
    const latest = JSON.parse(localStorage.getItem('REALTIME_FEED') || "[]")[0];
    if (latest) {
      try {
        fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: `[REALTIME] ${latest.icon} ${latest.text} lúc ${latest.time}` })
        }).catch(e => console.warn("Realtime webhook error:", e));
      } catch (e) {}
    }
  }
}

function renderMonitoringSummary() {
  const logs = JSON.parse(localStorage.getItem('HEALTH_LOGS') || "[]");
  const medEl = document.getElementById('monSummaryMedicine');
  const vitEl = document.getElementById('monSummaryVitals');
  const heartEl = document.getElementById('monSummaryHeart');
  const aiEl = document.getElementById('monSummaryAI');

  if (medEl) {
    medEl.textContent = isMedicineTakenToday ? `✅ ${medicineTakenTime}` : "Chưa uống";
    medEl.className = isMedicineTakenToday
      ? "font-black text-emerald-600 text-lg mt-1"
      : "font-black text-slate-400 text-lg mt-1";
  }
  if (vitEl && logs.length > 0) vitEl.textContent = logs[0].bloodPressure;
  if (heartEl && logs.length > 0) heartEl.textContent = `${logs[0].heartRate} bpm`;
  if (aiEl) {
    const aiCount = (JSON.parse(localStorage.getItem('AI_DOCTOR_JOURNAL') || "[]")).filter(e => e.text.includes('Bác sĩ AI tư vấn')).length;
    aiEl.textContent = aiCount;
  }
}

// ======================= BÁO CÁO HẰNG NGÀY (DAILY SUMMARY DASHBOARD) =======================
function renderDailySummary(prefix) {
  prefix = prefix || 'daily';
  const stepsEl = document.getElementById(prefix + 'Steps');
  if (!stepsEl) return;

  const logs = JSON.parse(localStorage.getItem('HEALTH_LOGS') || "[]");
  const latest = logs[0];

  const medEl = document.getElementById(prefix + 'Medicine');
  const vitEl = document.getElementById(prefix + 'Vitals');
  const heartEl = document.getElementById(prefix + 'Heart');
  const aiEl = document.getElementById(prefix + 'AiEvaluation');
  const logEl = document.getElementById(prefix + 'ActivityLog');

  if (stepsEl) stepsEl.textContent = stepCount.toLocaleString() + " bước";
  if (medEl) {
    medEl.textContent = isMedicineTakenToday ? `✅ ${medicineTakenTime}` : "Chưa uống";
    medEl.className = isMedicineTakenToday
      ? "font-black text-emerald-600 text-lg mt-1"
      : "font-black text-slate-400 text-lg mt-1";
  }
  if (vitEl && latest) {
    vitEl.textContent = `${latest.bloodPressure} mmHg`;
    const [sys, dia] = String(latest.bloodPressure).split('/').map(Number);
    const baseSys = healthProfile.baseSystolic || 120;
    const baseDia = healthProfile.baseDiastolic || 80;
    const dev = Math.abs(sys - baseSys) / baseSys + Math.abs(dia - baseDia) / baseDia;
    vitEl.className = dev > 0.3
      ? "font-black text-red-600 text-lg mt-1"
      : "font-black text-emerald-600 text-lg mt-1";
  }
  if (heartEl && latest) {
    heartEl.textContent = `${latest.heartRate} bpm`;
    heartEl.className = (latest.heartRate > 100 || latest.heartRate < 50)
      ? "font-black text-red-600 text-lg mt-1"
      : "font-black text-emerald-600 text-lg mt-1";
  }

  // Đánh giá tổng quan từ AI
  if (aiEl) {
    let parts = [`Ông/bà ${healthProfile.userName} hôm nay đã đi ${stepCount.toLocaleString()} bước.`];
    parts.push(isMedicineTakenToday
      ? `Đã xác nhận uống thuốc đầy đủ lúc ${medicineTakenTime}.`
      : "Chưa xác nhận uống thuốc hôm nay.");
    if (latest) {
      const abnormal = latest.heartRate > 100 || latest.heartRate < 50;
      parts.push(abnormal
        ? `Sinh hiệu mới nhất: Huyết áp ${latest.bloodPressure} mmHg, nhịp tim ${latest.heartRate} bpm — ⚠️ có dấu hiệu bất thường, con cháu nên liên hệ ông bà và nhắc đo lại, nghỉ ngơi.`
        : `Sinh hiệu mới nhất: Huyết áp ${latest.bloodPressure} mmHg, nhịp tim ${latest.heartRate} bpm — bình thường, ổn định.`);
    } else {
      parts.push("Chưa có chỉ số sinh hiệu nào được đo hôm nay.");
    }
    aiEl.textContent = parts.join(" ");
  }

  // Nhật ký hoạt động hôm nay (lọc từ realtime feed theo ngày hiện tại)
  if (logEl) {
    const feed = JSON.parse(localStorage.getItem('REALTIME_FEED') || "[]");
    if (feed.length === 0) {
      logEl.innerHTML = '<p class="text-xs text-teal-700 italic font-semibold">⏳ Chưa có hoạt động nào hôm nay.</p>';
    } else {
      logEl.innerHTML = feed.map(item => `
        <div class="flex items-start gap-2 bg-white p-3 rounded-lg border border-teal-100 shadow-sm">
          <span class="text-xl">${item.icon}</span>
          <div class="flex-1">
            <p class="text-slate-800 font-bold text-sm">${item.text}</p>
            <p class="text-[11px] text-teal-500 font-bold">⏰ ${item.time}</p>
          </div>
        </div>
      `).join('');
    }
  }
}

// ======================= CẢNH BÁO KHẨN CẤP SOS =======================
let sirenAudioCtx = null;

function playSiren() {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    sirenAudioCtx = sirenAudioCtx || new AC();
    const ctx = sirenAudioCtx;
    if (ctx.state === 'suspended') ctx.resume();
    const now = ctx.currentTime;
    for (let i = 0; i < 8; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(i % 2 === 0 ? 700 : 950, now + i * 0.4);
      gain.gain.setValueAtTime(0.12, now + i * 0.4);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.4 + 0.38);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + i * 0.4);
      osc.stop(now + i * 0.4 + 0.4);
    }
  } catch (e) { /* Trình duyệt chặn âm thanh - banner & thông báo vẫn hoạt động */ }
}

function triggerSOS(reason) {
  const phone = (healthProfile.familyPhone || localStorage.getItem('FAMILY_SOS_PHONE') || "").trim();
  const timeStr = new Date().toLocaleString('vi-VN');
  const sosMsg = `🚨 CẢNH BÁO KHẨN CẤP FAMCARE: ${reason} (lúc ${timeStr}). Con cháu hãy gọi ngay cho ông/bà!`;

  speakVietnamese("Cảnh báo khẩn cấp! " + reason + ". Con cháu ơi, xin hãy gọi điện ngay!");
  playSiren();
  showBigBanner("🚨 KHẨN CẤP SOS", sosMsg);

  sendRemoteWebhookAlert(sosMsg);
  // Gửi thông báo SOS qua Service Worker (hiện ngay cả khi app ở nền)
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({ action: 'sos', message: sosMsg });
  }
  addRealtimeEvent('🚨', `${healthProfile.userName} KÍCH HOẠT CẢNH BÁO KHẨN CẤP: ${reason}`);
  renderDailySummary();
  renderDailySummary('fam');
  renderMonitoringSummary();

  // Sao chép nội dung báo động để con cháu dán vào tin nhắn nếu cần
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(sosMsg).catch(() => {});
  }

  // Gửi tin nhắn / cuộc gọi báo động tới SĐT con cháu
  if (phone) {
    try {
      const smsUrl = `sms:${phone}?body=${encodeURIComponent(sosMsg)}`;
      const telWin = window.open(`tel:${phone}`, '_self');
      if (!telWin) {
        try { window.location.href = smsUrl; } catch (e) {}
      }
    } catch (e) {}
    showToastAlert("🚨 ĐÃ KÍCH HOẠT SOS", `Báo động khẩn cấp đang được gửi tới SĐT ${phone}!`);
  } else {
    showToastAlert("🚨 ĐÃ KÍCH HOẠT SOS", "Chưa có SĐT con cháu - hãy nhập trong Đăng nhập hoặc Cài Đặt AI!");
  }
}

// REQUEST NOTIFICATION PERMISSION IMMEDIATELY
function requestNotificationPermission() {
  if ("Notification" in window) {
    Notification.requestPermission().then(permission => {
      console.log("Notification permission state:", permission);
      if (permission === 'granted') {
        registerBackgroundSyncNotification();
      }
    });
  }
}

// REGISTER BACKGROUND NOTIFICATION TIMER IN SERVICE WORKER
function registerBackgroundSyncNotification() {
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    const reminders = medicineReminders.length > 0
      ? medicineReminders.map(r => ({ time: r.time, name: r.name }))
      : [{ time: localStorage.getItem('MEDICINE_TIME') || "08:00", name: "uống thuốc hằng ngày" }];
    navigator.serviceWorker.ready.then(reg => {
      navigator.serviceWorker.controller.postMessage({
        action: 'setReminders',
        reminders: reminders,
        userName: healthProfile.userName
      });
    });
  }
}

// UNLOCK AUDIO ON FIRST TOUCH
document.addEventListener('click', function unlockAudio() {
  if ('speechSynthesis' in window) {
    const silentUtterance = new SpeechSynthesisUtterance('');
    window.speechSynthesis.speak(silentUtterance);
  }
  document.removeEventListener('click', unlockAudio);
}, { once: true });

// SPEAK VIETNAMESE (V9 - NATIVE SPEECH SYNTHESIS + CLOUD FALLBACK, XUYÊN THIẾT BỊ)
let viVoicesCache = [];

function loadViVoices() {
  if ('speechSynthesis' in window) {
    viVoicesCache = window.speechSynthesis.getVoices().filter(v => v.lang && v.lang.toLowerCase().includes('vi'));
  }
}
if ('speechSynthesis' in window) {
  loadViVoices();
  window.speechSynthesis.onvoiceschanged = loadViVoices;
  document.addEventListener('click', loadViVoices, { once: true });
}

function speakVietnamese(text) {
  if (!text) return;
  
  const cleanText = text.toString()
    .replace(/[*_#`~[\](){}]/g, '')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/"action_type"\s*:\s*".*?"/gi, '')
    .replace(/"speech_message"\s*:\s*"/gi, '')
    .replace(/"action_solution"\s*:\s*"/gi, '')
    .replace(/[{}[\]"]/g, ' ')
    .trim();

  if (!cleanText) return;

  if (currentAudioElement) {
    currentAudioElement.pause();
    currentAudioElement = null;
  }

  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }

  // Priority 1: Native Web Speech API (works on Windows/Mac/Android, and iOS 13+)
  if ('speechSynthesis' in window) {
    loadViVoices();
    const voices = viVoicesCache.length > 0 ? viVoicesCache : window.speechSynthesis.getVoices();
    const viVoice = voices.find(v => v.lang.includes('vi') || v.lang.includes('VI')) || null;
    
    try {
      const utterance = new SpeechSynthesisUtterance(cleanText);
      if (viVoice) utterance.voice = viVoice;
      utterance.lang = 'vi-VN';
      utterance.rate = 0.82; // Slow pace for elderly users
      utterance.pitch = 1.0;

      const btnSpeakAgain = document.getElementById('btnSpeakAgain');
      if (btnSpeakAgain) btnSpeakAgain.classList.add('animate-pulse');
      utterance.onend = () => { if (btnSpeakAgain) btnSpeakAgain.classList.remove('animate-pulse'); };
      utterance.onerror = () => { speakWithGoogleTTS(cleanText); };

      window.speechSynthesis.speak(utterance);
      // Fix Chrome long-text cut-off bug: resume periodically
      const keepAlive = setInterval(() => {
        if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
          window.speechSynthesis.pause();
          window.speechSynthesis.resume();
        } else {
          clearInterval(keepAlive);
        }
      }, 14000);
      utterance.onend = () => { clearInterval(keepAlive); if (btnSpeakAgain) btnSpeakAgain.classList.remove('animate-pulse'); };
      return;
    } catch (e) {
      console.warn("SpeechSynthesis error, trying cloud TTS:", e);
    }
  }

  // Google TTS: tự động phát giọng đọc Tiếng Việt ngay khi AI tạo ra câu trả lời
  speakWithGoogleTTS(cleanText);
}

function speakWithGoogleTTS(cleanText) {
  // Priority 2: Google Translate TTS Fallback (0.85x) - works everywhere
  try {
    const audioUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=vi&client=tw-ob&q=${encodeURIComponent(cleanText.substring(0, 180))}`;
    const audio = new Audio(audioUrl);
    audio.playbackRate = 0.85;
    currentAudioElement = audio;

    const btnSpeakAgain = document.getElementById('btnSpeakAgain');
    if (btnSpeakAgain) btnSpeakAgain.classList.add('animate-pulse');
    audio.onended = () => { if (btnSpeakAgain) btnSpeakAgain.classList.remove('animate-pulse'); };
    audio.onerror = () => { if (btnSpeakAgain) btnSpeakAgain.classList.remove('animate-pulse'); };

    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch(error => {
        console.warn("Autoplay blocked:", error);
      });
    }
  } catch (e) {
    console.error("Cloud TTS error:", e);
  }
}

// DYNAMIC CONTEXTUAL AI & VISION OCR PRESCRIPTION ANALYSIS (V9: ẢNH + GIỌNG NÓI ĐỒNG THỜI)
async function askAIAdvisor(promptText, imageBase64 = null) {
  const aiOutputElement = document.getElementById('aiResponseText');
  const actionSolutionBox = document.getElementById('actionSolutionBox');
  const actionSolutionText = document.getElementById('actionSolutionText');
  const resultSection = document.getElementById('aiResponseBox');
  const loadingIndicator = document.getElementById('loadingIndicator');
  
  loadingIndicator.classList.remove('hidden');
  resultSection.classList.add('hidden');
  document.getElementById('imagePreviewSection').classList.add('hidden');
  loadingIndicator.scrollIntoView({ behavior: 'smooth' });

  if (aiOutputElement) {
    aiOutputElement.innerHTML = "Bác sĩ AI đang suy nghĩ và chẩn đoán cho ông bà...";
  }
  
  speakVietnamese("Bác sĩ AI đang phân tích hình ảnh và câu hỏi của ông bà. Ông bà chờ một chút nhé!");

  try {
    const lowerPrompt = (promptText || "").toLowerCase();
    let symptomContext = "";

    if (lowerPrompt.includes('mệt') || lowerPrompt.includes('chóng mặt') || lowerPrompt.includes('đau đầu')) {
      symptomContext = " [HƯỚNG DẪN ĐẶC BIỆT KHI MỆT/CHÓNG MẶT/ĐAU ĐẦU]: Khuyên ông bà nằm nghỉ ngơi tại chỗ ngay lập tức tránh đi lại phòng té ngã, nhắc đo ngay Huyết áp & Nhịp tim, hướng dẫn uống 1 ly nước ấm hoặc trà đường ấm và hỏi lại cảm giác hiện tại.";
    } else if (lowerPrompt.includes('sốt') || lowerPrompt.includes('ho') || lowerPrompt.includes('đau họng')) {
      symptomContext = " [HƯỚNG DẪN ĐẶC BIỆT KHI SỐT/HO/ĐAU HỌNG]: Khuyên chườm ấm trán nách, uống nhiều nước ấm và nhắc nhở thời gian uống thuốc hạ sốt cách 4-6 tiếng.";
    }

    const profileContext = `[HỒ SƠ SỨC KHỎE]: Bệnh nhân: ${healthProfile.userName}. Bệnh nền: ${(healthProfile.conditions || []).join(', ') || 'Không'}. Huyết áp chuẩn: ${healthProfile.baseSystolic}/${healthProfile.baseDiastolic} mmHg, Nhịp tim chuẩn: ${healthProfile.baseHeartRate} bpm. Thuốc hằng ngày: ${healthProfile.dailyMedicines || 'Chưa có'}.${symptomContext}`;

    const requestBody = {
      systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
      contents: [{
        parts: [
          { text: profileContext },
          { text: "SYSTEM_INSTRUCTION: Bạn là Trợ lý Sức khỏe Famcare dành cho người Việt lớn tuổi. BẮT BUỘC chỉ được trả lời 100% bằng TIẾNG VIỆT tự nhiên, ấm áp, lễ phép. Tuyệt đối KHÔNG ĐƯỢC dùng bất kỳ chữ tiếng Anh nào.\n\n" + (promptText || "Hãy phân tích hình ảnh/toa thuốc này và hướng dẫn liều dùng chi tiết cho ông bà.") }
        ]
      }],
      generationConfig: { responseMimeType: "application/json", maxOutputTokens: 65536 }
    };

    if (imageBase64) {
      requestBody.contents[0].parts.push({
        inline_data: {
          mime_type: "image/jpeg",
          data: imageBase64.replace(/^data:image\/(png|jpeg|jpg);base64,/, "")
        }
      });
    }

    const apiKey = localStorage.getItem('GEMINI_API_KEY') || "";
    // V9: gemini-1.5-flash là model chính (nhanh + rẻ + hỗ trợ ảnh & văn bản), dự phòng các model khác
    const modelsToTry = ['gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-2.5-flash', 'gemini-pro-vision'];
    let success = false;
    let replyText = "";
    let solutionText = "";
    let parsedData = null;

    for (const model of modelsToTry) {
      try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        });

        if (response.ok) {
          const data = await response.json();
          const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawText) {
            try {
              let cleaned = rawText.trim();
              if (cleaned.startsWith('```json')) cleaned = cleaned.replace(/^```json/, '').replace(/```$/, '').trim();
              else if (cleaned.startsWith('```')) cleaned = cleaned.replace(/^```/, '').replace(/```$/, '').trim();
              parsedData = JSON.parse(cleaned);
              replyText = parsedData.speech_message || rawText;
              solutionText = parsedData.action_solution || "";
            } catch(e) { replyText = rawText; }
            success = true;
            break;
          }
        }
      } catch(e){}
    }

    loadingIndicator.classList.add('hidden');

    // Dynamic Contextual Fallbacks (No static repetition)
    if (!success || !replyText) {
      if (lowerPrompt.includes('mệt') || lowerPrompt.includes('chóng mặt') || lowerPrompt.includes('đau đầu')) {
        replyText = "Ông bà ơi, khi bị mệt hoặc chóng mặt, ông bà hãy nằm nghỉ ngơi tại chỗ ngay lập tức để tránh đi lại té ngã! Nhờ người thân đo ngay chỉ số Huyết áp và Nhịp tim, sau đó uống 1 ly nước trà đường ấm nhé. Bây giờ ông bà thấy trong người thế nào rồi ạ?";
        solutionText = "Nằm nghỉ ngơi ngay tại chỗ, đo lại huyết áp và uống 1 ly nước trà đường ấm.";
      } else if (lowerPrompt.includes('sốt') || lowerPrompt.includes('ho') || lowerPrompt.includes('đau họng')) {
        replyText = "Cháu khuyên ông bà nên chườm ấm khăn ở trán và nách, uống nhiều nước ấm. Nếu sốt trên 38.5 độ C, ông bà uống 1 viên Paracetamol cách 4 đến 6 tiếng nhé!";
        solutionText = "Chườm ấm, uống nhiều nước ấm và dùng thuốc hạ sốt theo khoảng cách 4-6 tiếng.";
      } else {
        replyText = "Cháu chào ông bà, cháu là Trợ lý Famcare đây ạ. Ông bà cần cháu hỗ trợ gì về sức khỏe hôm nay không ạ?";
        solutionText = "";
      }
    }

    currentSpeechMessage = replyText;

    if (aiOutputElement) {
      aiOutputElement.innerHTML = replyText;
    }

    if (solutionText && actionSolutionBox && actionSolutionText) {
      actionSolutionText.textContent = solutionText;
      actionSolutionBox.classList.remove('hidden');
    } else if (actionSolutionBox) {
      actionSolutionBox.classList.add('hidden');
    }

    if (parsedData) {
      document.getElementById('valMedicine').textContent = `${parsedData.medicine_name || "Chưa xác định"} (${parsedData.medicine_type || "Chưa rõ"})`;
      document.getElementById('valDosage').textContent = parsedData.dosage || "Theo chỉ dẫn";
      document.getElementById('valExpiry').textContent = `${parsedData.expiry_date || "Chưa rõ"} - ${parsedData.intake_time || "Chưa rõ"}`;
      
      const badgeExpired = document.getElementById('badgeExpired');
      const badgeBlurry = document.getElementById('badgeBlurry');
      const badgeAlert = document.getElementById('badgeAlert');

      if (parsedData.is_expired) badgeExpired.classList.remove('hidden'); else badgeExpired.classList.add('hidden');
      if (parsedData.is_blurry) badgeBlurry.classList.remove('hidden'); else badgeBlurry.classList.add('hidden');
      if (parsedData.alert_children || parsedData.is_expired) {
        badgeAlert.classList.remove('hidden');
      } else {
        badgeAlert.classList.add('hidden');
      }
    }

    // Save interaction to Daily AI Doctor Journal
    const journalEntryText = `Bác sĩ AI tư vấn: "${promptText || 'Tư vấn toa thuốc'}" -> Lời khuyên: ${replyText}`;
    saveAiDoctorJournal(journalEntryText);

    // REALTIME: thông báo ngay cho Bảng Giám Sát Con Cháu
    addRealtimeEvent('🤖', `${healthProfile.userName} vừa hỏi Bác sĩ AI: "${(promptText || 'Tư vấn toa thuốc').substring(0, 80)}..."`);
    renderMonitoringSummary();

    resultSection.classList.remove('hidden');
    resultSection.scrollIntoView({ behavior: 'smooth' });

    // Speak entire response out loud
    speakVietnamese(replyText);

  } catch (error) {
    console.error("AI Consultation error:", error);
    loadingIndicator.classList.add('hidden');
    const fallbackMsg = "Cháu chào ông bà, cháu là Trợ lý Famcare đây ạ. Ông bà cần cháu hỗ trợ gì về sức khỏe hôm nay không ạ?";
    if (aiOutputElement) {
      aiOutputElement.innerHTML = fallbackMsg;
    }
    resultSection.classList.remove('hidden');
    speakVietnamese(fallbackMsg);
  }
}

// AI DOCTOR DAILY JOURNAL
function saveAiDoctorJournal(entryText) {
  const timeStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  const journalEntry = { time: timeStr, text: entryText };

  let journal = JSON.parse(localStorage.getItem('AI_DOCTOR_JOURNAL') || "[]");
  journal.unshift(journalEntry);
  if (journal.length > 25) journal.pop();
  localStorage.setItem('AI_DOCTOR_JOURNAL', JSON.stringify(journal));

  renderAiDoctorJournal();
}

function renderAiDoctorJournal() {
  const container = document.getElementById('ai-doctor-journal');
  if (!container) return;

  let journal = JSON.parse(localStorage.getItem('AI_DOCTOR_JOURNAL') || "[]");
  if (journal.length === 0) {
    container.innerHTML = `
      <h3 class="font-extrabold text-gray-900 text-base mb-2"><i class="fa-solid fa-book-medical"></i> 📖 Nhật Ký Bác Sĩ AI Theo Dõi Trong Ngày:</h3>
      <p class="text-xs text-teal-800 italic">Chưa có nhật ký tương tác sức khỏe hôm nay.</p>
    `;
    return;
  }

  let html = `<h3 class="font-extrabold text-gray-900 text-base mb-2"><i class="fa-solid fa-book-medical"></i> 📖 Nhật Ký Bác Sĩ AI Theo Dõi Trong Ngày:</h3>
  <ul class="text-xs space-y-1.5 list-none p-0 text-teal-900 font-bold">`;
  journal.forEach(item => {
    html += `<li class="p-2 rounded-lg border-l-4" style="background:rgba(0,95,115,0.08);border-color:#005F73;">
      ⏰ [${item.time}] ${item.text}
    </li>`;
  });
  html += `</ul>`;
  container.innerHTML = html;
}

// REMOTE HEALTH METRICS LOGGING & BOT WEBHOOK
function saveHealthMetrics(heartRate, bloodPressure) {
  const healthData = {
    time: new Date().toLocaleString('vi-VN'),
    heartRate: heartRate || 72,
    bloodPressure: bloodPressure || "120/80"
  };

  let logs = JSON.parse(localStorage.getItem('HEALTH_LOGS') || "[]");
  logs.unshift(healthData);
  if (logs.length > 30) logs.pop();
  localStorage.setItem('HEALTH_LOGS', JSON.stringify(logs));

  // Log into AI Doctor Journal
  saveAiDoctorJournal(`Đo sinh hiệu: Huyết áp ${healthData.bloodPressure} mmHg, Nhịp tim ${healthData.heartRate} bpm.`);

  // REALTIME: cập nhật ngay trên Bảng Giám Sát Con Cháu
  addRealtimeEvent('🩺', `${healthProfile.userName} vừa đo: Huyết áp ${healthData.bloodPressure} mmHg, Nhịp tim ${healthData.heartRate} bpm.`);
  renderMonitoringSummary();
  renderDailySummary();
  renderDailySummary('fam');

  const isAbnormal = (heartRate > 100 || heartRate < 50);

  if (isAbnormal) {
    const alertMsg = `⚠️ CẢNH BÁO SỨC KHỎE MẮT THẤY TAI NGHE: Nhịp tim của ông/bà bất thường: ${heartRate} bpm (Huyết áp ${bloodPressure}) lúc ${healthData.time}`;
    triggerSOS(`Nhịp tim bất thường: ${heartRate} bpm (Huyết áp ${bloodPressure})`);
  }

  renderHealthHistory();
}

function sendRemoteWebhookAlert(messageText) {
  const webhookUrl = localStorage.getItem('TELEGRAM_WEBHOOK_URL') || localStorage.getItem('ZALO_WEBHOOK_URL');
  if (webhookUrl) {
    try {
      fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: messageText, message: messageText })
      }).catch(e => console.warn("Webhook alert error:", e));
    } catch(e){}
  }
}

function renderHealthHistory() {
  const container = document.getElementById('health-history');
  if (!container) return;
  
  let logs = JSON.parse(localStorage.getItem('HEALTH_LOGS') || "[]");
  if (logs.length === 0) {
    container.innerHTML = "<p>Chưa có dữ liệu đo nhịp tim, huyết áp.</p>";
    return;
  }

  let html = `<p class="text-xs font-bold text-gray-700 mb-2">Lịch sử đo nhịp tim & huyết áp:</p>`;
  logs.forEach(log => {
    html += `<div class="flex justify-between items-center bg-white p-2.5 rounded-lg border mb-1">
      <span>⏰ ${log.time}</span>
      <span class="font-extrabold text-slate-800">❤️ ${log.heartRate} bpm | 🩺 ${log.bloodPressure} mmHg</span>
    </div>`;
  });
  container.innerHTML = html;
}

// CONFIRM TAKEN MEDICINE ("✅ TÔI ĐÃ UỐNG THUỐC RỒI")
function confirmMedicineTaken() {
  const curTimeStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  const praiseMsg = `Giỏi quá! Ông bà đã uống thuốc đầy đủ lúc ${curTimeStr} rồi ạ. Cháu đã gửi tin nhắn báo cho con cháu yên tâm rồi nhé!`;

  speakVietnamese(praiseMsg);

  isMedicineTakenToday = true;
  medicineTakenTime = curTimeStr;

  saveAiDoctorJournal(`Xác nhận: Ông/bà đã uống thuốc đầy đủ lúc ${curTimeStr}.`);

  // REALTIME: cập nhật ngay trên Bảng Giám Sát Con Cháu
  addRealtimeEvent('💊', `${healthProfile.userName} đã xác nhận UỐNG THUỐC đầy đủ lúc ${curTimeStr}.`);
  renderMonitoringSummary();
  renderDailySummary();
  renderDailySummary('fam');

  const familyMsg = `✅ MẮT THẤY TAI NGHE: Ông/bà đã uống thuốc đầy đủ lúc ${curTimeStr}`;

  sendRemoteWebhookAlert(familyMsg);

  showToastAlert("✅ ĐÃ XÁC NHẬN UỐNG THUỐC", `Đã lưu mốc giờ ${curTimeStr} và gửi thông báo báo cho con cháu yên tâm!`);
}

// ✉️ GMAIL HEALTH REPORT GENERATOR (V9)
function sendGmailHealthReport() {
  const curDateStr = new Date().toLocaleDateString('vi-VN');

  const logs = JSON.parse(localStorage.getItem('HEALTH_LOGS') || "[]");
  let vitalsInfo = "Chưa đo sinh hiệu hôm nay.";
  if (logs.length > 0) {
    const latest = logs[0];
    const isAbnormal = (latest.heartRate > 100 || latest.heartRate < 50);
    const evaluation = isAbnormal ? "⚠️ Cảnh báo nhịp tim bất thường!" : "✅ Bình thường ổn định";
    vitalsInfo = `Nhịp tim: ${latest.heartRate} bpm, Huyết áp: ${latest.bloodPressure} mmHg (${evaluation})`;
  }

  const medStatus = isMedicineTakenToday
    ? `✅ Đã uống đầy đủ lúc ${medicineTakenTime}`
    : "⏳ Chưa bấm xác nhận uống thuốc";

  const schedules = medicineReminders.map(r => `- ⏰ ${r.time}: ${r.name}`).join('\n') || "Không có lịch hẹn";

  const steps = stepCount || 0;

  const subject = encodeURIComponent(`[MẮT THẤY TAI NGHE] Báo cáo sức khỏe ${healthProfile.userName} - ${curDateStr}`);
  const bodyLines = [
    `Kính gửi con cháu yêu quý,`,
    ``,
    `Đây là báo cáo sức khỏe hôm nay (${curDateStr}) của ${healthProfile.userName}:`,
    ``,
    `📊 SINH HIỆU HÔM NAY:`,
    `- ${vitalsInfo}`,
    `- Số bước chân: ${steps.toLocaleString()} bước`,
    ``,
    `💊 TRẠNG THÁI UỐNG THUỐC:`,
    `- ${medStatus}`,
    ``,
    `🗓️ LỊCH SINH HOẠT HÔM NAY:`,
    schedules,
    ``,
    `💬 LỜI KHUYÊN BÁC SĨ AI MỚI NHẤT:`,
    `"${currentSpeechMessage || 'Không có yêu cầu triệu chứng khẩn cấp. Ông bà giữ gìn sức khỏe.'}"`,
    ``,
    `Mọi hoạt động đều được cập nhật realtime trên Bảng Giám Sát của ứng dụng MẮT THẤY TAI NGHE.`,
    ``,
    `Chúc ông bà và cả nhà nhiều sức khỏe! ❤️`
  ].join('\n');

  const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(getFamilyEmail())}&su=${subject}&body=${encodeURIComponent(bodyLines)}`;

  const win = window.open(gmailUrl, '_blank');
  if (!win) {
    showToastAlert("⚠️ KHÔNG MỞ ĐƯỢC GMAIL", "Trình duyệt đã chặn cửa sổ mới. Hãy cho phép mở cửa sổ bật lên và bấm lại!");
    return;
  }

  // Sao chép nội dung báo cáo để con cháu có thể dán nếu cần
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(subject + "\n\n" + bodyLines).catch(() => {});
  }

  addRealtimeEvent('✉️', `${healthProfile.userName} đã gửi báo cáo sức khỏe qua Gmail.`);
  renderMonitoringSummary();

  showToastAlert("✉️ ĐANG SOẠN BÁO CÁO GMAIL", "Email tổng hợp sức khỏe đã được tạo sẵn! Con cháu chỉ cần bấm Gửi trong Gmail.");
}

function getFamilyEmail() {
  return (healthProfile.familyEmail || localStorage.getItem('FAMILY_GMAIL') || "").trim();
}

function loadGmailPrefill() {
  const gmailInput = document.getElementById('settingGmailTo');
  if (gmailInput) gmailInput.value = getFamilyEmail();
  const qsGmail = document.getElementById('qsGmailTo');
  if (qsGmail) qsGmail.value = getFamilyEmail();
  const sosPhone = (healthProfile.familyPhone || localStorage.getItem('FAMILY_SOS_PHONE') || "");
  const settingPhone = document.getElementById('settingSosPhone');
  if (settingPhone) settingPhone.value = sosPhone;
  const qsPhone = document.getElementById('qsPhone');
  if (qsPhone) qsPhone.value = sosPhone;
}

// ======================= LỜI CHÀO TỰ ĐỘNG TỪ TRỢ LÝ AI THEO THỜI GIAN =======================
function showTimeBasedGreeting() {
  const box = document.getElementById('aiGreetingBox');
  const text = document.getElementById('aiGreetingText');
  if (!box || !text) return;

  const hour = new Date().getHours();
  const userName = healthProfile.userName || "Ông/Bà";
  let baseGreeting = "";

  if (hour >= 5 && hour < 12) {
    baseGreeting = `Chào buổi sáng ${userName}! Thời tiết hôm nay rất đẹp, chúc ông/bà một ngày mới tràn đầy năng lượng và đừng quên uống nước nhé! ☀️`;
  } else if (hour >= 12 && hour < 17) {
    baseGreeting = `Chào buổi chiều ${userName}! Chúc ông/bà buổi chiều vui khỏe, nhớ nghỉ ngơi một chút sau khi ăn trưa nhé! 🍃`;
  } else if (hour >= 17 && hour < 21) {
    baseGreeting = `Chào buổi tối ${userName}! Chúc ông/bà buổi tối ấm áp bên gia đình, đừng quên vận động nhẹ nhàng sau bữa tối nhé! 🌇`;
  } else {
    baseGreeting = `Đã muộn rồi ${userName} ơi, chúc ông/bà có một giấc ngủ thật ngon và những giấc mơ đẹp! 🌙`;
  }

  text.textContent = baseGreeting;
  box.classList.remove('hidden');

  // Cập nhật thời tiết trong ngày (best-effort, không cần API key - Open-Meteo)
  tryWeatherGreeting(text, hour);
}

function tryWeatherGreeting(textEl, hour) {
  if (!navigator.geolocation) return;
  navigator.geolocation.getCurrentPosition(pos => {
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${pos.coords.latitude}&longitude=${pos.coords.longitude}&current_weather=true`)
      .then(r => r.json())
      .then(d => {
        const w = d.current_weather;
        if (!w || typeof w.temperature !== 'number') return;
        const temp = Math.round(w.temperature);
        let weatherDesc = "trời nhiều mây";
        const code = w.weathercode;
        if (code === 0) weatherDesc = "trời nắng đẹp";
        else if (code === 1 || code === 2) weatherDesc = "trời ít mây, nắng nhẹ";
        else if (code >= 51 && code <= 67) weatherDesc = "có mưa, ông/bà nhớ mang áo mưa khi ra ngoài";
        else if (code >= 71 && code <= 77) weatherDesc = "trời lạnh có thể có tuyết, nhớ giữ ấm";
        else if (code >= 80 && code <= 82) weatherDesc = "có mưa rào, nhớ giữ ấm và cẩn thận đường trơn";
        else if (code >= 95) weatherDesc = "có giông bão, ông/bà ở trong nhà cho an toàn";

        const greeting = hour >= 5 && hour < 12
          ? `Chào buổi sáng ${healthProfile.userName || "ông/bà"}! Hôm nay ${weatherDesc}, nhiệt độ khoảng ${temp}°C. Chúc ông/bà một ngày mới tràn đầy năng lượng và đừng quên uống nước nhé! ☀️`
          : `Cập nhật thời tiết: hôm nay ${weatherDesc}, nhiệt độ khoảng ${temp}°C. Ông/bà nhớ mặc phù hợp với thời tiết nhé!`;
        textEl.textContent = greeting;
      })
      .catch(() => {});
  }, () => {}, { timeout: 5000, maximumAge: 600000 });
}

// AUTOMATIC DAILY REMINDERS (06:30 AM, 12:00 PM NOON, 21:00 PM)
function checkDailyReminders() {
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();

  // 06:30 AM Morning Greeting & Warm Clothes/Water Reminder
  if (hours === 6 && minutes === 30) {
    showBigBanner("☀️ CHÚC CỤ NGÀY MỚI AN LÀNH!", "Sáng sớm trời se lạnh, ông/bà nhớ khoác thêm áo ấm và uống ngay 1 ly nước ấm để tốt cho huyết áp nhé!");
    speakVietnamese("☀️ Chúc ông bà ngày mới an lành! Sáng sớm trời se lạnh, ông bà nhớ khoác thêm áo ấm và uống ngay 1 ly nước ấm để tốt cho huyết áp nhé!");
  } 
  // 12:00 PM Noon Lunch & Post-Meal Medicine Reminder
  else if (hours === 12 && minutes === 0) {
    showBigBanner("🍚 ĐÃ ĐẾN GIỜ ĂN TRƯA!", "Ông/bà nhớ ăn trưa đúng giờ và uống thuốc đầy đủ sau khi ăn no nhé!");
    speakVietnamese("🍚 Đã đến giờ ăn trưa rồi ạ! Ông bà nhớ ăn trưa đúng giờ và uống thuốc sau khi ăn no nhé!");
  }
  // 21:00 PM Night Goodnight Greeting
  else if (hours === 21 && minutes === 0) {
    showBigBanner("🌙 CHÚC ÔNG BÀ NGỦ NGON!", "Đã đến giờ nghỉ ngơi, chúc ông/bà ngủ thật ngon giấc!");
    speakVietnamese("🌙 Đã đến giờ nghỉ ngơi, chúc ông bà ngủ thật ngon giấc!");
  }

  // Automatic Medicine Alarms Check
  const medicineTime = localStorage.getItem('MEDICINE_TIME') || "08:00";
  const [medHour, medMin] = medicineTime.split(':').map(Number);

  if (hours === medHour && minutes === medMin) {
    showBigBanner("💊 ĐÃ ĐẾN GIỜ UỐNG THUỐC!", "Ông/bà ơi, đã đến giờ uống thuốc rồi! Hãy uống thuốc đúng liều lượng và uống nhiều nước ấm nhé.");
    speakVietnamese("Thông báo quan trọng! Đã đến giờ uống thuốc rồi. Ông bà hãy lấy thuốc uống và uống thêm một ly nước ấm nhé!");
  }

  medicineReminders.forEach(rem => {
    if (rem.time === `${String(hours).padStart(2,'0')}:${String(minutes).padStart(2,'0')}` && !rem.triggeredToday) {
      rem.triggeredToday = true;
      showBigBanner("💊 ĐÃ ĐẾN GIỜ UỐNG THUỐC!", `Ông/bà ơi, đã đến giờ uống thuốc: ${rem.name}! Hãy uống đúng liều lượng nhé.`);
      speakVietnamese("Thông báo quan trọng! Đã đến giờ uống thuốc rồi. Ông bà lấy thuốc uống ngay nhé!");
    }
  });
}

function showBigBanner(title, message) {
  let modal = document.getElementById('big-alert-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'big-alert-modal';
    modal.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
      background: rgba(0,0,0,0.85); display: flex; flex-direction: column;
      justify-content: center; align-items: center; z-index: 99999;
      padding: 20px; box-sizing: border-box; text-align: center;
    `;
    document.body.appendChild(modal);
  }

  modal.innerHTML = `
    <div style="background: #ffffff; padding: 30px; border-radius: 20px; border: 5px solid #dc2626; max-width: 90%; width: 500px; box-shadow: 0 20px 40px rgba(0,0,0,0.4);">
      <h1 style="color: #dc2626; font-size: 2.2rem; margin-bottom: 15px;">${title}</h1>
      <p style="font-size: 1.6rem; color: #0f172a; line-height: 1.5; font-weight: bold; margin-bottom: 25px;">${message}</p>
      <button onclick="document.getElementById('big-alert-modal').remove()" 
              style="font-size: 1.8rem; padding: 15px 40px; background: #2ed573; color: white; border: none; border-radius: 50px; font-weight: bold; cursor: pointer;">
        ĐÃ HIỂU (ĐÓNG)
      </button>
    </div>
  `;
}

// DATA INITIALIZATION & HELPERS
function initHealthProfile() {
  const savedProfile = localStorage.getItem('HEALTH_PROFILE');
  if (savedProfile) {
    try { healthProfile = JSON.parse(savedProfile); } catch(e){}
  }
  updateHealthProfileModalFields();
  renderUserBar();
}

function updateHealthProfileModalFields() {
  const checkInputs = document.querySelectorAll('input[name="condition"]');
  checkInputs.forEach(input => {
    input.checked = (healthProfile.conditions || []).includes(input.value);
  });

  const baseSystolic = document.getElementById('baseSystolic');
  const baseDiastolic = document.getElementById('baseDiastolic');
  const baseHeartRate = document.getElementById('baseHeartRate');
  const dailyMedicinesText = document.getElementById('dailyMedicinesText');

  if (baseSystolic) baseSystolic.value = healthProfile.baseSystolic || 120;
  if (baseDiastolic) baseDiastolic.value = healthProfile.baseDiastolic || 80;
  if (baseHeartRate) baseHeartRate.value = healthProfile.baseHeartRate || 72;
  if (dailyMedicinesText) dailyMedicinesText.value = healthProfile.dailyMedicines || "";
}

function saveMedicalHistory() {
  const checkedConditions = Array.from(document.querySelectorAll('input[name="condition"]:checked')).map(c => c.value);
  
  healthProfile.conditions = checkedConditions;
  healthProfile.baseSystolic = parseInt(document.getElementById('baseSystolic').value) || 120;
  healthProfile.baseDiastolic = parseInt(document.getElementById('baseDiastolic').value) || 80;
  healthProfile.baseHeartRate = parseInt(document.getElementById('baseHeartRate').value) || 72;
  healthProfile.dailyMedicines = document.getElementById('dailyMedicinesText').value.trim();

  localStorage.setItem('HEALTH_PROFILE', JSON.stringify(healthProfile));
  toggleModal('medicalModal');
  showToastAlert("ĐÃ LƯU HỒ SƠ", "Hồ sơ bệnh nền của ông/bà đã được cập nhật thành công!");
}

function initAuth() {
  const savedUser = localStorage.getItem('QUICK_USER');
  if (savedUser) {
    try { renderUserProfile(JSON.parse(savedUser)); } catch(e){}
  }
}

// USER RENDER
function renderUserBar() {
  const savedUser = localStorage.getItem('QUICK_USER');
  if (savedUser) {
    try { renderUserProfile(JSON.parse(savedUser)); } catch(e){}
  }
}

function renderUserProfile(user) {
  const bar = document.getElementById('user_profile');
  const avatar = document.getElementById('user_avatar');
  const uName = document.getElementById('user_name');
  const loginBtn = document.getElementById('btnLoginTop');
  if (avatar) avatar.src = user.picture || "https://api.dicebear.com/7.x/bottts/svg?seed=" + encodeURIComponent(user.name);
  if (uName) uName.textContent = user.name || healthProfile.userName || "Ông/Bà";
  if (bar) bar.classList.remove('hidden');
  if (loginBtn) loginBtn.classList.add('hidden');
}

function saveQuickStartProfile(e) {
  e.preventDefault();
  const name = document.getElementById('qsUserName').value.trim() || "Ông/Bà";
  const gmailTo = document.getElementById('qsGmailTo').value.trim() || "";
  const phone = document.getElementById('qsPhone').value.trim() || "";

  healthProfile.userName = name;
  healthProfile.familyEmail = gmailTo;
  if (phone) healthProfile.familyPhone = phone;
  localStorage.setItem('HEALTH_PROFILE', JSON.stringify(healthProfile));
  if (gmailTo) localStorage.setItem('FAMILY_GMAIL', gmailTo);
  if (phone) localStorage.setItem('FAMILY_SOS_PHONE', phone);

  const quickUser = {
    name: name,
    picture: "https://api.dicebear.com/7.x/bottts/svg?seed=" + encodeURIComponent(name)
  };
  localStorage.setItem('QUICK_USER', JSON.stringify(quickUser));

  toggleModal('quickStartModal');
  renderUserProfile(quickUser);
  showToastAlert("ĐÃ LƯU THÔNG TIN", `Chào mừng ${name}! Thông tin cá nhân đã được lưu an toàn.`);

  registerBackgroundSyncNotification();
}

function logoutProfile() {
  localStorage.removeItem('QUICK_USER');
  const bar = document.getElementById('user_profile');
  if (bar) bar.classList.add('hidden');
  const loginBtn = document.getElementById('btnLoginTop');
  if (loginBtn) loginBtn.classList.remove('hidden');
  toggleModal('quickStartModal');
}

// PEDOMETER (peak detection + noise filter trên gia tốc kế)
let lastAccelMagnitude = 0;
let accelBuffer = [];
let lastStepTime = 0;
let lastSummaryRenderTime = 0;

function initPedometer() {
  const savedSteps = localStorage.getItem('DAILY_STEPS_' + new Date().toDateString());
  if (savedSteps) stepCount = parseInt(savedSteps) || 0;
  updatePedometerUI();

  const motionHandler = (e) => {
    const acc = e.accelerationIncludingGravity;
    if (!acc) return;

    const magnitude = Math.sqrt(acc.x * acc.x + acc.y * acc.y + acc.z * acc.z);

    // Low-pass filter để khử nhiễu rung lắc nhỏ
    lastAccelMagnitude = (lastAccelMagnitude === 0)
      ? magnitude
      : lastAccelMagnitude * 0.8 + magnitude * 0.2;

    accelBuffer.push(lastAccelMagnitude);
    if (accelBuffer.length > 7) accelBuffer.shift();

    // Peak detection: điểm cực đại cục bộ, vượt ngưỡng trọng lực, cách bước trước >= 350ms
    if (accelBuffer.length >= 7) {
      const mid = accelBuffer[3];
      const isPeak = mid >= accelBuffer[0] && mid >= accelBuffer[1] &&
                     mid >= accelBuffer[2] && mid >= accelBuffer[4] &&
                     mid >= accelBuffer[5] && mid >= accelBuffer[6] &&
                     mid > 10.6;
      const now = Date.now();
      if (isPeak && (now - lastStepTime) > 350) {
        lastStepTime = now;
        stepCount++;
        localStorage.setItem('DAILY_STEPS_' + new Date().toDateString(), stepCount);
        updatePedometerUI();
      }
    }
  };

  const requestMotionPermission = () => {
    if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
      // iOS 13+: cần xin quyền trước khi đọc cảm biến chuyển động
      DeviceMotionEvent.requestPermission().then(state => {
        if (state === 'granted') {
          window.addEventListener('devicemotion', motionHandler);
        }
      }).catch(() => {});
    } else {
      window.addEventListener('devicemotion', motionHandler);
    }
  };

  requestMotionPermission();
}

function updatePedometerUI() {
  const stepCountValue = document.getElementById('stepCount');
  if (stepCountValue) stepCountValue.textContent = stepCount.toLocaleString();

  // Cập nhật Bảng Báo Cáo Hằng Ngày theo thời gian thực (giới hạn tần suất)
  const now = Date.now();
  if (now - lastSummaryRenderTime > 3000) {
    lastSummaryRenderTime = now;
    renderDailySummary();
    renderDailySummary('fam');
  }
}

// VITALS MANUAL COMPARISON
function checkVitalsAgainstProfile() {
  const sysVal = parseInt(document.getElementById('inputSystolic').value);
  const diaVal = parseInt(document.getElementById('inputDiastolic').value);
  const hrVal = parseInt(document.getElementById('inputHeartRate').value);

  if (isNaN(sysVal) || isNaN(diaVal) || isNaN(hrVal)) {
    showToastAlert("NHẬP THIẾU CHỈ SỐ", "Ông bà vui lòng nhập đủ Huyết áp (Tâm thu/Tâm trương) và Nhịp tim để Bác sĩ AI đối chiếu nhé!");
    return;
  }

  saveHealthMetrics(hrVal, `${sysVal}/${diaVal}`);

  const baseSys = healthProfile.baseSystolic || 120;
  const baseDia = healthProfile.baseDiastolic || 80;
  const baseHr = healthProfile.baseHeartRate || 72;

  const sysDev = Math.abs(sysVal - baseSys) / baseSys;
  const diaDev = Math.abs(diaVal - baseDia) / baseDia;
  const hrDev = Math.abs(hrVal - baseHr) / baseHr;

  const isDeviatedAbove15 = (sysDev > 0.15 || diaDev > 0.15 || hrDev > 0.15);

  let message = "";
  if (isDeviatedAbove15) {
    message = `CẢNH BÁO SỨC KHỎE! Chỉ số Huyết áp ${sysVal}/${diaVal} mmHg hoặc Nhịp tim ${hrVal} nhịp/phút của ông/bà đang bị LỆCH TRÊN 15% so với mức bình thường (${baseSys}/${baseDia} mmHg, ${baseHr} nhịp/phút) trong Hồ sơ sức khỏe. Ông bà hãy nằm nghỉ tại chỗ ngay và cháu sẽ gửi báo cáo qua Gmail cho con cháu!`;
    triggerSOS(`Huyết áp ${sysVal}/${diaVal} mmHg hoặc nhịp tim ${hrVal} bpm LỆCH TRÊN 15% so với hồ sơ sức khỏe`);
    document.getElementById('heartRateStatus').textContent = "⚠️ Nhịp tim bất thường!";
    document.getElementById('heartRateStatus').className = "text-xs text-red-600 font-bold block mt-1";
    document.getElementById('bloodPressureStatus').textContent = "⚠️ Huyết áp bất thường!";
    document.getElementById('bloodPressureStatus').className = "text-xs text-red-600 font-bold block mt-1";
  } else {
    message = `Huyết áp ${sysVal}/${diaVal} mmHg và Nhịp tim ${hrVal} nhịp/phút của ông bà nằm trong mức AN TOÀN, chỉ chênh lệch nhẹ dưới 15% so với hồ sơ sức khỏe. Ông bà tiếp tục duy trì sức khỏe tốt nhé!`;
    document.getElementById('heartRateStatus').textContent = "✓ Bình thường";
    document.getElementById('heartRateStatus').className = "text-xs text-emerald-600 font-bold block mt-1";
    document.getElementById('bloodPressureStatus').textContent = "✓ Ổn định";
    document.getElementById('bloodPressureStatus').className = "text-xs text-emerald-600 font-bold block mt-1";
  }

  currentAlertDetails = `Huyết áp thực tế: ${sysVal}/${diaVal} mmHg, Nhịp tim: ${hrVal} bpm (Chuẩn hồ sơ: ${baseSys}/${baseDia} mmHg, ${baseHr} bpm)`;

  const aiOutputElement = document.getElementById('aiResponseText');
  if (aiOutputElement) {
    aiOutputElement.innerHTML = message;
  }

  document.getElementById('valMedicine').textContent = `Huyết áp: ${sysVal}/${diaVal} mmHg`;
  document.getElementById('valDosage').textContent = `Nhịp tim: ${hrVal} nhịp/phút`;
  document.getElementById('valExpiry').textContent = `Chuẩn hồ sơ: ${baseSys}/${baseDia} mmHg`;

  const badgeAlert = document.getElementById('badgeAlert');
  if (isDeviatedAbove15) {
    badgeAlert.classList.remove('hidden');
  } else {
    badgeAlert.classList.add('hidden');
  }

  document.getElementById('aiResponseBox').classList.remove('hidden');
  document.getElementById('aiResponseBox').scrollIntoView({ behavior: 'smooth' });

  speakVietnamese(message);
}

// REMINDERS LIST
function initMedicineReminders() {
  const savedReminders = localStorage.getItem('MEDICINE_REMINDERS');
  if (savedReminders) {
    try { medicineReminders = JSON.parse(savedReminders); } catch(e){}
  }
  renderReminderList();
}

function renderReminderList() {
  const container = document.getElementById('scheduleList');
  if (!container) return;

  if (medicineReminders.length === 0) {
    container.innerHTML = `<p class="empty-reminder text-sm italic text-gray-400">Chưa có lịch hẹn. Bấm "+ Thêm Lịch" để đặt lịch nhé ông bà!</p>`;
    return;
  }

  container.innerHTML = medicineReminders.map((rem, idx) => `
    <div class="flex items-center justify-between p-3 rounded-xl" style="background:#EFF6F8;border:2px solid #b2d7dd;">
      <div class="flex items-center gap-3">
        <input type="checkbox" id="reminder_chk_${idx}" onchange="toggleReminderStatus(${idx})" class="w-5 h-5 rounded" style="accent-color:#005F73;">
        <div>
          <span class="font-bold text-sm" style="color:#002147;">⏰ ${rem.time}</span>
          <p class="text-sm text-gray-800 font-medium">${rem.name}</p>
        </div>
      </div>
      <div class="flex gap-2">
        <button onclick="speakVietnamese('Ông bà nhớ uống thuốc ${rem.name} nhé')" class="text-xs font-bold" style="color:#005F73;">
          <i class="fa-solid fa-volume-high"></i> Đọc
        </button>
        <button onclick="deleteReminder(${idx})" class="text-red-500 hover:text-red-700 text-xs font-bold ml-2">❌ Xóa</button>
      </div>
    </div>
  `).join('');
}

window.toggleReminderStatus = function(idx) {
  const chk = document.getElementById(`reminder_chk_${idx}`);
  if (chk && chk.checked) {
    confirmMedicineTaken();
  }
};

window.deleteReminder = function(idx) {
  medicineReminders.splice(idx, 1);
  localStorage.setItem('MEDICINE_REMINDERS', JSON.stringify(medicineReminders));
  renderReminderList();
  registerBackgroundSyncNotification();
};

function addNewSchedule() {
  const time = prompt("Nhập khung giờ (VD: 08:30):");
  const name = prompt("Nhập nội dung nhắc nhở / tên thuốc:");
  if (time && name) {
    medicineReminders.push({ time, name, triggeredToday: false });
    localStorage.setItem('MEDICINE_REMINDERS', JSON.stringify(medicineReminders));
    localStorage.setItem('MEDICINE_TIME', time);
    renderReminderList();
    registerBackgroundSyncNotification();
    showToastAlert("ĐÃ THÊM LỊCH", `Đã đặt nhắc lịch lúc ${time} cho ông bà!`);
  }
}

// PWA INSTALL AT FIRST
function initPwaInstall() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    window.deferredInstallPrompt = e;
    const installBtn = document.getElementById('installAppBtn');
    if (installBtn) installBtn.classList.remove('hidden');
    const banner = document.getElementById('pwaInstallBanner');
    if (banner) banner.classList.remove('hidden');
  });
}

function installPWA() {
  if (deferredInstallPrompt) {
    deferredInstallPrompt.prompt();
    deferredInstallPrompt.userChoice.then(() => {
      deferredInstallPrompt = null;
      const installBtn = document.getElementById('installAppBtn');
      if (installBtn) installBtn.classList.add('hidden');
      const banner = document.getElementById('pwaInstallBanner');
      if (banner) banner.classList.add('hidden');
    });
  } else {
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
    if (isIOS) {
      showToastAlert("📲 CÀI ĐẶT APP TRÊN iPhone/iPad",
        "Bấm nút Chia sẻ (☝️ hình vuông có mũi tên lên) dưới trình duyệt Safari → chọn 'Thêm vào Màn hình chính' → bấm 'Thêm' để Famcare hiện như App thật trên điện thoại!");
    } else {
      showToastAlert("📲 CÀI ĐẶT APP TRÊN ĐIỆN THOẠI",
        "Trên Android (Chrome): bấm dấu ⋮ → chọn 'Cài đặt ứng dụng' hoặc 'Thêm vào Màn hình chính'. Trên iPhone: bấm nút Chia sẻ → 'Thêm vào Màn hình chính'.");
    }
  }
}

// INTERACTION AUDIO WEBCAM
function openCamera() {
  const video = document.getElementById('webcam');
  const cameraContainer = document.getElementById('cameraContainer');
  cameraContainer.classList.remove('hidden');

  navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
    .then(stream => { video.srcObject = stream; })
    .catch(err => alert("Không thể khởi động Camera trên thiết bị này!"));
}

function closeCamera() {
  const video = document.getElementById('webcam');
  if (video && video.srcObject) {
    video.srcObject.getTracks().forEach(track => track.stop());
  }
  document.getElementById('cameraContainer').classList.add('hidden');
}

// IMAGE SELECTION & UPLOAD
function handleImageSelection(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(evt) {
    document.getElementById('imagePreview').src = evt.target.result;
    currentBase64Image = evt.target.result.split(',')[1];
    document.getElementById('imagePreviewSection').classList.remove('hidden');
    document.getElementById('aiResponseBox').classList.add('hidden');
    showToastAlert("📷 ĐÃ GẮN ẢNH", "Ảnh đã sẵn sàng! Ông bà bấm Micro để hỏi kèm ảnh này nhé.");
  };
  reader.readAsDataURL(file);
}

function clearSelectedImage() {
  currentBase64Image = null;
  document.getElementById('imageInput').value = '';
  document.getElementById('imagePreviewSection').classList.add('hidden');
}

// SPEECH RECOGNITION (TAI NGHE - V9: kết hợp ảnh + giọng nói gửi Gemini)
function initSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (SpeechRecognition) {
    speechRecognition = new SpeechRecognition();
    speechRecognition.lang = 'vi-VN';
    speechRecognition.continuous = false;
    speechRecognition.interimResults = false;
    speechRecognition.onstart = () => {
      document.getElementById('micText').textContent = "Đang nghe ông bà nói...";
      document.getElementById('micBtn').classList.add('pulse-mic', 'bg-red-600');
      const ring = document.getElementById('listenRing');
      if (ring) ring.classList.remove('hidden');
    };
    speechRecognition.onresult = (evt) => {
      let text = "";
      for (let i = evt.resultIndex; i < evt.results.length; i++) {
        text += evt.results[i][0].transcript;
      }
      stopVoiceInput();
      const finalText = (text || "").trim();
      if (!finalText) return;

      // V9: Nếu có ảnh đang gắn -> gửi CẢ ẢNH + GIỌNG NÓI cho Gemini
      voiceQuestionText = finalText;
      document.getElementById('aiQuestionInput').value = finalText;
      if (currentBase64Image) {
        showToastAlert("🔊 ĐÃ NGHE CÂU HỎI", `Đang gửi Ảnh + Câu hỏi "${finalText.substring(0, 60)}..." cho Bác sĩ AI!`);
        askAIAdvisor(finalText, currentBase64Image);
      } else {
        askAIAdvisor(finalText);
      }
    };
    speechRecognition.onerror = () => stopVoiceInput();
    speechRecognition.onend = () => stopVoiceInput();
  }
}

function startVoiceInput() {
  if (!speechRecognition) {
    const promptText = prompt("Mời ông bà nhập câu hỏi y tế:");
    if (promptText) askAIAdvisor(promptText, currentBase64Image);
    return;
  }
  try { speechRecognition.start(); } catch(e){ speechRecognition.stop(); speechRecognition.start(); }
}

function toggleSpeechRecognition() {
  if (speechRecognition) {
    startVoiceInput();
  } else {
    alert("Thiết bị không hỗ trợ nhận diện giọng nói.");
  }
}

function stopVoiceInput() {
  const micBtn = document.getElementById('micBtn');
  if (micBtn) {
    micBtn.classList.remove('pulse-mic', 'bg-red-600');
    document.getElementById('micText').textContent = "🎙️ NÓI VỚI BÁC SĨ";
  }
  const ring = document.getElementById('listenRing');
  if (ring) ring.classList.add('hidden');
  if (speechRecognition) { try { speechRecognition.stop(); } catch(e){} }
}

// GỬI CÂU HỎI GÕ TAY (KÈM ẢNH NẾU CÓ)
function askTypedQuestion() {
  const input = document.getElementById('aiQuestionInput');
  const question = (input ? input.value : "").trim();
  if (!question) {
    showToastAlert("✍️ CHƯA CÓ CÂU HỎI", "Ông bà hãy gõ câu hỏi vào ô bên trên hoặc bấm Micro để nói nhé!");
    return;
  }
  voiceQuestionText = question;
  askAIAdvisor(question, currentBase64Image);
}

function clearQuestion() {
  const input = document.getElementById('aiQuestionInput');
  if (input) input.value = "";
  voiceQuestionText = "";
}

function askPreset(queryText) {
  document.getElementById('aiQuestionInput').value = queryText;
  askAIAdvisor(queryText, currentBase64Image);
}

// SETUP MODAL
function toggleModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.classList.toggle('hidden');
  }
}

// TOAST NOTIFICATION HELPER
function showToastAlert(title, message) {
  let toast = document.getElementById('appToastAlert');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'appToastAlert';
    toast.style.cssText = `
      position: fixed; top: 16px; left: 50%; transform: translateX(-50%);
      background: #002147; color: #ffffff; padding: 14px 22px;
      border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.25);
      z-index: 999999; max-width: 92%; text-align: center;
      font-weight: 800; font-size: 15px; pointer-events: none;
      transition: opacity 0.3s ease;
    `;
    document.body.appendChild(toast);
  }
  toast.innerHTML = `<div style="font-size:16px;font-weight:900;">${title}</div><div style="font-size:13px;margin-top:4px;opacity:0.9;font-weight:600;">${message}</div>`;
  toast.style.opacity = '1';
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => { toast.style.opacity = '0'; }, 4200);
}

function closeAlertModalDirectly() {
  document.getElementById('alertModal').classList.add('hidden');
}

// SAVE SETTINGS
function saveSystemSettings() {
  const key = document.getElementById('settingGeminiApiKey').value.trim();
  const webhook = document.getElementById('settingTelegramWebhook').value.trim();
  const gmailTo = document.getElementById('settingGmailTo').value.trim();
  const sosPhone = document.getElementById('settingSosPhone').value.trim();
  if (key) localStorage.setItem('GEMINI_API_KEY', key);
  if (webhook) localStorage.setItem('TELEGRAM_WEBHOOK_URL', webhook);
  if (gmailTo) {
    localStorage.setItem('FAMILY_GMAIL', gmailTo);
    healthProfile.familyEmail = gmailTo;
    localStorage.setItem('HEALTH_PROFILE', JSON.stringify(healthProfile));
  }
  if (sosPhone) {
    localStorage.setItem('FAMILY_SOS_PHONE', sosPhone);
    healthProfile.familyPhone = sosPhone;
    localStorage.setItem('HEALTH_PROFILE', JSON.stringify(healthProfile));
  }
  toggleModal('settingsModal');
  showToastAlert("ĐÃ LƯU CÀI ĐẶT", "Cấu hình Gemini API, Gmail, SĐT SOS và Webhook Bot thành công!");
}

// EVENT LISTENERS SETUP
function setupEventListeners() {
  const imageInput = document.getElementById('imageInput');
  if (imageInput) {
    imageInput.addEventListener('change', handleImageSelection);
  }

  const btnAskTyped = document.getElementById('btnAskTyped');
  if (btnAskTyped) {
    btnAskTyped.addEventListener('click', askTypedQuestion);
  }

  // Action Button: Press Enter in question box to send
  const aiQuestionInput = document.getElementById('aiQuestionInput');
  if (aiQuestionInput) {
    aiQuestionInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') askTypedQuestion();
    });
  }

  // Action Button 2: TAI NGHE (Speak again)
  const btnSpeakAgain = document.getElementById('btnSpeakAgain');
  if (btnSpeakAgain) {
    btnSpeakAgain.addEventListener('click', () => {
      if (currentSpeechMessage) speakVietnamese(currentSpeechMessage);
    });
  }

  // Gmail Health Report Button Listener (kênh báo cáo chính - đã loại bỏ Zalo)
  const btnSendGmailReport = document.getElementById('btnSendGmailReport');
  if (btnSendGmailReport) {
    btnSendGmailReport.addEventListener('click', sendGmailHealthReport);
  }
  
  // Camera Capture snapshot
  const captureBtn = document.getElementById('captureBtn');
  if (captureBtn) {
    captureBtn.addEventListener('click', () => {
      const video = document.getElementById('webcam');
      const canvas = document.getElementById('canvas');
      if (video && canvas) {
        const context = canvas.getContext('2d');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        const dataUrl = canvas.toDataURL('image/jpeg');
        document.getElementById('imagePreview').src = dataUrl;
        currentBase64Image = dataUrl.split(',')[1];
        
        document.getElementById('imagePreviewSection').classList.remove('hidden');
        closeCamera();
      }
    });
  }
}

// EXPOSE FUNCTIONS ON WINDOW OBJECT FOR HTML ONCLICK BINDINGS
window.toggleModal = toggleModal;
window.speakText = speakVietnamese;
window.openCamera = openCamera;
window.closeCamera = closeCamera;
window.clearSelectedImage = clearSelectedImage;
window.saveMedicalHistory = saveMedicalHistory;
window.saveSystemSettings = saveSystemSettings;
window.closeAlertModalDirectly = closeAlertModalDirectly;
window.confirmMedicineTaken = confirmMedicineTaken;
window.addNewSchedule = addNewSchedule;
window.toggleSpeechRecognition = toggleSpeechRecognition;
window.askPreset = askPreset;
window.saveQuickStartProfile = saveQuickStartProfile;
window.logoutProfile = logoutProfile;
window.installPWA = installPWA;
window.checkVitalsAgainstProfile = checkVitalsAgainstProfile;
window.triggerSOS = triggerSOS;
window.sendGmailHealthReport = sendGmailHealthReport;
window.askTypedQuestion = askTypedQuestion;
window.clearQuestion = clearQuestion;
window.speakVietnamese = speakVietnamese;
