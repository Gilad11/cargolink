import { NextRequest, NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { getFlightById, getCargoRequestsByFlight } from '@/lib/sheets';
import { ManifestDocument } from '@/components/ManifestPDF';
import { ManifestData } from '@/lib/types';

export const runtime = 'nodejs';

function generateManifestNumber(flightNumber: string, date: string): string {
  const d = date.replace(/-/g, '').slice(0, 8);
  const rand = Math.floor(Math.random() * 900 + 100);
  return `MAN-${d}-${flightNumber}-${rand}`;
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

    const element = ManifestDocument({ data: manifestData });
    const buffer = await renderToBuffer(element as Parameters<typeof renderToBuffer>[0]);

    return new Response(new Uint8Array(buffer), {
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
