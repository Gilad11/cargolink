'use client';
import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { CargoStatusBadge } from '@/components/StatusBadge';
import { CargoRequest, CargoStatus, Flight } from '@/lib/types';

export default function CargoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [req, setReq] = useState<CargoRequest | null>(null);
  const [flights, setFlights] = useState<Flight[]>([]);
  const [role, setRole] = useState<'viewer' | 'admin'>('viewer');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notes, setNotes] = useState('');
  const [assignedFlight, setAssignedFlight] = useState('');
  const [dgClass, setDgClass] = useState('');
  const [dgDesc, setDgDesc] = useState('');
  const router = useRouter();

  useEffect(() => {
    Promise.all([
      fetch(`/api/cargo/${id}`).then(r => r.json()),
      fetch('/api/flights').then(r => r.json()),
    ]).then(([cargo, flightData]) => {
      setReq(cargo);
      setNotes(cargo.adminNotes ?? '');
      setAssignedFlight(cargo.assignedFlightId ?? '');
      setDgClass(cargo.dgClassification ?? '');
      setDgDesc(cargo.dgDescription ?? '');
      setFlights(Array.isArray(flightData) ? flightData : []);
      setLoading(false);
    });
    const role = document.cookie.split(';').find(c => c.trim().startsWith('cl_role='))?.split('=')[1];
    if (role === 'admin') setRole('admin');
  }, [id]);

  async function updateStatus(status: CargoStatus) {
    setSaving(true);
    const res = await fetch(`/api/cargo/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, adminNotes: notes, assignedFlightId: assignedFlight, dgClassification: dgClass, dgDescription: dgDesc }),
    });
    if (res.ok) {
      setReq(prev => prev ? { ...prev, status, adminNotes: notes, assignedFlightId: assignedFlight, dgClassification: dgClass, dgDescription: dgDesc } : prev);
    }
    setSaving(false);
  }

  async function saveNotes() {
    setSaving(true);
    await fetch(`/api/cargo/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: req?.status, adminNotes: notes, assignedFlightId: assignedFlight, dgClassification: dgClass, dgDescription: dgDesc }),
    });
    setReq(prev => prev ? { ...prev, adminNotes: notes, assignedFlightId: assignedFlight, dgClassification: dgClass, dgDescription: dgDesc } : prev);
    setSaving(false);
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-400">טוען...</div>;
  if (!req || (req as any).error) return <div className="min-h-screen flex items-center justify-center text-slate-400">בקשה לא נמצאה</div>;

  return (
    <div className="min-h-screen">
      <Navbar role={role} />
      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="btn btn-secondary py-1.5 px-3 text-sm">→ חזור</button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-800">בקשת מטען</h1>
                <CargoStatusBadge status={req.status} />
                {req.containsDG && <span className="dg-badge">DG</span>}
              </div>
              <div className="text-xs text-slate-400 mt-0.5">#{req.requestId}</div>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">

          {/* Requester Info */}
          <div className="card p-5">
            <h3 className="font-bold text-slate-700 mb-3 text-sm border-b border-slate-100 pb-2">פרטי מגיש</h3>
            <dl className="space-y-2">
              <InfoRow label="שם מלא" value={req.fullName} />
              <InfoRow label="יחידה / ארגון" value={req.unit} />
              <InfoRow label="טלפון" value={req.phone} />
              <InfoRow label="מייל" value={req.email} />
            </dl>
          </div>

          {/* Flight Info */}
          <div className="card p-5">
            <h3 className="font-bold text-slate-700 mb-3 text-sm border-b border-slate-100 pb-2">פרטי טיסה (לפי הגשה)</h3>
            <dl className="space-y-2">
              <InfoRow label="כיוון" value={req.flightDirection} />
              <InfoRow label="תאריך מבוקש" value={req.flightDate} />
              <InfoRow label="סוג מטוס" value={req.aircraftType} />
            </dl>
            {/* Assigned flight details */}
            {req.assignedFlightId && (() => {
              const f = flights.find(f => f.id === req.assignedFlightId);
              return f ? (
                <div className="mt-3 pt-3 border-t border-slate-100">
                  <div className="text-xs font-semibold text-blue-600 mb-2">✈ טיסה משויכת: {f.flightNumber}</div>
                  <dl className="space-y-1.5">
                    <InfoRow label="מסלול" value={`${f.departureAirport} → ${f.destinationAirport}`} />
                    <InfoRow label="תאריך" value={f.departureDate} />
                    <InfoRow label="שעת המראה" value={f.departureTime ? `${f.departureTime} (UAE)` : '—'} />
                    {f.arrivalTime && <InfoRow label="שעת נחיתה" value={`${f.arrivalTime} (UAE)`} />}
                  </dl>
                </div>
              ) : null;
            })()}
          </div>

          {/* Cargo Details */}
          <div className="card p-5 md:col-span-2">
            <h3 className="font-bold text-slate-700 mb-3 text-sm border-b border-slate-100 pb-2">פרטי מטען</h3>
            <div className="grid sm:grid-cols-2 gap-x-8 gap-y-2">
              <InfoRow label="קטגוריה" value={req.equipmentCategory} />
              {req.categoryDetails && <InfoRow label="פירוט קטגוריה" value={req.categoryDetails} />}
              <InfoRow label="כמות אריזות" value={String(req.packageCount)} />
              <InfoRow label="מידות אריזה" value={req.packageDimensions} />
              <InfoRow label="משקל לאריזה" value={`${req.weightPerPackage} ק"ג`} />
              <InfoRow label='משקל כולל' value={`${req.totalWeight} ק"ג`} />
              <InfoRow label="סוג אריזה" value={req.packagingType} />
              {(req.cargoDescription) && (
                <InfoRow label="תיאור מטען" value={req.cargoDescription} />
              )}
            </div>
          </div>

          {/* DG Info */}
          {req.containsDG && (
            <div className="card p-5 md:col-span-2 border-red-200 bg-red-50">
              <h3 className="font-bold text-red-700 mb-3 text-sm border-b border-red-200 pb-2">חומרים מסוכנים</h3>
              <div className="grid sm:grid-cols-2 gap-y-2">
                <InfoRow label="סיווג" value={req.dgClassification || '—'} />
                <InfoRow label="תיאור" value={req.dgDescription || '—'} />
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                {req.dgDocumentsUrl && splitUrls(req.dgDocumentsUrl).map((url, i, arr) => (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary text-xs py-1.5">
                    אישורי DG{arr.length > 1 ? ` (${i + 1})` : ''}
                  </a>
                ))}
                {req.msdsDocumentsUrl && splitUrls(req.msdsDocumentsUrl).map((url, i, arr) => (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary text-xs py-1.5">
                    MSDS{arr.length > 1 ? ` (${i + 1})` : ''}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Admin Panel */}
        {role === 'admin' && (
          <div className="card p-5">
            <h3 className="font-bold text-slate-700 mb-4 text-sm border-b border-slate-100 pb-2">פאנל מנהל</h3>

            {/* Assign to flight */}
            <div className="mb-4">
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">שיוך לטיסה</label>
              <select
                className="input max-w-xs"
                value={assignedFlight}
                onChange={e => setAssignedFlight(e.target.value)}
              >
                <option value="">— לא משויך —</option>
                {flights.map(f => (
                  <option key={f.id} value={f.id}>
                    {f.flightNumber} · {f.departureAirport} → {f.destinationAirport} · {f.departureDate}
                  </option>
                ))}
              </select>
            </div>

            {/* DG fields (editable by admin) */}
            {req.containsDG && (
              <div className="mb-4 grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">סיווג DG</label>
                  <input
                    className="input"
                    placeholder="לדוג׳ Class 3"
                    value={dgClass}
                    onChange={e => setDgClass(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">תיאור DG</label>
                  <input
                    className="input"
                    placeholder="תיאור החומר המסוכן"
                    value={dgDesc}
                    onChange={e => setDgDesc(e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* Notes */}
            <div className="mb-4">
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">הערות מנהל</label>
              <textarea
                className="input resize-none"
                rows={3}
                placeholder="הוסף הערות..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 flex-wrap">
              <button
                className="btn btn-success"
                disabled={saving || req.status === 'approved'}
                onClick={() => updateStatus('approved')}
              >
                אשר בקשה
              </button>
              <button
                className="btn btn-warning"
                disabled={saving || req.status === 'missing_info'}
                onClick={() => updateStatus('missing_info')}
              >
                מידע חסר
              </button>
              <button
                className="btn btn-danger"
                disabled={saving || req.status === 'rejected'}
                onClick={() => updateStatus('rejected')}
              >
                דחה בקשה
              </button>
              <button
                className="btn btn-secondary"
                disabled={saving}
                onClick={saveNotes}
              >
                {saving ? 'שומר...' : 'שמור הערות'}
              </button>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}

function splitUrls(raw: string): string[] {
  return raw.split(',').map(u => u.trim()).filter(Boolean).map(normalizeDriveUrl);
}

/** Convert any Google Drive share URL to a direct /file/d/ID/view viewer URL */
function normalizeDriveUrl(url: string): string {
  // Extract file ID from various Drive URL formats
  const patterns = [
    /[?&]id=([^&\s]+)/,       // ?id=FILE_ID  or  &id=FILE_ID
    /\/file\/d\/([^/\s?]+)/,  // /file/d/FILE_ID/
    /\/d\/([^/\s?]+)/,        // generic /d/FILE_ID
  ];
  for (const re of patterns) {
    const m = url.match(re);
    if (m?.[1]) return `https://drive.google.com/file/d/${m[1]}/view`;
  }
  return url; // fallback: return as-is
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm py-0.5">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-800 text-left">{value || '—'}</span>
    </div>
  );
}
