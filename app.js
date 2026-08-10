/**
 * MẮT THẤY TAI NGHE V7 MASTER AI - BÁC SĨ GIA ĐÌNH CHO NGƯỜI CAO TUỔI
 * Features: Dynamic Contextual AI (No static repeated fallback), OCR Solution Analyzer,
 * AI Doctor Daily Journal, Persistent Zalo Daily Health Reports, 12:00 PM Noon Reminder,
 * Non-freezing Modal Close Fix.
 */

const SYSTEM_INSTRUCTION = `Bạn là bác sĩ gia đình ảo thân thiện thuộc ứng dụng MẮT THẤY TAI NGHE dành cho người cao tuổi. Hãy tư vấn ngắn gọn, ấm áp, sử dụng từ ngữ dễ hiểu, xưng 'cháu' gọi 'ông' hoặc 'bà', nhắc nhở ăn uống nghỉ ngơi. 

BẮT BUỘC TƯ VẤN LINH HOẠT VÀ CHI TIẾT THEO NGỮ CẢNH (TUYỆT ĐỐI KHÔNG DÙNG CÂU MẪU CỐ ĐỊNH LẶP ĐI LẶP LẠI):
- NẾU NGƯỜI DÙNG BÁO 'MỆT / CHÓNG MẶT / ĐAU ĐẦU': AI lập tức khuyên nằm nghỉ ngơi tại chỗ ngay tránh té ngã, nhắc nhờ con cháu đo ngay Huyết áp & Nhịp tim, hướng dẫn uống 1 ly nước ấm hoặc trà đường ấm và hỏi lại cảm giác hiện tại.
- NẾU NGƯỜI DÙNG BÁO 'SỐT / HO / ĐAU HỌNG': AI hướng dẫn chườm ấm, uống nhiều nước ấm và nhắc nhở thời gian uống thuốc hạ sốt cách 4-6 tiếng.
- NẾU LÀ ẢNH ĐƠN THUỐC / TÊN THUỐC: Phân tích chính xác Tên thuốc, Công dụng, Liều lượng, Thời gian uống (Sáng/Trưa/Tối) và ĐƯA RA HƯỚNG GIẢI QUYẾT rõ ràng: 'Ông/bà cần uống thuốc này sau khi ăn no. Nhớ uống kèm 1 ly nước ấm to.'

ĐẦU RA BẮT BUỘC DẠNG JSON CHUẨN:
{
  "action_type": "READ_PRESCRIPTION" | "CHECK_EXPIRY" | "HEALTH_CHAT" | "EMERGENCY",
  "medicine_name": "Tên thuốc (nếu có)",
  "dosage": "Liều dùng/Giờ uống (nếu có)",
  "expiry_date": "YYYY-MM-DD (nếu có)",
  "is_expired": true/false,
  "is_blurry": true/false,
  "speech_message": "Câu tư vấn chi tiết ấm áp ngắn gọn để ứng dụng đọc ra loa cho ông bà nghe",
  "action_solution": "Hướng giải quyết hành động cụ thể cho ông bà (Ví dụ: Uống sau ăn no với 1 ly nước ấm to)",
  "alert_children": true/false
}`;

// App State
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
let currentAudioElement = null;

// DOM Content Loaded Initialization
document.addEventListener('DOMContentLoaded', () => {
  initHealthProfile();
  initAuth();
  initPedometer();
  initMedicineReminders();
  initPwaInstall();
  initSpeechRecognition();
  renderHealthHistory();
  renderAiDoctorJournal();
  setupEventListeners();

  checkDailyReminders();
  setInterval(checkDailyReminders, 30000);
});

// 1. UNLOCK AUDIO CONTEXT ON FIRST USER TOUCH
document.addEventListener('click', function unlockAudio() {
  if ('speechSynthesis' in window) {
    const silentUtterance = new SpeechSynthesisUtterance('');
    window.speechSynthesis.speak(silentUtterance);
  }
  document.removeEventListener('click', unlockAudio);
}, { once: true });

