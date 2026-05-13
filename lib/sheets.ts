import { google } from 'googleapis';
import { CargoRequest, Flight } from './types';
import { CARGO_COLS, FLIGHT_COLS, SHEET_NAMES } from './constants';

function isConfigured(): boolean {
  const json = process.env.GOOGLE_SERVICE_ACCOUNT_JSON ?? '';
  try {
    const creds = JSON.parse(json);
    return !!creds.private_key && !!creds.client_email;
  } catch {
    return false;
  }
}

function getAuth() {
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON!);
  return new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

function getSheetsClient() {
  return google.sheets({ version: 'v4', auth: getAuth() });
}

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_ID!;

function col(row: string[], index: number): string {
  return (row[index] ?? '').trim();
}

/** Convert a 0-based column index to a Sheets column letter (A, B, …, Z, AA, AB, …) */
function colLetter(index: number): string {
  if (index < 26) return String.fromCharCode(65 + index);
  const first = Math.floor(index / 26) - 1;
  const second = index % 26;
  return String.fromCharCode(65 + first) + String.fromCharCode(65 + second);
}

// ─── Cargo Requests ──────────────────────────────────────────────────────────

export async function getAllCargoRequests(): Promise<CargoRequest[]> {
  if (!isConfigured()) return [];
  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAMES.CARGO}!A:AH`,
  });

  const rows = res.data.values ?? [];
  if (rows.length <= 1) return [];

  return rows.slice(1).map((row, i) => rowToCargoRequest(row, i + 2));
}

export async function getCargoRequestsByFlight(flightId: string): Promise<CargoRequest[]> {
  const all = await getAllCargoRequests();
  return all.filter(r => r.assignedFlightId === flightId && r.status === 'approved');
}

export function rowToCargoRequest(row: string[], rowIndex: number): CargoRequest {
  const c = CARGO_COLS;
  return {
    rowIndex,
    requestId: col(row, c.REQUEST_ID) || `REQ-${rowIndex}`,
    timestamp: col(row, c.TIMESTAMP),
    fullName: col(row, c.FULL_NAME),
    unit: col(row, c.UNIT),
    phone: col(row, c.PHONE),
    email: col(row, c.EMAIL),
    flightDirection: col(row, c.FLIGHT_DIRECTION),
    flightDate: col(row, c.FLIGHT_DATE),
    departureTime: col(row, c.DEPARTURE_TIME),
    aircraftType: col(row, c.AIRCRAFT_TYPE),
    departureAirport: col(row, c.DEPARTURE_AIRPORT),
    destinationAirport: col(row, c.DESTINATION_AIRPORT),
    equipmentCategory: col(row, c.EQUIPMENT_CATEGORY),
    categoryDetails: col(row, c.CATEGORY_DETAILS),
    cargoDescription: col(row, c.CARGO_DESCRIPTION),
    packageCount: Number(col(row, c.PACKAGE_COUNT)) || 0,
    packageDimensions: col(row, c.PACKAGE_DIMENSIONS),
    weightPerPackage: Number(col(row, c.WEIGHT_PER_PACKAGE)) || 0,
    totalWeight: Number(col(row, c.TOTAL_WEIGHT)) || 0,
    // New submissions have packaging type at col 26 (AA); old ones at col 18 (S)
    packagingType: col(row, c.PACKAGING_TYPE) || col(row, c.PACKAGING_TYPE_OLD),
    containsDG: col(row, c.CONTAINS_DG).toLowerCase().includes('כן') || col(row, c.CONTAINS_DG).toLowerCase() === 'yes',
    dgClassification: col(row, c.DG_CLASSIFICATION),
    dgDescription: col(row, c.DG_DESCRIPTION),
    dgDocumentsUrl: col(row, c.DG_DOCUMENTS),
    msdsDocumentsUrl: col(row, c.MSDS_DOCUMENTS),
    status: (col(row, c.STATUS) as CargoRequest['status']) || 'pending',
    adminNotes: col(row, c.ADMIN_NOTES),
    assignedFlightId: col(row, c.ASSIGNED_FLIGHT_ID),
  };
}

export async function updateCargoRequest(
  rowIndex: number,
  fields: Partial<{ status: string; adminNotes: string; assignedFlightId: string; requestId: string; dgClassification: string; dgDescription: string }>
) {
  const sheets = getSheetsClient();
  const c = CARGO_COLS;

  const updates: { colIndex: number; value: string }[] = [];

  if (fields.requestId !== undefined)        updates.push({ colIndex: c.REQUEST_ID,        value: fields.requestId });
  if (fields.status !== undefined)            updates.push({ colIndex: c.STATUS,             value: fields.status });
  if (fields.adminNotes !== undefined)        updates.push({ colIndex: c.ADMIN_NOTES,        value: fields.adminNotes });
  if (fields.assignedFlightId !== undefined)  updates.push({ colIndex: c.ASSIGNED_FLIGHT_ID, value: fields.assignedFlightId });
  if (fields.dgClassification !== undefined)  updates.push({ colIndex: c.DG_CLASSIFICATION,  value: fields.dgClassification });
  if (fields.dgDescription !== undefined)     updates.push({ colIndex: c.DG_DESCRIPTION,     value: fields.dgDescription });

  for (const u of updates) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAMES.CARGO}!${colLetter(u.colIndex)}${rowIndex}`,
      valueInputOption: 'RAW',
      requestBody: { values: [[u.value]] },
    });
  }
}

