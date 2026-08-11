/**
 * MẮT THẤY TAI NGHE V8 - PHIÊN BẢN MASTER SYSTEM
 * Features:
 * 1. AI Tư Vấn Linh Hoạt (Xóa câu trả lời lặp lại, tư vấn mệt/chóng mặt/đau đầu/ho/sốt/đau họng và đọc to).
 * 2. Phân Tích OCR Toa Thuốc (Phân loại: huyết áp, tiểu đường, bổ..., liều dùng, uống trước/sau ăn, hướng giải quyết).
 * 3. Báo Cáo Sức Khỏe Con Cháu (📲 GỬI BÁO CÁO QUA ZALO tổng hợp sinh hiệu, trạng thái uống thuốc, lời khuyên AI).
 * 4. Thông Báo Ngầm Chạy Ngầm (Push Notification thông báo nhắc nhở khi thoát app).
 */

const SYSTEM_INSTRUCTION = `Bạn là bác sĩ gia đình ảo thông minh và thân thiện thuộc ứng dụng MẮT THẤY TAI NGHE dành cho người cao tuổi. Hãy tư vấn ngắn gọn, ấm áp, sử dụng từ ngữ dễ hiểu, xưng 'cháu' gọi 'ông' hoặc 'bà', nhắc nhở ăn uống nghỉ ngơi.

BẮT BUỘC TƯ VẤN LINH HOẠT VÀ CHI TIẾT THEO NGỮ CẢNH (TUYỆT ĐỐI KHÔNG DÙNG CÂU MẪU CỐ ĐỊNH LẶP ĐI LẶP LẠI):
- NẾU NGƯỜI DÙNG BÁO 'MỆT / CHÓNG MẶT / ĐAU ĐẦU': AI lập tức khuyên nằm nghỉ ngơi tại chỗ ngay tránh đi lại phòng té ngã, nhắc nhờ con cháu đo ngay Huyết áp & Nhịp tim, hướng dẫn uống 1 ly nước ấm hoặc trà đường ấm và hỏi lại cảm giác hiện tại.
- NẾU NGƯỜI DÙNG BÁO 'SỐT / HO / ĐAU HỌNG': AI hướng dẫn chườm ấm trán nách, uống nhiều nước ấm và nhắc nhở thời gian uống thuốc hạ sốt cách 4-6 tiếng.
- NẾU LÀ ẢNH ĐƠN THUỐC / TÊN THUỐC: Phân tích chính xác Tên thuốc, Công dụng, Liều lượng, Phân loại thuốc (Thuốc huyết áp, Thuốc tiểu đường, Thuốc bổ, Thuốc hạ sốt, v.v.), Uống trước hay sau ăn, và ĐƯA RA HƯỚNG GIẢI QUYẾT rõ ràng: 'Ông/bà cần uống thuốc này sau khi ăn no. Nhớ uống kèm 1 ly nước ấm to.'

ĐẦU RA BẮT BUỘC DẠNG JSON CHUẨN:
{
  "action_type": "READ_PRESCRIPTION" | "HEALTH_CHAT" | "EMERGENCY",
  "medicine_name": "Tên thuốc (nếu có)",
  "medicine_type": "Thuốc huyết áp" | "Thuốc tiểu đường" | "Thuốc bổ" | "Thuốc hạ sốt" | "Khác" | "Chưa rõ",
  "dosage": "Liều dùng & Giờ uống (nếu có)",
  "intake_time": "Trước khi ăn" | "Sau khi ăn no" | "Trong bữa ăn" | "Chưa rõ",
  "is_expired": true/false,
  "is_blurry": true/false,
  "speech_message": "Câu tư vấn chi tiết ấm áp ngắn gọn để ứng dụng đọc ra loa cho ông bà nghe",
  "action_solution": "Ông/bà cần uống thuốc này sau khi ăn no. Nhớ uống kèm 1 ly nước ấm to. (nếu là thuốc)",
  "alert_children": true/false
}`;