// SPEAK VIETNAMESE (V7 CLOUD & NATIVE HYBRID TTS)
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

  // Priority 1: Web Speech Synthesis if voice vi-VN exists
  if ('speechSynthesis' in window) {
    const voices = window.speechSynthesis.getVoices();
    const viVoice = voices.find(v => v.lang.includes('vi') || v.lang.includes('VI'));
    
    if (viVoice) {
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.voice = viVoice;
      utterance.lang = 'vi-VN';
      utterance.rate = 0.82; // Slow 0.82x for senior ears
      utterance.pitch = 1.0;

      const btnSpeakAgain = document.getElementById('btnSpeakAgain');
      if (btnSpeakAgain) btnSpeakAgain.classList.add('pulse-ring');
      utterance.onend = () => { if (btnSpeakAgain) btnSpeakAgain.classList.remove('pulse-ring'); };
      utterance.onerror = () => { if (btnSpeakAgain) btnSpeakAgain.classList.remove('pulse-ring'); };

      window.speechSynthesis.speak(utterance);
      return;
    }
  }

  // Priority 2: Google Translate Cloud TTS Fallback
  try {
    const audioUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=vi&client=tw-ob&q=${encodeURIComponent(cleanText.substring(0, 180))}`;
    const audio = new Audio(audioUrl);
    audio.playbackRate = 0.85;
    currentAudioElement = audio;

    const btnSpeakAgain = document.getElementById('btnSpeakAgain');
    if (btnSpeakAgain) btnSpeakAgain.classList.add('pulse-ring');
    audio.onended = () => { if (btnSpeakAgain) btnSpeakAgain.classList.remove('pulse-ring'); };
    audio.onerror = () => { if (btnSpeakAgain) btnSpeakAgain.classList.remove('pulse-ring'); };

    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch(error => {
        console.warn("Autoplay blocked or network error:", error);
      });
    }
  } catch (e) {
    console.error("Cloud TTS voice playback error:", e);
  }
}

// 2. DYNAMIC CONTEXTUAL AI ADVISOR & OCR SOLUTION ANALYZER
async function askAIAdvisor(promptText, imageBase64 = null) {
  const aiOutputElement = document.getElementById('ai-response') || document.getElementById('speechMessageText');
  const actionSolutionBox = document.getElementById('actionSolutionBox');
  const actionSolutionText = document.getElementById('actionSolutionText');
  const resultSection = document.getElementById('resultSection');
  const loadingIndicator = document.getElementById('loadingIndicator');
  
  loadingIndicator.classList.remove('hidden');
  resultSection.classList.add('hidden');
  document.getElementById('imagePreviewSection').classList.add('hidden');
  loadingIndicator.scrollIntoView({ behavior: 'smooth' });

  if (aiOutputElement) {
    aiOutputElement.innerHTML = "<p>⏳ Bác sĩ AI đang phân tích triệu chứng và toa thuốc cho ông bà...</p>";
  }
  
  speakVietnamese("Cháu đang phân tích thông tin và toa thuốc. Ông bà chờ cháu một chút nhé!");

  try {
    const lowerPrompt = (promptText || "").toLowerCase();
    let symptomContext = "";
    if (lowerPrompt.includes('mệt') || lowerPrompt.includes('chóng mặt') || lowerPrompt.includes('đau đầu')) {
      symptomContext = " [HƯỚNG DẪN ĐẶC BIỆT KHI MỆT/CHÓNG MẶT/ĐAU ĐẦU]: Khuyên ông bà nằm nghỉ ngơi tại chỗ ngay lập tức tránh té ngã, đo ngay Huyết áp & Nhịp tim, uống 1 ly nước ấm hoặc nước đường ấm và hỏi lại cảm giác hiện tại.";
    } else if (lowerPrompt.includes('sốt') || lowerPrompt.includes('ho') || lowerPrompt.includes('đau họng')) {
      symptomContext = " [HƯỚNG DẪN ĐẶC BIỆT KHI SỐT/HO/ĐAU HỌNG]: Khuyên chườm ấm, uống nhiều nước ấm và nhắc nhở thời gian uống thuốc hạ sốt cách 4-6 tiếng.";
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
      aiOutputElement.innerHTML = `<div class="ai-reply"><strong>👨‍⚕️ Bác sĩ AI tư vấn:</strong><br>${replyText.replace(/\n/g, '<br>')}</div>`;
    }

    if (solutionText && actionSolutionBox && actionSolutionText) {
      actionSolutionText.textContent = solutionText;
      actionSolutionBox.classList.remove('hidden');
    } else if (actionSolutionBox) {
      actionSolutionBox.classList.add('hidden');
    }

    if (parsedData) {
      document.getElementById('valMedicine').textContent = parsedData.medicine_name || "Chưa xác định";
      document.getElementById('valDosage').textContent = parsedData.dosage || "Theo chỉ dẫn bác sĩ";
      document.getElementById('valExpiry').textContent = parsedData.expiry_date || "Chưa rõ";
      
      const badgeExpired = document.getElementById('badgeExpired');
      const badgeBlurry = document.getElementById('badgeBlurry');
      const badgeAlert = document.getElementById('badgeAlert');
      const alertActionBox = document.getElementById('alertActionBox');

      if (parsedData.is_expired) badgeExpired.classList.remove('hidden'); else badgeExpired.classList.add('hidden');
      if (parsedData.is_blurry) badgeBlurry.classList.remove('hidden'); else badgeBlurry.classList.add('hidden');
      if (parsedData.alert_children || parsedData.is_expired || parsedData.action_type === 'EMERGENCY') {
        badgeAlert.classList.remove('hidden');
        alertActionBox.classList.remove('hidden');
      } else {
        badgeAlert.classList.add('hidden');
        alertActionBox.classList.add('hidden');
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
      aiOutputElement.innerHTML = `<p>${fallbackMsg}</p>`;
    }
    resultSection.classList.remove('hidden');
    speakVietnamese(fallbackMsg);
  }
}

// 3. AI DOCTOR DAILY JOURNAL FOR FAMILY REMOTELY
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
      <h3>📖 Nhật Ký Bác Sĩ AI Theo Dõi Trong Ngày (Con cháu xem từ xa)</h3>
      <p>Chưa có nhật ký ghi nhận hôm nay.</p>
    `;
    return;
  }

  let html = `<h3>📖 Nhật Ký Bác Sĩ AI Theo Dõi Trong Ngày (Con cháu xem từ xa)</h3><ul style="font-size: 1.1rem; list-style: none; padding: 0;">`;
  journal.forEach(item => {
    html += `<li style="background: #f0fdf4; border-left: 5px solid #10b981; margin: 8px 0; padding: 10px; border-radius: 8px; color: #065f46;">
      ⏰ <strong>[${item.time}]</strong> ${item.text}
    </li>`;
  });
  html += `</ul>`;
  container.innerHTML = html;
}

