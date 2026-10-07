/**
 * Paste this into the script editor opened from the spreadsheet:
 * Extensions → Apps Script. Deploy as a web app, execute as you, access Anyone.
 * If the script was created on its own, paste the spreadsheet ID below.
 * The site sends the completed response after the result is shown.
 * Talk this through updates that same row by Submission ID.
 */
var SHEET_ID = "11K_NI0k-Bz1_ch4H9BJWEdktR4jrSPU3RbhpzAkBYw4";
var HEADERS = [
  "Submission ID",
  "Timestamp",
  "Name",
  "Email",
  "Organisation",
  "Role",
  "Website",
  "Idea Type",
  "Target Audience",
  "Idea Description",
  "Reason To Back",
  "Clarity Score",
  "Proposition Score",
  "Belief Score",
  "Relevance Score",
  "Confidence Score",
  "Overall Score",
  "Score Band",
  "Lowest Dimension",
  "Biggest Barrier",
  "Follow-up Interest"
];

function doGet() {
  try {
    var ss = spreadsheet();
    return ContentService
      .createTextOutput("Backing Score is ready. Connected to " + ss.getName() + ".")
      .setMimeType(ContentService.MimeType.TEXT);
  } catch (error) {
    return ContentService
      .createTextOutput(error.message)
      .setMimeType(ContentService.MimeType.TEXT);
  }
}

function spreadsheet() {
  var active = null;
  try {
    active = SpreadsheetApp.getActiveSpreadsheet();
  } catch (error) {
    active = null;
  }
  if (active) return active;
  if (SHEET_ID) return SpreadsheetApp.openById(SHEET_ID);
  throw new Error("This script is not connected to the spreadsheet. Open the sheet, choose Extensions, then Apps Script, paste this file there, and deploy a new version.");
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    var body = readBody(e);
    var values = body && body.values;
    if (!values || values.length !== HEADERS.length) return respond(false);
    var submissionId = String(values[0] || "");
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(submissionId)) {
      return respond(false);
    }
    var ss = spreadsheet();
    var sheet = ss.getSheetByName("Responses");
    if (!sheet) sheet = ss.insertSheet("Responses");
    if (sheet.getLastRow() === 0) sheet.appendRow(HEADERS);
    if (!filled(values, "Clarity Score") || !filled(values, "Belief Score") || !filled(values, "Relevance Score") || !filled(values, "Confidence Score") || !filled(values, "Overall Score")) {
      return respond(false, "The completed scores were missing.");
    }
    var clean = values.map(plain);
    var rowNumber = findSubmission(sheet, submissionId);
    if (rowNumber) sheet.getRange(rowNumber, 1, 1, HEADERS.length).setValues([clean]);
    else sheet.appendRow(clean);
    return respond(true);
  } catch (error) {
    return respond(false, error && error.message ? error.message : "The sheet could not be updated.");
  } finally {
    lock.releaseLock();
  }
}

function readBody(e) {
  if (e && e.parameter && e.parameter.payload) return JSON.parse(e.parameter.payload);
  if (e && e.postData && e.postData.contents) return JSON.parse(e.postData.contents);
  return {};
}

function findSubmission(sheet, submissionId) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return 0;
  var column = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (var i = 0; i < column.length; i++) {
    if (String(column[i][0]) === submissionId) return i + 2;
  }
  return 0;
}

function plain(value) {
  var text = value == null ? "" : String(value);
  if (/^[=+\-@]/.test(text)) return "'" + text;
  return text;
}

function filled(values, name) {
  var value = values[HEADERS.indexOf(name)];
  return value !== "" && value != null;
}

function respond(ok, message) {
  var body = { ok: ok };
  if (message) body.message = message;
  return ContentService
    .createTextOutput(JSON.stringify(body))
    .setMimeType(ContentService.MimeType.JSON);
}
