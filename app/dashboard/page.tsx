'use client';
import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import { CargoStatusBadge, FlightStatusBadge } from '@/components/StatusBadge';
import { Flight, CargoRequest } from '@/lib/types';
import { useRouter } from 'next/navigation';

function useDashboard() {
  const [flights, setFlights] = useState<Flight[]>([]);
  const [cargo, setCargo] = useState<CargoRequest[]>([]);
  const [role, setRole] = useState<'viewer' | 'admin'>('viewer');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [fr, cr] = await Promise.all([
        fetch('/api/flights').then(r => r.json()),
        fetch('/api/cargo').then(r => r.json()),
      ]);
      setFlights(Array.isArray(fr) ? fr : []);
      setCargo(Array.isArray(cr) ? cr : []);
      const role = document.cookie.split(';').find(c => c.trim().startsWith('cl_role='))?.split('=')[1];
      if (role === 'admin') setRole('admin');
      setLoading(false);
    }
    load();
  }, []);

  return { flights, cargo, role, loading };
}

export default function DashboardPage() {
  const { flights, cargo, role, loading } = useDashboard();
  const router = useRouter();

  const pending     = cargo.filter(c => c.status === 'pending');
  const approved    = cargo.filter(c => c.status === 'approved');
  const missingInfo = cargo.filter(c => c.status === 'missing_info');
  const dgItems     = cargo.filter(c => c.containsDG);

  const upcomingFlights = flights
    .filter(f => f.status !== 'completed')
    .sort((a, b) => a.departureDate.localeCompare(b.departureDate));

  const alerts: { text: string; type: 'warning' | 'danger' }[] = [];
  if (pending.length > 0)     alerts.push({ text: `${pending.length} בקשות ממתינות לבדיקה`, type: 'warning' });
  if (missingInfo.length > 0) alerts.push({ text: `${missingInfo.length} בקשות עם מידע חסר`, type: 'warning' });
  const dgPending = dgItems.filter(c => c.status === 'pending' || c.status === 'missing_info');
  if (dgPending.length > 0)   alerts.push({ text: `${dgPending.length} בקשות עם חומרים מסוכנים ממתינות לאישור`, type: 'danger' });

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center text-slate-400 text-sm">טוען...</div>
  );

  return (
    <div className="min-h-screen">
      <Navbar role={role} />
      <main className="max-w-6xl mx-auto px-4 py-5 space-y-4">

        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-slate-800">לוח בקרה</h1>
          {role === 'admin' && (
            <button className="btn btn-primary text-xs" onClick={() => router.push('/flights/new')}>
              טיסה חדשה
            </button>
          )}
        </div>

        {alerts.length > 0 && (
          <div className="flex flex-col gap-1.5">
            {alerts.map((a, i) => (
              <div key={i} className={`alert alert-${a.type}`}>{a.text}</div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="טיסות פעילות"    value={upcomingFlights.length} />
          <StatCard label="מאושרות"          value={approved.length} highlight={approved.length > 0} color="green" />
          <StatCard label="ממתינות לבדיקה"  value={pending.length}  highlight={pending.length > 0} color="amber" />
          <StatCard label="חומרים מסוכנים"  value={dgItems.length}  highlight={dgItems.length > 0} color="red" />
        </div>

        <div className="card">
          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-700">טיסות קרובות</h2>
            <a href="/flights" className="text-xs text-slate-500 hover:text-slate-800 transition-colors">הכל</a>
          </div>
          {upcomingFlights.length === 0 ? (
            <div className="px-5 py-8 text-center text-slate-400 text-sm">אין טיסות מתוכננות</div>
          ) : (
            <div className="divide-y divide-slate-50">
              {upcomingFlights.map(flight => {
                const flightCargo = cargo.filter(c => c.assignedFlightId === flight.id && c.status === 'approved');
                const totalWeight = flightCargo.reduce((s, c) => s + c.totalWeight, 0);
                const hasDG = flightCargo.some(c => c.containsDG);
                return (
                  <div key={flight.id} className="px-5 py-3 hover:bg-slate-50 cursor-pointer flex items-center justify-between gap-3" onClick={() => router.push(`/flights/${flight.id}`)}>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-slate-800">{flight.flightNumber}</span>
                        <FlightStatusBadge status={flight.status} />
                        {hasDG && <span className="dg-badge">DG</span>}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">{flight.departureAirport} → {flight.destinationAirport} · {flight.departureDate} {flight.departureTime}{flight.arrivalTime ? `–${flight.arrivalTime}` : ''}</div>
                    </div>
                    <div className="text-left text-xs text-slate-500">{flightCargo.length} מטענים{totalWeight > 0 ? ` · ${totalWeight.toLocaleString()} ק"ג` : ''}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="card">
          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-700">בקשות אחרונות</h2>
            <a href="/cargo" className="text-xs text-slate-500 hover:text-slate-800 transition-colors">הכל</a>
          </div>
          {cargo.length === 0 ? (
            <div className="px-5 py-8 text-center text-slate-400 text-sm">אין בקשות מטען</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>מגיש</th><th>יחידה</th><th>תיאור</th><th>משקל</th><th>DG</th><th>סטטוס</th>
                  </tr>
                </thead>
                <tbody>
                  {cargo.slice(0, 8).map(req => (
                    <tr key={req.requestId} onClick={() => router.push(`/cargo/${req.requestId}`)}>
                      <td className="font-medium">{req.fullName}</td>
                      <td className="text-slate-500">{req.unit}</td>
                      <td className="max-w-48 truncate text-slate-600">{req.cargoDescription}</td>
                      <td className="whitespace-nowrap text-slate-600">{req.totalWeight} ק"ג</td>
                      <td>{req.containsDG ? <span className="dg-badge">DG</span> : <span className="text-slate-300">—</span>}</td>
                      <td><CargoStatusBadge status={req.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </main>
    </div>
  );
}

function StatCard({ label, value, highlight, color }: { label: string; value: number; highlight?: boolean; color?: string }) {
  const colorMap: Record<string, string> = {
    green: 'text-green-700',
    amber: 'text-amber-700',
    red:   'text-red-700',
  };
  return (
    <div className="stat-card">
      <div className={`text-2xl font-bold ${highlight && color ? colorMap[color] : 'text-slate-800'}`}>{value}</div>
      <div className="text-xs text-slate-400 font-medium">{label}</div>
    </div>
  );
}
