// Column indices for "תגובות לטופס 1" sheet (Google Form output)
// Column 0 = A (Timestamp, auto-added by Google Forms)
//
// Form columns (0–28, AC):
//   Col 18 (S)  – "סוג אריזה" old submissions (pre-form-edit)
//   Col 22 (W)  – "העלאת אישורי DG | תמונת מטען" — merged DG docs + cargo photo upload
//   Col 25 (Z)  – "סוג אריזה" artifact from form edit (duplicate, skip)
//   Col 26 (AA) – "סוג אריזה" packaging type (new submissions)
//   Col 27 (AB) – "כתובת אימייל" auto-collected by Google Forms
//   Col 28 (AC) – "תמונת מטען" old orphaned column (question deleted from form)
//   Col 29 (AD) – "עמודה 28" form artifact column (inserted by form, do not use for app writes)
// App-written columns start at col 31 (AF) — verified from actual sheet data.
export const CARGO_COLS = {
  TIMESTAMP: 0,
  FULL_NAME: 1,
  UNIT: 2,
  PHONE: 3,
  EMAIL: 4,
  FLIGHT_DIRECTION: 5,
  FLIGHT_DATE: 6,
  DEPARTURE_TIME: 7,
  AIRCRAFT_TYPE: 8,
  DEPARTURE_AIRPORT: 9,
  DESTINATION_AIRPORT: 10,
  EQUIPMENT_CATEGORY: 11,
  CATEGORY_DETAILS: 12,
  CARGO_DESCRIPTION: 13,
  PACKAGE_COUNT: 14,
  PACKAGE_DIMENSIONS: 15,
  WEIGHT_PER_PACKAGE: 16,
  TOTAL_WEIGHT: 17,
  PACKAGING_TYPE_OLD: 18, // old submissions (pre-form-edit)
  CONTAINS_DG: 19,
  DG_CLASSIFICATION: 20,
  DG_DESCRIPTION: 21,
  DG_DOCUMENTS: 22,       // also holds cargo photo for non-DG cargo (merged question)
  MSDS_DOCUMENTS: 23,
  // Col 24 (Y)  – "אישור סופי" confirmation (not stored in CargoRequest)
  // Col 25 (Z)  – "סוג אריזה" artifact duplicate (skip)
  PACKAGING_TYPE: 26,     // new submissions (post-form-edit, col AA)
  EMAIL_AUTO: 27,         // auto-collected by Google Forms (always filled)
  CARGO_PHOTO_URL: 28,    // old photo column (orphaned); new photo goes to DG_DOCUMENTS col
  // Col 29 (AD) – "עמודה 28" form artifact (do not write here)
  // Col 30 (AE) – reserved / empty
  // App-written columns (verified positions from sheet data):
  STATUS: 31,             // (AF) admin sets status
  ADMIN_NOTES: 32,        // (AG) admin notes
  ASSIGNED_FLIGHT_ID: 33, // (AH) linked flight
  CONDITIONS: 34,         // (AI) conditional cargo notes
  ARCHIVED: 35,           // (AJ) moved to archive after flight completed
  ACTUALLY_LOADED: 36,    // (AK) did cargo actually board
} as const;

// Column indices for "Flights" sheet (managed by web app)
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
  COORDINATOR_PHONE: 11,   // #2 contact phone
  COORDINATOR_EMAIL: 12,   // #2 contact email
  LOADING_REQUIREMENTS: 13, // #3 equipment needed at airports
  NOTES: 14,
  CREATED_AT: 15,
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
