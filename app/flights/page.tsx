'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { FlightStatusBadge } from '@/components/StatusBadge';
import { Flight } from '@/lib/types';

export default function FlightsPage() {
  const [flights, setFlights] = useState<Flight[]>([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<'viewer' | 'admin'>('viewer');
  const [filter, setFilter] = useState<'all' | 'planned' | 'active' | 'completed'>('all');
  const router = useRouter();

  useEffect(() => {
    fetch('/api/flights').then(r => r.json()).then(data => {
      setFlights(Array.isArray(data) ? data : []);
      setLoading(false);
    });
    const role = document.cookie.split(';').find(c => c.trim().startsWith('cl_role='))?.split('=')[1];
    if (role === 'admin') setRole('admin');
  }, []);

  const filtered = filter === 'all' ? flights : flights.filter(f => f.status === filter);
  const sorted = [...filtered].sort((a, b) => b.departureDate.localeCompare(a.departureDate));

  return (
    <div className="min-h-screen">
      <Navbar role={role} />
      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">

        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-slate-800">טיסות</h1>
          {role === 'admin' && (
            <button className="btn btn-primary" onClick={() => router.push('/flights/new')}>
              + טיסה חדשה
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          {(['all', 'planned', 'active', 'completed'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`btn text-sm py-1.5 px-3 ${filter === f ? 'btn-primary' : 'btn-secondary'}`}
            >
              {f === 'all' ? 'הכל' : f === 'planned' ? 'מתוכנן' : f === 'active' ? 'פעיל' : 'הושלם'}
            </button>
          ))}
        </div>

        <div className="card">
          {loading ? (
            <div className="p-8 text-center text-slate-400 text-sm">טוען...</div>
          ) : sorted.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-slate-500 text-sm">אין טיסות להצגה</div>
              {role === 'admin' && (
                <button className="btn btn-primary mt-4" onClick={() => router.push('/flights/new')}>
                  צור טיסה ראשונה
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>מספר טיסה</th>
                    <th>נתיב</th>
                    <th>תאריך</th>
                    <th>שעת המראה</th>
                    <th>סוג מטוס</th>
                    <th>סטטוס</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map(flight => (
                    <tr key={flight.id} onClick={() => router.push(`/flights/${flight.id}`)}>
                      <td className="font-bold text-slate-800">{flight.flightNumber}</td>
                      <td>{flight.departureAirport} → {flight.destinationAirport}</td>
                      <td>{flight.departureDate}</td>
                      <td>{flight.departureTime}</td>
                      <td>{flight.aircraftType}</td>
                      <td><FlightStatusBadge status={flight.status} /></td>
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
