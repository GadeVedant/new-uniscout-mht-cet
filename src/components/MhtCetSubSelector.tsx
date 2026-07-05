import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Rocket, FlaskConical, Sparkles } from 'lucide-react';

export function MhtCetSubSelector() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col relative z-10">
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-16 pt-[80px]">
        <div className="max-w-2xl w-full">

          {/* Back button */}
          <motion.button
            onClick={() => navigate('/mht-cet')}
            className="flex items-center gap-2 px-5 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 rounded-xl text-cyan-300 hover:text-cyan-100 transition-all text-sm font-medium mb-10"
            whileHover={{ x: -4 }}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </motion.button>

          {/* Title */}
          <motion.div
            className="text-center mb-10"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-center justify-center gap-3 mb-2">
              <Sparkles className="w-7 h-7 text-cyan-400" />
              <h1 className="text-4xl md:text-5xl font-black text-cyan-400 tracking-tight">MHT CET Portal</h1>
              <Sparkles className="w-7 h-7 text-cyan-400" />
            </div>
            <p className="text-purple-200 text-sm">Select your stream to continue</p>
          </motion.div>

          {/* Two sub-portal cards */}
          <div className="grid md:grid-cols-2 gap-6">

            {/* Engineering */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate('/mht-cet/engineering')}
              className="p-8 rounded-2xl border border-cyan-500/30 bg-white/5 backdrop-blur-md flex flex-col cursor-pointer hover:border-cyan-400/60 hover:bg-cyan-500/5 transition-all"
            >
              <div className="w-14 h-14 rounded-2xl bg-cyan-500 flex items-center justify-center mb-5 shadow-lg shadow-cyan-900/40">
                <Rocket className="w-7 h-7 text-white" />
              </div>
              <div className="flex items-center gap-2 mb-2">
                <h2 className="text-xl font-bold text-white">MHT CET Engineering</h2>
                <span className="text-[10px] px-2 py-0.5 bg-green-500/20 text-green-400 border border-green-500/30 rounded-full font-bold">LIVE</span>
              </div>
              <p className="text-cyan-300 text-sm font-medium mb-3">PCM Students</p>
              <p className="text-purple-200 text-sm mb-6">
                Get personalized engineering college recommendations based on your MHT CET percentile, preferred branch, and location.
              </p>
              <ul className="space-y-1 mb-6">
                {['150+ Engineering Colleges', 'Branch-wise Analysis', 'Location Preferences'].map(f => (
                  <li key={f} className="text-purple-300 text-sm flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 inline-block" />
                    {f}
                  </li>
                ))}
              </ul>
              <button className="mt-auto w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold transition-all shadow-lg shadow-cyan-900/30">
                Open Predictor →
              </button>
            </motion.div>

            {/* Pharmacy */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate('/mht-cet/pharmacy')}
              className="p-8 rounded-2xl border border-purple-500/30 bg-white/5 backdrop-blur-md flex flex-col cursor-pointer hover:border-purple-400/60 hover:bg-purple-500/5 transition-all"
            >
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center mb-5 shadow-lg shadow-pink-900/40">
                <FlaskConical className="w-7 h-7 text-white" />
              </div>
              <div className="flex items-center gap-2 mb-2">
                <h2 className="text-xl font-bold text-white">MHT CET Pharmacy</h2>
                <span className="text-[10px] px-2 py-0.5 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-full font-bold">SOON</span>
              </div>
              <p className="text-pink-300 text-sm font-medium mb-3">PCB Students</p>
              <p className="text-purple-200 text-sm mb-6">
                Discover the best pharmacy colleges based on your MHT CET PCB percentile. Coming soon with full predictions.
              </p>
              <ul className="space-y-1 mb-6">
                {['100+ Pharmacy Colleges', 'PCB Stream Analysis', 'Merit-based Sorting'].map(f => (
                  <li key={f} className="text-purple-300 text-sm flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-pink-400 inline-block" />
                    {f}
                  </li>
                ))}
              </ul>
              <button className="mt-auto w-full py-3 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-400 hover:to-purple-500 text-white font-semibold transition-all shadow-lg shadow-pink-900/30">
                Coming Soon →
              </button>
            </motion.div>

          </div>
        </div>
      </main>

      <footer className="w-full border-t border-white/10 bg-white/5 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-6 py-6 text-sm text-purple-400 text-center">
          © {new Date().getFullYear()} Uniscout. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
