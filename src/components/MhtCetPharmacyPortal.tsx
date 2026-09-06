import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft, Loader2, AlertCircle, X, Sparkles, Search,
  ChevronDown, Percent, MapPin, BookMarked, BookOpen,
  ServerCrash, Hash, ChevronRight, FlaskConical,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api, CollegeRecommendation } from '../services/api';import { useSEO } from '../seo/useSEO';

interface PharmacyPortalProps {
  onBack?: () => void;
  onRecommendationsReady: (results: CollegeRecommendation[], query: any) => void;
}

// ── Branch options ─────────────────────────────────────────────────────────
const PHARMACY_BRANCHES = [
  { label: 'B Pharmacy', value: 'B Pharmacy' },
  { label: 'D Pharmacy', value: 'D Pharmacy' },
];

// ── Grouped categories ─────────────────────────────────────────────────────
const CATEGORY_GROUPS = [
  {
    group: 'GOPEN — General Open',
    items: [
      { label: 'Open – State',       value: 'GOPENS' },
      { label: 'Open – Home Univ',   value: 'GOPENH' },
      { label: 'Open – Other Univ',  value: 'GOPENO' },
    ],
  },
  {
    group: 'LOPEN — Local Open',
    items: [
      { label: 'Open – State',       value: 'LOPENS' },
      { label: 'Open – Home Univ',   value: 'LOPENH' },
      { label: 'Open – Other Univ',  value: 'LOPENO' },
    ],
  },
  {
    group: 'GSC — General SC',
    items: [
      { label: 'SC – State',         value: 'GSCS' },
      { label: 'SC – Home Univ',     value: 'GSCH' },
      { label: 'SC – Other Univ',    value: 'GSCO' },
    ],
  },
  {
    group: 'LSC — Local SC',
    items: [
      { label: 'SC – State',         value: 'LSCS' },
      { label: 'SC – Home Univ',     value: 'LSCH' },
      { label: 'SC – Other Univ',    value: 'LSCO' },
    ],
  },
  {
    group: 'GST — General ST',
    items: [
      { label: 'ST – State',         value: 'GSTS' },
      { label: 'ST – Home Univ',     value: 'GSTH' },
      { label: 'ST – Other Univ',    value: 'GSTO' },
    ],
  },
  {
    group: 'LST — Local ST',
    items: [
      { label: 'ST – State',         value: 'LSTS' },
      { label: 'ST – Home Univ',     value: 'LSTH' },
      { label: 'ST – Other Univ',    value: 'LSTO' },
    ],
  },
  {
    group: 'GOBC — General OBC',
    items: [
      { label: 'OBC – State',        value: 'GOBCS' },
      { label: 'OBC – Home Univ',    value: 'GOBCH' },
      { label: 'OBC – Other Univ',   value: 'GOBCO' },
    ],
  },
  {
    group: 'LOBC — Local OBC',
    items: [
      { label: 'OBC – State',        value: 'LOBCS' },
      { label: 'OBC – Home Univ',    value: 'LOBCH' },
      { label: 'OBC – Other Univ',   value: 'LOBCO' },
    ],
  },
  {
    group: 'GSEBC — General SEBC',
    items: [
      { label: 'SEBC – State',       value: 'GSEBCS' },
      { label: 'SEBC – Home Univ',   value: 'GSEBCH' },
      { label: 'SEBC – Other Univ',  value: 'GSEBCO' },
    ],
  },
  {
    group: 'LSEBC — Local SEBC',
    items: [
      { label: 'SEBC – State',       value: 'LSEBCS' },
      { label: 'SEBC – Home Univ',   value: 'LSEBCH' },
      { label: 'SEBC – Other Univ',  value: 'LSEBCO' },
    ],
  },
  {
    group: 'GVJ — General VJ',
    items: [
      { label: 'VJ – State',         value: 'GVJS' },
      { label: 'VJ – Home Univ',     value: 'GVJH' },
      { label: 'VJ – Other Univ',    value: 'GVJO' },
    ],
  },
  {
    group: 'LVJ — Local VJ',
    items: [
      { label: 'VJ – State',         value: 'LVJS' },
      { label: 'VJ – Home Univ',     value: 'LVJH' },
      { label: 'VJ – Other Univ',    value: 'LVJO' },
    ],
  },
  {
    group: 'GNT — Nomadic Tribes',
    items: [
      { label: 'NT 1 – State',       value: 'GNT1S' },
      { label: 'NT 1 – Home Univ',   value: 'GNT1H' },
      { label: 'NT 1 – Other Univ',  value: 'GNT1O' },
      { label: 'NT 2 – State',       value: 'GNT2S' },
      { label: 'NT 2 – Home Univ',   value: 'GNT2H' },
      { label: 'NT 2 – Other Univ',  value: 'GNT2O' },
      { label: 'NT 3 – State',       value: 'GNT3S' },
      { label: 'NT 3 – Home Univ',   value: 'GNT3H' },
      { label: 'NT 3 – Other Univ',  value: 'GNT3O' },
    ],
  },
  {
    group: 'LNT — Local NT',
    items: [
      { label: 'NT 1 – State',       value: 'LNT1S' },
      { label: 'NT 1 – Home Univ',   value: 'LNT1H' },
      { label: 'NT 1 – Other Univ',  value: 'LNT1O' },
      { label: 'NT 2 – State',       value: 'LNT2S' },
      { label: 'NT 2 – Home Univ',   value: 'LNT2H' },
      { label: 'NT 2 – Other Univ',  value: 'LNT2O' },
      { label: 'NT 3 – State',       value: 'LNT3S' },
      { label: 'NT 3 – Home Univ',   value: 'LNT3H' },
      { label: 'NT 3 – Other Univ',  value: 'LNT3O' },
    ],
  },
  {
    group: 'EWS',
    items: [
      { label: 'Economically Weaker Section', value: 'EWS' },
    ],
  },
  {
    group: 'DEF — Defence',
    items: [
      { label: 'DEF – Open',   value: 'DEFOPENS'  },
      { label: 'DEF – RNT 2', value: 'DEFRNT2S'  },
      { label: 'DEF – OBC',   value: 'DEFROBCS'  },
      { label: 'DEF – SC',    value: 'DEFRSCS'   },
      { label: 'DEF – EBC',   value: 'DEFRSEBCS' },
    ],
  },
  {
    group: 'PWD — Persons with Disabilities',
    items: [
      { label: 'PWD – Open State',  value: 'PWDOPENS'  },
      { label: 'PWD – Open Home',   value: 'PWDOPENH'  },
      { label: 'PWD – OBC State',   value: 'PWDROBCS'  },
      { label: 'PWD – OBC Home',    value: 'PWDROBCH'  },
      { label: 'PWD – SC State',    value: 'PWDRSCS'   },
      { label: 'PWD – SC Home',     value: 'PWDRSCH'   },
      { label: 'PWD – SEBC State',  value: 'PWDRSEBCS' },
      { label: 'PWD – SEBC Home',   value: 'PWDRSEBCH' },
      { label: 'PWD – ST Home',     value: 'PWDRSTH'   },
      { label: 'PWD – VJ Home',     value: 'PWDRVJH'   },
    ],
  },
  {
    group: 'Special Categories',
    items: [
      { label: 'Minority (MI)',              value: 'MI'     },
      { label: 'Orphan',                     value: 'ORPHAN' },
      { label: 'Tuition Fee Waiver (TFWS)',  value: 'TFWS'   },
    ],
  },
];