// App State
let healthProfile = {
  userName: "Ông/Bà",
  familyPhone: "0901234567",
  conditions: [],
  baseSystolic: 120,
  baseDiastolic: 80,
  baseHeartRate: 72,
  dailyMedicines: ""
};

let stepCount = 0;
let lastAccelMagnitude = 0;
let medicineReminders = [];
let deferredInstallPrompt = null;
let currentSpeechMessage = "";
let currentAlertDetails = "";
let speechRecognition = null;
let currentBase64Image = null;
let currentAudioElement = null;
let isMedicineTakenToday = false;
let medicineTakenTime = "";

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  initHealthProfile();
  initPedometer();
  initMedicineReminders();
  initPwaInstall();
  initSpeechRecognition();
  renderHealthHistory();
  renderAiDoctorJournal();
  
  // Request Notification Permission immediately when app opens
  requestNotificationPermission();

  // Check reminders and start interval (every 30s)
  checkDailyReminders();
  setInterval(checkDailyReminders, 30000);
  
  setupEventListeners();
});

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
    const medicineTime = localStorage.getItem('MEDICINE_TIME') || "08:00";
    navigator.serviceWorker.ready.then(reg => {
      navigator.serviceWorker.controller.postMessage({
        action: 'setReminderTime',
        time: medicineTime,
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

// SPEAK VIETNAMESE (V8 CLOUD & NATIVE HYBRID TTS)
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

  // Priority 1: Native Web Speech API
  if ('speechSynthesis' in window) {
    const voices = window.speechSynthesis.getVoices();
    const viVoice = voices.find(v => v.lang.includes('vi') || v.lang.includes('VI'));
    
    if (viVoice) {
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.voice = viVoice;
      utterance.lang = 'vi-VN';
      utterance.rate = 0.82; // Slow pace for elderly users
      utterance.pitch = 1.0;

      const btnSpeakAgain = document.getElementById('btnSpeakAgain');
      if (btnSpeakAgain) btnSpeakAgain.classList.add('animate-pulse');
      utterance.onend = () => { if (btnSpeakAgain) btnSpeakAgain.classList.remove('animate-pulse'); };
      utterance.onerror = () => { if (btnSpeakAgain) btnSpeakAgain.classList.remove('animate-pulse'); };

      window.speechSynthesis.speak(utterance);
      return;
    }
  }

  // Priority 2: Google Translate TTS Fallback (0.85x)
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

// DYNAMIC CONTEXTUAL AI & VISION OCR PRESCRIPTION ANALYSIS
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
  
  speakVietnamese("Bác sĩ AI đang đọc toa thuốc và phân tích triệu chứng. Ông bà chờ một chút nhé!");

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
          { text: promptText || "Hãy phân tích hình ảnh/toa thuốc này và hướng dẫn liều dùng chi tiết cho ông bà." }
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
    const modelsToTry = ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-2.0-flash'];
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
        replyText = "Bác sĩ AI đã ghi nhận câu hỏi. Ông bà nhớ uống đầy đủ nước ấm, dùng thuốc đúng liều sau khi ăn no và nghỉ ngơi điều độ nhé!";
        solutionText = "Uống thuốc sau khi ăn no kèm 1 ly nước ấm to.";
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
    saveAiDoctorJournal(`Bác sĩ AI tư vấn: "${promptText || 'Tư vấn toa thuốc'}" -> Lời khuyên: ${replyText}`);

    resultSection.classList.remove('hidden');
    resultSection.scrollIntoView({ behavior: 'smooth' });

    // Speak entire response out loud
    speakVietnamese(replyText);

  } catch (error) {
    console.error("AI Consultation error:", error);
    loadingIndicator.classList.add('hidden');
    const fallbackMsg = "Cháu đã phân tích thông tin. Ông bà nhớ nghỉ ngơi tại chỗ, uống thuốc đúng giờ sau khi ăn no và giữ ấm cơ thể nhé.";
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
      <h3 class="font-extrabold text-emerald-950 text-base mb-2"><i class="fa-solid fa-book-medical"></i> 📖 Nhật Ký Bác Sĩ AI Theo Dõi Trong Ngày:</h3>
      <p class="text-xs text-emerald-800 italic">Chưa có nhật ký tương tác sức khỏe hôm nay.</p>
    `;
    return;
  }

  let html = `<h3 class="font-extrabold text-emerald-950 text-base mb-2"><i class="fa-solid fa-book-medical"></i> 📖 Nhật Ký Bác Sĩ AI Theo Dõi Trong Ngày:</h3>
  <ul class="text-xs space-y-1.5 list-none p-0 text-emerald-900 font-bold">`;
  journal.forEach(item => {
    html += `<li class="bg-emerald-100/50 p-2 rounded-lg border-l-4 border-emerald-500">
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

  const remotePhone = healthProfile.familyPhone || localStorage.getItem('ZALO_RELATIVE_PHONE');
  const isAbnormal = (heartRate > 100 || heartRate < 50);

  if (isAbnormal) {
    const alertMsg = `⚠️ CẢNH BÁO SỨC KHỎE MẮT THẤY TAI NGHE: Nhịp tim của ông/bà bất thường: ${heartRate} bpm (Huyết áp ${bloodPressure}) lúc ${healthData.time}`;
    sendRemoteWebhookAlert(alertMsg);
    if (remotePhone) {
      triggerZaloAlertMessage(remotePhone, alertMsg);
    }
  }

  renderHealthHistory();
}

function sendRemoteWebhookAlert(messageText) {
  const webhookUrl = localStorage.getItem('ZALO_WEBHOOK_URL');
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

  const familyMsg = `✅ MẮT THẤY TAI NGHE: Ông/bà đã uống thuốc đầy đủ lúc ${curTimeStr}`;
  const remotePhone = healthProfile.familyPhone || localStorage.getItem('ZALO_RELATIVE_PHONE') || "0901234567";

  sendRemoteWebhookAlert(familyMsg);
  triggerZaloAlertMessage(remotePhone, familyMsg);

  showToastAlert("✅ ĐÃ XÁC NHẬN UỐNG THUỐC", `Đã lưu mốc giờ ${curTimeStr} và gửi thông báo báo cho con cháu yên tâm!`);
}

// DETAILED HEALTH REPORTS GENERATOR FOR ZALO
function sendDetailedZaloReport() {
  const curDateStr = new Date().toLocaleDateString('vi-VN');
  
  // Get latest vitals log
  const logs = JSON.parse(localStorage.getItem('HEALTH_LOGS') || "[]");
  let vitalsInfo = "Chưa đo sinh hiệu hôm nay.";
  if (logs.length > 0) {
    const latest = logs[0];
    const isAbnormal = (latest.heartRate > 100 || latest.heartRate < 50);
    const evaluation = isAbnormal ? "⚠️ Cảnh báo nhịp tim bất thường!" : "✅ Bình thường ổn định";
    vitalsInfo = `Nhịp tim: ${latest.heartRate} bpm, Huyết áp: ${latest.bloodPressure} mmHg (${evaluation})`;
  }

  // Get medicine compliance
  const medStatus = isMedicineTakenToday 
    ? `✅ Đã uống đầy đủ lúc ${medicineTakenTime}`
    : "⏳ Chưa bấm xác nhận uống thuốc";

  // Compile final Zalo message
  const reportMsg = `[MẮT THẤY TAI NGHE] BÁO CÁO SỨC KHỎE ÔNG BÀ TRONG NGÀY (${curDateStr}):
- Ông/Bà: ${healthProfile.userName}
- Sinh hiệu đo được: ${vitalsInfo}
- Trạng thái uống thuốc: ${medStatus}
- Lời khuyên Bác sĩ AI vừa tư vấn: "${currentSpeechMessage || 'Không có yêu cầu triệu chứng khẩn cấp. Ông bà giữ gìn sức khỏe.'}"
Chúc ông bà nhiều niềm vui!`;

  const remotePhone = healthProfile.familyPhone || localStorage.getItem('ZALO_RELATIVE_PHONE') || "0901234567";
  triggerZaloAlertMessage(remotePhone, reportMsg);
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
  if (avatar) avatar.src = user.picture || "https://api.dicebear.com/7.x/bottts/svg?seed=" + encodeURIComponent(user.name);
  if (uName) uName.textContent = user.name || healthProfile.userName || "Ông/Bà";
  if (bar) bar.classList.remove('hidden');
}

function saveQuickStartProfile(e) {
  e.preventDefault();
  const name = document.getElementById('qsUserName').value.trim() || "Ông/Bà";
  const phone = document.getElementById('qsZaloPhone').value.trim() || "0901234567";

  healthProfile.userName = name;
  healthProfile.familyPhone = phone;
  localStorage.setItem('HEALTH_PROFILE', JSON.stringify(healthProfile));
  localStorage.setItem('ZALO_RELATIVE_PHONE', phone);

  const quickUser = {
    name: name,
    phone: phone,
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
  toggleModal('quickStartModal');
}

// PEDOMETER
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
  const stepCountValue = document.getElementById('stepCount');
  if (stepCountValue) stepCountValue.textContent = stepCount.toLocaleString();
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
    message = `CẢNH BÁO SỨC KHỎE! Chỉ số Huyết áp ${sysVal}/${diaVal} mmHg hoặc Nhịp tim ${hrVal} nhịp/phút của ông/bà đang bị LỆCH TRÊN 15% so với mức bình thường (${baseSys}/${baseDia} mmHg, ${baseHr} nhịp/phút) trong Hồ sơ sức khỏe. Ông bà hãy nằm nghỉ tại chỗ ngay và cháu đã chuẩn bị sẵn nút gửi tin nhắn Zalo báo cho con cháu!`;
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
    <div class="flex items-center justify-between p-3 rounded-xl bg-sky-50 border border-sky-100">
      <div class="flex items-center gap-3">
        <input type="checkbox" id="reminder_chk_${idx}" onchange="toggleReminderStatus(${idx})" class="w-5 h-5 accent-emerald-600 rounded">
        <div>
          <span class="font-bold text-sky-900 text-sm">⏰ ${rem.time}</span>
          <p class="text-sm text-gray-800 font-medium">${rem.name}</p>
        </div>
      </div>
      <div class="flex gap-2">
        <button onclick="speakVietnamese('Ông bà nhớ uống thuốc ${rem.name} nhé')" class="text-sky-600 hover:text-sky-800 text-xs font-bold">
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
    alert("Để cài đặt App: Trên iPhone bấm nút 'Chia sẻ' -> 'Thêm vào màn hình chính'. Trên Android bấm dấu 3 chấm -> 'Cài đặt ứng dụng'.");
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
  };
  reader.readAsDataURL(file);
}

function clearSelectedImage() {
  currentBase64Image = null;
  document.getElementById('imageInput').value = '';
  document.getElementById('imagePreviewSection').classList.add('hidden');
}

// SPEECH RECOGNITION (TAI NGHE)
function initSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (SpeechRecognition) {
    speechRecognition = new SpeechRecognition();
    speechRecognition.lang = 'vi-VN';
    speechRecognition.onstart = () => {
      document.getElementById('micText').textContent = "Đang nghe ông bà nói...";
      document.getElementById('micBtn').classList.add('pulse-mic', 'bg-red-600');
    };
    speechRecognition.onresult = (evt) => {
      const text = evt.results[0][0].transcript;
      stopVoiceInput();
      askAIAdvisor(text);
    };
    speechRecognition.onerror = () => stopVoiceInput();
    speechRecognition.onend = () => stopVoiceInput();
  }
}

function startVoiceInput() {
  if (!speechRecognition) {
    const promptText = prompt("Mời ông bà nhập câu hỏi y tế:");
    if (promptText) askAIAdvisor(promptText);
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
    document.getElementById('micText').textContent = "Bấm Để Nói (Tai Nghe)";
  }
  if (speechRecognition) { try { speechRecognition.stop(); } catch(e){} }
}

function askPreset(queryText) {
  askAIAdvisor(queryText);
}

// SETUP MODAL
function toggleModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.classList.toggle('hidden');
  }
}

