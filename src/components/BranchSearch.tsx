/**
 * BranchSearch — searchable branch picker.
 * Supports single-select (MhtCetPortal) and multi-select (SmartFormPage).
 */
import { useState, useRef, useEffect } from 'react';
import { Search, X, ChevronDown } from 'lucide-react';

// All branches from CAP 2025 data
export const ALL_BRANCHES = [
  '5g',
  'aeronautical engineering',
  'agricultural engineering',
  'artificial intelligence',
  'artificial intelligence (ai) and data science',
  'artificial intelligence and data science',
  'artificial intelligence and machine learning',
  'automation and robotics',
  'automobile engineering',
  'bio medical engineering',
  'bio technology',
  'chemical engineering',
  'civil and environmental engineering',
  'civil and infrastructure engineering',
  'civil engineering',
  'civil engineering (structural engineering)',
  'civil engineering and planning',
  'civil engineering with computer application',
  'computer engineering',
  'computer engineering (regional language)',
  'computer engineering (software engineering)',
  'computer science',
  'computer science and business systems',
  'computer science and design',
  'computer science and engineering',
  'computer science and engineering (artificial intelligence and data science)',
  'computer science and engineering (artificial intelligence)',
  'computer science and engineering (cyber security)',
  'computer science and engineering (internet of things and cyber security including block chain',
  'computer science and engineering (iot)',
  'computer science and engineering(artificial intelligence and machine learning)',
  'computer science and engineering(cyber security)',
  'computer science and engineering(data science)',
  'computer science and information technology',
  'computer science and technology',
  'computer technology',
  'cyber security',
  'data science',
  'dyestuff technology',
  'electrical and computer engineering',
  'electrical and electronics engineering',
  'electrical engg[electronics and power]',
  'electrical engineering',
  'electrical, electronics and power',
  'electronics & telecommunication engineering',
  'electronics and biomedical engineering',
  'electronics and communication (advanced communication technology)',
  'electronics and communication engineering',
  'electronics and communication engineering (bio-medical engineering)',
  'electronics and communication(advanced communication technology)',
  'electronics and computer engineering',
  'electronics and computer science',
  'electronics and telecommunication engg',
  'electronics engineering',
  'electronics engineering ( vlsi design and technology)',
  'fashion technology',
  'fibres and textile processing technology',
  'food engineering',
  'food engineering and technology',
  'food technology',
  'food technology and management',
  'industrial iot',
  'information technology',
  'instrumentation and control engineering',
  'instrumentation engineering',
  'internet of things (iot)',
  'man made textile technology',
  'manufacturing science and engineering',
  'mechanical & automation engineering',
  'mechanical and automation engineering',
  'mechanical and mechatronics engineering (additive manufacturing)',
  'mechanical and rail engineering',
  'mechanical engineering',
  'mechanical engineering automobile',
  'mechanical engineering[sandwich]',
  'mechatronics engineering',
  'metallurgy and material technology',
  'mining engineering',
  'oil and paints technology',
  'oil fats and waxes technology',
  'oil technology',
  'oil,oleochemicals and surfactants technology',
  'paints technology',
  'paper and pulp technology',
  'petro chemical engineering',
  'pharmaceutical and fine chemical technology',
  'pharmaceuticals chemistry and technology',
  'plastic and polymer engineering',
  'plastic technology',
  'polymer engineering and technology',
  'printing and packing technology',
  'production engineering',
  'production engineering[sandwich]',
  'robotics and artificial intelligence',
  'robotics and automation',
  'safety and fire engineering',
  'structural engineering',
  'surface coating technology',
  'technical textiles',
  'textile chemistry',
  'textile engineering / technology',
  'textile technology',
  'vlsi',
];

function toLabel(b: string) {
  return b.replace(/\b\w/g, (c) => c.toUpperCase());
}

// ── Single-select variant (for MhtCetPortal) ─────────────────────────────────
interface SingleBranchSearchProps {
  value: string;
  onChange: (val: string) => void;
  disabled?: boolean;
  required?: boolean;
}

