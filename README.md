# 👨‍⚕️🩺 MẮT THẤY TAI NGHE (V8 MASTER SYSTEM - HỆ THỐNG TRỢ LÝ Y TẾ TOÀN DIỆN)

Ứng dụng **Progressive Web App (PWA V8 MASTER SYSTEM)** hỗ trợ người cao tuổi với giao diện Tailwind CSS y tế dịu mắt, đọc toa thuốc OCR và phân loại thuốc thông minh, báo cáo sức khỏe chi tiết qua Zalo cho con cháu, và hệ thống thông báo đẩy chạy ngầm nhắc nhở uống thuốc/uống nước ấm kể cả khi tắt ứng dụng.

[![GitHub Repository](https://img.shields.io/badge/GitHub-health--care---blue?style=flat-square&logo=github)](https://github.com/Zhang-linghe3012/health-care-.git)
[![Gemini AI](https://img.shields.io/badge/AI-Google_Gemini_3.6_%2F_2.5_Flash-green?style=flat-square&logo=google)](https://ai.google.dev/)
[![PWA Ready](https://img.shields.io/badge/PWA-V8_MASTER_SYSTEM-purple?style=flat-square)](https://web.dev/progressive-web-apps/)

---

## 🚀 Chi Tiết Bộ Nâng Cấp V8 MASTER SYSTEM

1. **Giao Diện Tailwind CSS Y Tế & Chữ Siêu To**:
   - Chuyển đổi toàn bộ nền sang màu **Trắng Dịu (#F4F7F6)** và **Xanh Mint Y Tế (#E6F4EA)** giúp dịu mắt ông bà.
   - Thẻ nội dung bo góc mềm mại, chữ màu tối tương phản cao (`#2D3748`), kích thước chữ to rõ ràng (**20px - 24px**).
   - Biểu tượng logo mới chuẩn **👨‍⚕️🩺** (Bác Sĩ Gia Đình).

2. **Báo Cáo Sức Khỏe Con Cháu qua Zalo (Reports)**:
   - Nút bự nổi bật **"📲 GỬI BÁO CÁO CHO CON CHÁU QUA ZALO"** tự động tổng hợp:
     + Chỉ số Nhịp tim/Huyết áp mới nhất kèm đánh giá an toàn.
     + Trạng thái uống thuốc hôm nay (Đã uống / Chưa uống).
     + Lời khuyên mới nhất từ Bác Sĩ AI.
   - Hỗ trợ gửi tin nhắn tự động qua Zalo hoặc Web Share API.

3. **Thông Báo Đẩy Nhắc Nhở Chạy Ngầm (Background Push Notifications)**:
   - Xin quyền thông báo ngay khi mở ứng dụng (`Notification.requestPermission()`).
   - Kết nối với Service Worker (`sw.js`) để lập lịch chạy ngầm. Kể cả khi tắt ứng dụng hoặc tắt màn hình, Service Worker vẫn gửi thông báo thông báo nhắc nhở uống thuốc/uống nước ấm đúng giờ.

4. **AI Đọc Toa Thuốc & Phân Loại Thông Minh (Vision OCR)**:
   - Chụp trực tiếp từ Webcam hoặc tải ảnh đơn thuốc.
   - Phân loại rõ ràng loại thuốc: *Thuốc huyết áp, Thuốc tiểu đường, Thuốc bổ, Thuốc hạ sốt...*
   - Chỉ ra công dụng, liều dùng, uống trước/sau ăn, hướng giải quyết cụ thể và **TỰ ĐỘNG ĐỌC TO** chi tiết.

5. **AI Tư Vấn Triệu Chứng Linh Hoạt (Dynamic Response)**:
   - Loại bỏ hoàn toàn các câu trả lời rập khuôn.
   - Tự động phân tích triệu chứng (*mệt, chóng mặt, ho, sốt*) đưa ra lời khuyên khoa học, dặn nằm nghỉ tại chỗ, đo huyết áp, uống trà ấm và đọc to rõ ràng.

---

## 📦 GitHub Repository

Link chính thức: [https://github.com/Zhang-linghe3012/health-care-.git](https://github.com/Zhang-linghe3012/health-care-.git)
