import { CargoStatus, FlightStatus } from '@/lib/types';

const CARGO_LABELS: Record<CargoStatus, string> = {
  pending:      'ממתין',
  missing_info: 'מידע חסר',
  approved:     'מאושר',
  rejected:     'נדחה',
};

const FLIGHT_LABELS: Record<FlightStatus, string> = {
  planned:   'מתוכנן',
  active:    'פעיל',
  completed: 'הושלם',
};

const CARGO_CLASS: Record<CargoStatus, string> = {
  pending:      'badge-pending',
  missing_info: 'badge-missing',
  approved:     'badge-approved',
  rejected:     'badge-rejected',
};

const FLIGHT_CLASS: Record<FlightStatus, string> = {
  planned:   'badge-planned',
  active:    'badge-active',
  completed: 'badge-completed',
};

export function CargoStatusBadge({ status }: { status: CargoStatus }) {
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-xs font-semibold ${CARGO_CLASS[status]}`}>
      {CARGO_LABELS[status]}
    </span>
  );
}

export function FlightStatusBadge({ status }: { status: FlightStatus }) {
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-xs font-semibold ${FLIGHT_CLASS[status]}`}>
      {FLIGHT_LABELS[status]}
    </span>
  );
}
