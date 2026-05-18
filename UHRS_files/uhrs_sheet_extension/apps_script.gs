/*************************************************************
 * Google Apps Script Web App cho UHRS Sheet Action Runner
 * Sheet format:
 * - Cột A: URL cần đối chiếu
 * - Cột C: Action trả về: 1,2,3,4,5,6 hoặc C
 * - Cột D/E: tùy chọn, trả thêm để kiểm tra/debug
 *************************************************************/

const SPREADSHEET_ID = "PASTE_GOOGLE_SHEET_ID_HERE";
const DEFAULT_SHEET_NAME = "Sheet1";

function doGet(e) {
  try {
    const url = normalize_(e.parameter.url || "");
    const sheetName = e.parameter.sheet || DEFAULT_SHEET_NAME;

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
      const colA = normalize_(values[i][0]);
      const colC = String(values[i][2] || "").trim();

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

function normalize_(value) {
  return String(value || "").trim().toLowerCase();
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