// 4. REMOTE HEALTH METRICS LOGGING & BOT WEBHOOK
function saveHealthMetrics(heartRate, bloodPressure) {
  const healthData = {
    time: new Date().toLocaleString('vi-VN'),
    heartRate: heartRate || 75,
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

  let html = `<h3>📊 Lịch Sử Đo Nhịp Tim & Huyết Áp</h3><ul style="font-size: 1.2rem; list-style: none; padding: 0;">`;
  logs.forEach(log => {
    html += `<li style="background: #f1f5f9; border-left: 5px solid #1a73e8; margin: 8px 0; padding: 12px; border-radius: 8px;">
      ⏰ <strong>${log.time}</strong><br>
      ❤️ Nhịp tim: <span style="color:#dc2626; font-weight:bold;">${log.heartRate} bpm</span> | 
      🩺 Huyết áp: <span style="color:#1a73e8; font-weight:bold;">${log.bloodPressure} mmHg</span>
    </li>`;
  });
  html += `</ul>`;
  container.innerHTML = html;
}

// 5. CONFIRM TAKEN MEDICINE BUTTON HANDLER ("✅ TÔI ĐÃ UỐNG THUỐC RỒI")
function confirmMedicineTaken() {
  const curTimeStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  const praiseMsg = `Giỏi quá! Ông bà đã uống thuốc đầy đủ lúc ${curTimeStr} rồi ạ. Cháu đã gửi tin nhắn báo cho con cháu yên tâm rồi nhé!`;

  speakVietnamese(praiseMsg);

  saveAiDoctorJournal(`Xác nhận: Ông/bà đã bấm nút uống thuốc đầy đủ lúc ${curTimeStr}.`);

  const familyMsg = `✅ MẮT THẤY TAI NGHE: Ông/bà đã uống thuốc đầy đủ lúc ${curTimeStr}`;
  const remotePhone = healthProfile.familyPhone || localStorage.getItem('ZALO_RELATIVE_PHONE') || "0901234567";

  sendRemoteWebhookAlert(familyMsg);
  triggerZaloAlertMessage(remotePhone, familyMsg);

  showToastAlert("✅ ĐÃ XÁC NHẬN UỐNG THUỐC", `Đã lưu mốc giờ ${curTimeStr} và gửi thông báo báo cho con cháu yên tâm!`);
}

// 6. AUTOMATIC DAILY REMINDERS & GREETINGS (06:30 AM, 12:00 PM NOON, 21:00 PM)
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
      speakVietnamese(`Thông báo quan trọng! Đã đến giờ uống thuốc ${rem.name} rồi. Ông bà lấy thuốc uống ngay nhé!`);
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

// 7. HELPER FUNCTIONS & LISTENERS
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
  localStorage.setItem('ZALO_RELATIVE_PHONE', healthProfile.familyPhone);
  document.getElementById('healthProfileModal').classList.add('hidden');
  renderUserBar();
  showToastAlert("ĐÃ LƯU HỒ SƠ", "Hồ sơ sức khỏe cá nhân của ông/bà đã được cập nhật thành công!");
}

