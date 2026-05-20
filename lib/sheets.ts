import { google } from 'googleapis';
import { CargoRequest, Flight } from './types';
import { CARGO_COLS, FLIGHT_COLS, SHEET_NAMES } from './constants';
import { Readable } from 'stream';

function isConfigured(): boolean {
  const json = process.env.GOOGLE_SERVICE_ACCOUNT_JSON ?? '';
  try {
    const creds = JSON.parse(json);
    return !!creds.private_key && !!creds.client_email;
  } catch {
    return false;
  }
}

// ─── Cached singletons ───────────────────────────────────────────────────────
// Auth and API clients are expensive to create — reuse them across requests
// within the same serverless function instance.

let _auth: ReturnType<typeof google.auth.GoogleAuth> | null = null;
function getAuth() {
  if (!_auth) {
    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON!);
    _auth = new google.auth.GoogleAuth({
      credentials,
      scopes: [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive.readonly',
      ],
    });
  }
  return _auth;
}

let _sheetsClient: ReturnType<typeof google.sheets> | null = null;
function getSheetsClient() {
  if (!_sheetsClient) _sheetsClient = google.sheets({ version: 'v4', auth: getAuth() });
  return _sheetsClient;
}

let _driveClient: ReturnType<typeof google.drive> | null = null;
function getDriveClient() {
  if (!_driveClient) _driveClient = google.drive({ version: 'v3', auth: getAuth() });
  return _driveClient;
}

// ─── In-memory cache ─────────────────────────────────────────────────────────
const CACHE_TTL = 60_000; // 60 seconds

let _cargoCache: { data: CargoRequest[]; ts: number } | null = null;
let _flightsCache: { data: Flight[]; ts: number } | null = null;

export function invalidateCargoCache()   { _cargoCache   = null; }
export function invalidateFlightsCache() { _flightsCache = null; }

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
  if (_cargoCache && Date.now() - _cargoCache.ts < CACHE_TTL) return _cargoCache.data;

  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAMES.CARGO}!A:Z`,
  });

  const rows = res.data.values ?? [];
  const data = rows.length <= 1 ? [] : rows.slice(1)
    .map((row, i) => ({ row, rowIndex: i + 2 }))
    .filter(({ row }) => (row[0] ?? '').trim() !== '')
    .map(({ row, rowIndex }) => rowToCargoRequest(row, rowIndex));

  _cargoCache = { data, ts: Date.now() };
  return data;
}

export async function getCargoRequestsByFlight(flightId: string): Promise<CargoRequest[]> {
  const all = await getAllCargoRequests();
  return all.filter(r => r.assignedFlightId === flightId && r.status === 'approved');
}

export function rowToCargoRequest(row: string[], rowIndex: number): CargoRequest {
  const c = CARGO_COLS;
  return {
    rowIndex,
    requestId: `REQ-${rowIndex}`,  // Always use row-based ID (no sheet column)
    timestamp: col(row, c.TIMESTAMP),
    fullName: col(row, c.FULL_NAME),
    unit: col(row, c.UNIT),
    phone: col(row, c.PHONE),
    email: col(row, c.EMAIL_AUTO),
    flightDirection: col(row, c.FLIGHT_DIRECTION),
    flightDate: col(row, c.FLIGHT_DATE),
    aircraftType: col(row, c.AIRCRAFT_TYPE),
    equipmentCategory: col(row, c.EQUIPMENT_CATEGORY),
    categoryDetails: col(row, c.CATEGORY_DETAILS),
    cargoDescription: col(row, c.CARGO_DESCRIPTION),
    packageCount: Number(col(row, c.PACKAGE_COUNT)) || 0,
    packageDimensions: col(row, c.PACKAGE_DIMENSIONS),
    weightPerPackage: Number(col(row, c.WEIGHT_PER_PACKAGE)) || 0,
    totalWeight: Number(col(row, c.TOTAL_WEIGHT)) || 0,
    packagingType: col(row, c.PACKAGING_TYPE),
    cargoPhotoUrl: col(row, c.DG_DOCUMENTS),
    containsDG: col(row, c.CONTAINS_DG).toLowerCase().includes('כן') || col(row, c.CONTAINS_DG).toLowerCase() === 'yes',
    dgDescription: col(row, c.DG_DESCRIPTION),
    dgDocumentsUrl: col(row, c.DG_DOCUMENTS),
    status: (col(row, c.STATUS) as CargoRequest['status']) || 'pending',
    adminNotes: col(row, c.ADMIN_NOTES),
    assignedFlightId: col(row, c.ASSIGNED_FLIGHT_ID),
    conditions: col(row, c.CONDITIONS),
    actuallyLoaded: col(row, c.ACTUALLY_LOADED) === 'true',
    archived: col(row, c.ARCHIVED) === 'true',
  };
}

export async function updateCargoRequest(
  rowIndex: number,
  fields: Partial<{
    status: string;
    adminNotes: string;
    assignedFlightId: string;
    dgDescription: string;
    conditions: string;
    actuallyLoaded: boolean;
    archived: boolean;
  }>
) {
  const sheets = getSheetsClient();
  const c = CARGO_COLS;

  const updates: { colIndex: number; value: string }[] = [];

  if (fields.status !== undefined)            updates.push({ colIndex: c.STATUS,             value: fields.status });
  if (fields.adminNotes !== undefined)        updates.push({ colIndex: c.ADMIN_NOTES,        value: fields.adminNotes });
  if (fields.assignedFlightId !== undefined)  updates.push({ colIndex: c.ASSIGNED_FLIGHT_ID, value: fields.assignedFlightId });
  if (fields.dgDescription !== undefined)     updates.push({ colIndex: c.DG_DESCRIPTION,     value: fields.dgDescription });
  if (fields.conditions !== undefined)        updates.push({ colIndex: c.CONDITIONS,          value: fields.conditions });
  if (fields.actuallyLoaded !== undefined)    updates.push({ colIndex: c.ACTUALLY_LOADED,     value: String(fields.actuallyLoaded) });
  if (fields.archived !== undefined)          updates.push({ colIndex: c.ARCHIVED,            value: String(fields.archived) });

  if (updates.length === 0) return;
  invalidateCargoCache();

  // Send all updates in a single batchUpdate call instead of one per field
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      valueInputOption: 'RAW',
      data: updates.map(u => ({
        range: `${SHEET_NAMES.CARGO}!${colLetter(u.colIndex)}${rowIndex}`,
        values: [[u.value]],
      })),
    },
  });
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
  }
  // Always ensure header row is up to date
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAMES.FLIGHTS}!A1`,
    valueInputOption: 'RAW',
    requestBody: {
      values: [[
        'Flight ID', 'Flight Number', 'Aircraft Type', 'Direction',
        'Departure Date', 'Departure Time', 'Arrival Time',
        'Departure Airport', 'Destination Airport',
        'Status', 'Coordinator Name', 'Coordinator Phone',
        'Loading Requirements', 'Notes', 'Created At',
      ]],
    },
  });
}

