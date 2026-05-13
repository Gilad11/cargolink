'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

const PIN_LENGTH = 4;

export default function LoginPage() {
  const [digits, setDigits] = useState('');
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function submit(pin: string) {
    setLoading(true);
    setError('');

    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: pin }),
    });

    if (res.ok) {
      router.push('/dashboard');
      router.refresh();
    } else {
      setError('קוד גישה שגוי');
      setDigits('');
      inputRef.current?.focus();
    }
    setLoading(false);
  }

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value.replace(/\D/g, '').slice(0, PIN_LENGTH);
    setDigits(val);
    setError('');
    if (val.length === PIN_LENGTH) {
      submit(val);
    }
  }

  // Click on any display box → focus the hidden input
  function focusInput() {
    inputRef.current?.focus();
  }

  const filled = digits.length;

  return (
    <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center p-4" dir="rtl">
      <div className="mb-8 text-center">
        <div className="text-3xl font-black text-white tracking-tight mb-1">CargoLink</div>
        <div className="text-slate-400 text-sm">ניהול מטענים ישראל ↔ איחוד האמירויות</div>
      </div>

      <div className="w-full max-w-xs bg-white rounded-xl shadow-xl p-8">
        <h2 className="text-base font-bold text-slate-800 mb-0.5 text-center">כניסה למערכת</h2>
        <p className="text-xs text-slate-400 mb-7 text-center">הזן קוד גישה בן 4 ספרות</p>

        {/* Hidden real input */}
        <input
          ref={inputRef}
          type="password"
          inputMode="numeric"
          value={digits}
          onChange={handleInput}
          disabled={loading}
          autoFocus
          autoComplete="off"
          maxLength={PIN_LENGTH}
          className="sr-only"
          aria-label="קוד גישה"
        />

        {/* Visual PIN boxes — clicking focuses the hidden input */}
        <div className="flex justify-center gap-3 mb-6" dir="ltr" onClick={focusInput}>
          {Array.from({ length: PIN_LENGTH }).map((_, i) => {
            const hasDigit = i < filled;
            const isActive = i === filled && !loading;
            return (
              <div
                key={i}
                className={`
                  flex items-center justify-center
                  text-xl font-bold rounded-lg border-2 select-none cursor-text
                  transition-colors bg-slate-50 text-slate-900
                  ${error ? 'border-red-400 bg-red-50' : isActive ? 'border-slate-800' : hasDigit ? 'border-slate-400' : 'border-slate-200'}
                `}
                style={{ width: '3.25rem', height: '3.25rem' }}
              >
                {hasDigit ? '•' : ''}
              </div>
            );
          })}
        </div>

        {error && (
          <div className="text-center text-sm text-red-600 font-medium mb-4">{error}</div>
        )}

        {loading && (
          <div className="text-center text-xs text-slate-400">בודק...</div>
        )}
      </div>

      <p className="mt-6 text-slate-600 text-xs">CargoLink v1.0 · Israel ↔ UAE</p>
    </div>
  );
}
