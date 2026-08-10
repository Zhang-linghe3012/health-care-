/**
 * MẮT THẤY TAI NGHE - Client-side Application Script
 * Powered by Google Gemini AI (System Instruction & JSON Schema)
 */

// System Instruction extracted directly from AI Studio Java Code
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

// DOM Elements
const btnSettings = document.getElementById('btnSettings');
const settingsModal = document.getElementById('settingsModal');
const btnCloseSettings = document.getElementById('btnCloseSettings');
const apiKeyInput = document.getElementById('apiKeyInput');
const btnToggleKeyVisibility = document.getElementById('btnToggleKeyVisibility');
const modelSelect = document.getElementById('modelSelect');
const btnSaveKey = document.getElementById('btnSaveKey');
const keyStatusMessage = document.getElementById('keyStatusMessage');
const apiKeyBanner = document.getElementById('apiKeyBanner');

const btnMatThay = document.getElementById('btnMatThay');
const imageInput = document.getElementById('imageInput');
const btnTaiNghe = document.getElementById('btnTaiNghe');
const btnStopListening = document.getElementById('btnStopListening');
const listeningIndicator = document.getElementById('listeningIndicator');
const loadingIndicator = document.getElementById('loadingIndicator');

const imagePreviewSection = document.getElementById('imagePreviewSection');
const imagePreview = document.getElementById('imagePreview');
const btnClearImage = document.getElementById('btnClearImage');
const btnAnalyzeImage = document.getElementById('btnAnalyzeImage');

const resultSection = document.getElementById('resultSection');
const speechMessageText = document.getElementById('speechMessageText');
const btnSpeakAgain = document.getElementById('btnSpeakAgain');
const valMedicine = document.getElementById('valMedicine');
const valDosage = document.getElementById('valDosage');
const valExpiry = document.getElementById('valExpiry');

const badgeExpired = document.getElementById('badgeExpired');
const badgeBlurry = document.getElementById('badgeBlurry');
const badgeAlert = document.getElementById('badgeAlert');

const alertActionBox = document.getElementById('alertActionBox');
const btnCallChildren = document.getElementById('btnCallChildren');
const btnSendSms = document.getElementById('btnSendSms');

const alertModal = document.getElementById('alertModal');
const modalAlertTitle = document.getElementById('modalAlertTitle');
const modalAlertBody = document.getElementById('modalAlertBody');
const modalAlertIcon = document.getElementById('modalAlertIcon');
const btnCloseAlertModal = document.getElementById('btnCloseAlertModal');

// App State
let currentBase64Image = null;
let currentSpeechMessage = "";
let speechRecognition = null;
let isListening = false;

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
  loadSavedSettings();
  initSpeechRecognition();
  setupEventListeners();
});

// Load Settings from LocalStorage
function loadSavedSettings() {
  const savedKey = localStorage.getItem('GEMINI_API_KEY');
  const savedModel = localStorage.getItem('GEMINI_MODEL') || 'gemini-2.5-flash';
  
  if (savedKey) {
    apiKeyInput.value = savedKey;
    apiKeyBanner.classList.add('hidden');
  } else {
    apiKeyBanner.classList.remove('hidden');
  }
  
  modelSelect.value = savedModel;
}

// Event Listeners
function setupEventListeners() {
  // Settings Modal Controls
  btnSettings.addEventListener('click', () => settingsModal.classList.remove('hidden'));
  btnCloseSettings.addEventListener('click', () => settingsModal.classList.add('hidden'));
  
  btnToggleKeyVisibility.addEventListener('click', () => {
    if (apiKeyInput.type === 'password') {
      apiKeyInput.type = 'text';
      btnToggleKeyVisibility.textContent = '🙈 Ẩn';
    } else {
      apiKeyInput.type = 'password';
      btnToggleKeyVisibility.textContent = '👁️ Hiện';
    }
  });

  btnSaveKey.addEventListener('click', () => {
    const key = apiKeyInput.value.trim();
    const model = modelSelect.value;
    if (!key) {
      keyStatusMessage.textContent = '❌ Vui lòng nhập API Key!';
      keyStatusMessage.style.color = '#ef4444';
      return;
    }
    localStorage.setItem('GEMINI_API_KEY', key);
    localStorage.setItem('GEMINI_MODEL', model);
    keyStatusMessage.textContent = '✅ Đã lưu API Key thành công!';
    keyStatusMessage.style.color = '#10b981';
    apiKeyBanner.classList.add('hidden');
    setTimeout(() => settingsModal.classList.add('hidden'), 1000);
  });

  // Action Button 1: MẮT THẤY (Capture / Upload Image)
  btnMatThay.addEventListener('click', () => {
    if (!checkApiKey()) return;
    imageInput.click();
  });

  imageInput.addEventListener('change', handleImageSelection);

  btnClearImage.addEventListener('click', () => {
    currentBase64Image = null;
    imageInput.value = '';
    imagePreviewSection.classList.add('hidden');
  });

  btnAnalyzeImage.addEventListener('click', () => {
    if (currentBase64Image) {
      analyzeWithGemini({
        prompt: "Đọc thông tin đơn thuốc, tên thuốc, liều lượng và hạn sử dụng trong ảnh này giúp ông/bà.",
        base64Image: currentBase64Image
      });
    }
  });

  // Action Button 2: TAI NGHE (Voice Speech Input)
  btnTaiNghe.addEventListener('click', () => {
    if (!checkApiKey()) return;
    startVoiceInput();
  });

  btnStopListening.addEventListener('click', () => {
    stopVoiceInput();
  });

  // Speak Again Button
  btnSpeakAgain.addEventListener('click', () => {
    if (currentSpeechMessage) {
      speakText(currentSpeechMessage);
    }
  });

  // SMS / Contact Action
  btnSendSms.addEventListener('click', () => {
    const message = encodeURIComponent(`[MẮT THẤY TAI NGHE] Cảnh báo từ ứng dụng Cháu AI cho ông/bà: ${currentSpeechMessage}`);
    window.location.href = `sms:?body=${message}`;
  });

  // Close Alert Modal
  btnCloseAlertModal.addEventListener('click', () => {
    alertModal.classList.add('hidden');
  });

  // Chip Prompts
  document.querySelectorAll('.chip-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      if (!checkApiKey()) return;
      const text = e.target.textContent.replace(/"/g, '');
      analyzeWithGemini({ prompt: text });
    });
  });
}

