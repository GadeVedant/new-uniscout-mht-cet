import { motion } from 'motion/react';
import { GraduationCap, Map, Sparkles, ArrowRight, Brain, TrendingUp, BarChart3, ListChecks, BookOpen, Scale } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSEO } from '../seo/useSEO';
import { SchemaOrg, faqSchema } from '../seo/SchemaOrg';

interface HomePageProps {
  onPortalSelect: (portal: 'mht-cet' | 'jee') => void;
  onSmartFormSelect?: () => void;
}

// ── Exam data ──────────────────────────────────────────────────────────────

const EXAMS = [
  {
    id: 'mht-cet',
    name: 'MHT-CET',
    subtitle: 'Engineering',
    description: 'Maharashtra Engineering Admissions',
    route: '/mht-cet',
    active: true,
    color: 'from-cyan-500/20 to-blue-500/20',
    border: 'border-cyan-500/30 hover:border-cyan-400/60',
    badge: null,
    icon: '⚙️',
  },
  {
    id: 'dse',
    name: 'DSE',
    subtitle: 'Diploma to Degree',
    description: 'Direct Second Year Engineering',
    route: '/dse',
    active: false,
    color: 'from-violet-500/20 to-purple-500/20',
    border: 'border-violet-500/20',
    badge: 'Coming Soon',
    icon: '🎓',
  },
  {
    id: 'pharmacy',
    name: 'MHT-CET',
    subtitle: 'Pharmacy',
    description: 'B.Pharmacy & Pharm.D Admissions',
    route: '/pharmacy',
    active: false,
    color: 'from-emerald-500/20 to-teal-500/20',
    border: 'border-emerald-500/20',
    badge: 'Coming Soon',
    icon: '💊',
  },
  {
    id: 'jee',
    name: 'JEE Main',
    subtitle: 'Engineering',
    description: 'National Engineering Admissions',
    route: '/jee-college-predictor',
    active: false,
    color: 'from-orange-500/20 to-amber-500/20',
    border: 'border-orange-500/20',
    badge: 'Coming Soon',
    icon: '🏛️',
  },
  {
    id: 'neet',
    name: 'NEET',
    subtitle: 'Medical',
    description: 'Medical & Dental Admissions',
    route: '/neet',
    active: false,
    color: 'from-rose-500/20 to-pink-500/20',
    border: 'border-rose-500/20',
    badge: 'Coming Soon',
    icon: '🏥',
  },
];

// ── Trust metrics ──────────────────────────────────────────────────────────

const METRICS = [
  { value: '386+', label: 'Colleges' },
  { value: '93K+', label: 'Historical Records' },
  { value: '103', label: 'Branches' },
  { value: '4 yrs', label: 'Cutoff Data' },
];

// ── Features ───────────────────────────────────────────────────────────────

const FEATURES = [
  { icon: <Brain className="w-5 h-5" />, title: 'College Predictor', desc: 'AI-powered admission probability for each college', color: 'text-cyan-400' },
  { icon: <Scale className="w-5 h-5" />, title: 'College Comparison', desc: 'Compare up to 3 colleges side by side', color: 'text-violet-400' },
  { icon: <TrendingUp className="w-5 h-5" />, title: 'Cutoff Trends', desc: '3-year historical cutoff analysis', color: 'text-emerald-400' },
  { icon: <BarChart3 className="w-5 h-5" />, title: 'Round 2 Strategy', desc: 'Freeze or float recommendation with reasoning', color: 'text-amber-400' },
  { icon: <ListChecks className="w-5 h-5" />, title: 'Preference List', desc: 'Smart Safe, Target & Dream picks for CAP', color: 'text-pink-400' },
  { icon: <BookOpen className="w-5 h-5" />, title: 'Admission Probability', desc: 'P10/P50/P90 confidence bands per college', color: 'text-blue-400' },
];

// ── How it works steps ─────────────────────────────────────────────────────

const STEPS = [
  { step: '01', title: 'Select Exam', desc: 'Choose from MHT-CET, DSE, Pharmacy, JEE or NEET' },
  { step: '02', title: 'Enter Score', desc: 'Input your percentile, rank, or marks' },
  { step: '03', title: 'Get Predictions', desc: 'See Safe, Likely, Moderate & Risky colleges instantly' },
  { step: '04', title: 'Build Preference List', desc: 'Generate your optimized CAP preference list' },
];

// ── Main component ─────────────────────────────────────────────────────────

