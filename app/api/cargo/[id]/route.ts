import { NextRequest, NextResponse } from 'next/server';
import { getAllCargoRequests, updateCargoRequest } from '@/lib/sheets';
import { getRole } from '@/lib/auth';

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const all = await getAllCargoRequests();
    const request = all.find(r => r.requestId === id || String(r.rowIndex) === id);
    if (!request) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(request);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to load request' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const role = await getRole();
  if (role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const body = await req.json();
    const all = await getAllCargoRequests();
    const request = all.find(r => r.requestId === id || String(r.rowIndex) === id);
    if (!request) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    await updateCargoRequest(request.rowIndex, {
      status: body.status,
      adminNotes: body.adminNotes,
      assignedFlightId: body.assignedFlightId,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to update request' }, { status: 500 });
  }
}
