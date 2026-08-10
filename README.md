# 👁️👂 MẮT THẤY TAI NGHE (V4 - SỬA LỖI KỸ THUẬT TRIỆT ĐỂ)

Ứng dụng **Progressive Web App (PWA V4)** hỗ trợ người cao tuổi đọc đơn thuốc, chẩn đoán sinh hiệu, đếm bước chân, nhắc lịch uống thuốc và gửi báo động trực tiếp qua Zalo bằng Gemini AI & Cloud TTS.

[![GitHub Repository](https://img.shields.io/badge/GitHub-health--care---blue?style=flat-square&logo=github)](https://github.com/Zhang-linghe3012/health-care-.git)
[![Gemini AI](https://img.shields.io/badge/AI-Google_Gemini_3.6_%2F_2.5_Flash-green?style=flat-square&logo=google)](https://ai.google.dev/)
[![PWA Ready](https://img.shields.io/badge/PWA-V4_Offline_Ready-purple?style=flat-square)](https://web.dev/progressive-web-apps/)

---

## 🛠️ Đã Khắc Phục Triệt Để 3 Vấn Đề Kỹ Thuật (Bản V4)

1. **Xử Lý Đăng Nhập Gmail Và Dự Phòng An Toàn**:
   - Khi chưa có Google Client ID hoặc GIS bị gián đoạn, ứng dụng tự động mở **Form Đăng Nhập Nhanh** (lưu Tên + Email vào `localStorage`) giúp người dùng vào thẳng ứng dụng không bao giờ bị đơ/treo giao diện.
   - Thêm ô cấu hình `Google OAuth Client ID` trong Cài Đặt kèm hướng dẫn tạo Client ID nếu muốn bật Google OAuth2 thật.

2. **Hàm `speakVietnamese(text)` Phát Âm Thanh Tiếng Việt Chuẩn (Cloud TTS Fallback)**:
   - **Bước 1**: Tách lọc triệt để mã JSON, ký tự rác, câu lệnh code; chỉ phát phần lời nói ấm áp Tiếng Việt `speech_message`.
   - **Bước 2**: Kiểm tra `speechSynthesis` giọng `vi-VN` / `vi_VN` phát ở tốc độ **0.85x**.
   - **Bước 3**: Nếu thiết bị KHÔNG có giọng Việt, tự động gọi Google Translate Cloud TTS API (`https://translate.google.com/translate_tts?ie=UTF-8&tl=vi&client=tw-ob&q=...`) tải file mp3 giọng Việt chuẩn phát qua HTML5 Audio element!

3. **Tính Năng Gửi Cảnh Báo Zalo Với Tự Động Sao Chép Clipboard & Web Share**:
   - Nhập *"📱 Số điện thoại Zalo người thân"* trong Hồ sơ sức khỏe.
   - Khi bấm **"💬 GỬI BÁO ĐỘNG/KẾT QUẢ QUA ZALO"**:
     - Định dạng tin nhắn chuẩn: `"[MẮT THẤY TAI NGHE] Cập nhật sức khỏe ông/bà: ..."`
     - Trên điện thoại: Kích hoạt `navigator.share` chọn ứng dụng Zalo gửi cho con cháu.
     - Trên máy tính: Tự động `navigator.clipboard.writeText()` sao chép văn bản vào bộ nhớ tạm + tự động mở `https://zalo.me/[SĐT]` và hiển thị thông báo nhắc nhở nhấn Ctrl+V để dán gửi ngay!

---

## 📦 GitHub Repository

Link chính thức: [https://github.com/Zhang-linghe3012/health-care-.git](https://github.com/Zhang-linghe3012/health-care-.git)