export async function getAllFlights(): Promise<Flight[]> {
  if (!isConfigured()) return [];
  if (_flightsCache && Date.now() - _flightsCache.ts < CACHE_TTL) return _flightsCache.data;

  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAMES.FLIGHTS}!A:O`,
  });

  const rows = res.data.values ?? [];
  const data = rows.length <= 1 ? [] : rows.slice(1).map(rowToFlight).filter(Boolean) as Flight[];
  _flightsCache = { data, ts: Date.now() };
  return data;
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
    coordinatorPhone: col(row, c.COORDINATOR_PHONE),
    loadingRequirements: col(row, c.LOADING_REQUIREMENTS),
    notes: col(row, c.NOTES),
    createdAt: col(row, c.CREATED_AT),
  };
}

export async function createFlight(flight: Omit<Flight, 'createdAt'>): Promise<Flight> {
  invalidateFlightsCache();
  const sheets = getSheetsClient();
  const now = new Date().toISOString();
  const c = FLIGHT_COLS;
  const row = new Array(c.CREATED_AT + 1).fill('');
  row[c.FLIGHT_ID]            = flight.id;
  row[c.FLIGHT_NUMBER]        = flight.flightNumber;
  row[c.AIRCRAFT_TYPE]        = flight.aircraftType;
  row[c.DIRECTION]            = flight.direction;
  row[c.DEPARTURE_DATE]       = flight.departureDate;
  row[c.DEPARTURE_TIME]       = flight.departureTime;
  row[c.ARRIVAL_TIME]         = flight.arrivalTime ?? '';
  row[c.DEPARTURE_AIRPORT]    = flight.departureAirport;
  row[c.DESTINATION_AIRPORT]  = flight.destinationAirport;
  row[c.STATUS]               = flight.status;
  row[c.COORDINATOR_NAME]     = flight.coordinatorName;
  row[c.COORDINATOR_PHONE]    = flight.coordinatorPhone ?? '';
  row[c.LOADING_REQUIREMENTS] = flight.loadingRequirements ?? '';
  row[c.NOTES]                = flight.notes;
  row[c.CREATED_AT]           = now;

  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAMES.FLIGHTS}!A:O`,
    valueInputOption: 'RAW',
    requestBody: { values: [row] },
  });

  return { ...flight, createdAt: now };
}

