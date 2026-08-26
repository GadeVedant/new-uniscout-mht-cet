import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Loader2, AlertCircle, X, Sparkles, Search, ChevronDown, Percent, MapPin, BookMarked, BookOpen, ServerCrash, Hash, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api, CollegeRecommendation } from '../services/api';
import { useSEO } from '../seo/useSEO';
import { SchemaOrg, webPageSchema, howToSchema, faqSchema } from '../seo/SchemaOrg';
import { ALL_BRANCHES } from './BranchSearch';

interface MhtCetPortalProps {
  onBack?: () => void;
  onRecommendationsReady: (results: CollegeRecommendation[], query: any) => void;
}

const CATEGORIES = [
  { label: 'Open (General)', value: 'GOPENS' },
  { label: 'SC', value: 'GSCS' },
  { label: 'ST', value: 'GSTS' },
  { label: 'OBC', value: 'GOBCS' },
  { label: 'SEBC (EBC)', value: 'GSEBCS' },
  { label: 'EWS', value: 'EWS' },
  { label: 'TFWS', value: 'TFWS' },
  { label: 'NT1', value: 'GNT1S' },
  { label: 'NT2', value: 'GNT2S' },
  { label: 'NT3', value: 'GNT3S' },
  { label: 'VJ/DT', value: 'GVJS' },
];

const CAP_ROUNDS = [
  { label: 'Round I',   value: 'I'   },
  { label: 'Round II',  value: 'II'  },
  { label: 'Round III', value: 'III' },
];

const DISTRICTS = [
  'All Maharashtra',
  'Ahmednagar','Akola','Amravati','Aurangabad','Beed','Bhandara','Buldhana',
  'Chandrapur','Dhule','Gadhinglaj','Jalgaon','Jalna','Kolhapur','Latur','Mumbai',
  'Nagpur','Nanded','Nandurbar','Nashik','Navi Mumbai','Osmanabad','Palghar',
  'Panvel','Parbhani','Pune','Raigad','Ratnagiri','Sangli','Satara','Sindhudurg',
  'Solapur','Thane','Ulhasnagar','Vasai','Wardha','Washim','Yavatmal',
];

function toLabel(b: string) {
  return b.replace(/\b\w/g, c => c.toUpperCase());
}

// ── Reusable multiselect dropdown ────────────────────────────────────────────
interface MultiSelectProps {
  placeholder: string;
  options: { label: string; value: string }[];
  selected: string[];
  onChange: (vals: string[]) => void;
  max?: number;
  disabled?: boolean;
  searchable?: boolean;
}

// Detect if the user is on a small (mobile) screen
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 640);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return isMobile;
}

