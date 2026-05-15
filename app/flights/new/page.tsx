'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';

export default function NewFlightPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    flightNumber: '',
    aircraftType: '',
    direction: 'IL_TO_UAE',
    departureDate: '',
    departureTime: '',
    arrivalTime: '',
    departureAirport: '',
    destinationAirport: '',
    coordinatorName: '',
    coordinatorPhone: '',
    coordinatorEmail: '',
    loadingRequirements: '',
    notes: '',
  });

  function set(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  // Auto-fill airports when direction changes
  function handleDirection(dir: string) {
    set('direction', dir);
    if (dir === 'IL_TO_UAE') {
      set('departureAirport', 'LLBG');
      set('destinationAirport', 'OMAL');
    } else {
      set('departureAirport', 'OMAL');
      set('destinationAirport', 'LLBG');
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');

    const res = await fetch('/api/flights', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });

    if (res.ok) {
      const flight = await res.json();
      router.push(`/flights/${flight.id}`);
    } else {
      setError('שגיאה ביצירת הטיסה. נסה שנית.');
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen">
      <Navbar role="admin" />
      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">

        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="btn btn-secondary py-1.5 px-3 text-sm">
            → חזור
          </button>
          <h1 className="text-lg font-bold text-slate-800">טיסה חדשה</h1>
        </div>

        <div className="card p-6">
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Direction */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">כיוון הטיסה</label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { val: 'IL_TO_UAE', label: 'ישראל → אמירויות' },
                  { val: 'UAE_TO_IL', label: 'אמירויות → ישראל' },
                ].map(opt => (
                  <button
                    key={opt.val}
                    type="button"
                    onClick={() => handleDirection(opt.val)}
                    className={`p-3 rounded-lg border-2 text-sm font-medium transition-colors ${
                      form.direction === opt.val
                        ? 'border-slate-800 bg-slate-800 text-white'
                        : 'border-slate-200 text-slate-600 hover:border-slate-400'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Row: Flight Number + Aircraft */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">מספר טיסה</label>
                <input
                  className="input"
                  placeholder="MOU175"
                  value={form.flightNumber}
                  onChange={e => set('flightNumber', e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">סוג מטוס</label>
                <input
                  className="input"
                  placeholder="B707"
                  value={form.aircraftType}
                  onChange={e => set('aircraftType', e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Row: Date + Departure Time + Arrival Time */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">תאריך המראה</label>
                <input
                  type="date"
                  className="input"
                  value={form.departureDate}
                  onChange={e => set('departureDate', e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">שעת המראה (שעון UAE)</label>
                <input
                  type="time"
                  className="input"
                  value={form.departureTime}
                  onChange={e => set('departureTime', e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">שעת נחיתה ביעד (שעון UAE)</label>
                <input
                  type="time"
                  className="input"
                  value={form.arrivalTime}
                  onChange={e => set('arrivalTime', e.target.value)}
                />
              </div>
            </div>

            {/* Row: Airports */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">שדה יציאה (ICAO)</label>
                <input
                  className="input"
                  placeholder="LLBG"
                  value={form.departureAirport}
                  onChange={e => set('departureAirport', e.target.value.toUpperCase())}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">שדה יעד (ICAO)</label>
                <input
                  className="input"
                  placeholder="OMAL"
                  value={form.destinationAirport}
                  onChange={e => set('destinationAirport', e.target.value.toUpperCase())}
                  required
                />
              </div>
            </div>

            {/* Coordinator */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">שם איש קשר / רכז</label>
              <input
                className="input"
                placeholder="שם מלא"
                value={form.coordinatorName}
                onChange={e => set('coordinatorName', e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">טלפון איש קשר</label>
                <input
                  className="input"
                  placeholder="05X-XXXXXXX"
                  value={form.coordinatorPhone}
                  onChange={e => set('coordinatorPhone', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">מייל איש קשר</label>
                <input
                  type="email"
                  className="input"
                  placeholder="name@example.com"
                  value={form.coordinatorEmail}
                  onChange={e => set('coordinatorEmail', e.target.value)}
                />
              </div>
            </div>

            {/* Loading Requirements */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">דרישות העמסה / פריקה</label>
              <textarea
                className="input resize-none"
                rows={2}
                placeholder="לדוג׳: מלגזה 3 טון בLLBG, קרן 10 טון בOMAL"
                value={form.loadingRequirements}
                onChange={e => set('loadingRequirements', e.target.value)}
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">הערות</label>
              <textarea
                className="input resize-none"
                rows={2}
                placeholder="הערות נוספות..."
                value={form.notes}
                onChange={e => set('notes', e.target.value)}
              />
            </div>

            {error && <div className="alert alert-danger">{error}</div>}

            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={saving} className="btn btn-primary flex-1 justify-center py-3">
                {saving ? 'יוצר...' : 'צור טיסה'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => router.back()}>
                ביטול
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
