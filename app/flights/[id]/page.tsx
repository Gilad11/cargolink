'use client';
import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { CargoStatusBadge, FlightStatusBadge } from '@/components/StatusBadge';
import { Flight, CargoRequest } from '@/lib/types';

interface FlightData { flight: Flight; cargo: CargoRequest[] }

export default function FlightDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<FlightData | null>(null);
  const [role, setRole] = useState<'viewer' | 'admin'>('viewer');
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetch(`/api/flights/${id}`).then(r => r.json()).then(d => {
      setData(d);
      setLoading(false);
    });
    const role = document.cookie.split(';').find(c => c.trim().startsWith('cl_role='))?.split('=')[1];
    if (role === 'admin') setRole('admin');
  }, [id]);

  async function updateFlightStatus(status: Flight['status']) {
    setUpdatingStatus(true);
    await fetch(`/api/flights/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    setData(prev => prev ? { ...prev, flight: { ...prev.flight, status } } : prev);
    setUpdatingStatus(false);
  }

  async function handleShareWhatsApp() {
    if (!data) return;
    setSharing(true);
    try {
      const res = await fetch(`/api/manifest/${id}`);
      if (!res.ok) throw new Error('Failed to generate manifest');

      const blob = await res.blob();
      const file = new File([blob], `manifest-${data.flight.flightNumber}.pdf`, { type: 'application/pdf' });
      const { flight, cargo } = data;
      const totalWeight = cargo.reduce((s, c) => s + c.totalWeight, 0);
      const text = `✈️ CARGO MANIFEST\nFlight: ${flight.flightNumber}\nRoute: ${flight.departureAirport} → ${flight.destinationAirport}\nDate: ${flight.departureDate} ${flight.departureTime}\nCargo: ${cargo.length} items | ${totalWeight.toLocaleString()} KG`;

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: `Manifest ${flight.flightNumber}`, text });
      } else {
        // Fallback: open WhatsApp Web with text
        const waText = encodeURIComponent(text + '\n\n(הורד מניפסט: ראה קובץ מצורף)');
        window.open(`https://web.whatsapp.com/send?text=${waText}`, '_blank');
        // Also trigger PDF download
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `manifest-${flight.flightNumber}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (e) {
      console.error(e);
      alert('שגיאה בשיתוף המניפסט');
    }
    setSharing(false);
  }

  async function handleDownloadPDF() {
    if (!data) return;
    const res = await fetch(`/api/manifest/${id}`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `manifest-${data.flight.flightNumber}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-400">טוען...</div>;
  if (!data || !data.flight) return <div className="min-h-screen flex items-center justify-center text-slate-400">טיסה לא נמצאה</div>;

  const { flight, cargo } = data;
  const totalWeight = cargo.reduce((s, c) => s + c.totalWeight, 0);
  const totalPackages = cargo.reduce((s, c) => s + c.packageCount, 0);
  const dgItems = cargo.filter(c => c.containsDG);

  return (
    <div className="min-h-screen">
      <Navbar role={role} />
      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="btn btn-secondary py-1.5 px-3 text-sm">→ חזור</button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-slate-800">{flight.flightNumber}</h1>
                <FlightStatusBadge status={flight.status} />
                {dgItems.length > 0 && <span className="dg-badge">DG</span>}
              </div>
              <div className="text-sm text-slate-500 mt-0.5">
                {flight.departureAirport} → {flight.destinationAirport} · {flight.departureDate} {flight.departureTime}{flight.arrivalTime ? `–${flight.arrivalTime}` : ''}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 flex-wrap">
            {role === 'admin' && (
              <>
                {flight.status === 'planned' && (
                  <button
                    className="btn btn-success"
                    disabled={updatingStatus}
                    onClick={() => updateFlightStatus('active')}
                  >
                    הפעל טיסה
                  </button>
                )}
                {flight.status === 'active' && (
                  <button
                    className="btn btn-secondary"
                    disabled={updatingStatus}
                    onClick={() => updateFlightStatus('completed')}
                  >
                    סמן כהושלם
                  </button>
                )}
              </>
            )}
            <button className="btn btn-secondary" onClick={handleDownloadPDF}>
              הורד PDF
            </button>
            <button className="btn btn-whatsapp" onClick={handleShareWhatsApp} disabled={sharing}>
              {sharing ? 'שולח...' : 'שתף בווטסאפ'}
            </button>
          </div>
        </div>

        {/* Flight Info + Summary */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="card p-5">
            <h3 className="font-bold text-slate-700 mb-3 text-sm">פרטי טיסה</h3>
            <dl className="space-y-2">
              <InfoRow label="מספר טיסה" value={flight.flightNumber} />
              <InfoRow label="סוג מטוס" value={flight.aircraftType} />
              <InfoRow label="תאריך" value={flight.departureDate} />
              <InfoRow label="שעת המראה" value={flight.departureTime} />
              {flight.arrivalTime && <InfoRow label="שעת נחיתה ביעד" value={flight.arrivalTime} />}
              <InfoRow label="נתיב" value={`${flight.departureAirport} → ${flight.destinationAirport}`} />
              {flight.coordinatorName && <InfoRow label="רכז" value={flight.coordinatorName} />}
            </dl>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <SummaryCard label="פריטי מטען" value={cargo.length} />
            <SummaryCard label='משקל כולל (ק"ג)' value={totalWeight.toLocaleString()} />
            <SummaryCard label="אריזות" value={totalPackages} />
            <SummaryCard label="חומרים מסוכנים" value={dgItems.length} highlight={dgItems.length > 0} />
          </div>
        </div>

        {/* Cargo Table */}
        <div className="card">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-bold text-slate-800">מטענים מאושרים לטיסה ({cargo.length})</h2>
          </div>

          {cargo.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">
              אין מטענים מאושרים לטיסה זו.
              {role === 'admin' && (
                <div className="mt-2 text-xs text-slate-400">
                  אשר בקשות מטען ושייך אותן לטיסה זו מדף <a href="/cargo" className="text-blue-500 hover:underline">ניהול בקשות</a>
                </div>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>תיאור (אנגלית)</th>
                    <th>יחידה</th>
                    <th>קטגוריה</th>
                    <th>כמות</th>
                    <th>מידות</th>
                    <th>משקל</th>
                    <th>DG</th>
                    <th>סטטוס</th>
                  </tr>
                </thead>
                <tbody>
                  {cargo.map((req, i) => (
                    <tr key={req.requestId} onClick={() => router.push(`/cargo/${req.requestId}`)}>
                      <td className="text-slate-400 text-xs">{i + 1}</td>
                      <td className="font-medium max-w-48">
                        <div className="truncate">{req.cargoDescription}</div>
                      </td>
                      <td className="text-slate-500 text-xs">{req.unit}</td>
                      <td className="text-xs text-slate-600">{req.equipmentCategory}</td>
                      <td className="text-center">{req.packageCount}</td>
                      <td className="text-xs text-slate-500 whitespace-nowrap">{req.packageDimensions}</td>
                      <td className="font-medium whitespace-nowrap">{req.totalWeight} ק"ג</td>
                      <td>{req.containsDG ? <span className="dg-badge">DG</span> : '—'}</td>
                      <td><CargoStatusBadge status={req.status} /></td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={6} className="p-3 text-sm font-bold text-slate-700 bg-slate-50 text-left">
                      סה"כ:
                    </td>
                    <td className="p-3 font-bold text-slate-800 bg-slate-50 whitespace-nowrap">
                      {totalWeight.toLocaleString()} ק"ג
                    </td>
                    <td colSpan={2} className="bg-slate-50"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

        {/* DG Section */}
        {dgItems.length > 0 && (
          <div className="card border-red-100">
            <div className="p-5 border-b border-red-100 bg-red-50 rounded-t-xl">
              <h2 className="font-bold text-red-700 text-sm">חומרים מסוכנים ({dgItems.length})</h2>
            </div>
            <div className="divide-y divide-slate-50">
              {dgItems.map(req => (
                <div key={req.requestId} className="p-4">
                  <div className="font-medium text-slate-800 mb-1">{req.cargoDescription}</div>
                  <div className="text-sm text-slate-500 space-y-0.5">
                    <div>סיווג: <span className="font-medium text-slate-700">{req.dgClassification || '—'}</span></div>
                    <div>תיאור: <span className="font-medium text-slate-700">{req.dgDescription || '—'}</span></div>
                    {req.dgDocumentsUrl && (
                      <a href={req.dgDocumentsUrl} target="_blank" rel="noopener" className="text-slate-600 hover:underline text-xs">
                        פתח אישורים
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        {flight.notes && (
          <div className="alert alert-info">{flight.notes}</div>
        )}

      </main>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-800">{value}</span>
    </div>
  );
}

function SummaryCard({ label, value, highlight }: { label: string; value: string | number; highlight?: boolean }) {
  return (
    <div className={`card p-4 flex flex-col gap-1 ${highlight ? 'border-red-200 bg-red-50' : ''}`}>
      <div className={`text-xl font-bold ${highlight ? 'text-red-600' : 'text-slate-800'}`}>{value}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  );
}