function MultiSelect({ placeholder, options, selected, onChange, max = 99, disabled, searchable }: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  // Close dropdown on outside click (desktop only)
  useEffect(() => {
    if (isMobile) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isMobile]);

  // Prevent body scroll when mobile sheet is open
  useEffect(() => {
    if (isMobile && open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isMobile, open]);

  const filtered = searchable && query.trim()
    ? options.filter(o => o.label.toLowerCase().includes(query.toLowerCase()))
    : options;

  const toggle = useCallback((val: string) => {
    if (selected.includes(val)) onChange(selected.filter(v => v !== val));
    else if (selected.length < max) onChange([...selected, val]);
  }, [selected, onChange, max]);

  const displayText = selected.length === 0
    ? placeholder
    : selected.map(v => options.find(o => o.value === v)?.label ?? v).join(', ');

  // ── Shared list content ──────────────────────────────────────────────────
  const ListContent = (
    <>
      {searchable && (
        <div className="px-3 pt-2 pb-1 border-b border-white/10 bg-inherit">
          <div className="flex items-center gap-2 bg-indigo-900/60 rounded-lg px-3 py-1.5">
            <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <input
              autoFocus
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search..."
              className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-slate-500"
              onClick={e => e.stopPropagation()}
            />
            {query && (
              <button type="button" onClick={() => setQuery('')} className="text-slate-400 hover:text-white">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}
      {filtered.length === 0 && <div className="px-4 py-3 text-slate-500 text-sm">No results found</div>}
      {filtered.map(opt => {
        const isSel = selected.includes(opt.value);
        const isDisabledOpt = !isSel && selected.length >= max;
        return (
          <div
            key={opt.value}
            onMouseDown={e => { if (!isMobile) { e.preventDefault(); if (!isDisabledOpt) toggle(opt.value); } }}
            onClick={() => { if (isMobile && !isDisabledOpt) toggle(opt.value); }}
            className={`px-4 py-3 text-sm flex items-center justify-between transition-colors select-none
              ${isSel ? 'bg-cyan-500/20 text-cyan-300' : isDisabledOpt ? 'text-slate-600 cursor-not-allowed' : 'text-slate-300 hover:bg-white/10 cursor-pointer active:bg-white/20'}`}
          >
            <span>{opt.label}</span>
            {isSel && <span className="text-cyan-400 text-xs ml-2 shrink-0">✓</span>}
          </div>
        );
      })}
    </>
  );

  // ── Trigger button ────────────────────────────────────────────────────────
  const Trigger = (
    <div
      onClick={() => !disabled && setOpen(o => !o)}
      className={`flex items-center justify-between w-full bg-indigo-950/80 border border-white/10 rounded-xl px-4 py-3 cursor-pointer transition-all
        ${open && !isMobile ? 'border-cyan-500/60' : 'hover:border-white/25'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <span className={`text-sm truncate ${selected.length === 0 ? 'text-slate-500' : 'text-white'}`}>{displayText}</span>
      <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 ml-2 transition-transform ${open && !isMobile ? 'rotate-180' : ''}`} />
    </div>
  );

  // ── Selected chips ────────────────────────────────────────────────────────
  const Chips = selected.length > 0 ? (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {selected.map(val => {
        const label = options.find(o => o.value === val)?.label ?? val;
        return (
          <span key={val} className="flex items-center gap-1 px-2.5 py-1 bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 rounded-full text-xs font-medium">
            {label}
            <button type="button" onClick={() => toggle(val)} disabled={disabled} className="hover:text-white ml-0.5">
              <X className="w-3 h-3" />
            </button>
          </span>
        );
      })}
    </div>
  ) : null;

  // ── Mobile: bottom sheet ──────────────────────────────────────────────────
  if (isMobile) {
    return (
      <div>
        {Trigger}
        {Chips}
        <AnimatePresence>
          {open && (
            <>
              {/* Backdrop */}
              <motion.div
                key="backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
                onClick={() => { setOpen(false); setQuery(''); }}
              />
              {/* Sheet */}
              <motion.div
                key="sheet"
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                className="fixed bottom-0 left-0 right-0 z-50 bg-indigo-950 border-t border-white/10 rounded-t-2xl flex flex-col"
                style={{ maxHeight: '80vh' }}
              >
                {/* Sheet header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
                  <span className="text-sm font-semibold text-white">
                    {placeholder}
                    {max < 99 && <span className="ml-2 text-xs text-slate-400">({selected.length}/{max})</span>}
                  </span>
                  <button
                    type="button"
                    onClick={() => { setOpen(false); setQuery(''); }}
                    className="px-4 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white text-sm font-semibold transition-colors"
                  >
                    Done
                  </button>
                </div>
                {/* Scrollable list */}
                <div className="overflow-y-auto flex-1">
                  {ListContent}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ── Desktop: dropdown ─────────────────────────────────────────────────────
  return (
    <div ref={ref} className="relative">
      {Trigger}
      {Chips}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 mt-1 w-full max-h-56 overflow-y-auto bg-indigo-950 border border-white/15 rounded-xl shadow-2xl"
          >
            {ListContent}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Rank → Percentile Converter ───────────────────────────────────────────────
const TOTAL_CANDIDATES = 450000;

interface RankConverterProps {
  onUsePercentile: (percentile: string) => void;
}

function RankToPercentileConverter({ onUsePercentile }: RankConverterProps) {
  const [open, setOpen] = useState(false);
  const [rankInput, setRankInput] = useState('');

  const computedPercentile = (() => {
    const rank = parseInt(rankInput, 10);
    if (!rankInput || isNaN(rank) || rank < 1 || rank > TOTAL_CANDIDATES) return null;
    return ((1 - rank / TOTAL_CANDIDATES) * 100).toFixed(2);
  })();

  const handleUse = () => {
    if (computedPercentile !== null) {
      onUsePercentile(computedPercentile);
      setOpen(false);
    }
  };

  return (
    <div className="rounded-xl border border-white/10 overflow-hidden">
      {/* Toggle header */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-indigo-950/60 hover:bg-indigo-950/80 transition-colors text-left"
      >
        <span className="flex items-center gap-2 text-slate-400 text-sm">
          <Hash className="w-4 h-4 text-cyan-500/70 shrink-0" />
          Don't know your percentile? Convert rank →
        </span>
        <ChevronRight
          className={`w-4 h-4 text-slate-500 shrink-0 transition-transform duration-200 ${open ? 'rotate-90' : ''}`}
        />
      </button>

      {/* Expandable body */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="converter-body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-3 bg-indigo-950/40 space-y-3 border-t border-white/10">
              <p className="text-xs text-slate-500">
                Based on ~4.5 lakh total candidates.{' '}
                <span className="text-slate-600">Formula: (1 − rank / 4,50,000) × 100</span>
              </p>

              <div className="flex gap-2 items-start flex-wrap sm:flex-nowrap">
                {/* Rank input */}
                <div className="flex-1 min-w-0">
                  <input
                    type="number"
                    min={1}
                    max={TOTAL_CANDIDATES}
                    step={1}
                    value={rankInput}
                    onChange={e => setRankInput(e.target.value)}
                    placeholder="Enter your rank (1 – 4,50,000)"
                    className="w-full bg-indigo-950/80 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/60 transition-colors"
                  />
                  {rankInput && !computedPercentile && (
                    <p className="mt-1 text-xs text-red-400">Enter a rank between 1 and 4,50,000</p>
                  )}
                </div>

                {/* Result badge */}
                {computedPercentile !== null && (
                  <div className="flex items-center gap-1.5 px-4 py-2.5 bg-cyan-500/15 border border-cyan-500/30 rounded-xl shrink-0">
                    <Percent className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="text-cyan-300 font-bold text-sm tabular-nums">{computedPercentile}</span>
                  </div>
                )}
              </div>

              {/* Use button */}
              {computedPercentile !== null && (
                <motion.button
                  type="button"
                  onClick={handleUse}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 hover:text-white text-sm font-medium transition-all"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Use this percentile ({computedPercentile})
                </motion.button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main Portal ───────────────────────────────────────────────────────────────
export function MhtCetPortal({ onRecommendationsReady }: MhtCetPortalProps) {
  const navigate = useNavigate();

  useSEO({
    title: 'MHT CET College Predictor 2025 – Enter Percentile & Get Results | Uniscout',
    description: 'Enter your MHT CET 2025 percentile, category, and branch to get instant college predictions.',
    canonical: 'https://www.uniscout.co.in/mht-cet/engineering',
  });

  const [formData, setFormData] = useState({
    percentile: '',
    year: '2025',
    capRound: 'I',
    categories: [] as string[],
    branchPreferences: [] as string[],
    locations: [] as string[],
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showWarmupBanner, setShowWarmupBanner] = useState(false);

  const progress = (() => {
    let c = 0;
    if (formData.percentile !== '') c++;
    if (formData.categories.length > 0) c++;
    if (formData.branchPreferences.length > 0) c++;
    if (formData.locations.length > 0) c++;
    return (c / 4) * 100;
  })();

  const branchOptions = ALL_BRANCHES.map(b => ({ label: toLabel(b), value: b }));
  const locationOptions = DISTRICTS.map(d => ({ label: d, value: d === 'All Maharashtra' ? 'ALL' : d }));

  const handlePredict = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.branchPreferences.length === 0) { setError('Please select at least one branch.'); return; }
    if (formData.locations.length === 0) { setError('Please select at least one location.'); return; }
    if (formData.categories.length === 0) { setError('Please select at least one category.'); return; }
    setIsLoading(true); setError(null);
    // Show warm-up banner if server takes > 5s (Render free tier cold start)
    const warmupTimer = setTimeout(() => setShowWarmupBanner(true), 5000);
    try {
      const allResults: CollegeRecommendation[] = [];
      const locationStr = formData.locations.includes('ALL') ? '' : formData.locations.join(',');
      let anyFallback = false;
      for (const category of formData.categories) {
        for (const branch of formData.branchPreferences) {
          const resp = await api.getRecommendations({
            percentile: parseFloat(formData.percentile),
            year: `${formData.year}-${String(parseInt(formData.year) + 1).slice(-2)}`,
            capRound: formData.capRound,
            category, branchPreference: branch, location: locationStr,
          });
          if (resp.success && resp.data) { allResults.push(...resp.data); if (resp.metadata?.location_fallback) anyFallback = true; }
        }
      }
      const seen = new Set<string>();
      const unique = allResults.filter(r => { if (seen.has(r.id)) return false; seen.add(r.id); return true; });
      onRecommendationsReady(unique, {
        percentile: parseFloat(formData.percentile),
        year: `${formData.year}-${String(parseInt(formData.year) + 1).slice(-2)}`,
        capRound: formData.capRound,
        category: formData.categories.join(', '),
        branchPreference: formData.branchPreferences.join(', '),
        location: locationStr, locationFallback: anyFallback,
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
      <SchemaOrg id="mhtcet-webpage" schema={webPageSchema({ name: 'MHT CET College Predictor 2025', description: 'Enter your MHT CET 2025 percentile, category, and branch to get AI-powered college predictions.', url: 'https://www.uniscout.co.in/mht-cet/engineering', breadcrumbs: [{ name: 'Home', url: 'https://www.uniscout.co.in/' }, { name: 'MHT CET Predictor', url: 'https://www.uniscout.co.in/mht-cet/engineering' }] })} />
      <SchemaOrg id="mhtcet-faq" schema={faqSchema([
        { question: 'What percentile do I need for VJTI Mumbai Computer Engineering?', answer: 'You typically need above 99.5 percentile for VJTI Mumbai Computer Engineering (Open category).' },
        { question: 'How accurate is the MHT CET college predictor?', answer: "Uniscout's predictor uses 4 years of CAP cutoff data with a LightGBM model." },
      ])} />

      <div className="max-w-2xl w-full pt-[70px]">

        {/* Top bar */}
        <div className="flex items-center justify-between mb-8">
          <motion.button
            onClick={() => navigate('/mht-cet/select')}
            className="flex items-center gap-2 px-5 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 rounded-xl text-cyan-300 hover:text-white transition-all text-sm font-medium"
            whileHover={{ x: -3 }}
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </motion.button>

          <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-1.5 sm:py-2 bg-white/5 border border-white/10 rounded-xl backdrop-blur-sm">
            <span className="text-slate-400 text-[11px] sm:text-xs font-medium">Progress</span>
            <div className="w-20 sm:w-28 h-1.5 bg-white/10 rounded-full overflow-hidden">
              <motion.div className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full" initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 0.4 }} />
            </div>
            <span className="text-cyan-400 text-[11px] sm:text-xs font-bold">{Math.round(progress)}%</span>
          </div>
        </div>

        {/* Title */}
        <motion.div className="text-center mb-8" initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center justify-center gap-3 mb-2">
            <Sparkles className="w-7 h-7 text-cyan-400" />
            <h1 className="text-4xl md:text-5xl font-black text-cyan-400 tracking-tight">MHT CET Portal</h1>
            <Sparkles className="w-7 h-7 text-cyan-400" />
          </div>
          <p className="text-slate-400 text-sm mb-3">Find your perfect engineering college</p>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/5 border border-white/10 rounded-full text-slate-400 text-xs">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse inline-block" />
            Fill in your details to get personalized recommendations
          </div>
        </motion.div>

        {/* Form Card */}
        <motion.div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 md:p-8 shadow-2xl" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <form onSubmit={handlePredict} className="space-y-6">

            {/* Row 1: Percentile */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-300">
                <Percent className="w-4 h-4 text-slate-400" /> Enter Your Percentile
              </label>

              {/* Rank → Percentile converter helper */}
              <RankToPercentileConverter
                onUsePercentile={p => setFormData(prev => ({ ...prev, percentile: p }))}
              />

              <input type="number" min="0" max="100" step="0.01" required
                value={formData.percentile} onChange={e => setFormData(p => ({ ...p, percentile: e.target.value }))}
                placeholder="e.g. 95.5" disabled={isLoading}
                className="w-full bg-indigo-950/80 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/60 transition-colors"
              />
            </div>

            {/* Row 2: CAP Round + Category */}
            <div className="grid md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-300">
                  <BookMarked className="w-4 h-4 text-slate-400" /> CAP Round Number
                </label>
                <div className="flex gap-2">
                  {CAP_ROUNDS.map(r => (
                    <button key={r.value} type="button" disabled={isLoading}
                      onClick={() => setFormData(p => ({ ...p, capRound: r.value }))}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all border ${formData.capRound === r.value ? 'bg-cyan-500 border-cyan-400 text-white shadow-lg shadow-cyan-900/40' : 'bg-indigo-950/80 border-white/10 text-slate-400 hover:border-white/25 hover:text-slate-200'}`}>
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-300">
                  <BookOpen className="w-4 h-4 text-slate-400" /> Category
                  <span className="text-slate-500 text-xs ml-auto font-normal">{formData.categories.length} selected</span>
                </label>
                <MultiSelect placeholder="Select category" options={CATEGORIES} selected={formData.categories}
                  onChange={vals => setFormData(p => ({ ...p, categories: vals }))} max={CATEGORIES.length} disabled={isLoading} />
              </div>
            </div>

            {/* Branch Preference */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-300">
                <BookOpen className="w-4 h-4 text-slate-400" /> Branch Preference
                <span className="text-slate-500 text-xs ml-auto font-normal">{formData.branchPreferences.length}/5 selected</span>
              </label>
              <MultiSelect placeholder="Select your preferred branch" options={branchOptions} selected={formData.branchPreferences}
                onChange={vals => setFormData(p => ({ ...p, branchPreferences: vals }))} max={5} disabled={isLoading} searchable />
            </div>

            {/* Preferred Location */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-300">
                <MapPin className="w-4 h-4 text-slate-400" /> Preferred Location
                <span className="text-slate-500 text-xs ml-auto font-normal">
                  {formData.locations.includes('ALL') ? 'All Maharashtra' : `${formData.locations.length}/5 selected`}
                </span>
              </label>
              <MultiSelect placeholder="Select your preferred location" options={locationOptions} selected={formData.locations}
                onChange={vals => {
                  if (vals.includes('ALL') && !formData.locations.includes('ALL')) {
                    // User just selected "All Maharashtra" — clear everything else
                    setFormData(p => ({ ...p, locations: ['ALL'] }));
                  } else if (!vals.includes('ALL') && formData.locations.includes('ALL')) {
                    // User deselected "All Maharashtra" — keep whatever else they picked
                    setFormData(p => ({ ...p, locations: vals.filter(v => v !== 'ALL') }));
                  } else {
                    // Normal multi-select change — strip ALL to avoid mixed state
                    setFormData(p => ({ ...p, locations: vals.filter(v => v !== 'ALL') }));
                  }
                }} max={5} disabled={isLoading} searchable />
            </div>

            {/* Warm-up banner — shown after 5s of loading */}
            <AnimatePresence>
              {showWarmupBanner && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex items-center gap-2.5 text-amber-300 text-sm"
                >
                  <ServerCrash className="w-4 h-4 shrink-0" />
                  <span>Server is warming up — this takes ~30 seconds on first request. Please wait...</span>
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
              className="w-full py-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-base transition-all disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg shadow-cyan-900/30"
              whileHover={{ scale: isLoading ? 1 : 1.01 }} whileTap={{ scale: isLoading ? 1 : 0.99 }}>
              {isLoading ? (<><Loader2 className="w-5 h-5 animate-spin" />Finding colleges for you...</>) : (<><Sparkles className="w-5 h-5" />Find My Perfect Colleges<Sparkles className="w-5 h-5" /></>)}
            </motion.button>

          </form>
        </motion.div>
      </div>
    </main>
  );
}
