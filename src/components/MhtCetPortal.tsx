import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Loader2, AlertCircle, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { MhtCetFormData } from '../App';
import { api, CollegeRecommendation } from '../services/api';
import { Slider } from './ui/slider';
import { MultiBranchSearch } from './BranchSearch';
import { useSEO } from '../seo/useSEO';

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

const CURRENT_YEAR = '2025-26';

const DISTRICTS = [
  'Ahmednagar', 'Akola', 'Amravati', 'Aurangabad', 'Beed',
  'Bhandara', 'Buldhana', 'Chandrapur', 'Dhule', 'Gadhinglaj',
  'Jalgaon', 'Jalna', 'Kolhapur', 'Latur', 'Mumbai',
  'Nagpur', 'Nanded', 'Nandurbar', 'Nashik', 'Navi Mumbai',
  'Osmanabad', 'Palghar', 'Panvel', 'Parbhani', 'Pune',
  'Raigad', 'Ratnagiri', 'Sangli', 'Satara', 'Sindhudurg',
  'Solapur', 'Thane', 'Ulhasnagar', 'Vasai', 'Wardha',
  'Washim', 'Yavatmal',
];

export function MhtCetPortal({ onRecommendationsReady }: MhtCetPortalProps) {
  const navigate = useNavigate();

  useSEO({
    title: 'MHT CET College Predictor – Enter Your Percentile | UNISCOUT',
    description: 'Enter your MHT CET percentile, category, and branch to get AI-powered college recommendations with cutoff trends and admission probability bands.',
    canonical: 'https://uniscout.in/mht-cet',
  });

  const [formData, setFormData] = useState<MhtCetFormData>({
    percentile: '',
    year: CURRENT_YEAR,
    capRound: 'I',
    category: 'GOPENS',
    branchPreferences: [],
    locations: [],
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calculateProgress = () => {
    let completed = 0;
    if (formData.percentile !== '') completed++;
    if (formData.category) completed++;
    if (formData.branchPreferences.length > 0) completed++;
    if (formData.locations.length > 0) completed++;
    return (completed / 4) * 100;
  };

  const toggleLocation = (loc: string) => {
    setFormData(p => {
      if (p.locations.includes(loc)) return { ...p, locations: p.locations.filter(l => l !== loc) };
      if (p.locations.length >= 5) return p;
      return { ...p, locations: [...p.locations, loc] };
    });
  };

  const handlePredict = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.branchPreferences.length === 0) {
      setError('Please select at least one branch.');
      return;
    }
    if (formData.locations.length === 0) {
      setError('Please select at least one district or choose All Maharashtra.');
      return;
    }
    setIsLoading(true);
    setError(null);

    try {
      // Send one request per branch, merge results
      const allResults: CollegeRecommendation[] = [];
      const locationStr = formData.locations.includes('ALL') ? '' : formData.locations.join(',');

      for (const branch of formData.branchPreferences) {
        const requestPayload = {
          percentile: parseFloat(formData.percentile),
          year: formData.year,
          capRound: formData.capRound,
          category: formData.category,
          branchPreference: branch,
          location: locationStr,
        };
        const response = await api.getRecommendations(requestPayload);
        if (response.success && response.data) {
          allResults.push(...response.data);
        }
      }

      // Dedup by id, keep unique
      const seen = new Set<string>();
      const unique = allResults.filter(r => {
        if (seen.has(r.id)) return false;
        seen.add(r.id);
        return true;
      });

      const queryMeta = {
        percentile: parseFloat(formData.percentile),
        year: formData.year,
        capRound: formData.capRound,
        category: formData.category,
        branchPreference: formData.branchPreferences.join(', '),
        location: locationStr,
        locationFallback: false,
      };

      onRecommendationsReady(unique, queryMeta);
      navigate('/results');
    } catch (err) {
      console.error('API Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to connect to server.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen px-4 py-8 relative z-10 w-full flex justify-center">
      <div className="max-w-3xl w-full">
        {/* Header */}
        <header className="flex items-center justify-between mb-8">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-slate-300 transition-all backdrop-blur-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Home</span>
          </button>
          <div className="hidden md:flex items-center gap-3">
            <span className="text-slate-400 text-sm">Progress</span>
            <div className="w-32 h-2 bg-white/10 rounded-full overflow-hidden">
              <motion.div className="h-full bg-cyan-500" initial={{ width: 0 }} animate={{ width: `${calculateProgress()}%` }} />
            </div>
          </div>
        </header>

        <div className="mb-10 text-center">
          <h1 className="text-4xl font-bold text-white mb-2">MHT-CET Predictor</h1>
          <p className="text-slate-400">Enter your details to find best matching colleges</p>
        </div>

        <motion.div
          className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 md:p-10 shadow-xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <form onSubmit={handlePredict} className="space-y-8">

            {/* Percentile */}
            <div className="space-y-4">
              <label className="block text-sm font-medium text-slate-200">Percentile (0–100) <span className="text-red-400">*</span></label>
              <div className="flex gap-4 items-center">
                <Slider
                  max={100} step={0.01}
                  value={[parseFloat(formData.percentile) || 0]}
                  onValueChange={(vals: number[]) => setFormData(p => ({ ...p, percentile: vals[0].toString() }))}
                  className="flex-1"
                />
                <input
                  type="number" min="0" max="100" step="0.01" required
                  value={formData.percentile}
                  onChange={(e) => setFormData(p => ({ ...p, percentile: e.target.value }))}
                  className="w-24 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                  placeholder="95.50" disabled={isLoading}
                />
              </div>
            </div>

            {/* Category */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-200">Category <span className="text-red-400">*</span></label>
              <select
                required value={formData.category}
                onChange={(e) => setFormData(p => ({ ...p, category: e.target.value }))}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-cyan-500 appearance-none disabled:opacity-50"
                disabled={isLoading}
              >
                {CATEGORIES.map(c => <option key={c.value} value={c.value} className="bg-slate-900">{c.label}</option>)}
              </select>
            </div>

            {/* Branch Preferences — up to 5 */}
            <div className="space-y-2">
              <div className="flex justify-between items-end">
                <label className="block text-sm font-medium text-slate-200">Branch Preferences (up to 5) <span className="text-red-400">*</span></label>
                <span className="text-xs text-slate-500">{formData.branchPreferences.length}/5</span>
              </div>
              <MultiBranchSearch
                selected={formData.branchPreferences}
                onChange={(vals) => setFormData(p => ({ ...p, branchPreferences: vals }))}
                max={5}
                disabled={isLoading}
              />
            </div>

            {/* Locations — up to 5 or All Maharashtra */}
            <div className="space-y-3">
              <div className="flex justify-between items-end">
                <div>
                  <label className="block text-sm font-medium text-slate-200">Preferred Districts <span className="text-red-400">*</span></label>
                  <p className="text-xs text-slate-500 mt-0.5">Select specific districts or choose All Maharashtra</p>
                </div>
                <span className="text-xs text-slate-500">
                  {formData.locations.includes('ALL') ? 'All' : `${formData.locations.length}/5`}
                </span>
              </div>

              {/* All Maharashtra toggle */}
              <button
                type="button"
                onClick={() => setFormData(p => ({
                  ...p,
                  locations: p.locations.includes('ALL') ? [] : ['ALL']
                }))}
                disabled={isLoading}
                className={`w-full px-4 py-2.5 rounded-xl text-sm font-semibold transition-all border ${
                  formData.locations.includes('ALL')
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                    : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10'
                }`}
              >
                🗺️ All Maharashtra (no district filter)
              </button>

              {/* Selected tags */}
              {!formData.locations.includes('ALL') && formData.locations.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.locations.map(loc => (
                    <span key={loc} className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-full text-xs font-semibold">
                      📍 {loc}
                      <button type="button" onClick={() => toggleLocation(loc)} disabled={isLoading}>
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* District grid — hidden when All is selected */}
              {!formData.locations.includes('ALL') && (
                <div className="flex flex-wrap gap-2">
                  {DISTRICTS.map(d => {
                    const selected = formData.locations.includes(d);
                    const disabled = isLoading || (!selected && formData.locations.length >= 5);
                    return (
                      <button
                        key={d} type="button"
                        onClick={() => toggleLocation(d)}
                        disabled={disabled}
                        className={`px-3 py-1.5 rounded-full text-sm transition-all border ${
                          selected
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10 disabled:opacity-40'
                        }`}
                      >
                        {d}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                  className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex items-center gap-2 text-red-400 text-sm"
                >
                  <AlertCircle className="w-4 h-4" />
                  <p>{error}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit */}
            <button
              type="submit" disabled={isLoading}
              className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-semibold rounded-lg px-4 py-4 transition-all disabled:opacity-70 flex justify-center items-center gap-2 shadow-lg"
            >
              {isLoading ? (
                <><Loader2 className="w-5 h-5 animate-spin" />Finding colleges for you...</>
              ) : 'Predict Colleges'}
            </button>
          </form>
        </motion.div>
      </div>
    </main>
  );
}