// Check API Key
function checkApiKey() {
  const key = localStorage.getItem('GEMINI_API_KEY');
  if (!key) {
    settingsModal.classList.remove('hidden');
    alertModalBody.textContent = "Ông bà ơi, nhờ con cháu nhấn vào nút ⚙️ Key góc trên màn hình để dán Gemini API Key trước nhé!";
    modalAlertTitle.textContent = "Chưa Có API Key";
    modalAlertIcon.textContent = "🔑";
    alertModal.classList.remove('hidden');
    return false;
  }
  return true;
}

// Handle Image Selection
function handleImageSelection(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    imagePreview.src = e.target.result;
    // Extract raw base64 string
    currentBase64Image = e.target.result.split(',')[1];
    imagePreviewSection.classList.remove('hidden');
    resultSection.classList.add('hidden');
    imagePreviewSection.scrollIntoView({ behavior: 'smooth' });
  };
  reader.readAsDataURL(file);
}

// Web Speech Recognition (Speech-to-Text)
function initSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (SpeechRecognition) {
    speechRecognition = new SpeechRecognition();
    speechRecognition.lang = 'vi-VN';
    speechRecognition.continuous = false;
    speechRecognition.interimResults = false;

    speechRecognition.onstart = () => {
      isListening = true;
      listeningIndicator.classList.remove('hidden');
    };

    speechRecognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      console.log('Voice Recognized:', transcript);
      stopVoiceInput();
      analyzeWithGemini({ prompt: transcript });
    };

    speechRecognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      stopVoiceInput();
      showToastAlert("Không nghe thấy giọng nói", "Ông bà hãy thử nói lại hoặc kê sát micro hơn nhé!");
    };

    speechRecognition.onend = () => {
      stopVoiceInput();
    };
  }
}

function startVoiceInput() {
  if (!speechRecognition) {
    const userPrompt = prompt("Trình duyệt không hỗ trợ nhận diện giọng nói tự động. Vui lòng nhập câu hỏi của ông/bà:");
    if (userPrompt) {
      analyzeWithGemini({ prompt: userPrompt });
    }
    return;
  }
  try {
    speechRecognition.start();
  } catch (err) {
    speechRecognition.stop();
    speechRecognition.start();
  }
}

function stopVoiceInput() {
  isListening = false;
  listeningIndicator.classList.add('hidden');
  if (speechRecognition) {
    try { speechRecognition.stop(); } catch(e){}
  }
}

// Call Gemini API via REST
async function analyzeWithGemini({ prompt, base64Image = null }) {
  const apiKey = localStorage.getItem('GEMINI_API_KEY');
  let selectedModel = localStorage.getItem('GEMINI_MODEL') || 'gemini-2.5-flash';
  
  if (!apiKey) return;

  // Show loading UI
  loadingIndicator.classList.remove('hidden');
  resultSection.classList.add('hidden');
  imagePreviewSection.classList.add('hidden');
  loadingIndicator.scrollIntoView({ behavior: 'smooth' });

  // Prepare Payload
  const contentsParts = [];
  if (prompt) {
    contentsParts.push({ text: prompt });
  }
  if (base64Image) {
    contentsParts.push({
      inlineData: {
        mimeType: "image/jpeg",
        data: base64Image
      }
    });
  }

  const requestBody = {
    systemInstruction: {
      parts: [{ text: SYSTEM_INSTRUCTION }]
    },
    contents: [
      { parts: contentsParts }
    ],
    generationConfig: {
      responseMimeType: "application/json",
      maxOutputTokens: 65536
    }
  };

  // Try calling primary model, fallback if error
  const modelsToTry = [selectedModel, 'gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
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

      if (!response.ok) {
        const errText = await response.text();
        console.warn(`Model ${model} failed (${response.status}):`, errText);
        continue; // Try next model
      }

      const data = await response.json();
      if (data.candidates && data.candidates[0].content && data.candidates[0].content.parts) {
        const textResponse = data.candidates[0].content.parts[0].text;
        rawJsonResult = parseGeminiJsonResponse(textResponse);
        if (rawJsonResult) {
          success = true;
          break;
        }
      }
    } catch (err) {
      console.warn(`Error invoking ${model}:`, err);
    }
  }

  loadingIndicator.classList.add('hidden');

  if (success && rawJsonResult) {
    renderResult(rawJsonResult);
  } else {
    showToastAlert("Chưa Kết Nối Được AI", "Không thể kết nối với Cháu AI. Vui lòng kiểm tra lại API Key hoặc kết nối mạng nhé!");
  }
}

