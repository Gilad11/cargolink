'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { CargoStatusBadge } from '@/components/StatusBadge';
import { CargoRequest, CargoStatus } from '@/lib/types';

const TABS: { key: CargoStatus | 'all'; label: string }[] = [
  { key: 'all',         label: 'הכל' },
  { key: 'pending',     label: 'ממתין' },
  { key: 'missing_info',label: 'מידע חסר' },
  { key: 'approved',    label: 'מאושר' },
  { key: 'rejected',    label: 'נדחה' },
];

export default function CargoPage() {
  const [cargo, setCargo] = useState<CargoRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<CargoStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [role, setRole] = useState<'viewer' | 'admin'>('viewer');
  const router = useRouter();

  useEffect(() => {
    fetch('/api/cargo').then(r => r.json()).then(data => {
      setCargo(Array.isArray(data) ? data : []);
      setLoading(false);
    });
    const role = document.cookie.split(';').find(c => c.trim().startsWith('cl_role='))?.split('=')[1];
    if (role === 'admin') setRole('admin');
  }, []);

  const filtered = cargo.filter(req => {
    const matchTab = tab === 'all' || req.status === tab;
    const q = search.toLowerCase();
    const matchSearch = !q || [req.fullName, req.unit, req.cargoDescription, req.categoryDetails, req.equipmentCategory, req.requestId]
      .some(f => f?.toLowerCase().includes(q));
    return matchTab && matchSearch;
  });

  const counts: Record<string, number> = { all: cargo.length };
  TABS.slice(1).forEach(t => { counts[t.key] = cargo.filter(c => c.status === t.key).length; });

  return (
    <div className="min-h-screen">
      <Navbar role={role} />
      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">

        <h1 className="text-lg font-bold text-slate-800">בקשות מטען</h1>

        {/* Search */}
        <input
          type="search"
          className="input max-w-sm"
          placeholder="חיפוש לפי שם, יחידה, תיאור..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />

        {/* Tabs */}
        <div className="flex gap-2 flex-wrap">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`btn text-sm py-1.5 px-3 ${tab === t.key ? 'btn-primary' : 'btn-secondary'}`}
            >
              {t.label}
              <span className={`mr-1 text-xs rounded-full px-1.5 py-0.5 ${
                tab === t.key ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
              }`}>
                {counts[t.key] ?? 0}
              </span>
            </button>
          ))}
        </div>

        <div className="card">
          {loading ? (
            <div className="p-8 text-center text-slate-400 text-sm">טוען...</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">אין בקשות להצגה</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>מגיש</th>
                    <th>יחידה</th>
                    <th>תיאור מטען</th>
                    <th>תאריך טיסה</th>
                    <th>משקל</th>
                    <th>DG</th>
                    <th>סטטוס</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(req => (
                    <tr key={req.requestId} onClick={() => router.push(`/cargo/${req.requestId}`)}>
                      <td>
                        <div className="font-medium text-slate-800">{req.fullName}</div>
                        <div className="text-xs text-slate-400">{req.phone}</div>
                      </td>
                      <td className="text-slate-600">{req.unit}</td>
                      <td>
                        <div className="max-w-52 truncate text-slate-700">{req.cargoDescription || req.categoryDetails || '—'}</div>
                        <div className="text-xs text-slate-400">{req.equipmentCategory}</div>
                      </td>
                      <td className="whitespace-nowrap text-slate-600 text-sm">{req.flightDate}</td>
                      <td className="whitespace-nowrap font-medium">{req.totalWeight} ק"ג</td>
                      <td>{req.containsDG ? <span className="dg-badge">DG</span> : '—'}</td>
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
