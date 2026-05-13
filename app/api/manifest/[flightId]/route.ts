import { NextRequest, NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';
import { renderToBuffer } from '@react-pdf/renderer';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { getFlightById, getCargoRequestsByFlight, extractDriveFileId, fetchDriveFile } from '@/lib/sheets';
import { ManifestDocument } from '@/components/ManifestPDF';
import { ManifestData, CargoRequest } from '@/lib/types';

export const runtime = 'nodejs';

function generateManifestNumber(flightNumber: string, date: string): string {
  const d = date.replace(/-/g, '').slice(0, 8);
  const rand = Math.floor(Math.random() * 900 + 100);
  return `MAN-${d}-${flightNumber}-${rand}`;
}

/** Collect all Drive file IDs from a cargo item's DG / MSDS URL fields. */
function dgFileIds(item: CargoRequest): { fileId: string; label: string }[] {
  const results: { fileId: string; label: string }[] = [];
  for (const [raw, label] of [
    [item.dgDocumentsUrl, 'DG Certificate'],
    [item.msdsDocumentsUrl, 'MSDS'],
  ] as [string, string][]) {
    if (!raw) continue;
    raw.split(',').forEach((url, i, arr) => {
      const fileId = extractDriveFileId(url.trim());
      if (fileId) results.push({ fileId, label: arr.length > 1 ? `${label} (${i + 1})` : label });
    });
  }
  return results;
}

// Hebrew-capable font loaded once and reused
let _hebrewFontBytes: Uint8Array | null = null;
function getHebrewFontBytes(): Uint8Array {
  if (!_hebrewFontBytes) {
    _hebrewFontBytes = new Uint8Array(
      readFileSync(join(process.cwd(), 'public', 'fonts', 'Alef-Regular.ttf'))
    );
  }
  return _hebrewFontBytes;
}

// Seal image loaded once and reused
let _sealBytes: Uint8Array | null = null;
function getSealBytes(): Uint8Array {
  if (!_sealBytes) {
    _sealBytes = new Uint8Array(
      readFileSync(join(process.cwd(), 'public', 'images', 'seal.jpg'))
    );
  }
  return _sealBytes;
}

/** Stamp the official seal onto the first page of the manifest (bottom-right). */
async function stampSeal(pdfDoc: PDFDocument) {
  const pages = pdfDoc.getPages();
  if (pages.length === 0) return;
  const page = pages[0];
  const { width, height } = page.getSize();

  const sealImage = await pdfDoc.embedJpg(getSealBytes());
  const sealSize = 130; // points (~46mm) — prominent but not overpowering
  const scaled = sealImage.scaleToFit(sealSize, sealSize);

  const margin = 28;
  page.drawImage(sealImage, {
    x: width - scaled.width - margin,
    y: margin,
    width: scaled.width,
    height: scaled.height,
    opacity: 0.92,
  });
}

/** Create a simple separator page identifying the upcoming DG certificate. */
async function makeSeparatorPage(
  pdfDoc: PDFDocument,
  item: CargoRequest,
  docLabel: string,
) {
  const fontBytes = getHebrewFontBytes();
  const font    = await pdfDoc.embedFont(fontBytes, { subset: true });
  const regular = font; // same font for all text — Alef supports Latin too
  const page = pdfDoc.addPage([841.89, 595.28]); // A4 landscape

  const { width, height } = page.getSize();
  const cx = width / 2;

  // Red top bar
  page.drawRectangle({ x: 0, y: height - 48, width, height: 48, color: rgb(0.86, 0.15, 0.15) });
  page.drawText('⚠  DANGEROUS GOODS CERTIFICATE', {
    x: 32, y: height - 32, size: 14, font, color: rgb(1, 1, 1),
  });

  // Card in the middle
  const cardW = 400, cardH = 160;
  page.drawRectangle({
    x: cx - cardW / 2, y: height / 2 - cardH / 2,
    width: cardW, height: cardH,
    color: rgb(1, 0.95, 0.95),
    borderColor: rgb(0.99, 0.75, 0.75),
    borderWidth: 1,
    opacity: 1,
  });

  const lines = [
    { text: item.fullName, size: 16, font },
    { text: item.unit, size: 11, font: regular },
    { text: '', size: 6, font: regular },
    { text: item.cargoDescription, size: 10, font: regular },
    { text: `Classification: ${item.dgClassification || '—'}`, size: 10, font: regular },
    { text: `Description: ${item.dgDescription || '—'}`, size: 10, font: regular },
    { text: '', size: 6, font: regular },
    { text: docLabel, size: 11, font, color: rgb(0.86, 0.15, 0.15) },
  ];

  let y = height / 2 + cardH / 2 - 24;
  for (const line of lines) {
    if (line.text) {
      const textWidth = (line.font as typeof font).widthOfTextAtSize(line.text, line.size);
      page.drawText(line.text, {
        x: cx - textWidth / 2,
        y,
        size: line.size,
        font: line.font as typeof font,
        color: (line as any).color ?? rgb(0.12, 0.18, 0.30),
      });
    }
    y -= line.size + 4;
  }

  // Footer note
  page.drawText('The following page(s) contain the original certificate as uploaded by the requester.',
    { x: 32, y: 24, size: 8, font: regular, color: rgb(0.58, 0.64, 0.72) });
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ flightId: string }> }) {
  const { flightId } = await params;

  try {
    const [flight, cargo] = await Promise.all([
      getFlightById(flightId),
      getCargoRequestsByFlight(flightId),
    ]);

    if (!flight) {
      return NextResponse.json({ error: 'Flight not found' }, { status: 404 });
    }

    const totalWeight   = cargo.reduce((s, c) => s + c.totalWeight, 0);
    const totalPackages = cargo.reduce((s, c) => s + c.packageCount, 0);
    const dgCount       = cargo.filter(c => c.containsDG).length;
    const now           = new Date();
    const generatedAt   = now.toLocaleString('en-GB', { timeZone: 'Asia/Dubai', hour12: false })
                              .replace(',', '') + ' UAE Time';

    const manifestData: ManifestData = {
      flight,
      cargo,
      totalWeight,
      totalPackages,
      dgCount,
      generatedAt,
      manifestNumber: generateManifestNumber(flight.flightNumber, flight.departureDate),
    };

    // 1. Render the main manifest PDF
    const element = ManifestDocument({ data: manifestData });
    const manifestBuffer = await renderToBuffer(element as Parameters<typeof renderToBuffer>[0]);

    // 2. Start building the merged PDF
    const merged = await PDFDocument.create();
    merged.registerFontkit(fontkit);

    // Copy manifest pages
    const manifestDoc = await PDFDocument.load(manifestBuffer);
    const manifestPages = await merged.copyPages(manifestDoc, manifestDoc.getPageIndices());
    manifestPages.forEach(p => merged.addPage(p));

    // Stamp official seal on the first (manifest) page
    await stampSeal(merged);

    // 3. Append DG certificates
    const dgItems = cargo.filter(c => c.containsDG);

    for (const item of dgItems) {
      const files = dgFileIds(item);
      for (const { fileId, label } of files) {
        try {
          // Fetch first — only add pages if this succeeds
          const { bytes, mimeType } = await fetchDriveFile(fileId);

          // Separator page (added only after successful fetch)
          await makeSeparatorPage(merged, item, label);

          if (mimeType.includes('pdf')) {
            const certDoc = await PDFDocument.load(bytes);
            const certPages = await merged.copyPages(certDoc, certDoc.getPageIndices());
            certPages.forEach(p => merged.addPage(p));
          } else if (mimeType.includes('png')) {
            const img = await merged.embedPng(bytes);
            const page = merged.addPage([841.89, 595.28]);
            const scaled = img.scaleToFit(page.getWidth() - 40, page.getHeight() - 40);
            page.drawImage(img, {
              x: (page.getWidth() - scaled.width) / 2,
              y: (page.getHeight() - scaled.height) / 2,
              width: scaled.width,
              height: scaled.height,
            });
          } else {
            // JPEG / other images
            const img = await merged.embedJpg(bytes);
            const page = merged.addPage([841.89, 595.28]);
            const scaled = img.scaleToFit(page.getWidth() - 40, page.getHeight() - 40);
            page.drawImage(img, {
              x: (page.getWidth() - scaled.width) / 2,
              y: (page.getHeight() - scaled.height) / 2,
              width: scaled.width,
              height: scaled.height,
            });
          }
        } catch (err) {
          // File unavailable — log and skip entirely (no orphaned separator page)
          console.error(`Could not attach DG file ${fileId} for ${item.fullName}:`, err);
        }
      }
    }

    const finalBytes = await merged.save();

    return new Response(Buffer.from(finalBytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="manifest-${flight.flightNumber}.pdf"`,
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to generate manifest' }, { status: 500 });
  }
}