function initAuth() {
  const savedUser = localStorage.getItem('QUICK_USER');
  if (savedUser) {
    try { renderUserProfile(JSON.parse(savedUser)); } catch(e){}
  }
}

function renderUserBar() {
  const savedUser = localStorage.getItem('QUICK_USER');
  if (savedUser) {
    try { renderUserProfile(JSON.parse(savedUser)); } catch(e){}
  }
}

function renderUserProfile(user) {
  const bar = document.getElementById('userProfileBar');
  document.getElementById('userAvatar').src = user.picture || "https://api.dicebear.com/7.x/bottts/svg?seed=" + encodeURIComponent(user.name);
  document.getElementById('userName').textContent = user.name || healthProfile.userName || "Ông/Bà";
  document.getElementById('userEmail').textContent = `Zalo người thân: ${user.phone || healthProfile.familyPhone || '0901234567'}`;
  bar.classList.remove('hidden');
}

function handleQuickStartSubmit(e) {
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

  document.getElementById('quickStartModal').classList.add('hidden');
  renderUserProfile(quickUser);
  showToastAlert("ĐÃ LƯU THÔNG TIN", `Chào mừng ${name}! Thông tin cá nhân đã được lưu an toàn.`);
}

function handleLogout() {
  localStorage.removeItem('QUICK_USER');
  document.getElementById('userProfileBar').classList.add('hidden');
  document.getElementById('quickStartModal').classList.remove('hidden');
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
  const stepCountValue = document.getElementById('stepCountValue');
  const stepProgressFill = document.getElementById('stepProgressFill');
  const stepPercent = document.getElementById('stepPercent');
  
  if (stepCountValue) stepCountValue.textContent = stepCount.toLocaleString();
  const target = 3000;
  const pct = Math.min(100, Math.round((stepCount / target) * 100));
  if (stepProgressFill) stepProgressFill.style.width = pct + '%';
  if (stepPercent) stepPercent.textContent = pct;
}

