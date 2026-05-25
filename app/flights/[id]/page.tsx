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
  const [editingTimes, setEditingTimes] = useState(false);
  const [editDate, setEditDate] = useState('');
  const [editDep, setEditDep] = useState('');
  const [editArr, setEditArr] = useState('');
  const [savingTimes, setSavingTimes] = useState(false);
  const [togglingLoaded, setTogglingLoaded] = useState<string | null>(null);
  const [archivingAll, setArchivingAll] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetch(`/api/flights/${id}`).then(r => r.json()).then(d => {
      setData(d);
      setLoading(false);
    });
    const role = document.cookie.split(';').find(c => c.trim().startsWith('cl_role='))?.split('=')[1];
    if (role === 'admin') setRole('admin');
  }, [id]);

  function openEditTimes() {
    if (!data) return;
    setEditDate(data.flight.departureDate);
    setEditDep(data.flight.departureTime);
    setEditArr(data.flight.arrivalTime ?? '');
    setEditingTimes(true);
  }

  async function saveTimes() {
    setSavingTimes(true);
    await fetch(`/api/flights/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ departureDate: editDate, departureTime: editDep, arrivalTime: editArr }),
    });
    setData(prev => prev ? {
      ...prev,
      flight: { ...prev.flight, departureDate: editDate, departureTime: editDep, arrivalTime: editArr },
    } : prev);
    setSavingTimes(false);
    setEditingTimes(false);
  }

  async function archiveLoadedCargo() {
    if (!data) return;
    const toArchive = data.cargo.filter(c => c.actuallyLoaded && !c.archived);
    if (toArchive.length === 0) return;
    setArchivingAll(true);
    await Promise.all(toArchive.map(c =>
      fetch(`/api/cargo/${c.requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archived: true }),
      })
    ));
    setData(prev => prev ? {
      ...prev,
      cargo: prev.cargo.map(c => toArchive.some(a => a.requestId === c.requestId) ? { ...c, archived: true } : c),
    } : prev);
    setArchivingAll(false);
  }

  async function toggleActuallyLoaded(req: CargoRequest) {
    setTogglingLoaded(req.requestId);
    const next = !req.actuallyLoaded;
    await fetch(`/api/cargo/${req.requestId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actuallyLoaded: next }),
    });
    setData(prev => prev ? {
      ...prev,
      cargo: prev.cargo.map(c => c.requestId === req.requestId ? { ...c, actuallyLoaded: next } : c),
    } : prev);
    setTogglingLoaded(null);
  }

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
      const { flight, cargo } = data;
      const totalWeight = cargo.reduce((s, c) => s + c.totalWeight, 0);
      const dgCount   = cargo.filter(c => c.containsDG).length;

      // Build message first — synchronously, from already-loaded data
      const msgLines = [
        `*CARGO MANIFEST — ${flight.flightNumber}*`,
        `--------------------------------`,
        `Route:    ${flight.departureAirport} → ${flight.destinationAirport}`,
        `Date:     ${flight.departureDate}  ${flight.departureTime} (UAE)`,
        ``,
        `Cargo Items:    *${cargo.length}*`,
        `Total Weight:   *${totalWeight.toLocaleString()} KG*`,
        ...(dgCount > 0 ? [`Dangerous Goods: *${dgCount}*`] : []),
        ``,
        `_See attached manifest file_`,
      ];
      const text = msgLines.join('\n');

      const isTouchDevice = window.matchMedia('(pointer: coarse)').matches;

      // ── Desktop: open WhatsApp BEFORE any await so Chrome doesn't block the popup ──
      if (!isTouchDevice) {
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
      }

      // ── Fetch and download the PDF ────────────────────────────────────────
      const res = await fetch(`/api/manifest/${id}`);
      if (!res.ok) throw new Error('Failed to generate manifest');
      const blob = await res.blob();

      // Download PDF
      const objUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objUrl;
      a.download = `manifest-${flight.flightNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objUrl);

      // Desktop: notify user to attach the downloaded PDF manually
      if (!isTouchDevice) {
        alert(`הקובץ manifest-${flight.flightNumber}.pdf הורד — צרף אותו ידנית לשיחת הווטסאפ שנפתחה.`);
      }

      // ── Mobile only: native share with file attachment ────────────────────
      if (isTouchDevice && navigator.canShare) {
        const file = new File([blob], `manifest-${flight.flightNumber}.pdf`, { type: 'application/pdf' });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: `Manifest ${flight.flightNumber}`, text });
        }
      }
    } catch (e) {
      console.error(e);
      alert('שגיאה בשיתוף המניפסט');
    } finally {
      setSharing(false);
    }
  }

  async function handleDownloadPDF(finalOnly = false) {
    if (!data) return;
    const url = `/api/manifest/${id}${finalOnly ? '?final=true' : ''}`;
    const res = await fetch(url);
    const blob = await res.blob();
    const objUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objUrl;
    a.download = `manifest-${data.flight.flightNumber}${finalOnly ? '-final' : ''}.pdf`;
    a.click();
    URL.revokeObjectURL(objUrl);
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
                {flight.status !== 'active' && (
                  <button className="btn btn-success" disabled={updatingStatus} onClick={() => updateFlightStatus('active')}>
                    {flight.status === 'completed' ? 'החזר לפעיל' : 'הפעל טיסה'}
                  </button>
                )}
                {flight.status !== 'planned' && (
                  <button className="btn btn-secondary" disabled={updatingStatus} onClick={() => updateFlightStatus('planned')}>
                    החזר לתכנון
                  </button>
                )}
                {flight.status === 'active' && (
                  <button className="btn btn-secondary" disabled={updatingStatus} onClick={() => updateFlightStatus('completed')}>
                    סמן כהושלם
                  </button>
                )}
                <button className="btn btn-warning" onClick={openEditTimes}>
                  עריכת זמנים
                </button>
              </>
            )}
            <button className="btn btn-secondary" onClick={() => handleDownloadPDF()}>
              הורד מניפסט
            </button>
            {(flight.status === 'active' || flight.status === 'completed') && (
              <button className="btn btn-primary" onClick={() => { handleDownloadPDF(true); }}>
                מניפסט סופי ✓
              </button>
            )}
            <button className="btn btn-whatsapp" onClick={handleShareWhatsApp} disabled={sharing}>
              {sharing ? 'שולח...' : 'שתף בווטסאפ'}
            </button>
            {role === 'admin' && flight.status === 'completed' && cargo.some(c => c.actuallyLoaded && !c.archived) && (
              <button
                className="btn btn-secondary !border-slate-400 !text-slate-600 hover:!bg-slate-100"
                onClick={archiveLoadedCargo}
                disabled={archivingAll}
                title="העבר לארכיון את כל המטענים שעלו בפועל"
              >
                {archivingAll ? 'מעביר...' : '🗄 ארכב מטענים שנטענו'}
              </button>
            )}
          </div>
        </div>

        {/* Edit Times Panel */}
        {editingTimes && (
          <div className="card p-5 border-amber-200 bg-amber-50">
            <h3 className="font-bold text-amber-800 mb-4 text-sm border-b border-amber-200 pb-2">עריכת זמני טיסה</h3>
            <div className="grid sm:grid-cols-3 gap-3 mb-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">תאריך</label>
                <input type="date" className="input" value={editDate} onChange={e => setEditDate(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">שעת המראה</label>
                <input type="time" className="input" value={editDep} onChange={e => setEditDep(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">שעת נחיתה (אופציונלי)</label>
                <input type="time" className="input" value={editArr} onChange={e => setEditArr(e.target.value)} />
              </div>
            </div>
            <div className="flex gap-2">
              <button className="btn btn-success" disabled={savingTimes} onClick={saveTimes}>
                {savingTimes ? 'שומר...' : 'שמור שינויים'}
              </button>
              <button className="btn btn-secondary" onClick={() => setEditingTimes(false)}>ביטול</button>
            </div>
          </div>
        )}

        {/* Flight Info + Summary */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="card p-5 space-y-4">
            <div>
              <h3 className="font-bold text-slate-700 mb-3 text-sm">פרטי טיסה</h3>
              <dl className="space-y-2">
                <InfoRow label="מספר טיסה" value={flight.flightNumber} />
                <InfoRow label="סוג מטוס" value={flight.aircraftType} />
                <InfoRow label="תאריך" value={flight.departureDate} />
                <InfoRow label="שעת המראה" value={flight.departureTime} />
                {flight.arrivalTime && <InfoRow label="שעת נחיתה ביעד" value={flight.arrivalTime} />}
                <InfoRow label="נתיב" value={`${flight.departureAirport} → ${flight.destinationAirport}`} />
              </dl>
            </div>
            {(flight.coordinatorName || flight.coordinatorPhone) && (
              <div className="border-t border-slate-100 pt-3">
                <h4 className="text-xs font-semibold text-slate-500 mb-2">איש קשר לטיסה</h4>
                <dl className="space-y-1.5">
                  {flight.coordinatorName  && <InfoRow label="שם"    value={flight.coordinatorName} />}
                  {flight.coordinatorPhone && <InfoRow label="טלפון" value={flight.coordinatorPhone} />}
                </dl>
              </div>
            )}
            {flight.loadingRequirements && (
              <div className="border-t border-amber-100 pt-3 bg-amber-50 -mx-5 px-5 pb-1 rounded-b-xl">
                <h4 className="text-xs font-semibold text-amber-700 mb-1">⚙ דרישות העמסה / פריקה</h4>
                <p className="text-sm text-amber-900">{flight.loadingRequirements}</p>
              </div>
            )}
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
                    <th>תיאור / קטגוריה</th>
                    <th>יחידה</th>
                    <th>כמות</th>
                    <th>משקל</th>
                    <th>DG</th>
                    <th>תנאים</th>
                    {role === 'admin' && <th>עלה בפועל</th>}
                  </tr>
                </thead>
                <tbody>
                  {cargo.map((req, i) => (
                    <tr key={req.requestId}
                      onClick={() => router.push(`/cargo/${req.requestId}`)}
                      className={
                        req.archived ? 'opacity-40 bg-slate-50' :
                        req.actuallyLoaded === false && (flight.status === 'active' || flight.status === 'completed') ? 'opacity-50' : ''
                      }
                    >
                      <td className="text-slate-400 text-xs">{i + 1}</td>
                      <td className="font-medium max-w-48">
                        <div className="truncate">{req.cargoDescription || req.categoryDetails || req.equipmentCategory}</div>
                        <div className="text-xs text-slate-400">{req.unit}</div>
                      </td>
                      <td className="text-slate-500 text-xs">{req.equipmentCategory}</td>
                      <td className="text-center">{req.packageCount}</td>
                      <td className="font-medium whitespace-nowrap">{req.totalWeight} ק"ג</td>
                      <td>{req.containsDG ? <span className="dg-badge">DG</span> : '—'}</td>
                      <td>
                        {req.conditions ? (
                          <span className="inline-block bg-amber-100 text-amber-800 text-xs px-2 py-0.5 rounded-full" title={req.conditions}>⚠ על תנאי</span>
                        ) : '—'}
                      </td>
                      {role === 'admin' && (
                        <td onClick={e => { e.stopPropagation(); if (!req.archived) toggleActuallyLoaded(req); }}>
                          {req.archived ? (
                            <span className="text-xs text-slate-400 px-1">🗄</span>
                          ) : (
                            <button
                              disabled={togglingLoaded === req.requestId}
                              className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-bold transition-colors ${
                                req.actuallyLoaded
                                  ? 'bg-green-500 border-green-500 text-white'
                                  : 'border-slate-300 text-slate-300 hover:border-green-400'
                              }`}
                            >
                              {req.actuallyLoaded ? '✓' : ''}
                            </button>
                          )}
                        </td>
                      )}
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
                  <div className="flex items-start justify-between gap-2 flex-wrap mb-1">
                    <div className="font-medium text-slate-800">{req.cargoDescription}</div>
                    <div className="text-xs text-slate-400 whitespace-nowrap">{req.fullName} · {req.unit}</div>
                  </div>
                  <div className="text-sm text-slate-500 space-y-0.5">
                    <div>תיאור: <span className="font-medium text-slate-700">{req.dgDescription || '—'}</span></div>
                    {req.dgDocumentsUrl && (
                      <DriveLinks raw={req.dgDocumentsUrl} label="אישורי DG" />
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

/** Convert any Google Drive share URL to a direct /file/d/ID/view viewer URL */
function normalizeDriveUrl(url: string): string {
  const patterns = [
    /[?&]id=([^&\s]+)/,
    /\/file\/d\/([^/\s?]+)/,
    /\/d\/([^/\s?]+)/,
  ];
  for (const re of patterns) {
    const m = url.match(re);
    if (m?.[1]) return `https://drive.google.com/file/d/${m[1]}/view`;
  }
  return url;
}

/** Renders one link per Drive URL (Google Forms may store multiple comma-separated URLs). */
function DriveLinks({ raw, label }: { raw: string; label: string }) {
  const urls = raw.split(',').map(u => u.trim()).filter(Boolean).map(normalizeDriveUrl);
  return (
    <span className="inline-flex flex-wrap gap-2 mt-1">
      {urls.map((url, i) => (
        <a
          key={i}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline text-xs"
        >
          {label}{urls.length > 1 ? ` (${i + 1})` : ''}
        </a>
      ))}
    </span>
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
