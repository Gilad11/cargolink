import { NextRequest, NextResponse } from 'next/server';
import { getAllFlights, createFlight } from '@/lib/sheets';
import { getRole } from '@/lib/auth';
import { Flight } from '@/lib/types';
import { randomUUID } from 'crypto';

export async function GET() {
  try {
    const flights = await getAllFlights();
    return NextResponse.json(flights);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to load flights' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const role = await getRole();
  if (role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const body = await req.json();
    const flight: Omit<Flight, 'createdAt'> = {
      id: randomUUID(),
      flightNumber: body.flightNumber,
      aircraftType: body.aircraftType,
      direction: body.direction,
      departureDate: body.departureDate,
      departureTime: body.departureTime,
      arrivalTime: body.arrivalTime ?? '',
      departureAirport: body.departureAirport,
      destinationAirport: body.destinationAirport,
      status: 'planned',
      coordinatorName: body.coordinatorName ?? '',
      coordinatorPhone: body.coordinatorPhone ?? '',
      coordinatorEmail: body.coordinatorEmail ?? '',
      loadingRequirements: body.loadingRequirements ?? '',
      notes: body.notes ?? '',
    };
    const created = await createFlight(flight);
    return NextResponse.json(created);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to create flight' }, { status: 500 });
  }
}