export function SingleBranchSearch({ value, onChange, disabled, required }: SingleBranchSearchProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const filtered = query.trim()
    ? ALL_BRANCHES.filter((b) => b.includes(query.toLowerCase().trim()))
    : ALL_BRANCHES;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <div
        className={`flex items-center gap-2 w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2.5 cursor-pointer ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-cyan-500/50'}`}
        onClick={() => !disabled && setOpen((o) => !o)}
      >
        <Search className="w-4 h-4 text-slate-400 shrink-0" />
        <input
          type="text"
          value={open ? query : (value ? toLabel(value) : '')}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Search branch..."
          disabled={disabled}
          required={required}
          className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-slate-500 min-w-0"
          onClick={(e) => e.stopPropagation()}
        />
        {value && !open && (
          <button type="button" onClick={(e) => { e.stopPropagation(); onChange(''); setQuery(''); }}
            className="text-slate-500 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
        <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </div>

      {open && (
        <ul className="absolute z-50 mt-1 w-full max-h-56 overflow-y-auto bg-slate-900 border border-white/20 rounded-xl shadow-2xl">
          {filtered.length === 0 && (
            <li className="px-4 py-3 text-slate-500 text-sm">No branches found</li>
          )}
          {filtered.map((b) => (
            <li key={b}
              className={`px-4 py-2.5 text-sm cursor-pointer transition-colors ${value === b ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-300 hover:bg-white/10'}`}
              onMouseDown={(e) => { e.preventDefault(); onChange(b); setQuery(''); setOpen(false); }}
            >
              {toLabel(b)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Multi-select variant (for SmartFormPage) ──────────────────────────────────
interface MultiBranchSearchProps {
  selected: string[];
  onChange: (vals: string[]) => void;
  max?: number;
  disabled?: boolean;
}

export function MultiBranchSearch({ selected, onChange, max = 5, disabled }: MultiBranchSearchProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const filtered = query.trim()
    ? ALL_BRANCHES.filter((b) => b.includes(query.toLowerCase().trim()) && !selected.includes(b))
    : ALL_BRANCHES.filter((b) => !selected.includes(b));

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const add = (b: string) => {
    if (selected.length < max) onChange([...selected, b]);
    setQuery('');
  };

  const remove = (b: string) => onChange(selected.filter((s) => s !== b));

  return (
    <div ref={ref} className="space-y-2">
      {/* Selected tags */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selected.map((b, i) => (
            <span key={b} className="flex items-center gap-1.5 px-3 py-1 bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 rounded-full text-xs font-semibold">
              <span className="text-cyan-400 font-black">#{i + 1}</span>
              {toLabel(b)}
              <button type="button" onClick={() => remove(b)} disabled={disabled}
                className="text-cyan-400/60 hover:text-cyan-300 ml-0.5">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Search input */}
      {selected.length < max && (
        <div className="relative">
          <div className={`flex items-center gap-2 w-full bg-slate-900 border border-white/20 rounded-lg px-3 py-2.5 ${disabled ? 'opacity-50' : 'hover:border-cyan-500/50'}`}>
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
              onFocus={() => setOpen(true)}
              placeholder={selected.length === 0 ? 'Search and add branches...' : `Add more (${selected.length}/${max})`}
              disabled={disabled}
              className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-slate-500"
            />
          </div>

          {open && (
            <ul className="absolute z-50 mt-1 w-full max-h-56 overflow-y-auto bg-slate-900 border border-white/20 rounded-xl shadow-2xl">
              {filtered.length === 0 && (
                <li className="px-4 py-3 text-slate-500 text-sm">No branches found</li>
              )}
              {filtered.map((b) => (
                <li key={b}
                  className="px-4 py-2.5 text-sm text-slate-300 hover:bg-white/10 cursor-pointer transition-colors"
                  onMouseDown={(e) => { e.preventDefault(); add(b); setOpen(false); }}
                >
                  {toLabel(b)}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
