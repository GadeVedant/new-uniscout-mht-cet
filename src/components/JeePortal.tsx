import { motion } from 'motion/react';
import { ArrowLeft, Construction } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSEO } from '../seo/useSEO';

interface JeePortalProps {
  onBack?: () => void;
}

export function JeePortal({ }: JeePortalProps) {
  const navigate = useNavigate();

  useSEO({
    title: 'JEE College Predictor 2024 – Find IITs, NITs & GFTIs | UniScout',
    description: 'Predict your JEE Main and Advanced college using your rank. Find IITs, NITs, IIITs, and GFTIs with cutoff trends and admission probability.',
    canonical: 'https://uniscout.co.in/jee-college-predictor',
  });
  return (
    <main className="min-h-screen px-4 py-8 relative z-10 w-full flex justify-center">
      <div className="max-w-3xl w-full">
        {/* Header */}
        <header className="flex items-center mb-10">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-slate-300 transition-all backdrop-blur-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Home</span>
          </button>
        </header>

        {/* Coming Soon Message */}
        <motion.div 
          className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-10 text-center flex flex-col items-center justify-center min-h-[50vh]"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="w-20 h-20 bg-blue-500/20 rounded-full flex items-center justify-center mb-6">
            <Construction className="w-10 h-10 text-cyan-400" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">JEE Predictor</h1>
          <p className="text-slate-300 text-lg max-w-md mx-auto mb-8">
            We are working hard to bring you the best National Engineering Admissions predictor. Stay tuned!
          </p>
          
          <div className="flex flex-col gap-3 text-left w-full max-w-sm opacity-50 pointer-events-none">
            <div className="bg-white/5 border border-white/10 rounded-lg p-3">
              <span className="text-slate-400 text-sm">Rank</span>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-lg p-3">
              <span className="text-slate-400 text-sm">Category</span>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-lg p-3">
              <span className="text-slate-400 text-sm">State Preference</span>
            </div>
          </div>
        </motion.div>
      </div>
    </main>
  );
}
