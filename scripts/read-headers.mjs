import { google } from 'googleapis';
import { readFileSync } from 'fs';

const env = readFileSync('.env.local', 'utf8');
const getEnv = (key) => env.split('\n').find(l => l.startsWith(key + '='))?.slice(key.length + 1).trim();

const creds = JSON.parse(getEnv('GOOGLE_SERVICE_ACCOUNT_JSON'));
const sheetId = getEnv('GOOGLE_SHEETS_ID');

const auth = new google.auth.GoogleAuth({ credentials: creds, scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'] });
const sheets = google.sheets({ version: 'v4', auth });

const res = await sheets.spreadsheets.values.get({
  spreadsheetId: sheetId,
  range: 'תגובות לטופס 1!A:AH',  // read wide enough
});

const rows = res.data.values ?? [];
const headers = rows[0] || [];

console.log('=== ALL COLUMNS (header + all data rows) ===');
headers.forEach((h, i) => {
  const letter = i < 26 ? String.fromCharCode(65 + i) : 'A' + String.fromCharCode(65 + i - 26);
  const vals = rows.slice(1).map(r => (r[i] || '').slice(0, 40)).join(' | ');
  console.log(`${String(i).padStart(2)} (${letter.padEnd(2)}): [${h}]  →  ${vals}`);
});
console.log(`\nTotal columns in header: ${headers.length}`);
console.log(`Total data rows: ${rows.length - 1}`);
