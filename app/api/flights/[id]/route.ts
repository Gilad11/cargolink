import { NextRequest, NextResponse } from 'next/server';
import { getFlightById, updateFlight, getCargoRequestsByFlight } from '@/lib/sheets';
import { getRole } from '@/lib/auth';

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const [flight, cargo] = await Promise.all([
      getFlightById(id),
      getCargoRequestsByFlight(id),
    ]);
    if (!flight) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ flight, cargo });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to load flight' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const role = await getRole();
  if (role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const body = await req.json();
    await updateFlight(id, body);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to update flight' }, { status: 500 });
  }
}
