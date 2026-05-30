/**
 * SmartFormPage — Task 8 (Smart Form Filling spec)
 * Full form with inline validation, progress indicator, duplicate branch
 * validation, district count enforcement, and result display via PreferenceList.
 */
import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Loader2, AlertCircle, DollarSign } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api, FormFillingRequest, FormFillingResponse } from '../services/api';
import { Slider } from './ui/slider';
import { MultiBranchSearch } from './BranchSearch';
import { PreferenceList } from './PreferenceList';
import { useSEO } from '../seo/useSEO';

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
const CAP_ROUNDS = ['I', 'II', 'III'];
const BRANCHES = [
  'artificial intelligence and data science',
  'artificial intelligence and machine learning',
  'civil engineering',
  'computer engineering',
  'computer science and engineering',
  'electrical engineering',
  'electronics and telecommunication engg',
  'information technology',
  'mechanical engineering',
];
const BRANCH_LABELS: Record<string, string> = {
  'artificial intelligence and data science': 'AI & Data Science',
  'artificial intelligence and machine learning': 'AI & Machine Learning',
  'civil engineering': 'Civil Engineering',
  'computer engineering': 'Computer Engineering',
  'computer science and engineering': 'Computer Science & Engineering',
  'electrical engineering': 'Electrical Engineering',
  'electronics and telecommunication engg': 'Electronics & Telecom',
  'information technology': 'Information Technology',
  'mechanical engineering': 'Mechanical Engineering',
};
const DISTRICTS = [
  'Ahmednagar', 'Akola', 'Amravati', 'Aurangabad', 'Beed',
  'Bhandara', 'Buldhana', 'Chandrapur', 'Dhule', 'Jalgaon',
  'Jalna', 'Kolhapur', 'Latur', 'Mumbai', 'Nagpur',
  'Nanded', 'Nandurbar', 'Nashik', 'Navi Mumbai', 'Osmanabad',
  'Palghar', 'Panvel', 'Parbhani', 'Pune', 'Raigad',
  'Ratnagiri', 'Sangli', 'Satara', 'Solapur', 'Thane',
  'Wardha', 'Washim', 'Yavatmal',
];

interface FormState {
  percentile: string;
  category: string;
  capRound: string;
  branchPreferences: string[];
  preferredDistricts: string[];
  priorityMode: 'branch' | 'college';
  budget: number;
}

const INITIAL_FORM: FormState = {
  percentile: '',
  category: 'GOPENS',
  capRound: 'I',
  branchPreferences: [],
  preferredDistricts: [],
  priorityMode: 'college',
  budget: 0,
};

// ── Progress indicator ────────────────────────────────────────────────────────
function ProgressIndicator({ form }: { form: FormState }) {
  const steps = [
    { label: 'Percentile', done: form.percentile !== '' && parseFloat(form.percentile) >= 0 && parseFloat(form.percentile) <= 100 },
    { label: 'Category', done: !!form.category },
    { label: 'Branch(es)', done: form.branchPreferences.length > 0 },
    { label: 'District(s)', done: form.preferredDistricts.length > 0 },
  ];
  const completed = steps.filter((s) => s.done).length;

  return (
    <div className="flex items-center gap-3 mb-8">
      {steps.map((step, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <div
            className={`w-2.5 h-2.5 rounded-full transition-colors ${
              step.done ? 'bg-cyan-400' : 'bg-white/20'
            }`}
          />
          <span className={`text-xs ${step.done ? 'text-cyan-300' : 'text-slate-500'}`}>
            {step.label}
          </span>
          {i < steps.length - 1 && <span className="text-slate-700 mx-1">·</span>}
        </div>
      ))}
      <span className="ml-auto text-xs text-slate-500">{completed}/{steps.length} required</span>
    </div>
  );
}

