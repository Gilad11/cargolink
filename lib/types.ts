export type CargoStatus = 'pending' | 'missing_info' | 'approved' | 'rejected';
export type FlightStatus = 'planned' | 'active' | 'completed';
export type FlightDirection = 'IL_TO_UAE' | 'UAE_TO_IL';
export type UserRole = 'viewer' | 'admin';

export interface CargoRequest {
  rowIndex: number;
  requestId: string;
  timestamp: string;

  // Requester
  fullName: string;
  unit: string;
  phone: string;
  email: string;

  // Flight (as filled in form)
  flightDirection: string;
  flightDate: string;
  departureTime: string;
  aircraftType: string;
  departureAirport: string;
  destinationAirport: string;

  // Cargo
  equipmentCategory: string;
  categoryDetails: string;
  cargoDescription: string;
  packageCount: number;
  packageDimensions: string;
  weightPerPackage: number;
  totalWeight: number;
  packagingType: string;
  cargoPhotoUrl: string;       // #1 — photo uploaded via Google Form

  // Dangerous Goods
  containsDG: boolean;
  dgClassification: string;
  dgDescription: string;
  dgDocumentsUrl: string;
  msdsDocumentsUrl: string;

  // Admin fields (written by web app)
  status: CargoStatus;
  adminNotes: string;
  assignedFlightId: string;
  conditions: string;          // #4 — conditional notes (e.g. "דורש הפחתת נוסעים")
  actuallyLoaded: boolean;     // #5 — did this cargo actually board the aircraft
  archived: boolean;           // moved to archive after flight completed
}

export interface Flight {
  id: string;
  flightNumber: string;
  aircraftType: string;
  direction: FlightDirection;
  departureDate: string;
  departureTime: string;
  arrivalTime: string;
  departureAirport: string;
  destinationAirport: string;
  status: FlightStatus;
  coordinatorName: string;
  coordinatorPhone: string;    // #2 — contact person phone
  loadingRequirements: string; // #3 — equipment needed at airports
  notes: string;
  createdAt: string;
}

export interface ManifestData {
  flight: Flight;
  cargo: CargoRequest[];
  totalWeight: number;
  totalPackages: number;
  dgCount: number;
  generatedAt: string;
  manifestNumber: string;
  finalManifest?: boolean;     // #5 — true = only actually-loaded items
}