export async function updateFlight(id: string, fields: Partial<Flight>) {
  // Use cached flight list to find the row index — avoids extra Sheets read
  const flights = await getAllFlights();
  const rowIndex = flights.findIndex(f => f.id === id) + 2; // +2: 1-based + header row
  if (rowIndex <= 1) throw new Error('Flight not found');

  invalidateFlightsCache();
  const sheets = getSheetsClient();
  const c = FLIGHT_COLS;
  const updates: { col: number; value: string }[] = [];
  if (fields.status !== undefined)               updates.push({ col: c.STATUS,                value: fields.status });
  if (fields.notes !== undefined)                updates.push({ col: c.NOTES,                 value: fields.notes });
  if (fields.departureDate !== undefined)        updates.push({ col: c.DEPARTURE_DATE,        value: fields.departureDate });
  if (fields.departureTime !== undefined)        updates.push({ col: c.DEPARTURE_TIME,        value: fields.departureTime });
  if (fields.arrivalTime !== undefined)          updates.push({ col: c.ARRIVAL_TIME,          value: fields.arrivalTime });
  if (fields.coordinatorName !== undefined)      updates.push({ col: c.COORDINATOR_NAME,      value: fields.coordinatorName });
  if (fields.coordinatorPhone !== undefined)     updates.push({ col: c.COORDINATOR_PHONE,     value: fields.coordinatorPhone });
  if (fields.loadingRequirements !== undefined)  updates.push({ col: c.LOADING_REQUIREMENTS,  value: fields.loadingRequirements });

  if (updates.length === 0) return;

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      valueInputOption: 'RAW',
      data: updates.map(u => ({
        range: `${SHEET_NAMES.FLIGHTS}!${colLetter(u.col)}${rowIndex}`,
        values: [[u.value]],
      })),
    },
  });
}

// ─── Drive file fetching ──────────────────────────────────────────────────────

/** Extract a Google Drive file ID from any share URL format. */
export function extractDriveFileId(url: string): string | null {
  const patterns = [
    /[?&]id=([^&\s]+)/,
    /\/file\/d\/([^/\s?]+)/,
    /\/d\/([^/\s?]+)/,
  ];
  for (const re of patterns) {
    const m = url.match(re);
    if (m?.[1]) return m[1];
  }
  return null;
}

/** Export a Google Workspace native file (Docs, Sheets, etc.) to a specific mimeType.
 *  Returns the raw bytes of the exported file. */
export async function fetchDriveFileExport(fileId: string, exportMimeType: string): Promise<Uint8Array> {
  const drive = getDriveClient();
  const res = await drive.files.export(
    { fileId, mimeType: exportMimeType },
    { responseType: 'stream' },
  );
  const chunks: Buffer[] = [];
  await new Promise<void>((resolve, reject) => {
    const stream = res.data as unknown as Readable;
    stream.on('data', (chunk: Buffer) => chunks.push(chunk));
    stream.on('end', resolve);
    stream.on('error', reject);
  });
  return new Uint8Array(Buffer.concat(chunks));
}

/** Fetch a file from Google Drive by file ID using the service account.
 *  Returns the raw bytes and mime type. */
export async function fetchDriveFile(fileId: string): Promise<{ bytes: Uint8Array; mimeType: string }> {
  const drive = getDriveClient();

  // Fetch metadata and content in parallel
  const [meta, res] = await Promise.all([
    drive.files.get({ fileId, fields: 'mimeType' }),
    drive.files.get({ fileId, alt: 'media' }, { responseType: 'stream' }),
  ]);

  const mimeType = meta.data.mimeType ?? 'application/octet-stream';

  const chunks: Buffer[] = [];
  await new Promise<void>((resolve, reject) => {
    const stream = res.data as unknown as Readable;
    stream.on('data', (chunk: Buffer) => chunks.push(chunk));
    stream.on('end', resolve);
    stream.on('error', reject);
  });

  return { bytes: new Uint8Array(Buffer.concat(chunks)), mimeType };
}
