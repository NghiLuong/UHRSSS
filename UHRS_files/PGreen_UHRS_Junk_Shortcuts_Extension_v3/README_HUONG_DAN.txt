HƯỚNG DẪN CÀI EXTENSION PGREEN UHRS JUNK SHORTCUTS V3

Mục đích:
- Dùng phím tắt để chọn nhanh các radio button trong trang UHRS Junk Type.
- Dùng phím tắt để copy link ẩn trong input id="sja_DocumentUrl".
- Dùng Ctrl + Shift + 8 để mở nhanh link UHRS app trong tab hiện tại.

PHÍM TẮT ĐÃ CÀI

Ctrl + Shift + 1
- Chọn Not Junk
- Radio id: notjunkButton

Ctrl + Shift + 2
- Chọn Error Message / Page not found / No results
- Radio id: junkButton4

Ctrl + Shift + 3
- Chọn Low / No Content / Ads only pages
- Radio id: junkButton5

Ctrl + Shift + 4
- Chọn Site unreachable
- Radio id: junkButton11

Ctrl + Shift + 5
- Chọn Automatic Redirection
- Radio id: junkButton10

Ctrl + Shift + 6
- Chọn Other type of Junk
- Radio id: junkButton8

Ctrl + Shift + 7
- Copy link ẩn từ input id="sja_DocumentUrl"

Ctrl + Shift + 8
- Mở đường dẫn:
  https://www.uhrs.ai/marketplace/app/63766?taskgroupid=178599?taskgroupid=178599

GHI CHÚ VỀ CTRL + SHIFT + 8
- Chrome Extension không cần gõ từng ký tự vào thanh địa chỉ.
- Extension sẽ đổi URL của tab hiện tại bằng chrome.tabs.update().
- Kết quả tương đương thao tác nhập URL vào thanh địa chỉ rồi bấm Enter.

CÁCH CÀI

1. Giải nén file ZIP này ra một thư mục cố định.
2. Mở Chrome hoặc Edge.
3. Vào:
   chrome://extensions
   hoặc
   edge://extensions
4. Bật Developer mode / Chế độ nhà phát triển.
5. Bấm Load unpacked / Tải tiện ích đã giải nén.
6. Chọn thư mục đã giải nén.
7. Mở trang UHRS cần thao tác và dùng phím tắt.

CÁCH CẬP NHẬT TỪ BẢN CŨ

Cách 1:
- Xóa extension cũ.
- Load unpacked lại thư mục bản V3.

Cách 2:
- Ghi đè file trong thư mục extension cũ bằng file của bản V3.
- Vào chrome://extensions
- Bấm nút Reload ở extension.

CÁCH ĐỔI PHÍM TẮT

Chrome:
- Vào chrome://extensions/shortcuts

Edge:
- Vào edge://extensions/shortcuts

Sau đó tìm "PGreen UHRS Junk Shortcuts" và đổi phím theo ý muốn.

XỬ LÝ NẾU PHÍM KHÔNG HOẠT ĐỘNG

1. Kiểm tra extension đã bật chưa.
2. Vào trang shortcuts để xem Chrome/Edge có nhận đủ phím tắt chưa.
3. Nếu phím bị trùng với hệ thống hoặc extension khác, đổi sang tổ hợp khác.
4. Extension không chạy script chọn nút trên trang chrome://, edge://, file://.
5. Với Ctrl + Shift + 8, extension sẽ mở link ở tab hiện tại; nếu không có tab hiện tại thì tạo tab mới.