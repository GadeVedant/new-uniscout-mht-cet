import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Rocket, FlaskConical, BookOpen, Sparkles, Users, Building2, TrendingUp } from 'lucide-react';

export function MhtCetSelector() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col relative z-10">

      {/* ── Main ── */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-16 pt-[80px]">
        <div className="max-w-4xl w-full">

          {/* Back button */}
          <motion.button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 px-5 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 rounded-xl text-cyan-300 hover:text-cyan-100 transition-all text-sm font-medium mb-10"
            whileHover={{ x: -4 }}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </motion.button>

          {/* Hero */}
          <motion.div
            className="text-center mb-10"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-center justify-center gap-3 mb-3">
              <Sparkles className="w-7 h-7 text-cyan-400" />
              <h1 className="text-4xl md:text-5xl font-black text-cyan-400 tracking-tight">
                Uniscout Portals
              </h1>
              <Sparkles className="w-7 h-7 text-cyan-400" />
            </div>
            <p className="text-purple-200 text-base">
              A college-based recommendation system based on <span className="font-bold text-white">your marks</span>, <span className="font-bold text-cyan-400">location</span> and <span className="font-bold text-pink-400">branch</span>
            </p>

            {/* Stats */}
            <motion.div
              className="flex flex-wrap justify-center gap-4 mt-6"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <StatBadge icon={<Users className="w-4 h-4 text-purple-400" />} value="50,000+" label="Students Helped" />
              <StatBadge icon={<Building2 className="w-4 h-4 text-purple-400" />} value="200+" label="Top Colleges" />
              <StatBadge icon={<TrendingUp className="w-4 h-4 text-purple-400" />} value="95%" label="Accuracy Rate" />
            </motion.div>
          </motion.div>

          {/* Portal Cards */}
          <div className="grid md:grid-cols-2 gap-6">

            {/* MHT CET Portal */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate('/mht-cet/select')}
              className="p-8 rounded-2xl border border-white/15 bg-white/5 backdrop-blur-md flex flex-col cursor-pointer hover:border-cyan-500/40 transition-all"
            >
              <Rocket className="w-9 h-9 text-white/80 mb-4" />
              <h2 className="text-2xl font-bold text-white mb-1">MHT CET Portal</h2>
              <p className="text-pink-400 font-medium text-sm mb-4">For Engineering & Pharmacy Students</p>
              <p className="text-purple-200 text-sm mb-5">
                Get personalized college recommendations based on your MHT CET percentile for PCM (Engineering) and PCB (Pharmacy) students.
              </p>

              {/* Display-only sub-cards */}
              <div className="space-y-3 mb-6">
                {/* Engineering */}
                <div className="flex items-center gap-3 p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/30">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500 flex items-center justify-center shrink-0">
                    <Rocket className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="text-white font-semibold text-sm">MHT CET Engineering</div>
                    <div className="text-cyan-300 text-xs">PCM Students · 150+ Colleges</div>
                  </div>
                  <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-400 border border-green-500/30 rounded-full font-semibold">LIVE</span>
                </div>

                {/* Pharmacy */}
                <div className="flex items-center gap-3 p-4 rounded-xl bg-purple-500/10 border border-purple-500/30">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center shrink-0">
                    <FlaskConical className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="text-white font-semibold text-sm">MHT CET Pharmacy</div>
                    <div className="text-purple-300 text-xs">PCB Students · Coming Soon</div>
                  </div>
                  <span className="text-xs px-2 py-0.5 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-full font-semibold">SOON</span>
                </div>
              </div>

              <button
                onClick={(e) => { e.stopPropagation(); navigate('/mht-cet/select'); }}
                className="mt-auto w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold transition-all shadow-lg shadow-cyan-900/30"
              >
                Explore Now →
              </button>
            </motion.div>

            {/* 10th SSC / Diploma Portal */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate('/ssc')}
              className="p-8 rounded-2xl border border-white/15 bg-white/5 backdrop-blur-md flex flex-col cursor-pointer hover:border-pink-500/40 transition-all"
            >
              <BookOpen className="w-9 h-9 text-white/80 mb-4" />
              <h2 className="text-2xl font-bold text-white mb-1">10th SSC / Diploma</h2>
              <p className="text-pink-400 font-medium text-sm mb-4">For Junior College Admissions</p>
              <p className="text-purple-200 text-sm mb-5">
                Discover the best junior colleges for Arts, Commerce, and Science streams based on your 10th SSC performance.
              </p>
              <ul className="space-y-1 mb-6">
                {['100+ Junior Colleges', 'Stream-wise Options', 'Merit-based Sorting'].map(f => (
                  <li key={f} className="text-purple-300 text-sm flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400 inline-block" />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                className="mt-auto w-full py-3 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-400 hover:to-purple-500 text-white font-semibold transition-all shadow-lg shadow-pink-900/30"
                onClick={(e) => { e.stopPropagation(); navigate('/ssc'); }}
              >
                Explore Now →
              </button>
            </motion.div>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-white/10 bg-white/5 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-6 py-6 text-sm text-purple-400 text-center">
          © {new Date().getFullYear()} Uniscout. All rights reserved.
        </div>
      </footer>
    </div>
  );
}

function StatBadge({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
      {icon}
      <div className="text-left">
        <div className="text-white font-bold text-sm leading-tight">{value}</div>
        <div className="text-purple-300 text-xs leading-tight">{label}</div>
      </div>
    </div>
  );
}
