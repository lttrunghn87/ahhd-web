# AHHD Account System

Web dùng thật cho Cloudflare Pages + Pages Functions + D1.

## Chức năng

- Trang chính cấp Mail ĐK, tài khoản thường, tài khoản 2FA.
- Tra cứu tài khoản đã cấp.
- Nhóm video TikTok thường 60p, TikTok Lite 60p, TikTok Lite 180p.
- Hiển thị iCloud, email rút tiền nhanh.
- Form đăng link Giftee theo nhân viên.
- Settings có mật khẩu.
- Quản lý link video, kho tài khoản, kho 2FA, nhân viên, link theo ngày, 2FA theo ngày.
- Xuất TXT/CSV cho link và 2FA.
- Dữ liệu lưu trong Cloudflare D1.

## Chạy local

```powershell
npm run build
npx wrangler d1 create ahhd_db
npx wrangler pages dev dist --functions functions --d1 DB=ahhd_db
```

Mật khẩu mặc định ban đầu:

- Settings: `d`
- Quản lý Link/2FA/NV: `d`

Vào Settings để đổi mật khẩu ngay sau khi deploy.

## Deploy Cloudflare Pages

1. Tạo repo GitHub mới, ví dụ `ahhd-account-system`.
2. Push source này lên repo đó.
3. Cloudflare Pages chọn repo đó.
4. Đặt Project name là `ahhd` để có link `https://ahhd.pages.dev` nếu tên còn trống.
5. Build command: `npm run build`.
6. Build output directory: `dist`.
7. Deploy command: để trống.
8. Tạo D1 database tên `ahhd_db`.
9. Trong Pages project, vào Settings -> Functions -> D1 database bindings.
10. Thêm binding:
    - Variable name: `DB`
    - D1 database: `ahhd_db`
11. Trong Environment variables, thêm:
    - `SESSION_SECRET`: chuỗi dài ngẫu nhiên, ví dụ 32 ký tự trở lên.

Database schema tự tạo khi API chạy lần đầu. File `migrations/0001_init.sql` chỉ để tham khảo hoặc chạy thủ công nếu muốn.
