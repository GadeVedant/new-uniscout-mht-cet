import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Loader2, AlertCircle, X, Sparkles, Search, ChevronDown, Percent, MapPin, BookMarked, BookOpen } from 'lucide-react';
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

function MultiSelect({ placeholder, options, selected, onChange, max = 99, disabled, searchable }: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = searchable && query.trim()
    ? options.filter(o => o.label.toLowerCase().includes(query.toLowerCase()))
    : options;

  const toggle = (val: string) => {
    if (selected.includes(val)) onChange(selected.filter(v => v !== val));
    else if (selected.length < max) onChange([...selected, val]);
  };

  const displayText = selected.length === 0
    ? placeholder
    : selected.map(v => options.find(o => o.value === v)?.label ?? v).join(', ');

  return (
    <div ref={ref} className="relative">
      <div
        onClick={() => !disabled && setOpen(o => !o)}
        className={`flex items-center justify-between w-full bg-indigo-950/80 border border-white/10 rounded-xl px-4 py-3 cursor-pointer transition-all ${open ? 'border-cyan-500/60' : 'hover:border-white/25'} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <span className={`text-sm truncate ${selected.length === 0 ? 'text-slate-500' : 'text-white'}`}>{displayText}</span>
        <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 ml-2 transition-transform ${open ? 'rotate-180' : ''}`} />
      </div>

      {selected.length > 0 && (
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
      )}

      <AnimatePresence>
        {open && (
          <motion.ul
            initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 mt-1 w-full max-h-56 overflow-y-auto bg-indigo-950 border border-white/15 rounded-xl shadow-2xl"
          >
            {searchable && (
              <li className="sticky top-0 bg-indigo-950 px-3 pt-2 pb-1 border-b border-white/10">
                <div className="flex items-center gap-2 bg-indigo-900/60 rounded-lg px-3 py-1.5">
                  <Search className="w-3.5 h-3.5 text-slate-400" />
                  <input autoFocus type="text" value={query} onChange={e => setQuery(e.target.value)}
                    placeholder="Search..." className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-slate-500"
                    onClick={e => e.stopPropagation()} />
                </div>
              </li>
            )}
            {filtered.length === 0 && <li className="px-4 py-3 text-slate-500 text-sm">No results found</li>}
            {filtered.map(opt => {
              const isSel = selected.includes(opt.value);
              const isDisabled = !isSel && selected.length >= max;
              return (
                <li key={opt.value}
                  onMouseDown={e => { e.preventDefault(); if (!isDisabled) toggle(opt.value); }}
                  className={`px-4 py-2.5 text-sm cursor-pointer flex items-center justify-between transition-colors ${isSel ? 'bg-cyan-500/20 text-cyan-300' : isDisabled ? 'text-slate-600 cursor-not-allowed' : 'text-slate-300 hover:bg-white/10'}`}
                >
                  {opt.label}
                  {isSel && <span className="text-cyan-400 text-xs">✓</span>}
                </li>
              );
            })}
          </motion.ul>
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
    } finally { setIsLoading(false); }
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
                  if (vals.includes('ALL') && !formData.locations.includes('ALL')) setFormData(p => ({ ...p, locations: ['ALL'] }));
                  else setFormData(p => ({ ...p, locations: vals.filter(v => v !== 'ALL') }));
                }} max={5} disabled={isLoading} searchable />
            </div>

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
