# 👁️👂 MẮT THẤY TAI NGHE (V3 - KHẮC PHỤC TRIỆT ĐỂ)

Ứng dụng **Progressive Web App (PWA V3)** hỗ trợ người cao tuổi đọc đơn thuốc, chẩn đoán sinh hiệu, đếm bước chân, nhắc lịch uống thuốc và gửi báo động chủ động qua Zalo cho con cháu bằng Gemini AI.

[![GitHub Repository](https://img.shields.io/badge/GitHub-health--care---blue?style=flat-square&logo=github)](https://github.com/Zhang-linghe3012/health-care-.git)
[![Gemini AI](https://img.shields.io/badge/AI-Google_Gemini_3.6_%2F_2.5_Flash-green?style=flat-square&logo=google)](https://ai.google.dev/)
[![PWA Ready](https://img.shields.io/badge/PWA-V3_Offline_Ready-purple?style=flat-square)](https://web.dev/progressive-web-apps/)

---

## 🚀 Đã Khắc Phục Triệt Để 3 Vấn Đề (Bản V3)

1. **Chế Độ "🚀 BẮT ĐẦU NHANH (KHÔNG CẦN GOOGLE)"**:
   - Thêm nút Bắt Đầu Nhanh sử dụng `localStorage` cho phép người dùng vào thẳng ứng dụng mà không cần cấu hình Google Client ID hay lo bị đơ/chặn ủy quyền OAuth.
   - Hiển thị form nhập Tên đại diện và Số điện thoại Zalo của Con/Cháu đơn giản, dễ thao tác.

2. **Làm Sạch & Tối Ưu Âm Thanh Giọng Nói Tiếng Việt (TTS)**:
   - Tách bỏ hoàn toàn mã JSON, thẻ ký tự đặc biệt, chỉ đọc câu nói ấm áp Tiếng Việt (`speech_message`) cho ông bà.
   - Tìm kiếm giọng đọc Tiếng Việt `vi-VN` / `vi_VN` linh hoạt với sự kiện `onvoiceschanged`. Nếu thiết bị chưa có giọng Việt, tự động hiển thị chữ siêu to (26px+) để ông bà đọc dễ dàng.
   - Thiết lập tốc độ đọc chậm rãi, rõ tiếng (**0.85x**).

3. **Gửi Báo Động Zalo Chủ Động Thực Tế**:
   - Thêm ô nhập: *"📱 Số điện thoại Zalo của Con/Cháu"* trong Hồ sơ sức khỏe.
   - Nút bấm nổi bật **"💬 GỬI BÁO ĐỘNG BẰNG ZALO CHỦ ĐỘNG"** tự động kích hoạt Web Share API hoặc liên kết Zalo `https://zalo.me/[SĐT]` / SMS với tin nhắn soạn sẵn:
     *"CẢNH BÁO SỨC KHỎE TỪ MẮT THẤY TAI NGHE: Ông/bà đang gặp tình trạng [Nội dung], chỉ số [Chi tiết]. Hãy kiểm tra ngay!"*

---

## 📦 GitHub Repository

Link chính thức: [https://github.com/Zhang-linghe3012/health-care-.git](https://github.com/Zhang-linghe3012/health-care-.git)