function closeAlertModalDirectly() {
  document.getElementById('alertModal').classList.add('hidden');
}

// SAVE SETTINGS
function saveSystemSettings() {
  const key = document.getElementById('settingGeminiApiKey').value.trim();
  const webhook = document.getElementById('settingZaloWebhook').value.trim();
  if (key) localStorage.setItem('GEMINI_API_KEY', key);
  if (webhook) localStorage.setItem('ZALO_WEBHOOK_URL', webhook);
  toggleModal('settingsModal');
  showToastAlert("ĐÃ LƯU CÀI ĐẶT", "Cấu hình Gemini API và Webhook Bot thành công!");
}

// EVENT LISTENERS SETUP
function setupEventListeners() {
  // Action Button 1: MẮT THẤY (Capture Image / OCR Prescription)
  const btnMatThay = document.getElementById('btnMatThay');
  if (btnMatThay) {
    btnMatThay.addEventListener('click', () => {
      document.getElementById('imageInput').click();
    });
  }

  const imageInput = document.getElementById('imageInput');
  if (imageInput) {
    imageInput.addEventListener('change', handleImageSelection);
  }

  const btnAnalyzeImage = document.getElementById('btnAnalyzeImage');
  if (btnAnalyzeImage) {
    btnAnalyzeImage.addEventListener('click', () => {
      if (currentBase64Image) {
        askAIAdvisor("Hãy đọc toa thuốc/ảnh này và phân loại từng viên thuốc, công dụng, liều dùng, trước/sau ăn.", currentBase64Image);
      }
    });
  }

  // Action Button 2: TAI NGHE (Speak again)
  const btnSpeakAgain = document.getElementById('btnSpeakAgain');
  if (btnSpeakAgain) {
    btnSpeakAgain.addEventListener('click', () => {
      if (currentSpeechMessage) speakVietnamese(currentSpeechMessage);
    });
  }

  // Zalo Active Daily Report Button Listener
  const btnGlobalZaloAlert = document.getElementById('btnGlobalZaloAlert');
  if (btnGlobalZaloAlert) {
    btnGlobalZaloAlert.addEventListener('click', sendDetailedZaloReport);
  }

  const btnSendZaloAlert = document.getElementById('btnSendZaloAlert');
  if (btnSendZaloAlert) {
    btnSendZaloAlert.addEventListener('click', sendDetailedZaloReport);
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

// ZALO ALERT TRIGGER HELPER
function triggerZaloAlertMessage(phone, alertText) {
  const cleanPhone = phone.replace(/\D/g, '');
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(alertText).catch(() => {});
  }

  if (navigator.share) {
    navigator.share({
      title: '[MẮT THẤY TAI NGHE] Cập Nhật Sức Khỏe',
      text: alertText,
      url: window.location.href
    }).catch(() => openZaloLink(cleanPhone, alertText));
  } else {
    openZaloLink(cleanPhone, alertText);
  }
}

function openZaloLink(cleanPhone, alertText) {
  const zaloUrl = `https://zalo.me/${cleanPhone}`;
  const smsUrl = `sms:${cleanPhone}?body=${encodeURIComponent(alertText)}`;
  
  showToastAlert("📋 ĐÃ SAO CHÉP BÁO CÁO", "Báo cáo chi tiết đã được tự động sao chép! Đang mở Zalo con cháu, người thân chỉ cần nhấn Ctrl+V (hoặc Dán) để gửi ngay!");

  setTimeout(() => {
    const opened = window.open(zaloUrl, '_blank');
    if (!opened) {
      window.location.href = smsUrl;
    }
  }, 1000);
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
window.sendDetailedZaloReport = sendDetailedZaloReport;
window.speakVietnamese = speakVietnamese;