export function HomePage({ onPortalSelect }: HomePageProps) {
  const navigate = useNavigate();

  useSEO({
    title: 'MHT CET College Predictor 2025 – AI-Powered Admission Predictions | UniScout',
    description: 'Get AI-powered MHT CET college predictions for 2025. Enter your percentile, category & branch to see admission probability for 386 Maharashtra engineering colleges. Free, instant results.',
    canonical: 'https://www.uniscout.co.in/',
  });

  return (
    <div className="min-h-screen flex flex-col relative z-10">
      <SchemaOrg
        id="home-faq"
        schema={faqSchema([
          {
            question: 'How does the MHT CET college predictor work?',
            answer: 'Enter your MHT CET percentile, category, and branch preference. Our AI analyzes 4 years of cutoff data to predict your admission probability at each college.',
          },
          {
            question: 'What is CAP Round 2 strategy?',
            answer: 'CAP Round 2 strategy helps you decide whether to freeze your current allotment or float to a better college in Round 2, based on expected cutoff drops.',
          },
          {
            question: 'Which colleges are covered?',
            answer: 'UniScout covers 386 Maharashtra engineering colleges including VJTI Mumbai, COEP Pune, PICT Pune, and all government and private colleges under MHT CET CAP.',
          },
          {
            question: 'Is UniScout free to use?',
            answer: 'Yes, UniScout is completely free. No sign-up required — just enter your score and get instant predictions.',
          },
        ])}
      />

      {/* ── Navbar ── */}
      <header className="w-full border-b border-white/10 bg-white/5 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-cyan-400" />
            <span className="text-white font-black text-xl tracking-tight">UniScout</span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm text-slate-400">
            <button onClick={() => navigate('/mht-cet')} className="hover:text-white transition-colors">Predict</button>
            <button onClick={() => navigate('/smart-form')} className="hover:text-white transition-colors">Form Filling</button>
            <button onClick={() => navigate('/compare')} className="hover:text-white transition-colors">Compare</button>
          </nav>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center px-4 pb-16">
        <div className="max-w-6xl w-full">

          {/* ── Hero ── */}
          <section className="text-center pt-20 pb-16">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <motion.div
                className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500/10 border border-cyan-500/20 rounded-full text-cyan-300 text-sm mb-8"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
              >
                <Sparkles className="w-4 h-4" />
                India's Admission Intelligence Platform
              </motion.div>

              <h1 className="text-5xl md:text-6xl font-black text-white mb-6 leading-tight">
                Predict Your College<br />
                <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-violet-400 bg-clip-text text-transparent">
                  Before Counselling Begins
                </span>
              </h1>

              <p className="text-xl text-slate-300 max-w-2xl mx-auto mb-10">
                AI-powered admission predictions, cutoff analysis, college comparisons, and preference list generation for MHT-CET, DSE, Pharmacy, JEE and more.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <motion.button
                  onClick={() => { onPortalSelect('mht-cet'); navigate('/mht-cet'); }}
                  className="flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold rounded-xl shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 transition-all"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  Start Predicting
                  <ArrowRight className="w-5 h-5" />
                </motion.button>
                <motion.button
                  onClick={() => navigate('/smart-form')}
                  className="flex items-center justify-center gap-2 px-8 py-4 bg-white/5 border border-white/20 text-slate-200 font-semibold rounded-xl hover:bg-white/10 transition-all"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <Map className="w-5 h-5 text-pink-400" />
                  Build Preference List
                </motion.button>
              </div>
            </motion.div>
          </section>

          {/* ── Trust metrics ── */}
          <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
            {METRICS.map((m, i) => (
              <motion.div
                key={m.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * i }}
                className="bg-white/5 border border-white/10 rounded-2xl p-5 text-center backdrop-blur-sm"
              >
                <div className="text-3xl font-black text-white mb-1">{m.value}</div>
                <div className="text-sm text-slate-400">{m.label}</div>
              </motion.div>
            ))}
          </section>

          {/* ── Exam selector ── */}
          <section className="mb-16">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-center mb-8"
            >
              <h2 className="text-2xl font-bold text-white mb-2">Choose Your Exam</h2>
              <p className="text-slate-400">Select the exam you're preparing for to get started</p>
            </motion.div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {EXAMS.map((exam, i) => (
                <motion.div
                  key={exam.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * i }}
                  onClick={() => {
                    if (!exam.active) return;
                    if (exam.id === 'mht-cet') onPortalSelect('mht-cet');
                    navigate(exam.route);
                  }}
                  className={`relative p-5 rounded-2xl border bg-gradient-to-br ${exam.color} ${exam.border} backdrop-blur-sm transition-all ${exam.active ? 'cursor-pointer hover:scale-105' : 'cursor-not-allowed opacity-60'}`}
                  whileHover={exam.active ? { scale: 1.05 } : {}}
                  whileTap={exam.active ? { scale: 0.97 } : {}}
                >
                  {exam.badge && (
                    <span className="absolute top-3 right-3 text-xs px-2 py-0.5 bg-white/10 border border-white/20 rounded-full text-slate-300">
                      {exam.badge}
                    </span>
                  )}
                  <div className="text-3xl mb-3">{exam.icon}</div>
                  <div className="font-bold text-white text-lg leading-tight">{exam.name}</div>
                  <div className="text-xs text-slate-300 font-medium mb-2">{exam.subtitle}</div>
                  <div className="text-xs text-slate-400">{exam.description}</div>
                  {exam.active && (
                    <div className="mt-4 flex items-center gap-1 text-cyan-400 text-xs font-semibold">
                      Start <ArrowRight className="w-3 h-3" />
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </section>

          {/* ── How it works ── */}
          <section className="mb-16">
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="text-center mb-10"
            >
              <h2 className="text-2xl font-bold text-white mb-2">How It Works</h2>
              <p className="text-slate-400">Get college predictions in under 60 seconds</p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {STEPS.map((s, i) => (
                <motion.div
                  key={s.step}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.1 * i }}
                  className="bg-white/5 border border-white/10 rounded-2xl p-6 relative backdrop-blur-sm"
                >
                  <div className="text-4xl font-black text-white/10 mb-3">{s.step}</div>
                  <div className="font-bold text-white mb-2">{s.title}</div>
                  <div className="text-sm text-slate-400">{s.desc}</div>
                  {i < STEPS.length - 1 && (
                    <div className="hidden md:block absolute -right-2 top-1/2 -translate-y-1/2 z-10">
                      <ArrowRight className="w-4 h-4 text-slate-600" />
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </section>

          {/* ── Features ── */}
          <section className="mb-16">
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="text-center mb-10"
            >
              <h2 className="text-2xl font-bold text-white mb-2">Everything You Need</h2>
              <p className="text-slate-400">Built for serious admission planning</p>
            </motion.div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {FEATURES.map((f, i) => (
                <motion.div
                  key={f.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.05 * i }}
                  className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm hover:bg-white/8 transition-colors"
                >
                  <div className={`${f.color} mb-3`}>{f.icon}</div>
                  <div className="font-bold text-white mb-1">{f.title}</div>
                  <div className="text-sm text-slate-400">{f.desc}</div>
                </motion.div>
              ))}
            </div>
          </section>

          {/* ── Smart form CTA ── */}
          <section className="mb-8">
            <motion.button
              onClick={() => navigate('/smart-form')}
              className="group w-full flex items-center justify-between p-6 rounded-2xl bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/30 hover:border-purple-400/50 hover:bg-purple-600/25 transition-all text-left"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              whileHover={{ scale: 1.01 }}
            >
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Map className="w-5 h-5 text-pink-400" />
                  <h2 className="text-xl font-bold text-white group-hover:text-pink-300 transition-colors">
                    Generate Your CAP Preference List
                  </h2>
                </div>
                <p className="text-slate-300">
                  Safe Picks, Target Picks & Dream Picks — ranked by AI. Download as PDF.
                </p>
              </div>
              <ArrowRight className="w-6 h-6 text-purple-400 opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
            </motion.button>
          </section>

        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="w-full border-t border-white/10 bg-white/5 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 py-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-slate-500">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-cyan-400/60" />
            <span>© {new Date().getFullYear()} UniScout. All rights reserved.</span>
          </div>
          <nav className="flex items-center gap-6">
            <button onClick={() => navigate('/mht-cet')} className="hover:text-slate-300 transition-colors">MHT-CET</button>
            <button onClick={() => navigate('/smart-form')} className="hover:text-slate-300 transition-colors">Form Filling</button>
            <button onClick={() => navigate('/compare')} className="hover:text-slate-300 transition-colors">Compare</button>
          </nav>
        </div>
      </footer>
    </div>
  );
}
