import { motion } from 'motion/react';
import { Rocket, GraduationCap, Map, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSEO } from '../seo/useSEO';
import { SchemaOrg, faqSchema } from '../seo/SchemaOrg';

interface HomePageProps {
  onPortalSelect: (portal: 'mht-cet' | 'jee') => void;
  onSmartFormSelect?: () => void;
}

export function HomePage({ onPortalSelect }: HomePageProps) {
  const navigate = useNavigate();

  useSEO({
    title: 'College Predictor for JEE, MHT CET, NEET, CAT & More | UniScout',
    description: "UniScout is India's multi-exam college predictor. Find the best engineering, medical, and MBA colleges using JEE, MHT CET, NEET, or CAT scores. AI-powered cutoffs, admission bands, and smart preference list.",
    canonical: 'https://uniscout.in/',
  });

  return (
    <div className="min-h-screen flex flex-col relative z-10">
      <SchemaOrg
        id="home-faq"
        schema={faqSchema([
          {
            question: 'How does the MHT CET college predictor work?',
            answer: 'Enter your MHT CET percentile, category, and branch preference. Our AI analyzes 3 years of cutoff data to predict your admission probability at each college.',
          },
          {
            question: 'What is CAP Round 2 strategy?',
            answer: 'CAP Round 2 strategy helps you decide whether to freeze your current allotment or float to a better college in Round 2, based on expected cutoff drops.',
          },
          {
            question: 'Which colleges are covered?',
            answer: 'UNISCOUT covers 500+ Maharashtra engineering colleges including VJTI Mumbai, COEP Pune, PICT Pune, and all government and private colleges under MHT CET CAP.',
          },
        ])}
      />

      {/* ── Header ── */}
      <header className="w-full border-b border-white/10 bg-white/5 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-cyan-400" />
            <span className="text-white font-black text-xl tracking-tight">UniScout</span>
          </div>
          {/* Placeholder — add nav links here */}
          <nav className="hidden md:flex items-center gap-6 text-sm text-slate-400">
            {/* future nav items */}
          </nav>
        </div>
      </header>

      {/* ── Main content ── */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className="max-w-4xl w-full">

          {/* Hero */}
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <motion.div
              className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white/10 backdrop-blur-md border border-white/20 mb-8"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', delay: 0.2 }}
            >
              <GraduationCap className="w-10 h-10 text-cyan-400" />
            </motion.div>
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
              Find Your Perfect College
            </h1>
            <p className="text-xl text-slate-300 max-w-2xl mx-auto">
              Make informed decisions based on historical cutoffs and advanced predictions.
            </p>
          </motion.div>

          {/* Exam cards */}
          <section id="portals" className="grid md:grid-cols-2 gap-6 mb-10">
            <ExamCard
              title="MHT-CET"
              description="Maharashtra Engineering Admissions"
              isActive={true}
              onClick={() => { onPortalSelect('mht-cet'); navigate('/mht-cet'); }}
              delay={0.4}
            />
            <ExamCard
              title="JEE"
              description="National Engineering Admissions"
              isActive={false}
              onClick={() => { onPortalSelect('jee'); navigate('/jee'); }}
              delay={0.5}
            />
          </section>

          {/* Divider */}
          <motion.div
            className="flex items-center gap-4 mb-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-slate-500 text-sm uppercase tracking-wide">Or</span>
            <div className="flex-1 h-px bg-white/10" />
          </motion.div>

          {/* Smart form CTA */}
          <motion.div
            className="w-full flex justify-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            <button
              onClick={() => navigate('/smart-form')}
              className="group w-full md:w-3/4 flex items-center justify-between p-6 rounded-xl bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/30 hover:border-purple-400/50 hover:bg-purple-600/30 transition-all text-left"
            >
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Map className="w-5 h-5 text-pink-400" />
                  <h3 className="text-xl font-bold text-white group-hover:text-pink-300 transition-colors">
                    Generate Form Filling List
                  </h3>
                </div>
                <p className="text-slate-300">
                  Get a smart, personalized preference list of Safe, Target, and Dream colleges.
                </p>
              </div>
              <Sparkles className="w-6 h-6 text-purple-400 opacity-50 group-hover:opacity-100 transition-opacity" />
            </button>
          </motion.div>

        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="w-full border-t border-white/10 bg-white/5 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-6 py-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-slate-500">
          <span>© {new Date().getFullYear()} UniScout. All rights reserved.</span>
          {/* Placeholder — add footer links here */}
          <nav className="flex items-center gap-6">
            {/* future footer links */}
          </nav>
        </div>
      </footer>
    </div>
  );
}

interface ExamCardProps {
  title: string;
  description: string;
  isActive: boolean;
  onClick: () => void;
  delay: number;
}

function ExamCard({ title, description, isActive, onClick, delay }: ExamCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
      whileHover={isActive ? { scale: 1.02 } : {}}
      whileTap={isActive ? { scale: 0.98 } : {}}
      onClick={isActive ? onClick : undefined}
      className={`
        relative p-8 rounded-xl border flex flex-col items-start
        ${isActive
          ? 'bg-white/5 backdrop-blur-md border-white/20 hover:border-cyan-500/30 cursor-pointer'
          : 'bg-white/5 backdrop-blur-md border-white/10 opacity-70 cursor-not-allowed'}
      `}
    >
      <div className="flex justify-between w-full items-start mb-4">
        <h3 className="text-3xl font-bold text-white">{title}</h3>
        {!isActive && (
          <span className="bg-slate-800 text-slate-300 text-xs px-3 py-1 rounded-full font-medium border border-slate-700">
            Coming Soon
          </span>
        )}
      </div>
      <p className="text-slate-300 mb-8 flex-1">{description}</p>
      <div className={`font-semibold ${isActive ? 'text-cyan-400' : 'text-slate-500'}`}>
        {isActive ? 'Start Prediction →' : 'Currently Unavailable'}
      </div>
    </motion.div>
  );
}