export function SmartFormPage() {
  const navigate = useNavigate();
  const resultsRef = useRef<HTMLDivElement>(null);

  useSEO({
    title: 'Smart CAP Form Filling – MHT CET Preference List Generator | UNISCOUT',
    description: 'Generate an optimized MHT CET CAP preference list with Safe, Target, and Dream picks. AI-ranked colleges based on your percentile, category, and branch preferences.',
    canonical: 'https://uniscout.co.in/smart-form',
  });

  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [result, setResult] = useState<FormFillingResponse | null>(null);
  const [request, setRequest] = useState<FormFillingRequest | undefined>(undefined);
  const [mlUnavailable, setMlUnavailable] = useState(false);
  const [budgetWarning, setBudgetWarning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Inline validation errors
  const [percentileError, setPercentileError] = useState<string | null>(null);
  const [branchError, setBranchError] = useState<string | null>(null);
  const [districtError, setDistrictError] = useState<string | null>(null);

  // ── Percentile validation ─────────────────────────────────────────────────
  const handlePercentileChange = (val: string) => {
    setForm((p) => ({ ...p, percentile: val }));
    const n = parseFloat(val);
    if (val !== '' && (isNaN(n) || n < 0 || n > 100)) {
      setPercentileError('Percentile must be between 0 and 100');
    } else {
      setPercentileError(null);
    }
  };

  // ── Branch toggle with duplicate guard ───────────────────────────────────
  const handleBranchToggle = (branch: string) => {
    setForm((p) => {
      if (p.branchPreferences.includes(branch)) {
        setBranchError(null);
        return { ...p, branchPreferences: p.branchPreferences.filter((b) => b !== branch) };
      }
      if (p.branchPreferences.length >= 5) {
        setBranchError('You can select up to 5 branches.');
        return p;
      }
      setBranchError(null);
      return { ...p, branchPreferences: [...p.branchPreferences, branch] };
    });
  };

  // ── District toggle with max-5 guard ─────────────────────────────────────
  const handleDistrictToggle = (district: string) => {
    setForm((p) => {
      if (p.preferredDistricts.includes(district)) {
        setDistrictError(null);
        return { ...p, preferredDistricts: p.preferredDistricts.filter((d) => d !== district) };
      }
      if (p.preferredDistricts.length >= 5) {
        setDistrictError('You can select up to 5 districts.');
        return p;
      }
      setDistrictError(null);
      return { ...p, preferredDistricts: [...p.preferredDistricts, district] };
    });
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate percentile
    const pct = parseFloat(form.percentile);
    if (isNaN(pct) || pct < 0 || pct > 100) {
      setPercentileError('Percentile must be between 0 and 100');
      return;
    }
    if (form.branchPreferences.length === 0) {
      setBranchError('Please select at least 1 branch preference.');
      return;
    }
    if (form.preferredDistricts.length === 0) {
      setDistrictError('Please select at least 1 district or choose All Maharashtra.');
      return;
    }

    setIsLoading(true);
    setError(null);

    const request: FormFillingRequest = {
      percentile: pct,
      category: form.category,
      capRound: form.capRound,
      branchPreferences: form.branchPreferences,
      preferredDistricts: form.preferredDistricts.includes('ALL') ? [] : form.preferredDistricts,
      priorityMode: form.priorityMode,
      budget: form.budget > 0 ? form.budget : undefined,
    };

    // Retry up to 3 times — handles Render cold start (server wakes up mid-request)
    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const response = await api.generateFormFillingList(request);
        if (response.success && response.data) {
          const total = response.data.safePicks.length + response.data.targetPicks.length + response.data.dreamPicks.length;
          // If empty on first attempt, wait and retry (cold start may still be loading data)
          if (total === 0 && attempt < 3) {
            await new Promise(r => setTimeout(r, 3000));
            continue;
          }
          setRequest(request);
          setResult(response.data);
          setMlUnavailable(response.metadata?.ml_unavailable ?? false);
          setBudgetWarning(response.metadata?.warning != null);
          setTimeout(() => { window.scrollTo({ top: 0, behavior: 'smooth' }); }, 100);
          setIsLoading(false);
          return;
        } else {
          lastError = new Error(response.error || 'Failed to generate list');
        }
      } catch (err) {
        lastError = err instanceof Error ? err : new Error('Failed to connect to server.');
        if (attempt < 3) await new Promise(r => setTimeout(r, 3000));
      }
    }
    setError(lastError?.message ?? 'Failed to generate list');
    setIsLoading(false);
  };

  // ── Result view ───────────────────────────────────────────────────────────
  if (result) {
    return (
      <div ref={resultsRef} className="min-h-screen pb-32 text-slate-300 w-full flex flex-col items-center">
        <PreferenceList
          result={result}
          request={request}
          mlUnavailable={mlUnavailable}
          budgetWarning={budgetWarning}
          onBack={() => setResult(null)}
        />
      </div>
    );
  }

  // ── Form view ─────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen px-4 py-8 relative z-10 w-full flex justify-center text-slate-300">
      <div className="max-w-3xl w-full">
        {/* Back button */}
        <header className="flex items-center mb-10">
          <button
            onClick={() => navigate(-1)}
            aria-label="Back to Home"
            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-slate-300 transition-all backdrop-blur-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Home</span>
          </button>
        </header>

        <div className="mb-8 text-center">
          <h1 className="text-4xl font-black bg-gradient-to-r from-blue-400 via-purple-400 to-emerald-400 bg-clip-text text-transparent mb-2">
            Smart Form Filling
          </h1>
          <p className="text-slate-400 text-lg">Generate an AI-optimized preference list ready for the portal</p>
        </div>

        {/* Progress indicator */}
        <ProgressIndicator form={form} />

        <motion.div
          className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 md:p-10 shadow-2xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <form onSubmit={handleGenerate} className="space-y-8" noValidate>

            {/* ── Academic Info ── */}
            <div className="grid md:grid-cols-2 gap-6 border-b border-white/10 pb-8">
              {/* Percentile */}
              <div className="space-y-2">
                <label htmlFor="percentile" className="block text-sm font-medium text-slate-200">
                  Percentile (0–100) <span className="text-red-400">*</span>
                </label>
                <input
                  id="percentile"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  required
                  value={form.percentile}
                  onChange={(e) => handlePercentileChange(e.target.value)}
                  className={`w-full bg-slate-900 border rounded-lg px-4 py-2.5 focus:outline-none text-white transition-colors ${
                    percentileError ? 'border-red-500 focus:border-red-400' : 'border-white/20 focus:border-cyan-500'
                  }`}
                  placeholder="95.50"
                  disabled={isLoading}
                  aria-describedby={percentileError ? 'percentile-error' : undefined}
                  aria-invalid={!!percentileError}
                />
                {percentileError && (
                  <p id="percentile-error" className="text-xs text-red-400 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {percentileError}
                  </p>
                )}
              </div>

              {/* Category */}
              <div className="space-y-2">
                <label htmlFor="category" className="block text-sm font-medium text-slate-200">
                  Category <span className="text-red-400">*</span>
                </label>
                <select
                  id="category"
                  value={form.category}
                  onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                  className="w-full bg-slate-900 border border-white/20 rounded-lg px-4 py-2.5 focus:border-cyan-500 outline-none text-white disabled:opacity-50 appearance-none"
                  disabled={isLoading}
                >
                  {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              {/* CAP Round always I — Cap 2/3 chances shown in results */}
            </div>

            {/* ── Branch Preferences ── */}
            <div className="space-y-3">
              <div className="flex justify-between items-end">
                <label className="block text-sm font-medium text-slate-200">
                  Branch Preferences (up to 5) <span className="text-red-400">*</span>
                </label>
                <span className="text-xs text-slate-500">{form.branchPreferences.length}/5</span>
              </div>
              <MultiBranchSearch
                selected={form.branchPreferences}
                onChange={(vals) => {
                  setForm((p) => ({ ...p, branchPreferences: vals }));
                  setBranchError(null);
                }}
                max={5}
                disabled={isLoading}
              />
              {branchError && (
                <p className="text-xs text-red-400 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {branchError}
                </p>
              )}
            </div>

            {/* ── District Preferences ── */}
            <div className="space-y-3 border-t border-white/10 pt-8">
              <div className="flex justify-between items-end">
                <label className="block text-sm font-medium text-slate-200">
                  Preferred Districts <span className="text-red-400">*</span>
                </label>
                <span className="text-xs text-slate-500">
                  {form.preferredDistricts.includes('ALL') ? 'All' : `${form.preferredDistricts.length}/5`}
                </span>
              </div>

              {/* All Maharashtra toggle */}
              <button
                type="button"
                disabled={isLoading}
                onClick={() => setForm(p => ({
                  ...p,
                  preferredDistricts: p.preferredDistricts.includes('ALL') ? [] : ['ALL']
                }))}
                className={`w-full px-4 py-2.5 rounded-xl text-sm font-semibold transition-all border ${
                  form.preferredDistricts.includes('ALL')
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                    : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10'
                }`}
              >
                🗺️ All Maharashtra (no district filter)
              </button>

              {/* District grid — hidden when All is selected */}
              {!form.preferredDistricts.includes('ALL') && (
                <div className="flex flex-wrap gap-2">
                  {DISTRICTS.map((d) => {
                    const isSelected = form.preferredDistricts.includes(d);
                    return (
                      <button
                        key={d}
                        type="button"
                        disabled={isLoading}
                        onClick={() => handleDistrictToggle(d)}
                        aria-pressed={isSelected}
                        className={`px-3 py-1.5 rounded-full text-sm transition-all border ${
                          isSelected
                            ? 'bg-purple-500/20 text-purple-300 border-purple-500/50'
                            : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10'
                        }`}
                      >
                        {d}
                      </button>
                    );
                  })}
                </div>
              )}
              {districtError && (
                <p className="text-xs text-amber-400 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {districtError}
                </p>
              )}
            </div>

            {/* ── Priority Mode ── */}
            <div className="border-t border-white/10 pt-8 space-y-4">
              <label className="block text-sm font-medium text-slate-200">Optimization Priority</label>
              <div className="grid md:grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, priorityMode: 'college' }))}
                  aria-pressed={form.priorityMode === 'college'}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    form.priorityMode === 'college'
                      ? 'bg-blue-500/20 border-blue-500/50'
                      : 'bg-white/5 border-white/10'
                  }`}
                >
                  <div className="font-bold text-white mb-1">Top College</div>
                  <div className="text-xs text-slate-400">
                    Prioritize the best ranked college, even if it means a lower preference branch.
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, priorityMode: 'branch' }))}
                  aria-pressed={form.priorityMode === 'branch'}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    form.priorityMode === 'branch'
                      ? 'bg-blue-500/20 border-blue-500/50'
                      : 'bg-white/5 border-white/10'
                  }`}
                >
                  <div className="font-bold text-white mb-1">Preferred Branch</div>
                  <div className="text-xs text-slate-400">
                    Prioritize your top branch choice, even at a lower ranked college.
                  </div>
                </button>
              </div>
            </div>

            {/* ── Budget ── */}
            <div className="space-y-4 pt-4">
              <div className="flex justify-between items-center">
                <label className="block text-sm font-medium text-slate-200 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-400" aria-hidden="true" />
                  Max Annual College Fees (optional)
                </label>
                <span className="text-emerald-400 font-bold">
                  {form.budget > 0 ? `₹${form.budget} Lakhs/Yr` : 'No Limit'}
                </span>
              </div>
              <Slider
                max={10}
                step={0.5}
                value={[form.budget]}
                onValueChange={(v: number[]) => setForm((p) => ({ ...p, budget: v[0] }))}
                aria-label="Maximum annual college fees in lakhs"
              />
            </div>

            {/* ── Error ── */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex items-center gap-3 text-red-400 text-sm"
                  role="alert"
                >
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <div>
                    <p>{error}</p>
                    <button
                      type="button"
                      onClick={() => setError(null)}
                      className="mt-1 underline text-red-300 hover:text-red-200 text-xs"
                    >
                      Try Again
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Submit ── */}
            <button
              type="submit"
              disabled={isLoading || !!percentileError}
              className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold rounded-xl px-4 py-4 transition-all shadow-lg flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-busy={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Generating your personalised preference list...
                </>              ) : (
                'Generate Form Filling List'
              )}
            </button>
          </form>
        </motion.div>
      </div>
    </main>
  );
}
