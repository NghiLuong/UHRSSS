# UHRS Sheet Action Runner

Extension này chạy đúng mô hình Tú yêu cầu:

1. Nhấn phím tắt Ctrl+Shift+7.
2. Extension lấy đường dẫn trên trang, ưu tiên selector `#sja_DocumentUrl`.
3. Gửi đường dẫn sang Google Apps Script Web App.
4. Apps Script đối chiếu với cột A của Google Sheet.
5. Lấy kết quả ở cột C.
6. Nếu cột C là `1` đến `6`, extension bấm action tương ứng.
7. Nếu cột C là `C`, extension mở link:
   `https://www.uhrs.ai/marketplace/app/63766?taskgroupid=178599?taskgroupid=178599`
8. Xong việc thì clear clipboard và chờ lần nhấn phím tiếp theo.

## Cài Google Apps Script

1. Mở Google Sheet cần dùng.
2. Copy Sheet ID trong URL, ví dụ:
   `https://docs.google.com/spreadsheets/d/SHEET_ID/edit`
3. Vào Extensions > Apps Script.
4. Dán nội dung file `apps_script.gs`.
5. Thay `PASTE_GOOGLE_SHEET_ID_HERE` bằng Sheet ID thật.
6. Thay `DEFAULT_SHEET_NAME` nếu tên sheet không phải `Sheet1`.
7. Deploy > New deployment > Web app.
8. Execute as: Me.
9. Who has access: Anyone with the link.
10. Copy Web App URL.

## Cài Chrome Extension

1. Mở file `service_worker.js`.
2. Thay `PASTE_APPS_SCRIPT_WEB_APP_URL_HERE` bằng Web App URL vừa copy.
3. Thay `SHEET_NAME` đúng tên sheet.
4. Chỉnh ACTIONS 3-6 theo tên nút thật trên UHRS nếu cần.
5. Vào Chrome: `chrome://extensions`.
6. Bật Developer mode.
7. Load unpacked > chọn thư mục này.
8. Vào `chrome://extensions/shortcuts` để kiểm tra phím tắt Ctrl+Shift+7.

## Lưu ý quan trọng

- Không nhúng file JSON service account vào extension vì rất dễ bị lộ.
- Apps Script đóng vai trò API trung gian, extension không cần biết khóa Google Cloud.
- Chỉ dùng automation này cho quy trình/tài khoản mà Tú được phép thao tác.
