# UHRS Sheet Action Runner v1.2.0

## Chức năng
Nhấn `Ctrl + Shift + 7` để chạy 1 lần:
1. Lấy URL từ `#sja_DocumentUrl` trên trang UHRS.
2. Gửi URL sang Apps Script.
3. Apps Script đối chiếu với cột A Google Sheet.
4. Lấy kết quả ở cột C.
5. Nếu C = 1..7 thì chọn radio tương ứng và bấm Submit.
6. Nếu C = C thì mở link UHRS marketplace.
7. Clear clipboard và chờ lần bấm phím tiếp theo.

## Mapping cột C
- 1 = Not Junk
- 2 = Error Message / Page not found / No results
- 3 = Low / No Content / Ads only pages
- 4 = Site unreachable
- 5 = Automatic Redirection
- 6 = Other type of Junk
- 7 = Can't Judge
- C = Mở link marketplace UHRS

## Cấu hình đã điền sẵn
Trong `apps_script.gs`:
```js
const SPREADSHEET_ID = "1oWss0LqzB2KVAHYg133pis0GYWfcw3eVt8999yw2t3s";
const DEFAULT_SHEET_NAME = "Trang tính1";
const ACCESS_TOKEN = "PGREEN_UHRS_2026_X9K72M4Q";
```

Trong `service_worker.js`:
```js
const SHEET_NAME = "Trang tính1";
const API_TOKEN = "PGREEN_UHRS_2026_X9K72M4Q";
```

## Dòng còn cần điền
Sau khi Deploy Apps Script dạng Web App, copy link Web App và dán vào `service_worker.js`:
```js
const SHEET_API_URL = "PASTE_APPS_SCRIPT_WEB_APP_URL_HERE";
```

## Cách cài Extension
1. Mở `chrome://extensions/`.
2. Bật `Developer mode`.
3. Bấm `Load unpacked`.
4. Chọn thư mục `uhrs_sheet_extension_final`.
5. Vào `chrome://extensions/shortcuts` để kiểm tra phím tắt `Ctrl + Shift + 7`.
