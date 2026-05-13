/**
 * Full end-to-end manifest PDF generation test.
 * Generates the manifest for the first flight with approved DG cargo
 * and saves it to scripts/test-manifest-output.pdf
 */
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { google } from 'googleapis';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { Readable } from 'stream';

// ── env ───────────────────────────────────────────────────────────────────────
const env    = readFileSync('.env.local', 'utf8');
const getEnv = k => env.split('\n').find(l => l.startsWith(k + '='))?.slice(k.length + 1).trim();
const creds  = JSON.parse(getEnv('GOOGLE_SERVICE_ACCOUNT_JSON'));
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

// ── helpers ───────────────────────────────────────────────────────────────────
const col = (row, i) => (row[i] ?? '').trim();

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
    res.data.on('data', c => chunks.push(c));
    res.data.on('end', resolve);
    res.data.on('error', reject);
  });
  return { bytes: Buffer.concat(chunks), mimeType, name };
}

const hebrewFontBytes = readFileSync('public/fonts/Alef-Regular.ttf');

async function makeSeparatorPage(pdfDoc, submitter, unit, description, dgClass, docLabel) {
  const font    = await pdfDoc.embedFont(hebrewFontBytes, { subset: true });
  const regular = font;
  const page = pdfDoc.addPage([841.89, 595.28]);
  const { width, height } = page.getSize();
  const cx = width / 2;

  page.drawRectangle({ x: 0, y: height - 48, width, height: 48, color: rgb(0.86, 0.15, 0.15) });
  page.drawText('DANGEROUS GOODS CERTIFICATE', { x: 32, y: height - 30, size: 14, font, color: rgb(1,1,1) });

  const cardW = 420, cardH = 160;
  page.drawRectangle({
    x: cx - cardW/2, y: height/2 - cardH/2,
    width: cardW, height: cardH,
    color: rgb(1, 0.95, 0.95),
    borderColor: rgb(0.99, 0.75, 0.75), borderWidth: 1,
  });

  const lines = [
    { text: submitter, size: 16, font },
    { text: unit,      size: 11, font: regular },
    { text: '',        size: 6,  font: regular },
    { text: description,         size: 10, font: regular },
    { text: `Classification: ${dgClass || '—'}`, size: 10, font: regular },
    { text: '',        size: 6,  font: regular },
    { text: docLabel,  size: 11, font, color: rgb(0.86, 0.15, 0.15) },
  ];
  let y = height/2 + cardH/2 - 24;
  for (const line of lines) {
    if (line.text) {
      const w = line.font.widthOfTextAtSize(line.text, line.size);
      page.drawText(line.text, { x: cx - w/2, y, size: line.size, font: line.font, color: line.color ?? rgb(0.12,0.18,0.30) });
    }
    y -= line.size + 4;
  }
  page.drawText('The following page(s) contain the original certificate as uploaded by the requester.',
    { x: 32, y: 24, size: 8, font: regular, color: rgb(0.58,0.64,0.72) });
}

// ── read sheet ────────────────────────────────────────────────────────────────
console.log('Reading sheet…');
const res = await sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range: 'תגובות לטופס 1!A:AH' });
const rows = (res.data.values ?? []).slice(1);

// Find rows that have DG docs and are approved (col 30 = STATUS)
const dgRows = rows.filter(r => col(r, 22) && col(r, 22).includes('drive.google.com'));
if (!dgRows.length) { console.error('No DG rows found.'); process.exit(1); }

console.log(`Found ${dgRows.length} DG row(s). Building merged PDF…`);

// Start with a simple placeholder "manifest" page
const merged = await PDFDocument.create();
merged.registerFontkit(fontkit);
const font   = await merged.embedFont(StandardFonts.HelveticaBold);
const placeholder = merged.addPage([841.89, 595.28]);
placeholder.drawText('CARGO MANIFEST — test placeholder', { x: 40, y: 500, size: 20, font, color: rgb(0.12,0.18,0.30) });
placeholder.drawText(`Generated: ${new Date().toISOString()}`, { x: 40, y: 470, size: 10, font: await merged.embedFont(StandardFonts.Helvetica), color: rgb(0.5,0.5,0.5) });

let attached = 0;

for (const row of dgRows) {
  const submitter = col(row, 1);
  const unit      = col(row, 2);
  const desc      = col(row, 13);
  const dgClass   = col(row, 20);

  for (const [rawUrl, label] of [[col(row, 22), 'DG Certificate'], [col(row, 23), 'MSDS']]) {
    if (!rawUrl) continue;
    for (const [i, url] of rawUrl.split(',').map(u => u.trim()).filter(Boolean).entries()) {
      const fileId = extractFileId(url);
      if (!fileId) { console.log(`  ✗ No file ID in: ${url}`); continue; }
      const docLabel = rawUrl.split(',').length > 1 ? `${label} (${i+1})` : label;
      try {
        const { bytes, mimeType, name } = await fetchFile(fileId);
        console.log(`  ✓ ${submitter} — ${docLabel}: "${name}" (${mimeType}, ${bytes.length} bytes)`);

        await makeSeparatorPage(merged, submitter, unit, desc, dgClass, docLabel);

        if (mimeType.includes('pdf')) {
          const doc   = await PDFDocument.load(bytes);
          const pages = await merged.copyPages(doc, doc.getPageIndices());
          pages.forEach(p => merged.addPage(p));
        } else if (mimeType.includes('png')) {
          const img  = await merged.embedPng(bytes);
          const page = merged.addPage([841.89, 595.28]);
          const s    = img.scaleToFit(page.getWidth()-40, page.getHeight()-40);
          page.drawImage(img, { x:(page.getWidth()-s.width)/2, y:(page.getHeight()-s.height)/2, ...s });
        } else {
          const img  = await merged.embedJpg(bytes);
          const page = merged.addPage([841.89, 595.28]);
          const s    = img.scaleToFit(page.getWidth()-40, page.getHeight()-40);
          page.drawImage(img, { x:(page.getWidth()-s.width)/2, y:(page.getHeight()-s.height)/2, ...s });
        }
        attached++;
      } catch (err) {
        console.log(`  ✗ Failed (${docLabel}): ${err.message}`);
      }
    }
  }
}

const outPath = 'scripts/test-manifest-output.pdf';
writeFileSync(outPath, await merged.save());
console.log(`\n✓ PDF written to ${outPath}  (${merged.getPageCount()} pages, ${attached} certificate(s) attached)`);
