// Column indices for "תגובות לטופס 1" sheet (Google Form output)
// Column 0 = A (Timestamp, auto-added by Google Forms)
//
// Form columns (0–26, AA):
//   Col 18 (S)  – "סוג אריזה" old submissions (pre-form-edit)
//   Col 22 (W)  – "העלאת אישורי DG | תמונת מטען" — merged DG docs + cargo photo upload
//   Col 24 (Y)  – "אישור סופי" confirmation (form-linked, cannot delete, not stored in CargoRequest)
//   Col 25 (Z)  – "סוג אריזה" packaging type (new submissions)
//   Col 26 (AA) – "כתובת אימייל" auto-collected by Google Forms
// App-written columns start at col 27 (AB).
// Note: cols 25(Z), 28(AC), 29(AD), 30(AE) were deleted; col 24(Y) is form-linked and kept.
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
  // Col 24 (Y)  – "אישור סופי" confirmation (form-linked, not stored in CargoRequest)
  PACKAGING_TYPE: 25,     // new submissions (post-form-edit, col Z)
  EMAIL_AUTO: 26,         // auto-collected by Google Forms (col AA, always filled)
  // App-written columns:
  STATUS: 27,             // (AB) admin sets status
  ADMIN_NOTES: 28,        // (AC) admin notes
  ASSIGNED_FLIGHT_ID: 29, // (AD) linked flight
  CONDITIONS: 30,         // (AE) conditional cargo notes
  ARCHIVED: 31,           // (AF) moved to archive after flight completed
  ACTUALLY_LOADED: 32,    // (AG) did cargo actually board
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
