import { useState } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Sparkles, BookOpen, Award, Users, Star, CheckCircle } from 'lucide-react';

const APPS_SCRIPT_URL = import.meta.env.VITE_FEEDBACK_SCRIPT_URL ?? '';

interface ComingSoonProps {
  portalType?: 'mht-cet' | 'ssc' | string;
  title?: string;
  subtitle?: string;
  backRoute?: string;
  onBack?: () => void;
}

export function ComingSoon({ portalType, title, subtitle, backRoute: backRouteProp }: ComingSoonProps) {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const displayTitle = title || (portalType === 'ssc' ? '10th SSC / Diploma' : 'MHT CET Pharmacy');
  const displaySubtitle = subtitle || (portalType === 'ssc'
    ? 'Junior college admissions for Arts, Commerce & Science'
    : 'Pharmacy college admissions for PCB students');

  const backRoute = backRouteProp || '/mht-cet';

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative z-10 px-4 py-12 pt-[80px]">

      {/* Back button — above card */}
      <div className="w-full max-w-lg mb-4">
        <motion.button
          onClick={() => navigate(backRoute)}
          className="flex items-center gap-2 px-5 py-2.5 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 rounded-xl text-cyan-300 hover:text-white transition-all text-sm font-medium"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          whileHover={{ x: -4 }}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Portal
        </motion.button>
      </div>

      {/* Main card */}
      <motion.div
        className="w-full max-w-lg bg-white/5 backdrop-blur-md border border-white/15 rounded-3xl p-10 flex flex-col items-center text-center shadow-2xl shadow-purple-900/30"
        initial={{ opacity: 0, scale: 0.9, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, type: 'spring', stiffness: 120 }}
      >
        {/* Icon with notification badge */}
        <motion.div
          className="relative mb-6"
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        >
          <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center shadow-lg shadow-pink-900/40">
            <Sparkles className="w-12 h-12 text-white" />
          </div>
          <span className="absolute -top-2 -right-2 w-7 h-7 bg-orange-400 rounded-full flex items-center justify-center text-white font-black text-sm shadow-md">
            !
          </span>
        </motion.div>

        {/* Heading */}
        <motion.h1
          className="text-3xl md:text-4xl font-black mb-2 bg-gradient-to-r from-pink-400 via-purple-400 to-pink-400 bg-clip-text text-transparent"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {displayTitle}
          <br />Coming Soon!
        </motion.h1>

        <motion.p
          className="text-purple-200 text-sm md:text-base mb-2 max-w-sm leading-relaxed"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          {displaySubtitle}
        </motion.p>

        <motion.p
          className="text-slate-400 text-sm mb-8 max-w-sm leading-relaxed"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          Exciting features and college predictions are on their way. Stay tuned to <span className="text-cyan-400 font-semibold">Uniscout</span> for updates!
        </motion.p>

        {/* Notify Me form */}
        <motion.div
          className="w-full mb-8"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4, type: 'spring' }}
        >
          {!submitted ? (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!email.trim()) return;
                setSubmitting(true);
                try {
                  await fetch(APPS_SCRIPT_URL, {
                    method: 'POST',
                    mode: 'no-cors',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      type: 'notify_me',
                      portal: displayTitle,
                      email: email.trim(),
                      timestamp: new Date().toISOString(),
                    }),
                  });
                } catch {} // no-cors — always swallow errors
                setSubmitted(true);
                setSubmitting(false);
              }}
              className="w-full flex flex-col gap-3"
            >
              <input
                type="email"
                required
                placeholder="Enter your email for early access"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-slate-400 focus:outline-none focus:border-cyan-400 text-sm"
                disabled={submitting}
              />
              <motion.button
                type="submit"
                disabled={submitting}
                className="flex items-center justify-center gap-2 px-8 py-3 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold text-base shadow-lg shadow-purple-900/40 transition-all disabled:opacity-60"
                whileHover={{ scale: submitting ? 1 : 1.05 }}
                whileTap={{ scale: submitting ? 1 : 0.97 }}
              >
                <Star className="w-5 h-5" />
                {submitting ? 'Saving...' : 'Notify Me When Live'}
              </motion.button>
            </form>
          ) : (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex flex-col items-center gap-2 py-4"
            >
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-emerald-400" />
              </div>
              <p className="text-emerald-300 font-bold">You're on the list!</p>
              <p className="text-slate-400 text-sm">We'll notify you when {displayTitle} launches.</p>
            </motion.div>
          )}
        </motion.div>

        {/* Feature tiles */}
        <motion.div
          className="grid grid-cols-3 gap-4 w-full"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <FeatureTile icon={<BookOpen className="w-6 h-6 text-white" />} bg="from-pink-500 to-rose-600" label="College Finder" />
          <FeatureTile icon={<Award className="w-6 h-6 text-white" />} bg="from-amber-400 to-orange-500" label="AI Predictions" />
          <FeatureTile icon={<Users className="w-6 h-6 text-white" />} bg="from-amber-400 to-yellow-500" label="Smart Ranking" />
        </motion.div>
      </motion.div>

    </div>
  );
}

function FeatureTile({ icon, bg, label }: { icon: React.ReactNode; bg: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-2 p-3 bg-white/5 border border-white/10 rounded-xl">
      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${bg} flex items-center justify-center shadow-md`}>
        {icon}
      </div>
      <span className="text-white text-xs font-semibold text-center leading-tight">{label}</span>
    </div>
  );
}
