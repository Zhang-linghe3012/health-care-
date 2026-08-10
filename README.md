# 👁️👂 MẮT THẤY TAI NGHE (V5 - HỖ TRỢ NGƯỜI CAO TUỔI & GIA ĐÌNH)

Ứng dụng **Progressive Web App (PWA V5)** hỗ trợ người cao tuổi đọc đơn thuốc, bác sĩ gia đình AI tư vấn, chẩn đoán sinh hiệu, đếm bước chân, lưu lịch sử sức khỏe từ xa cho con cháu và hiển thị bảng nhắc nhở siêu to khổng lồ hằng ngày.

[![GitHub Repository](https://img.shields.io/badge/GitHub-health--care---blue?style=flat-square&logo=github)](https://github.com/Zhang-linghe3012/health-care-.git)
[![Gemini AI](https://img.shields.io/badge/AI-Google_Gemini_3.6_%2F_1.5_Flash-green?style=flat-square&logo=google)](https://ai.google.dev/)
[![PWA Ready](https://img.shields.io/badge/PWA-V5_Offline_Ready-purple?style=flat-square)](https://web.dev/progressive-web-apps/)

---

## 🌟 Chi Tiết Bộ Mã Nguồn Nâng Cấp (Bản V5)

1. **Khởi Tạo Âm Thanh & Giọng Đọc V5 (`speakVietnamese`)**:
   - Tự động mở khóa quyền Audio Context (`unlockAudio`) bằng sự kiện chạm màn hình đầu tiên của người dùng.
   - Ưu tiên 1: Web Speech Synthesis với giọng `vi-VN` / `vi_VN` phát ở tốc độ **0.82x** chậm rãi, dễ nghe cho người lớn tuổi.
   - Ưu tiên 2: Fallback sang Google Translate Cloud TTS API (`https://translate.google.com/translate_tts?ie=UTF-8&tl=vi&client=tw-ob&q=...`) audio element (rate 0.85x) kèm xử lý lỗi Autoplay bị chặn.

2. **Bác Sĩ AI Tư Vấn & Đọc Toa Thuốc / OCR (`askAIAdvisor`)**:
   - Bác sĩ gia đình ảo tư vấn ngắn gọn, ấm áp, xưng "cháu" gọi "ông/bà".
   - Phân tích ảnh đơn thuốc/bao bì hoặc văn bản, liệt kê tên thuốc, liều dùng và giờ uống rõ ràng.
   - Hiển thị khối phản hồi `👨‍⚕️ Bác sĩ AI tư vấn:` và phát âm thanh loa tự động.

3. **Theo Dõi Sức Khỏe Từ Xa Cho Con Cháu (`saveHealthMetrics`, `renderHealthHistory`)**:
   - Lưu 30 bản ghi đo nhịp tim, huyết áp gần nhất vào `localStorage` (`HEALTH_LOGS`).
   - Hiển thị danh sách **📊 Lịch Sử Sức Khỏe (Con cháu xem từ xa)** trực quan.
   - Tự động gửi cảnh báo qua Zalo nếu nhịp tim bất thường (< 50 bpm hoặc > 100 bpm) hoặc huyết áp lệch cao.

4. **Thông Báo Nhắc Nhở Uống Thuốc Bự, Dài & Lời Chúc Thời Tiết (`checkDailyReminders`, `showBigBanner`)**:
   - 06:30 AM: Banner & Giọng đọc `☀️ CHÚC CỤ NGÀY MỚI TỐT LÀNH! Hôm nay thời tiết có thể lạnh, cụ nhớ khoác thêm áo ấm và uống một ly nước ấm nhé!`.
   - 21:00 PM: Banner & Giọng đọc `🌙 CHÚC ÔNG BÀ NGỦ NGON! Đã đến giờ nghỉ ngơi, chúc ông bà có một giấc ngủ thật ngon và giấc mơ đẹp!`.
   - Nhắc uống thuốc tự động với Bảng thông báo khổng lồ (`#big-alert-modal`) font chữ 2.2rem/1.6rem siêu to, sắc nét kèm nút bấm hoàn thành 50px.

---

## 📦 GitHub Repository

Link chính thức: [https://github.com/Zhang-linghe3012/health-care-.git](https://github.com/Zhang-linghe3012/health-care-.git)
