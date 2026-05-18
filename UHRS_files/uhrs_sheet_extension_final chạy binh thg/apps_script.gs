/*************************************************************
 * Google Apps Script Web App cho UHRS Sheet Action Runner
 *
 * Format Google Sheet:
 * - Cột A: URL cần đối chiếu
 * - Cột C: Action trả về: 1,2,3,4,5,6,7 hoặc C
 *
 * 1 = Not Junk
 * 2 = Error Message / Page not found / No results
 * 3 = Low / No Content / Ads only pages
 * 4 = Site unreachable
 * 5 = Automatic Redirection
 * 6 = Other type of Junk
 * 7 = Can't Judge
 * C = Mở link UHRS marketplace trong extension
 *************************************************************/

const SPREADSHEET_ID = "1oWss0LqzB2KVAHYg133pis0GYWfcw3eVt8999yw2t3s";
const DEFAULT_SHEET_NAME = "Trang tính1";
const ACCESS_TOKEN = "PGREEN_UHRS_2026_X9K72M4Q"; // Phải trùng với API_TOKEN trong service_worker.js

function doGet(e) {
  try {
    const token = String((e.parameter && e.parameter.token) || "");
    if (token !== ACCESS_TOKEN) {
      return json_({ found: false, error: "UNAUTHORIZED" });
    }

    const url = normalizeUrl_((e.parameter && e.parameter.url) || "");
    const sheetName = String((e.parameter && e.parameter.sheet) || DEFAULT_SHEET_NAME);

    if (!url) {
      return json_({ found: false, error: "MISSING_URL" });
    }

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(sheetName);

    if (!sheet) {
      return json_({ found: false, error: "SHEET_NOT_FOUND", sheetName });
    }

    const values = sheet.getDataRange().getValues();

    for (let i = 0; i < values.length; i++) {
      const colA = normalizeUrl_(values[i][0]);
      const colC = String(values[i][2] || "").trim().toUpperCase();

      if (colA === url) {
        return json_({
          found: true,
          row: i + 1,
          action: colC,
          c: colC,
          d: String(values[i][3] || ""),
          e: String(values[i][4] || "")
        });
      }
    }

    return json_({ found: false, error: "URL_NOT_FOUND", url });
  } catch (err) {
    return json_({ found: false, error: String(err) });
  }
}

function normalizeUrl_(value) {
  let text = String(value || "").trim().toLowerCase();

  // Bỏ dấu / cuối URL để tránh lệch dữ liệu do trailing slash.
  while (text.endsWith("/") && text.length > 8) {
    text = text.slice(0, -1);
  }

  return text;
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
