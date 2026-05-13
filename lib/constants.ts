// Column indices for "Form Responses 1" sheet (Google Form output)
// Column 0 = A (Timestamp, auto-added by Google Forms)
//
// NOTE: After the form was edited, new columns appeared:
//   Col 25 (Z)  – empty artifact "סוג אריזה" (old question edit residue)
//   Col 26 (AA) – new "סוג אריזה" packaging type (new submissions)
//   Col 27 (AB) – "כתובת אימייל" auto-collected by Google Forms
// App-written columns start at col 29 (AD) to avoid conflicts.
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
  DG_DOCUMENTS: 22,
  MSDS_DOCUMENTS: 23,
  CONFIRMATION: 24,
  // Col 25 (Z)  – empty artifact column (skip)
  PACKAGING_TYPE: 26,     // new submissions (post-form-edit, col AA)
  // Col 27 (AB) – "כתובת אימייל" auto-added by Google Forms (skip)
  // Col 28 (AC) – spare
  // Written by web app (start at AD=29 to avoid form columns)
  REQUEST_ID: 29,
  STATUS: 30,
  ADMIN_NOTES: 31,
  ASSIGNED_FLIGHT_ID: 32,
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
  NOTES: 11,
  CREATED_AT: 12,
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
