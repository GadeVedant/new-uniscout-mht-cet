/**
 * Global Navbar — shown on all pages except HomePage (which has its own).
 * Fixed at top, 60px height, matches new design system.
 */
import { useState } from 'react';
import { Sparkles, Menu, X } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

const NAV_ITEMS = [
  { label: 'Home',         route: '/'           },
  { label: 'Predictor',    route: '/mht-cet'    },
  { label: 'Form Filling', route: '/smart-form' },
  { label: 'Compare',      route: '/compare'    },
];

export function Navbar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  // HomePage has its own navbar — don't render this one there
  if (pathname === '/') return null;

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/[0.06] bg-gradient-to-r from-[#4facfe] via-[#a78bfa] to-[#f093fb] backdrop-blur-2xl">
        <div className="max-w-7xl mx-auto px-4 flex items-center h-[60px] gap-4">
          {/* Logo */}
          <button onClick={() => { navigate('/'); setMenuOpen(false); }} className="flex items-center gap-2 shrink-0">
            <div className="size-7 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-[0_0_12px_rgba(90,135,239,0.5)]">
              <Sparkles className="size-3.5 text-white" />
            </div>
            <span className="text-sm font-bold tracking-tight text-white">Uniscout</span>
          </button>

          {/* Desktop Nav links */}
          <div className="hidden md:flex items-center gap-0.5 flex-1">
            {NAV_ITEMS.map(item => (
              <button key={item.route} onClick={() => navigate(item.route)}
                className={`px-3.5 py-1.5 rounded-lg text-[13px] font-semibold transition-all ${
                  pathname === item.route ? 'text-slate-900 bg-black/10' : 'text-slate-800 hover:text-slate-900 hover:bg-black/10'
                }`}>
                {item.label}
              </button>
            ))}
          </div>

          {/* Right */}
          <div className="flex items-center gap-2 ml-auto">
            <button className="size-8 rounded-lg hover:bg-black/10 flex items-center justify-center transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="size-4" fill="none" viewBox="0 0 24 24" stroke="#ffffff" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
            </button>
            <button onClick={() => navigate('/mht-cet')}
              className="hidden sm:flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-red-600 text-white text-[13px] font-medium hover:bg-red-500 transition-colors shadow-[0_0_16px_rgba(220,38,38,0.35)]">
              <Sparkles className="size-3.5" />
              Predict Now
            </button>
            {/* Hamburger */}
            <button onClick={() => setMenuOpen(o => !o)} className="md:hidden size-8 rounded-lg flex items-center justify-center text-white hover:bg-black/10 transition-colors">
              {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile dropdown menu */}
      {menuOpen && (
        <div className="fixed top-[60px] left-0 right-0 z-40 bg-gradient-to-b from-[#4facfe] to-[#a78bfa] border-b border-white/20 shadow-xl md:hidden">
          <div className="flex flex-col px-4 py-3 gap-1">
            {NAV_ITEMS.map(item => (
              <button key={item.route} onClick={() => { navigate(item.route); setMenuOpen(false); }}
                className={`px-4 py-3 rounded-xl text-left text-[14px] font-semibold transition-all ${
                  pathname === item.route ? 'bg-black/15 text-slate-900' : 'text-slate-800 hover:bg-black/10'
                }`}>
                {item.label}
              </button>
            ))}
            <button onClick={() => { navigate('/mht-cet'); setMenuOpen(false); }}
              className="mt-2 px-4 py-3 rounded-xl bg-red-600 text-white text-[14px] font-semibold text-center">
              Predict Now
            </button>
          </div>
        </div>
      )}
    </>
  );
}
