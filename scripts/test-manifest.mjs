/**
 * Test script: generates the manifest PDF for the first flight that has
 * approved DG cargo and writes it to /tmp/test-manifest.pdf
 * Run: node scripts/test-manifest.mjs
 */
import { readFileSync, writeFileSync } from 'fs';
import { google } from 'googleapis';
import { PDFDocument } from 'pdf-lib';
import { Readable } from 'stream';

// ── Load env ──────────────────────────────────────────────────────────────────
const env = readFileSync('.env.local', 'utf8');
const getEnv = k => env.split('\n').find(l => l.startsWith(k + '='))?.slice(k.length + 1).trim();
const creds   = JSON.parse(getEnv('GOOGLE_SERVICE_ACCOUNT_JSON'));
const sheetId = getEnv('GOOGLE_SHEETS_ID');

const auth = new google.auth.GoogleAuth({
  credentials: creds,
  scopes: [
    'https://www.googleapis.com/auth/spreadsheets.readonly',
    'https://www.googleapis.com/auth/drive.readonly',
  ],
});
const sheets = google.sheets({ version: 'v4', auth });
const drive  = google.drive({ version: 'v3', auth });

// ── Helpers ───────────────────────────────────────────────────────────────────
function col(row, i) { return (row[i] ?? '').trim(); }

function extractFileId(url) {
  for (const re of [/[?&]id=([^&\s]+)/, /\/file\/d\/([^/\s?]+)/, /\/d\/([^/\s?]+)/]) {
    const m = url.match(re);
    if (m?.[1]) return m[1];
  }
  return null;
}

async function fetchFile(fileId) {
  const meta = await drive.files.get({ fileId, fields: 'mimeType,name' });
  const mimeType = meta.data.mimeType ?? 'application/octet-stream';
  const name = meta.data.name ?? fileId;

  const res = await drive.files.get({ fileId, alt: 'media' }, { responseType: 'stream' });
  const chunks = [];
  await new Promise((resolve, reject) => {
    const s = res.data;
    s.on('data', c => chunks.push(c));
    s.on('end', resolve);
    s.on('error', reject);
  });
  return { bytes: Buffer.concat(chunks), mimeType, name };
}

// ── Read cargo from sheet ─────────────────────────────────────────────────────
console.log('Reading cargo sheet…');
const res = await sheets.spreadsheets.values.get({
  spreadsheetId: sheetId,
  range: 'תגובות לטופס 1!A:AH',
});
const rows = res.data.values ?? [];
const dataRows = rows.slice(1);

// Find rows with DG docs
const dgRows = dataRows.filter(r => {
  const dgUrl = col(r, 22);  // DG_DOCUMENTS
  return dgUrl && dgUrl.includes('drive.google.com');
});

if (dgRows.length === 0) {
  console.error('No rows with DG document URLs found in the sheet.');
  process.exit(1);
}

console.log(`Found ${dgRows.length} row(s) with DG documents.`);

// ── Test fetching the first DG file ──────────────────────────────────────────
const testRow = dgRows[0];
const submitter = col(testRow, 1);
const dgUrlRaw  = col(testRow, 22);

console.log(`\nTesting with submitter: ${submitter}`);
console.log(`Raw DG URL: ${dgUrlRaw}`);

const urls = dgUrlRaw.split(',').map(u => u.trim()).filter(Boolean);
console.log(`Split into ${urls.length} URL(s)`);

let passed = 0, failed = 0;

for (const url of urls) {
  const fileId = extractFileId(url);
  if (!fileId) { console.log(`  ✗ Could not extract file ID from: ${url}`); failed++; continue; }

  console.log(`\n  File ID: ${fileId}`);
  try {
    const { bytes, mimeType, name } = await fetchFile(fileId);
    console.log(`  ✓ Fetched: "${name}"  mimeType=${mimeType}  size=${bytes.length} bytes`);

    // Try to load as PDF if applicable
    if (mimeType.includes('pdf')) {
      const doc = await PDFDocument.load(bytes);
      console.log(`    PDF pages: ${doc.getPageCount()}`);
    }
    passed++;
  } catch (err) {
    console.log(`  ✗ Fetch failed: ${err.message}`);
    failed++;
  }
}

console.log(`\n── Result: ${passed} succeeded, ${failed} failed ──`);
if (failed > 0) {
  console.log('\nLikely cause: the service account does not have access to these Drive files.');
  console.log('Fix: share the upload folder with the service account email below.');
  const sa = JSON.parse(getEnv('GOOGLE_SERVICE_ACCOUNT_JSON'));
  console.log(`  Service account email: ${sa.client_email}`);
}