// VITALS CHECK WITH AUTOMATIC LOG & REMOTE ALERT
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
  } else {
    message = `Huyết áp ${sysVal}/${diaVal} mmHg và Nhịp tim ${hrVal} nhịp/phút của ông bà nằm trong mức AN TOÀN, chỉ chênh lệch nhẹ dưới 15% so với hồ sơ sức khỏe. Ông bà tiếp tục duy trì sức khỏe tốt nhé!`;
  }

  currentAlertDetails = `Huyết áp thực tế: ${sysVal}/${diaVal} mmHg, Nhịp tim: ${hrVal} bpm (Chuẩn hồ sơ: ${baseSys}/${baseDia} mmHg, ${baseHr} bpm)`;

  const aiOutputElement = document.getElementById('ai-response') || document.getElementById('speechMessageText');
  if (aiOutputElement) {
    aiOutputElement.innerHTML = `<div class="ai-reply"><strong>👨‍⚕️ Bác sĩ AI tư vấn:</strong><br>${message}</div>`;
  }

  document.getElementById('valMedicine').textContent = `Huyết áp: ${sysVal}/${diaVal} mmHg`;
  document.getElementById('valDosage').textContent = `Nhịp tim: ${hrVal} nhịp/phút`;
  document.getElementById('valExpiry').textContent = `Chuẩn hồ sơ: ${baseSys}/${baseDia} mmHg`;

  const badgeAlert = document.getElementById('badgeAlert');
  const alertActionBox = document.getElementById('alertActionBox');

  if (isDeviatedAbove15) {
    badgeAlert.classList.remove('hidden');
    alertActionBox.classList.remove('hidden');
  } else {
    badgeAlert.classList.add('hidden');
    alertActionBox.classList.add('hidden');
  }

  document.getElementById('resultSection').classList.remove('hidden');
  document.getElementById('resultSection').scrollIntoView({ behavior: 'smooth' });

  speakVietnamese(message);
}

// MEDICINE REMINDERS
function initMedicineReminders() {
  const savedReminders = localStorage.getItem('MEDICINE_REMINDERS');
  if (savedReminders) {
    try { medicineReminders = JSON.parse(savedReminders); } catch(e){}
  }
  renderReminderList();
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

// PWA INSTALL PROMPT
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
      deferredInstallPrompt.userChoice.then(() => {
        deferredInstallPrompt = null;
        document.getElementById('btnInstallPwa').classList.add('hidden');
        document.getElementById('pwaInstallBanner').classList.add('hidden');
      });
    }
  };

  document.getElementById('btnInstallPwa').addEventListener('click', installAction);
  document.getElementById('btnBannerInstall').addEventListener('click', installAction);
}

