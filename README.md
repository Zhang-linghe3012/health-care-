# 👁️👂 MẮT THẤY TAI NGHE (V2 NÂNG CẤP) – Trợ Lý Y Tế & Kết Nối Tình Thân Cho Người Cao Tuổi

Ứng dụng **Progressive Web App (PWA V2)** thông minh hỗ trợ người cao tuổi đọc đơn thuốc, nhận diện hạn sử dụng, chẩn đoán sinh hiệu (Huyết áp & Nhịp tim), đếm bước chân tự động, nhắc lịch uống thuốc hằng ngày và phát cảnh báo khẩn cấp qua Zalo bằng bộ não **Gemini AI ("Cháu Ngoan AI")**.

[![GitHub Repository](https://img.shields.io/badge/GitHub-health--care---blue?style=flat-square&logo=github)](https://github.com/Zhang-linghe3012/health-care-.git)
[![Gemini AI](https://img.shields.io/badge/AI-Google_Gemini_3.6_%2F_2.5_Flash-green?style=flat-square&logo=google)](https://ai.google.dev/)
[![PWA Ready](https://img.shields.io/badge/PWA-V2_Offline_Ready-purple?style=flat-square)](https://web.dev/progressive-web-apps/)

---

## 🚀 Các Tính Năng Nâng Cấp Nổi Bật (V2)

1. **Đăng Nhập Gmail & Hồ Sơ Sức Khỏe Cá Nhân**:
   - Tích hợp Đăng nhập bằng Google / Gmail (**Google Identity Services**).
   - Bảng **"Hồ Sơ Sức Khỏe Cá Nhân"**: Quản lý bệnh nền (Cao huyết áp, Tiểu đường, Tim mạch, Xương khớp...), Chỉ số Huyết áp & Nhịp tim bình thường lúc khỏe mạnh (chuẩn cơ sở), và Danh sách thuốc hằng ngày.

2. **Chẩn Đoán Sinh Hiệu & Cảnh Báo Lệch >15% qua Zalo**:
   - Nhập hoặc kết nối Web Bluetooth lấy chỉ số **Huyết áp & Nhịp tim** thực tế.
   - AI tự động đối chiếu chỉ số đo thực tế với **Hồ sơ sức khỏe cá nhân**. Nếu lệch **>15%**, tự động phát giọng nói cảnh báo khẩn cấp và bật nút **"🚨 GỬI CẢNH BÁO CHO CON CHÁU QUA ZALO"**.

3. **Cảm Biến Đếm Bước Chân Tự Động (`DeviceMotionEvent`)**:
   - Tự động đếm số bước chân hằng ngày của ông bà thông qua cảm biến gia tốc chuyển động trình duyệt di động.

4. **Nhắc Lịch Uống Thuốc Hằng Ngày**:
   - Đặt giờ hẹn uống thuốc. Tự động phát chuông báo + đọc loa giọng nói tiếng Việt tốc độ **0.9x** nhắc nhở khi đến giờ.

5. **Tính Năng PWA & Nút "📱 THÊM VÀO MÀN HÌNH CHÍNH"**:
   - Tự động bắt sự kiện `beforeinstallprompt` hiển thị banner cài đặt 1-click lên màn hình chính điện thoại.
   - Cập nhật `sw.js` (Cache V2) & `manifest.json` nâng cao khả năng hoạt động Offline.

---

## 🏗️ Cấu Trúc Mã Nguồn V2

```
mat-thay-tai-nghe/
├── index.html        # Giao diện nâng cấp V2 (Hồ sơ sức khỏe, Sinh hiệu, Đếm bước, Lịch thuốc)
├── style.css         # CSS nâng cấp (Màu sắc sinh hiệu, nút Zalo #0068FF, PWA banner)
├── app.js            # Logic V2 (Google Identity, Gemini API, Đối chiếu >15%, DeviceMotion, Alarm)
├── sw.js             # Service Worker Cache V2
├── manifest.json     # Manifest V2 hỗ trợ PWA shortcuts
├── icons/            # Bộ icon ứng dụng (SVG & PNG)
└── README.md         # Tài liệu nâng cấp V2
```

---

## 📤 GitHub Push

Repository chính thức: [https://github.com/Zhang-linghe3012/health-care-.git](https://github.com/Zhang-linghe3012/health-care-.git)

*Phát triển bởi Cháu Ngoan AI - Đồng hành cùng sức khỏe và niềm vui của Ông Bà!*
