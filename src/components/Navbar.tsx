/**
 * Global Navbar — shown on all pages except HomePage (which has its own).
 * Fixed at top, 60px height, matches new design system.
 */
import { Sparkles } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

const NAV_ITEMS = [
  { label: 'Home',         route: '/'           },
  { label: 'MHT-CET',     route: '/mht-cet'    },
  { label: 'Form Filling', route: '/smart-form' },
  { label: 'Compare',      route: '/compare'    },
];

export function Navbar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // HomePage has its own navbar — don't render this one there
  if (pathname === '/') return null;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/[0.06] bg-background/75 backdrop-blur-2xl">
      <div className="max-w-7xl mx-auto px-5 flex items-center h-[60px] gap-6">
        {/* Logo */}
        <button onClick={() => navigate('/')} className="flex items-center gap-2.5 shrink-0">
          <div className="size-7 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-[0_0_12px_rgba(90,135,239,0.5)]">
            <Sparkles className="size-3.5 text-white" />
          </div>
          <span className="text-sm font-semibold tracking-tight">UniScout</span>
          <span className="hidden md:inline-block text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-blue-500/15 border border-blue-500/25 text-blue-400">BETA</span>
        </button>

        {/* Nav links */}
        <div className="hidden md:flex items-center gap-0.5 flex-1">
          {NAV_ITEMS.map(item => (
            <button
              key={item.route}
              onClick={() => navigate(item.route)}
              className={`px-3.5 py-1.5 rounded-lg text-[13px] font-medium transition-all ${
                pathname === item.route
                  ? 'text-foreground bg-white/10'
                  : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Predict CTA */}
        <div className="flex items-center gap-3 ml-auto">
          <button
            onClick={() => navigate('/mht-cet')}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-[13px] font-medium hover:opacity-90 transition-opacity shadow-[0_0_16px_rgba(90,135,239,0.35)]"
          >
            Predict Now
          </button>
        </div>
      </div>
    </nav>
  );
}