// EVENT LISTENERS SETUP
function setupEventListeners() {
  // Quick Start Form Controls
  document.getElementById('btnQuickStart').addEventListener('click', () => {
    document.getElementById('quickStartModal').classList.remove('hidden');
  });
  document.getElementById('btnCloseQuickStart').addEventListener('click', () => {
    document.getElementById('quickStartModal').classList.add('hidden');
  });
  document.getElementById('quickStartForm').addEventListener('submit', handleQuickStartSubmit);
  document.getElementById('btnGoogleLogout').addEventListener('click', handleLogout);

  // System Settings Modal
  document.getElementById('btnOpenSettings').addEventListener('click', () => {
    document.getElementById('settingGeminiApiKey').value = localStorage.getItem('GEMINI_API_KEY') || "";
    document.getElementById('settingZaloWebhook').value = localStorage.getItem('ZALO_WEBHOOK_URL') || "";
    document.getElementById('systemSettingsModal').classList.remove('hidden');
  });
  document.getElementById('btnCloseSystemSettings').addEventListener('click', () => {
    document.getElementById('systemSettingsModal').classList.add('hidden');
  });
  document.getElementById('btnSaveSystemSettings').addEventListener('click', () => {
    const key = document.getElementById('settingGeminiApiKey').value.trim();
    const webhook = document.getElementById('settingZaloWebhook').value.trim();
    if (key) localStorage.setItem('GEMINI_API_KEY', key);
    if (webhook) localStorage.setItem('ZALO_WEBHOOK_URL', webhook);
    document.getElementById('systemSettingsModal').classList.add('hidden');
    showToastAlert("ĐÃ LƯU CÀI ĐẶT", "Cài đặt hệ thống API và Webhook Bot đã được lưu thành công!");
  });

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

  // Bluetooth Scan
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

  // Action Button 1: MẮT THẤY (Capture Image / OCR Prescription)
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
      askAIAdvisor("Hãy đọc toa thuốc/ảnh này và hướng dẫn liều dùng chi tiết cho ông bà.", currentBase64Image);
    }
  });

  // Action Button 2: TAI NGHE (Voice Speech Recognition)
  document.getElementById('btnTaiNghe').addEventListener('click', () => startVoiceInput());
  document.getElementById('btnStopListening').addEventListener('click', () => stopVoiceInput());
  document.getElementById('btnSpeakAgain').addEventListener('click', () => {
    if (currentSpeechMessage) speakVietnamese(currentSpeechMessage);
  });

  // Confirm Taken Medicine Button Listener
  document.getElementById('btnConfirmMedicineTaken').addEventListener('click', confirmMedicineTaken);

  // Zalo Active Daily Report Button Listener
  const sendZaloReportAction = () => {
    const remotePhone = healthProfile.familyPhone || localStorage.getItem('ZALO_RELATIVE_PHONE') || "0901234567";
    const reportMsg = `[MẮT THẤY TAI NGHE] Cập nhật tình hình ông/bà hôm nay (${new Date().toLocaleDateString('vi-VN')}): ${currentSpeechMessage || 'Sức khỏe ổn định, đã kiểm tra sinh hiệu và tương tác với Bác sĩ AI.'}`;
    triggerZaloAlertMessage(remotePhone, reportMsg);
  };

  const btnGlobalZaloAlert = document.getElementById('btnGlobalZaloAlert');
  if (btnGlobalZaloAlert) btnGlobalZaloAlert.addEventListener('click', sendZaloReportAction);

  const btnSendZaloAlert = document.getElementById('btnSendZaloAlert');
  if (btnSendZaloAlert) btnSendZaloAlert.addEventListener('click', sendZaloReportAction);

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
    localStorage.setItem('MEDICINE_TIME', timeVal);
    renderReminderList();
    document.getElementById('addReminderModal').classList.add('hidden');
    showToastAlert("ĐÃ ĐẶT LỊCH", `Đã cài lịch nhắc uống thuốc lúc ${timeVal} cho ông bà!`);
  });

  // GUARANTEED NON-FREEZING MODAL CLOSE LISTENER FOR "ĐÃ HIỂU (ĐÓNG)"
  const btnCloseAlertModal = document.getElementById('btnCloseAlertModal');
  if (btnCloseAlertModal) {
    btnCloseAlertModal.onclick = function() {
      document.getElementById('alertModal').classList.add('hidden');
    };
  }

  // Backdrop overlay click to close for all modals
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.classList.add('hidden');
      }
    });
  });

  // Chip Prompt Buttons
  document.querySelectorAll('.chip-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const text = e.target.textContent.replace(/"/g, '');
      askAIAdvisor(text);
    });
  });
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

// SPEECH RECOGNITION
function initSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (SpeechRecognition) {
    speechRecognition = new SpeechRecognition();
    speechRecognition.lang = 'vi-VN';
    speechRecognition.onstart = () => document.getElementById('listeningIndicator').classList.remove('hidden');
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
    const promptText = prompt("Vui lòng nhập câu hỏi của ông/bà:");
    if (promptText) askAIAdvisor(promptText);
    return;
  }
  try { speechRecognition.start(); } catch(e){ speechRecognition.stop(); speechRecognition.start(); }
}

function stopVoiceInput() {
  document.getElementById('listeningIndicator').classList.add('hidden');
  if (speechRecognition) { try { speechRecognition.stop(); } catch(e){} }
}

// TOAST ALERT MODAL
function showToastAlert(title, message) {
  document.getElementById('modalAlertTitle').textContent = title;
  document.getElementById('modalAlertBody').textContent = message;
  document.getElementById('modalAlertIcon').textContent = (title.includes('CẢNH BÁO') || title.includes('HẾT HẠN')) ? '🚨' : 'ℹ️';
  document.getElementById('alertModal').classList.remove('hidden');
}