// Parse Gemini Response JSON safely
function parseGeminiJsonResponse(text) {
  try {
    // Clean markdown code blocks if any
    let cleaned = text.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.replace(/^```json/, '').replace(/```$/, '').trim();
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```/, '').replace(/```$/, '').trim();
    }
    return JSON.parse(cleaned);
  } catch (err) {
    console.error("JSON parse error:", err, text);
    return null;
  }
}

// Render Results on UI & Trigger Vietnamese Speech (0.9x rate)
function renderResult(data) {
  console.log("Gemini Output JSON:", data);

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

  // Render Speech Text
  speechMessageText.textContent = speech_message;

  // Render Details
  valMedicine.textContent = medicine_name || "Chưa xác định";
  valDosage.textContent = dosage || "Tham khảo ý kiến bác sĩ";
  valExpiry.textContent = expiry_date || "Chưa rõ";

  // Render Status Badges
  if (is_expired) {
    badgeExpired.classList.remove('hidden');
  } else {
    badgeExpired.classList.add('hidden');
  }

  if (is_blurry) {
    badgeBlurry.classList.remove('hidden');
  } else {
    badgeBlurry.classList.add('hidden');
  }

  if (alert_children || action_type === 'EMERGENCY') {
    badgeAlert.classList.remove('hidden');
    alertActionBox.classList.remove('hidden');
  } else {
    badgeAlert.classList.add('hidden');
    alertActionBox.classList.add('hidden');
  }

  // Show Result Section
  resultSection.classList.remove('hidden');
  resultSection.scrollIntoView({ behavior: 'smooth' });

  // AUTOMATIC VIETNAMESE VOICE PLAYBACK at 0.9x speed
  speakText(speech_message);

  // Trigger Modal Alerts if needed
  if (is_blurry) {
    showToastAlert("📷 ẢNH MỜ HOẶC KHÓ ĐỌC", "Cháu thấy ảnh hơi mờ nên không đoán mò. Cháu đã ghi lại để nhờ con cháu kiểm tra lại cho chắc chắn nhé!");
  } else if (is_expired) {
    showToastAlert("⚠️ THUỐC ĐÃ HẾT HẠN", "Cháu phát hiện thuốc này đã quá hạn sử dụng! Ông bà tuyệt đối KHÔNG ĐƯỢC UỐNG thuốc này nhé!");
  } else if (alert_children || action_type === 'EMERGENCY') {
    showToastAlert("🚨 CẢNH BÁO SỨC KHỎE KHẨN CẤP", "Cháu đã phát hiện dấu hiệu cần chú ý. Đã kích hoạt nút gọi điện và gửi tin nhắn cho con cháu của ông bà!");
  }
}

// Text-To-Speech (Vietnamese 0.9x Speed)
function speakText(text) {
  if (!('speechSynthesis' in window)) {
    console.warn("Speech Synthesis is not supported in this browser.");
    return;
  }

  // Cancel ongoing speech
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.9; // 0.9x speed for clear senior playback
  utterance.pitch = 1.0;
  utterance.lang = 'vi-VN';

  // Find best Vietnamese Voice
  const voices = window.speechSynthesis.getVoices();
  const viVoice = voices.find(v => v.lang.includes('vi') || v.lang.includes('VI'));
  if (viVoice) {
    utterance.voice = viVoice;
  }

  btnSpeakAgain.classList.add('pulse-ring');
  utterance.onend = () => btnSpeakAgain.classList.remove('pulse-ring');
  utterance.onerror = () => btnSpeakAgain.classList.remove('pulse-ring');

  window.speechSynthesis.speak(utterance);
}

// Show Alert Dialog Modal
function showToastAlert(title, message) {
  modalAlertTitle.textContent = title;
  modalAlertBody.textContent = message;
  modalAlertIcon.textContent = title.includes('HẾT HẠN') || title.includes('KHẨN CẤP') ? '🚨' : 'ℹ️';
  alertModal.classList.remove('hidden');
}
