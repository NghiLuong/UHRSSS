HƯỚNG DẪN CÀI EXTENSION COPY LINK ẨN

Mục đích:
- Thay thế macro UI.Vision:
  storeAttribute | id=sja_DocumentUrl@value | !clipboard
- Bấm phím tắt để copy giá trị trong phần tử:
  id="sja_DocumentUrl"

Phím tắt mặc định:
- Windows/Linux: Ctrl + Shift + 5
- Mac: Command + Shift + 5

Cách cài:
1. Giải nén file ZIP này ra một thư mục cố định trên máy.
2. Mở Chrome hoặc Edge.
3. Vào trang:
   chrome://extensions
   hoặc
   edge://extensions
4. Bật Developer mode / Chế độ nhà phát triển.
5. Chọn Load unpacked / Tải tiện ích đã giải nén.
6. Chọn đúng thư mục đã giải nén.
7. Mở trang web có phần tử id="sja_DocumentUrl".
8. Bấm Ctrl + Shift + 5 để copy link ẩn.

Cách đổi phím tắt:
- Vào:
  chrome://extensions/shortcuts
- Tìm extension "PGreen Copy Hidden Document URL"
- Đổi phím tắt theo ý muốn.

Lưu ý:
- Extension này chỉ copy khi Tú bấm phím tắt.
- Nếu bấm mà không được, có thể trang không có id="sja_DocumentUrl", hoặc đang ở trang chrome://, edge://, file:// nên Chrome không cho inject script.
- Nếu website đặt link trong iframe, extension đã có allFrames=true để tự dò cả iframe.