// ─── Flights ─────────────────────────────────────────────────────────────────

export async function ensureFlightsSheet() {
  if (!isConfigured()) return;
  const sheets = getSheetsClient();
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const exists = meta.data.sheets?.some(s => s.properties?.title === SHEET_NAMES.FLIGHTS);

  if (!exists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        requests: [{ addSheet: { properties: { title: SHEET_NAMES.FLIGHTS } } }],
      },
    });
    // Add header row
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAMES.FLIGHTS}!A1`,
      valueInputOption: 'RAW',
      requestBody: {
        values: [[
          'Flight ID', 'Flight Number', 'Aircraft Type', 'Direction',
          'Departure Date', 'Departure Time', 'Arrival Time',
          'Departure Airport', 'Destination Airport',
          'Status', 'Coordinator Name', 'Notes', 'Created At',
        ]],
      },
    });
  }
}

export async function getAllFlights(): Promise<Flight[]> {
  if (!isConfigured()) return [];
  await ensureFlightsSheet();
  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAMES.FLIGHTS}!A:M`,
  });

  const rows = res.data.values ?? [];
  if (rows.length <= 1) return [];

  return rows.slice(1).map(rowToFlight).filter(Boolean) as Flight[];
}

export async function getFlightById(id: string): Promise<Flight | null> {
  const flights = await getAllFlights();
  return flights.find(f => f.id === id) ?? null;
}

export function rowToFlight(row: string[]): Flight | null {
  if (!row[0]) return null;
  const c = FLIGHT_COLS;
  return {
    id: col(row, c.FLIGHT_ID),
    flightNumber: col(row, c.FLIGHT_NUMBER),
    aircraftType: col(row, c.AIRCRAFT_TYPE),
    direction: col(row, c.DIRECTION) as Flight['direction'],
    departureDate: col(row, c.DEPARTURE_DATE),
    departureTime: col(row, c.DEPARTURE_TIME),
    arrivalTime: col(row, c.ARRIVAL_TIME),
    departureAirport: col(row, c.DEPARTURE_AIRPORT),
    destinationAirport: col(row, c.DESTINATION_AIRPORT),
    status: (col(row, c.STATUS) as Flight['status']) || 'planned',
    coordinatorName: col(row, c.COORDINATOR_NAME),
    notes: col(row, c.NOTES),
    createdAt: col(row, c.CREATED_AT),
  };
}

export async function createFlight(flight: Omit<Flight, 'createdAt'>): Promise<Flight> {
  await ensureFlightsSheet();
  const sheets = getSheetsClient();
  const now = new Date().toISOString();
  const row = [
    flight.id, flight.flightNumber, flight.aircraftType, flight.direction,
    flight.departureDate, flight.departureTime, flight.arrivalTime ?? '',
    flight.departureAirport, flight.destinationAirport,
    flight.status, flight.coordinatorName, flight.notes, now,
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAMES.FLIGHTS}!A:M`,
    valueInputOption: 'RAW',
    requestBody: { values: [row] },
  });

  return { ...flight, createdAt: now };
}

export async function updateFlight(id: string, fields: Partial<Flight>) {
  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAMES.FLIGHTS}!A:A`,
  });
  const ids = (res.data.values ?? []).map(r => r[0]);
  const rowIndex = ids.indexOf(id) + 1;
  if (rowIndex <= 0) throw new Error('Flight not found');

  const c = FLIGHT_COLS;
  const updates: { col: number; value: string }[] = [];
  if (fields.status) updates.push({ col: c.STATUS, value: fields.status });
  if (fields.notes !== undefined) updates.push({ col: c.NOTES, value: fields.notes });

  for (const u of updates) {
    const colLetter = String.fromCharCode(65 + u.col);
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAMES.FLIGHTS}!${colLetter}${rowIndex}`,
      valueInputOption: 'RAW',
      requestBody: { values: [[u.value]] },
    });
  }
}