const CAP_ROUNDS = [
  { label: 'Round I',   value: 'I'   },
  { label: 'Round II',  value: 'II'  },
  { label: 'Round III', value: 'III' },
];

// Districts from B Pharmacy CSV data
const DISTRICTS = [
  'All Maharashtra',
  'Ahmednagar',
  'Akola',
  'Amravati',
  'Beed',
  'Bhandara',
  'Buldhana',
  'Chandrapur',
  'Chhatrapati Sambhajinagar',
  'Dharashiv',
  'Dhule',
  'Gondia',
  'Hingoli',
  'Jalgaon',
  'Jalna',
  'Kolhapur',
  'Latur',
  'Mumbai',
  'Nagpur',
  'Nanded',
  'Nandurbar',
  'Nashik',
  'Palghar',
  'Parbhani',
  'Pune',
  'Raigad',
  'Ratnagiri',
  'Sangli',
  'Satara',
  'Silvassa',
  'Sindhudurg',
  'Solapur',
  'Thane',
  'Wardha',
  'Washim',
  'Yavatmal',
];

// ── Mobile detection ───────────────────────────────────────────────────────
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 640);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return isMobile;
}

// ── Category Selector (group dropdown + sub-category section) ─────────────
function CategorySelector({
  selected,
  onChange,
  disabled,
}: {
  selected: string;
  onChange: (val: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (isMobile) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isMobile]);

  useEffect(() => {
    if (isMobile && open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [isMobile, open]);

  // Active group object
  const activeGroup = CATEGORY_GROUPS.find(g => g.group === selectedGroup) ?? null;

  // Group dropdown list
  const GroupList = (
    <div className="overflow-y-auto">
      {CATEGORY_GROUPS.map(group => {
        const isActive = selectedGroup === group.group;
        const hasSelection = group.items.some(i => i.value === selected);
        return (
          <div
            key={group.group}
            onMouseDown={e => { if (!isMobile) e.preventDefault(); }}
            onClick={() => { setSelectedGroup(group.group); setOpen(false); }}
            className={`px-4 py-3 text-sm flex items-center justify-between cursor-pointer transition-colors select-none
              ${isActive ? 'bg-pink-500/20 text-pink-300' : 'text-slate-300 hover:bg-white/10'}`}
          >
            <span className="font-medium">{group.group}</span>
            {hasSelection && (
              <span className="text-[10px] px-2 py-0.5 bg-pink-500/30 text-pink-300 rounded-full font-semibold">✓</span>
            )}
          </div>
        );
      })}
    </div>
  );

  const Trigger = (
    <div
      onClick={() => !disabled && setOpen(o => !o)}
      className={`flex items-center justify-between w-full bg-pink-950/40 border border-white/10 rounded-xl px-4 py-3 cursor-pointer transition-all
        ${open && !isMobile ? 'border-pink-500/60' : 'hover:border-white/25'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <span className={`text-sm truncate ${!selectedGroup ? 'text-slate-500' : 'text-white'}`}>
        {selectedGroup ?? 'Select category'}
      </span>
      <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 ml-2 transition-transform ${open && !isMobile ? 'rotate-180' : ''}`} />
    </div>
  );

  // Desktop dropdown
  const Dropdown = (
    <AnimatePresence>
      {open && !isMobile && (
        <motion.div
          initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.15 }}
          className="absolute z-50 mt-1 w-full max-h-64 overflow-y-auto bg-[#1a0a14] border border-white/15 rounded-xl shadow-2xl"
        >
          {GroupList}
        </motion.div>
      )}
    </AnimatePresence>
  );

  // Mobile bottom sheet
  const MobileSheet = (
    <AnimatePresence>
      {open && isMobile && (
        <>
          <motion.div key="backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={() => setOpen(false)} />
          <motion.div key="sheet" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-[#1a0a14] border-t border-white/10 rounded-t-2xl flex flex-col"
            style={{ maxHeight: '80vh' }}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
              <span className="text-sm font-semibold text-white">Select Category</span>
              <button type="button" onClick={() => setOpen(false)}
                className="px-4 py-1.5 rounded-xl bg-pink-500 hover:bg-pink-400 text-white text-sm font-semibold">Done</button>
            </div>
            <div className="overflow-y-auto flex-1">{GroupList}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  return (
    <div>
      {/* Category group dropdown */}
      <div ref={ref} className="relative">
        {Trigger}
        {Dropdown}
        {MobileSheet}
      </div>

      {/* Sub Category — shown after a group is picked */}
      <AnimatePresence>
        {activeGroup && (
          <motion.div
            key={activeGroup.group}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className="mt-3"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Sub Category
                <span className="ml-2 text-pink-400 normal-case font-normal">— {activeGroup.group}</span>
              </span>
              {selected && activeGroup.items.some(i => i.value === selected) && (
                <button
                  type="button"
                  onClick={() => onChange('')}
                  className="text-[11px] text-slate-500 hover:text-red-400 transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {activeGroup.items.map(item => {
                const isSel = selected === item.value;
                return (
                  <button
                    key={item.value}
                    type="button"
                    disabled={disabled}
                    onClick={() => onChange(isSel ? '' : item.value)}
                    className={`flex flex-col items-start px-3 py-2.5 rounded-xl text-xs text-left transition-all border
                      ${isSel
                        ? 'bg-pink-500/20 border-pink-500/50 text-pink-300'
                        : 'bg-pink-950/30 border-white/[0.08] text-slate-400 hover:bg-pink-950/50 hover:border-pink-500/30 hover:text-slate-200'}`}
                  >
                    <span className="font-mono text-[10px] mb-0.5 opacity-60">{item.value}</span>
                    <span className="font-medium leading-tight">{item.label}</span>
                    {isSel && <span className="mt-1 text-[9px] text-pink-400 font-semibold">✓ Selected</span>}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Location MultiSelect (pink) ────────────────────────────────────────────
interface MultiSelectProps {
  placeholder: string;
  options: { label: string; value: string }[];
  selected: string[];
  onChange: (vals: string[]) => void;
  max?: number;
  disabled?: boolean;
}

function MultiSelect({ placeholder, options, selected, onChange, max = 99, disabled }: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (isMobile) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isMobile]);

  useEffect(() => {
    if (isMobile && open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [isMobile, open]);

  const filtered = query.trim()
    ? options.filter(o => o.label.toLowerCase().includes(query.toLowerCase()))
    : options;

  const toggle = useCallback((val: string) => {
    if (selected.includes(val)) onChange(selected.filter(v => v !== val));
    else if (selected.length < max) onChange([...selected, val]);
  }, [selected, onChange, max]);

  const displayText = selected.length === 0
    ? placeholder
    : selected.map(v => options.find(o => o.value === v)?.label ?? v).join(', ');

  const ListContent = (
    <>
      <div className="px-3 pt-2 pb-1 border-b border-white/10">
        <div className="flex items-center gap-2 bg-pink-950/60 rounded-lg px-3 py-1.5">
          <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <input autoFocus type="text" value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Search district..." className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-slate-500"
            onClick={e => e.stopPropagation()} />
          {query && <button type="button" onClick={() => setQuery('')} className="text-slate-400 hover:text-white"><X className="w-3.5 h-3.5" /></button>}
        </div>
      </div>
      {filtered.length === 0 && <div className="px-4 py-3 text-slate-500 text-sm">No results</div>}
      {filtered.map(opt => {
        const isSel = selected.includes(opt.value);
        const isDisabled = !isSel && selected.length >= max;
        return (
          <div key={opt.value}
            onMouseDown={e => { if (!isMobile) { e.preventDefault(); if (!isDisabled) toggle(opt.value); } }}
            onClick={() => { if (isMobile && !isDisabled) toggle(opt.value); }}
            className={`px-4 py-3 text-sm flex items-center justify-between transition-colors select-none
              ${isSel ? 'bg-pink-500/20 text-pink-300' : isDisabled ? 'text-slate-600 cursor-not-allowed' : 'text-slate-300 hover:bg-white/10 cursor-pointer'}`}>
            <span>{opt.label}</span>
            {isSel && <span className="text-pink-400 text-xs ml-2">✓</span>}
          </div>
        );
      })}
    </>
  );

  const Trigger = (
    <div onClick={() => !disabled && setOpen(o => !o)}
      className={`flex items-center justify-between w-full bg-pink-950/40 border border-white/10 rounded-xl px-4 py-3 cursor-pointer transition-all
        ${open && !isMobile ? 'border-pink-500/60' : 'hover:border-white/25'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
      <span className={`text-sm truncate ${selected.length === 0 ? 'text-slate-500' : 'text-white'}`}>{displayText}</span>
      <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 ml-2 transition-transform ${open && !isMobile ? 'rotate-180' : ''}`} />
    </div>
  );

  const Chips = selected.length > 0 ? (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {selected.map(val => {
        const label = options.find(o => o.value === val)?.label ?? val;
        return (
          <span key={val} className="flex items-center gap-1 px-2.5 py-1 bg-pink-500/20 text-pink-300 border border-pink-500/30 rounded-full text-xs font-medium">
            {label}
            <button type="button" onClick={() => toggle(val)} disabled={disabled} className="hover:text-white ml-0.5"><X className="w-3 h-3" /></button>
          </span>
        );
      })}
    </div>
  ) : null;

  if (isMobile) {
    return (
      <div>
        {Trigger}{Chips}
        <AnimatePresence>
          {open && (
            <>
              <motion.div key="backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={() => { setOpen(false); setQuery(''); }} />
              <motion.div key="sheet" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                className="fixed bottom-0 left-0 right-0 z-50 bg-[#1a0a14] border-t border-white/10 rounded-t-2xl flex flex-col" style={{ maxHeight: '80vh' }}>
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
                  <span className="text-sm font-semibold text-white">{placeholder} {max < 99 && <span className="text-xs text-slate-400">({selected.length}/{max})</span>}</span>
                  <button type="button" onClick={() => { setOpen(false); setQuery(''); }}
                    className="px-4 py-1.5 rounded-xl bg-pink-500 hover:bg-pink-400 text-white text-sm font-semibold transition-colors">Done</button>
                </div>
                <div className="overflow-y-auto flex-1">{ListContent}</div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div ref={ref} className="relative">
      {Trigger}{Chips}
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 mt-1 w-full max-h-56 overflow-y-auto bg-[#1a0a14] border border-white/15 rounded-xl shadow-2xl">
            {ListContent}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Rank → Percentile Converter ────────────────────────────────────────────
const TOTAL_CANDIDATES = 450000;

function RankToPercentileConverter({ onUsePercentile }: { onUsePercentile: (p: string) => void }) {
  const [open, setOpen] = useState(false);
  const [rankInput, setRankInput] = useState('');

  const computedPercentile = (() => {
    const rank = parseInt(rankInput, 10);
    if (!rankInput || isNaN(rank) || rank < 1 || rank > TOTAL_CANDIDATES) return null;
    return ((1 - rank / TOTAL_CANDIDATES) * 100).toFixed(2);
  })();

  const handleUse = () => {
    if (computedPercentile !== null) { onUsePercentile(computedPercentile); setOpen(false); }
  };

  return (
    <div className="rounded-xl border border-white/10 overflow-hidden">
      <button type="button" onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-pink-950/40 hover:bg-pink-950/60 transition-colors text-left">
        <span className="flex items-center gap-2 text-slate-400 text-sm">
          <Hash className="w-4 h-4 text-pink-500/70 shrink-0" />
          Don't know your percentile? Convert rank →
        </span>
        <ChevronRight className={`w-4 h-4 text-slate-500 shrink-0 transition-transform duration-200 ${open ? 'rotate-90' : ''}`} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div key="body" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }} className="overflow-hidden">
            <div className="px-4 pb-4 pt-3 bg-pink-950/20 space-y-3 border-t border-white/10">
              <p className="text-xs text-slate-500">Based on ~4.5 lakh total candidates. Formula: (1 − rank / 4,50,000) × 100</p>
              <div className="flex gap-2 items-start flex-wrap sm:flex-nowrap">
                <input type="number" min="1" max={TOTAL_CANDIDATES} step="1" value={rankInput}
                  onChange={e => setRankInput(e.target.value)} placeholder="Enter your rank (e.g. 5000)"
                  className="flex-1 bg-pink-950/60 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-pink-500/60 transition-colors" />
                {computedPercentile !== null && (
                  <div className="flex items-center gap-1.5 px-4 py-2.5 bg-pink-500/15 border border-pink-500/30 rounded-xl shrink-0">
                    <Percent className="w-3.5 h-3.5 text-pink-400" />
                    <span className="text-pink-300 font-bold text-sm tabular-nums">{computedPercentile}</span>
                  </div>
                )}
              </div>
              {computedPercentile !== null && (
                <motion.button type="button" onClick={handleUse} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-pink-500/20 hover:bg-pink-500/30 border border-pink-500/40 text-pink-300 hover:text-white text-sm font-medium transition-all">
                  <Sparkles className="w-3.5 h-3.5" /> Use this percentile ({computedPercentile})
                </motion.button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main Pharmacy Portal ───────────────────────────────────────────────────
export function MhtCetPharmacyPortal({ onRecommendationsReady }: PharmacyPortalProps) {
  const navigate = useNavigate();

  useSEO({
    title: 'MHT CET Pharmacy College Predictor 2025 – PCB Students | Uniscout',
    description: 'Enter your MHT CET 2025 PCB percentile, category, and preferred pharmacy branch to get instant college predictions.',
    canonical: 'https://www.uniscout.co.in/mht-cet/pharmacy',
  });

  const [formData, setFormData] = useState({
    percentile: '',
    year: '2025',
    capRound: 'I',
    category: '',
    branch: '',
    locations: [] as string[],
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showWarmupBanner, setShowWarmupBanner] = useState(false);

  const progress = (() => {
    let c = 0;
    if (formData.percentile !== '') c++;
    if (formData.category !== '') c++;
    if (formData.branch !== '') c++;
    if (formData.locations.length > 0) c++;
    return (c / 4) * 100;
  })();

  const locationOptions = DISTRICTS.map(d => ({ label: d, value: d === 'All Maharashtra' ? 'ALL' : d }));

  const handlePredict = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.branch) { setError('Please select a branch.'); return; }
    if (formData.locations.length === 0) { setError('Please select at least one location.'); return; }
    if (!formData.category) { setError('Please select a category.'); return; }
    setIsLoading(true); setError(null);
    const warmupTimer = setTimeout(() => setShowWarmupBanner(true), 3000);
    try {
      const allResults: CollegeRecommendation[] = [];
      const locationStr = formData.locations.includes('ALL') ? '' : formData.locations.join(',');
      let anyFallback = false;
      const resp = await api.getPharmacyRecommendations({
        percentile: parseFloat(formData.percentile),
        year: `${formData.year}-${String(parseInt(formData.year) + 1).slice(-2)}`,
        capRound: formData.capRound,
        category: formData.category,
        branchPreference: formData.branch,
        location: locationStr,
      });
      if (resp.success && resp.data) {
        allResults.push(...resp.data);
        if (resp.metadata?.location_fallback) anyFallback = true;
      }
      const seen = new Set<string>();
      const unique = allResults.filter(r => { if (seen.has(r.id)) return false; seen.add(r.id); return true; });
      onRecommendationsReady(unique, {
        percentile: parseFloat(formData.percentile),
        year: `${formData.year}-${String(parseInt(formData.year) + 1).slice(-2)}`,
        capRound: formData.capRound,
        category: formData.category,
        branchPreference: formData.branch,
        location: locationStr,
        locationFallback: anyFallback,
      });
      navigate('/results');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect to server.');
    } finally {
      clearTimeout(warmupTimer);
      setShowWarmupBanner(false);
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen px-4 py-8 relative z-10 w-full flex flex-col items-center">
      <div className="max-w-2xl w-full pt-[70px]">

        {/* Top bar */}
        <div className="flex items-center justify-between mb-8">
          <motion.button onClick={() => navigate('/mht-cet/select')}
            className="flex items-center gap-2 px-5 py-2 bg-pink-500/20 hover:bg-pink-500/30 border border-pink-400/40 rounded-xl text-pink-300 hover:text-white transition-all text-sm font-medium"
            whileHover={{ x: -3 }}>
            <ArrowLeft className="w-4 h-4" /> Back
          </motion.button>
          <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-1.5 sm:py-2 bg-white/5 border border-white/10 rounded-xl backdrop-blur-sm">
            <span className="text-slate-400 text-[11px] sm:text-xs font-medium">Progress</span>
            <div className="w-20 sm:w-28 h-1.5 bg-white/10 rounded-full overflow-hidden">
              <motion.div className="h-full bg-gradient-to-r from-pink-400 to-purple-500 rounded-full"
                initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 0.4 }} />
            </div>
            <span className="text-pink-400 text-[11px] sm:text-xs font-bold">{Math.round(progress)}%</span>
          </div>
        </div>

        {/* Title */}
        <motion.div className="text-center mb-8" initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center justify-center gap-3 mb-2">
            <FlaskConical className="w-7 h-7 text-pink-400" />
            <h1 className="text-4xl md:text-5xl font-black text-pink-400 tracking-tight">MHT CET Pharmacy</h1>
            <FlaskConical className="w-7 h-7 text-pink-400" />
          </div>
          <p className="text-slate-400 text-sm mb-3">Find your perfect pharmacy college · PCB Students</p>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/5 border border-white/10 rounded-full text-slate-400 text-xs">
            <span className="w-2 h-2 rounded-full bg-pink-400 animate-pulse inline-block" />
            Fill in your details to get personalized recommendations
          </div>
        </motion.div>

        {/* Form Card */}
        <motion.div className="bg-pink-950/20 backdrop-blur-md border border-pink-500/20 rounded-2xl p-6 md:p-8 shadow-2xl shadow-pink-950/30"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <form onSubmit={handlePredict} className="space-y-6">

            {/* Percentile */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-300">
                <Percent className="w-4 h-4 text-slate-400" /> Enter Your Percentile
              </label>
              <RankToPercentileConverter onUsePercentile={p => setFormData(prev => ({ ...prev, percentile: p }))} />
              <input type="number" min="0" max="100" step="0.01" required
                value={formData.percentile} onChange={e => setFormData(p => ({ ...p, percentile: e.target.value }))}
                placeholder="e.g. 85.5" disabled={isLoading}
                className="w-full bg-pink-950/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-pink-500/60 transition-colors" />
            </div>

            {/* CAP Round */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-300">
                <BookMarked className="w-4 h-4 text-slate-400" /> CAP Round Number
              </label>
              <div className="flex gap-2">
                {CAP_ROUNDS.map(r => (
                  <button key={r.value} type="button" disabled={isLoading}
                    onClick={() => setFormData(p => ({ ...p, capRound: r.value }))}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all border
                      ${formData.capRound === r.value
                        ? 'bg-pink-500 border-pink-400 text-white shadow-lg shadow-pink-900/40'
                        : 'bg-pink-950/40 border-white/10 text-slate-400 hover:border-white/25 hover:text-slate-200'}`}>
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Branch — toggle buttons, no multiselect */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-300">
                <BookOpen className="w-4 h-4 text-slate-400" /> Branch Preference
              </label>
              <div className="flex gap-3">
                {PHARMACY_BRANCHES.map(b => (
                  <button key={b.value} type="button" disabled={isLoading}
                    onClick={() => setFormData(p => ({ ...p, branch: b.value }))}
                    className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all border flex items-center justify-center gap-2
                      ${formData.branch === b.value
                        ? 'bg-pink-500 border-pink-400 text-white shadow-lg shadow-pink-900/40'
                        : 'bg-pink-950/40 border-white/10 text-slate-400 hover:border-pink-400/40 hover:text-pink-300'}`}>
                    <FlaskConical className="w-4 h-4" />
                    {b.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Category — grouped accordion, no multiselect */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-300">
                <BookOpen className="w-4 h-4 text-slate-400" /> Category
                {formData.category && (
                  <span className="text-pink-400 text-xs ml-auto font-normal">{formData.category}</span>
                )}
              </label>
              <CategorySelector
                selected={formData.category}
                onChange={val => setFormData(p => ({ ...p, category: val }))}
                disabled={isLoading}
              />
            </div>

            {/* Location */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-300">
                <MapPin className="w-4 h-4 text-slate-400" /> Preferred Location
                <span className="text-slate-500 text-xs ml-auto font-normal">
                  {formData.locations.includes('ALL') ? 'All Maharashtra' : `${formData.locations.length}/5 selected`}
                </span>
              </label>
              <MultiSelect placeholder="Select your preferred location" options={locationOptions}
                selected={formData.locations}
                onChange={vals => {
                  if (vals.includes('ALL') && !formData.locations.includes('ALL')) setFormData(p => ({ ...p, locations: ['ALL'] }));
                  else if (!vals.includes('ALL') && formData.locations.includes('ALL')) setFormData(p => ({ ...p, locations: vals.filter(v => v !== 'ALL') }));
                  else setFormData(p => ({ ...p, locations: vals.filter(v => v !== 'ALL') }));
                }}
                max={5} disabled={isLoading} />
            </div>

            {/* Warm-up banner */}
            <AnimatePresence>
              {showWarmupBanner && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                  className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex items-center gap-2.5 text-amber-300 text-sm">
                  <ServerCrash className="w-4 h-4 shrink-0" />
                  <span>Server is warming up (Render cold start ~30s). Retrying automatically — please wait...</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                  className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center gap-2 text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" />{error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit */}
            <motion.button type="submit" disabled={isLoading}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-400 hover:to-purple-500 text-white font-bold text-base transition-all disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg shadow-pink-900/30"
              whileHover={{ scale: isLoading ? 1 : 1.01 }} whileTap={{ scale: isLoading ? 1 : 0.99 }}>
              {isLoading
                ? (<><Loader2 className="w-5 h-5 animate-spin" />Finding colleges for you...</>)
                : (<><Sparkles className="w-5 h-5" />Find My Perfect Pharmacy Colleges<Sparkles className="w-5 h-5" /></>)}
            </motion.button>

          </form>
        </motion.div>
      </div>
    </main>
  );
}
