# 👁️👂 MẮT THẤY TAI NGHE – Trợ Lý Y Tế & Kết Nối Tình Thân Cho Người Cao Tuổi

Ứng dụng **Progressive Web App (PWA)** thông minh hỗ trợ người cao tuổi đọc đơn thuốc, nhận diện hạn sử dụng, hỏi đáp sức khỏe và cảnh báo an toàn thông qua bộ não **Gemini AI ("Cháu Ngoan AI")**.

[![GitHub Repository](https://img.shields.io/badge/GitHub-health--care---blue?style=flat-square&logo=github)](https://github.com/Zhang-linghe3012/health-care-.git)
[![Gemini AI](https://img.shields.io/badge/AI-Google_Gemini_3.6_%2F_2.5_Flash-green?style=flat-square&logo=google)](https://ai.google.dev/)
[![PWA Ready](https://img.shields.io/badge/PWA-Offline_Ready-purple?style=flat-square)](https://web.dev/progressive-web-apps/)

---

## 🌟 Tính Năng Nổi Bật

1. **"MẮT THẤY" (Thị giác AI)**:
   - Chụp/Đọc ảnh đơn thuốc, nhãn bao bì, số hóa hóa đơn thuốc viết tay.
   - Nhận diện **Tên thuốc**, **Liều dùng / Giờ uống**, **Hạn sử dụng (EXP)**.
   - Cảnh báo an toàn nếu phát hiện kỵ thuốc hoặc thuốc đã hết hạn.
   - Trường hợp ảnh mờ/khó đọc: Tự động thông báo gửi ảnh nhờ con cháu kiểm tra (KHÔNG đoán mò).

2. **"TAI NGHE" (Giao tiếp & Giọng nói 3 Miền)**:
   - Giao tiếp bằng giọng nói Tiếng Việt ấm áp, lễ phép (xưng "cháu", gọi "ông" / "bà").
   - Tự động **phát giọng nói Tiếng Việt** (`window.speechSynthesis`) với tốc độ **0.9x** chậm rãi, dễ nghe cho người lớn tuổi.
   - Phân tích triệu chứng / sinh hiệu (ví dụ: *"đau đầu"*, *"chóng mặt"*, *"huyết áp 140/90"*) để tư vấn hoặc đưa ra cảnh báo khẩn cấp.

3. **Giao Diện Siêu Trực Quan Dành Cho Người Già**:
   - Font chữ siêu to (**22px - 28px**), màu tương phản cao (nền tối, chữ sáng rõ nét).
   - Nút bấm khổng lồ màu xanh lá (**📷 MẮT THẤY**) và xanh dương (**🎙️ TAI NGHE**).
   - Ô dán Gemini API Key đơn giản, lưu trữ an toàn trong `localStorage` của trình duyệt.

4. **PWA Offline Shell**:
   - Tích hợp `manifest.json` và Service Worker `sw.js` cho phép cài đặt trực tiếp lên điện thoại / máy tính như ứng dụng Native app.

---

## 🏗️ Cấu Trúc Mã Nguồn

```
mat-thay-tai-nghe/
├── index.html        # Giao diện chính (Giao diện chữ to, nút bấm khổng lồ)
├── style.css         # Hệ thống thiết kế CSS tương phản cao dành cho người cao tuổi
├── app.js            # Chuyển đổi logic Java từ Google AI Studio sang JavaScript
├── sw.js             # Service Worker cho PWA Offline cache
├── manifest.json     # Web App Manifest cài đặt PWA
├── icons/            # Bộ icon ứng dụng (SVG & PNG 192x192, 512x512)
│   ├── icon.svg
│   ├── icon-192.png
│   ├── icon-512.png
│   └── apple-touch-icon.png
└── README.md         # Tài liệu hướng dẫn sử dụng
```

---

## ⚙️ Cấu Hình System Instruction & JSON Output (Gemini API)

Logic core được xuất từ Google AI Studio với định dạng JSON chuẩn:

```json
{
  "action_type": "READ_PRESCRIPTION" | "CHECK_EXPIRY" | "HEALTH_CHAT" | "EMERGENCY",
  "medicine_name": "Tên thuốc (nếu có)",
  "dosage": "Liều dùng/Giờ uống (nếu có)",
  "expiry_date": "YYYY-MM-DD (nếu có)",
  "is_expired": true/false,
  "is_blurry": true/false,
  "speech_message": "Câu nói ấm áp ngắn gọn để ứng dụng đọc ra loa cho ông bà nghe",
  "alert_children": true/false
}
```

---

## 🚀 Hướng Dẫn Sử Dụng

1. Mở file `index.html` trên trình duyệt web bất kỳ hoặc đưa lên hosting (GitHub Pages, Vercel, Firebase Hosting).
2. Nhấn nút **⚙️ Key** góc trên bên phải để dán **Gemini API Key** của bạn (Lấy API Key miễn phí tại [Google AI Studio](https://aistudio.google.com/)).
3. Trải nghiệm 2 tính năng chính:
   - Nhấn **📷 MẮT THẤY** để chụp ảnh đơn thuốc hoặc bao bì thuốc.
   - Nhấn **🎙️ TAI NGHE** để nói chuyện trực tiếp với Cháu AI bằng tiếng Việt.

---

## 📤 GitHub Repository

Repository chính thức: [https://github.com/Zhang-linghe3012/health-care-.git](https://github.com/Zhang-linghe3012/health-care-.git)

*Phát triển bởi Cháu Ngoan AI - Đồng hành cùng sức khỏe và niềm vui của Ông Bà!*
