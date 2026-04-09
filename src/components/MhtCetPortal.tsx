import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { MhtCetFormData } from '../App';
import { api, CollegeRecommendation } from '../services/api';
import { Slider } from './ui/slider';
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
const CAP_ROUNDS = ['I', 'II', 'III'];
const CURRENT_YEAR = '2025-26'; // Always predict for the current admission cycle
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
// All districts/locations present in the MHT-CET data
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
    capRound: 'I', // always Round I — strategy tab shows Round II/III chances
    category: 'GOPENS',
    branchPreference: '',
    location: '',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calculateProgress = () => {
    let completed = 0;
    if (formData.percentile !== '') completed++;
    if (formData.category) completed++;
    if (formData.branchPreference) completed++;
    return (completed / 3) * 100;
  };

  const handlePredict = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const requestPayload = {
        percentile: parseFloat(formData.percentile),
        year: formData.year,
        capRound: formData.capRound,
        category: formData.category,
        branchPreference: formData.branchPreference,
        location: formData.location || '',
      };
      
      const response = await api.getRecommendations(requestPayload);

      if (response.success && response.data) {
        onRecommendationsReady(response.data, {
          ...requestPayload,
          locationFallback: response.metadata?.location_fallback ?? false,
        });
        navigate('/results');
      } else {
        setError(response.error || 'Failed to get recommendations');
      }
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
              <motion.div
                className="h-full bg-cyan-500"
                initial={{ width: 0 }}
                animate={{ width: `${calculateProgress()}%` }}
              />
            </div>
          </div>
        </header>

        {/* Title */}
        <div className="mb-10 text-center">
          <h1 className="text-4xl font-bold text-white mb-2">MHT-CET Predictor</h1>
          <p className="text-slate-400">Enter your details to find best matching colleges</p>
        </div>

        {/* Form Container */}
        <motion.div 
          className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 md:p-10 shadow-xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <form onSubmit={handlePredict} className="space-y-8">
            
            {/* Percentile row */}
            <div className="space-y-4">
              <label className="block text-sm font-medium text-slate-200">Percentile Check (0-100)</label>
              <div className="flex gap-4 items-center">
                <Slider 
                  max={100} 
                  step={0.01} 
                  value={[parseFloat(formData.percentile) || 0]}
                  onValueChange={(vals: number[]) => setFormData(p => ({...p, percentile: vals[0].toString()}))}
                  className="flex-1"
                />
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  required
                  value={formData.percentile}
                  onChange={(e) => setFormData(p => ({...p, percentile: e.target.value}))}
                  className="w-24 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                  placeholder="95.50"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Category */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-200">Category</label>
                <select
                  required
                  value={formData.category}
                  onChange={(e) => setFormData(p => ({...p, category: e.target.value}))}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-cyan-500 appearance-none disabled:opacity-50"
                  disabled={isLoading}
                >
                  {CATEGORIES.map(c => <option key={c.value} value={c.value} className="bg-slate-900">{c.label}</option>)}
                </select>
              </div>

              {/* CAP Round — always Round I; Cap 2/3 chances shown in Round 2 Strategy tab */}

              {/* Branch */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-200">Branch Preference</label>
                <select
                  required
                  value={formData.branchPreference}
                  onChange={(e) => setFormData(p => ({...p, branchPreference: e.target.value}))}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-cyan-500 appearance-none disabled:opacity-50"
                  disabled={isLoading}
                >
                  <option value="" className="bg-slate-900 text-slate-400">Select branch</option>
                  {BRANCHES.map(b => <option key={b} value={b} className="bg-slate-900">{b.replace(/\b\w/g, c => c.toUpperCase())}</option>)}
                </select>
              </div>

              {/* District */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-200">District (Optional)</label>
                <select
                  value={formData.location}
                  onChange={(e) => setFormData(p => ({...p, location: e.target.value}))}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-cyan-500 appearance-none disabled:opacity-50"
                  disabled={isLoading}
                >
                  <option value="" className="bg-slate-900 text-slate-400">Any District</option>
                  {DISTRICTS.map(d => <option key={d} value={d} className="bg-slate-900">{d}</option>)}
                </select>
              </div>
            </div>

            {/* Error Message */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex flex-col items-center gap-2"
                >
                  <div className="flex items-center gap-2 text-red-400 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    <p>{error}</p>
                  </div>
                  <button type="button" onClick={handlePredict} className="text-red-300 text-xs hover:text-red-200 underline">
                    Try Again
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-semibold rounded-lg px-4 py-4 transition-all disabled:opacity-70 flex justify-center items-center gap-2 shadow-lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Finding colleges for you...
                </>
              ) : (
                'Predict Colleges'
              )}
            </button>
          </form>
        </motion.div>
      </div>
    </main>
  );
}