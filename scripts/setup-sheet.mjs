import { google } from 'googleapis';

const SERVICE_ACCOUNT = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);

const auth = new google.auth.GoogleAuth({
  credentials: SERVICE_ACCOUNT,
  scopes: [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive',
  ],
});

const sheets = google.sheets({ version: 'v4', auth });
const drive = google.drive({ version: 'v3', auth });

async function main() {
  // 1. Create a new Google Spreadsheet
  console.log('Creating Google Spreadsheet...');
  const spreadsheet = await sheets.spreadsheets.create({
    requestBody: {
      properties: { title: 'CargoLink - Cargo Requests' },
      sheets: [
        {
          properties: { title: 'Form Responses 1', index: 0 },
        },
        {
          properties: { title: 'Flights', index: 1 },
        },
      ],
    },
  });

  const spreadsheetId = spreadsheet.data.spreadsheetId;
  console.log('Spreadsheet ID:', spreadsheetId);

  // 2. Add headers to "Form Responses 1" (matching CARGO_COLS constants)
  const cargoHeaders = [
    'Timestamp',           // 0
    'Full Name',           // 1
    'Unit / Organization', // 2
    'Phone',               // 3
    'Email',               // 4
    'Flight Direction',    // 5
    'Flight Date',         // 6
    'Departure Time',      // 7
    'Aircraft Type',       // 8
    'Departure Airport',   // 9
    'Destination Airport', // 10
    'Equipment Category',  // 11
    'Category Details',    // 12
    'Cargo Description (English)', // 13
    'Package Count',       // 14
    'Package Dimensions',  // 15
    'Weight Per Package (kg)', // 16
    'Total Weight (kg)',   // 17
    'Packaging Type',      // 18
    'Contains Dangerous Goods?', // 19
    'DG Classification',   // 20
    'DG Description',      // 21
    'DG Documents URL',    // 22
    'MSDS Documents URL',  // 23
    'Confirmation',        // 24
    'Request ID',          // 25
    'Status',              // 26
    'Admin Notes',         // 27
    'Assigned Flight ID',  // 28
  ];

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: 'Form Responses 1!A1',
    valueInputOption: 'RAW',
    requestBody: { values: [cargoHeaders] },
  });

  // 3. Add headers to "Flights" sheet (matching FLIGHT_COLS constants)
  const flightHeaders = [
    'Flight ID',          // 0
    'Flight Number',      // 1
    'Aircraft Type',      // 2
    'Direction',          // 3
    'Departure Date',     // 4
    'Departure Time',     // 5
    'Departure Airport',  // 6
    'Destination Airport',// 7
    'Status',             // 8
    'Coordinator Name',   // 9
    'Notes',              // 10
    'Created At',         // 11
  ];

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: 'Flights!A1',
    valueInputOption: 'RAW',
    requestBody: { values: [flightHeaders] },
  });

  console.log('Headers added successfully.');
  console.log('\n✅ Done! Add this to your .env.local:');
  console.log(`GOOGLE_SHEETS_ID=${spreadsheetId}`);
}

main().catch(console.error);
