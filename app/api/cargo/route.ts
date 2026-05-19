import { NextResponse } from 'next/server';
import { getAllCargoRequests } from '@/lib/sheets';

export const revalidate = 60; // cache for 60 seconds

export async function GET() {
  try {
    const cargo = await getAllCargoRequests();
    return NextResponse.json(cargo);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to load cargo requests' }, { status: 500 });
  }
}
