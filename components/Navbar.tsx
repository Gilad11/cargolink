'use client';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';

const navItems = [
  { label: 'לוח בקרה', href: '/dashboard' },
  { label: 'טיסות',    href: '/flights' },
  { label: 'בקשות מטען', href: '/cargo' },
];

export default function Navbar({ role }: { role: 'viewer' | 'admin' }) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  async function handleLogout() {
    await fetch('/api/auth', { method: 'DELETE' });
    router.push('/');
    router.refresh();
  }

  return (
    <>
      <nav className="bg-[#0f172a] text-white sticky top-0 z-50 border-b border-white/5">
        <div className="max-w-6xl mx-auto px-4 h-12 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold tracking-wide">CargoLink</span>
            <span className="text-[11px] text-slate-400 hidden sm:block font-normal">IL ↔ UAE</span>
          </div>

          <div className="hidden md:flex items-center gap-0.5">
            {navItems.map(item => (
              <a
                key={item.href}
                href={item.href}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                  pathname.startsWith(item.href)
                    ? 'bg-white/10 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {item.label}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded ${
              role === 'admin'
                ? 'bg-white/10 text-white'
                : 'text-slate-400'
            }`}>
              {role === 'admin' ? 'מנהל' : 'צופה'}
            </span>
            <button
              onClick={handleLogout}
              className="text-[11px] text-slate-400 hover:text-white transition-colors hidden md:block"
            >
              יציאה
            </button>
            <button
              className="md:hidden flex flex-col gap-1 p-1"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              <div className="w-4 h-px bg-slate-400"></div>
              <div className="w-4 h-px bg-slate-400"></div>
              <div className="w-4 h-px bg-slate-400"></div>
            </button>
          </div>
        </div>

        {menuOpen && (
          <div className="md:hidden border-t border-white/5 px-4 py-2 flex flex-col gap-0.5">
            {navItems.map(item => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className={`px-3 py-2 rounded text-sm font-medium ${
                  pathname.startsWith(item.href)
                    ? 'bg-white/10 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {item.label}
              </a>
            ))}
            <button onClick={handleLogout} className="text-right text-sm text-slate-400 px-3 py-2 hover:text-white">
              יציאה
            </button>
          </div>
        )}
      </nav>
    </>
  );
}
