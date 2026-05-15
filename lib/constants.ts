// Column indices for "תגובות לטופס 1" sheet (Google Form output)
// Column 0 = A (Timestamp, auto-added by Google Forms)
//
// Form columns (A–T, 0–19):
//   Col 17 (R) – "אישור סופי" confirmation (form-linked, not stored in CargoRequest)
// App-written columns start at col 20 (U).
export const CARGO_COLS = {
  TIMESTAMP: 0,           // A
  FULL_NAME: 1,           // B
  UNIT: 2,                // C
  PHONE: 3,               // D
  FLIGHT_DIRECTION: 4,    // E
  FLIGHT_DATE: 5,         // F
  AIRCRAFT_TYPE: 6,       // G
  EQUIPMENT_CATEGORY: 7,  // H
  CATEGORY_DETAILS: 8,    // I
  CARGO_DESCRIPTION: 9,   // J
  PACKAGE_COUNT: 10,      // K
  PACKAGE_DIMENSIONS: 11, // L
  WEIGHT_PER_PACKAGE: 12, // M
  TOTAL_WEIGHT: 13,       // N
  CONTAINS_DG: 14,        // O
  DG_DESCRIPTION: 15,     // P
  DG_DOCUMENTS: 16,       // Q — DG docs + cargo photo (merged question)
  // Col 17 (R) – "אישור סופי" form-linked, not stored
  PACKAGING_TYPE: 18,     // S
  EMAIL_AUTO: 19,         // T — auto-collected by Google Forms, always filled
  // App-written columns:
  STATUS: 20,             // U
  ADMIN_NOTES: 21,        // V
  ASSIGNED_FLIGHT_ID: 22, // W
  CONDITIONS: 23,         // X
  ARCHIVED: 24,           // Y
  ACTUALLY_LOADED: 25,    // Z
} as const;

// Column indices for "Flights" sheet (managed by web app)
// Note: COORDINATOR_EMAIL (was col 12) was deleted — columns shifted accordingly.
export const FLIGHT_COLS = {
  FLIGHT_ID: 0,
  FLIGHT_NUMBER: 1,
  AIRCRAFT_TYPE: 2,
  DIRECTION: 3,
  DEPARTURE_DATE: 4,
  DEPARTURE_TIME: 5,
  ARRIVAL_TIME: 6,
  DEPARTURE_AIRPORT: 7,
  DESTINATION_AIRPORT: 8,
  STATUS: 9,
  COORDINATOR_NAME: 10,
  COORDINATOR_PHONE: 11,    // contact phone
  LOADING_REQUIREMENTS: 12, // equipment needed at airports
  NOTES: 13,
  CREATED_AT: 14,
} as const;

export const SHEET_NAMES = {
  CARGO: 'תגובות לטופס 1',
  FLIGHTS: 'Flights',
} as const;

export const STATUS_LABELS: Record<string, string> = {
  pending: 'ממתין לבדיקה',
  missing_info: 'מידע חסר',
  approved: 'מאושר',
  rejected: 'נדחה',
};

export const CATEGORY_LABELS: Record<string, string> = {
  'Technological Equipment': 'ציוד טכנולוגי',
  'Logistics Equipment': 'ציוד לוגיסטי',
  'Toiletries': 'טואלטיקה',
  'Medical Equipment': 'ציוד רפואי',
  'Personal Equipment': 'ציוד אישי',
  'Other': 'אחר',
};

export const DIRECTION_LABELS: Record<string, string> = {
  IL_TO_UAE: 'ישראל → איחוד האמירויות',
  UAE_TO_IL: 'איחוד האמירויות → ישראל',
};
