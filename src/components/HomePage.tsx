import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles, Bell, Brain, TrendingUp, BarChart2, ListChecks,
  Layers, ArrowRight, GraduationCap,
} from 'lucide-react';
import { useSEO } from '../seo/useSEO';
import { SchemaOrg, faqSchema } from '../seo/SchemaOrg';

interface HomePageProps {
  onPortalSelect: (portal: 'mht-cet' | 'jee') => void;
  onSmartFormSelect?: () => void;
}

const exams = [
  { id: 'mhtcet-eng',  name: 'MHT-CET Engineering', desc: 'Maharashtra PCM Based',  available: true,  route: '/mht-cet'   },
  { id: 'dse-eng',     name: 'DSE Engineering',      desc: 'Direct Second Year',     available: false, route: '/dse'       },
  { id: 'mhtcet-pharm',name: 'MHT-CET Pharmacy',     desc: 'Maharashtra PCB Based',  available: false, route: '/pharmacy'  },
  { id: 'jee-main',    name: 'JEE Main',             desc: 'National Level Entrance',available: false, route: '/jee-college-predictor' },
  { id: 'neet',        name: 'NEET',                 desc: 'Medical Admissions',     available: false, route: '/neet'      },
];

const features = [
  { icon: Brain,     title: 'AI Admission Predictor',   grad: 'from-blue-500 to-indigo-500',  desc: 'ML model trained on 4 years of cutoff data predicts your exact admission probability for every college-branch combination in Maharashtra.' },
  { icon: TrendingUp,title: 'Cutoff Trend Analyzer',    grad: 'from-violet-500 to-purple-500', desc: 'Visualize how closing percentiles have shifted over 4 years. Spot rising and falling trends before the CAP counselling round begins.' },
  { icon: BarChart2,  title: 'Smart College Ranker',    grad: 'from-teal-500 to-cyan-500',    desc: 'Compare 386 colleges across placements, fees, and infrastructure. See the full picture beyond just the brand name.' },
  { icon: ListChecks, title: 'Preference List Builder', grad: 'from-amber-500 to-orange-500', desc: 'AI-guided Safe, Target, and Dream categorization. Build your CAP Round preference list and export to PDF in one click.' },
];

const steps = [
  { num: '01', title: 'Enter Your Score',     desc: 'Select your exam and input your percentile or score. Add your category (OPEN, OBC, SC, etc.) for precise predictions.' },
  { num: '02', title: 'Explore Predictions',  desc: 'Browse ranked predictions for 386 colleges with probability scores, confidence intervals, and 4-year cutoff trends.' },
  { num: '03', title: 'Build Your List',       desc: 'Curate your Safe, Target, and Dream picks. Export your counselling preference list as a PDF for the CAP Round.' },
];

const stats = [
  { value: '386+',  label: 'Colleges Indexed'    },
  { value: '93K+',  label: 'Historical Records'  },
  { value: '103',   label: 'Branches'            },
  { value: '4 Yrs', label: 'Cutoff History'      },
];

export function HomePage({ onPortalSelect }: HomePageProps) {
  const navigate = useNavigate();
  const [selectedExam, setSelectedExam] = useState('mhtcet-eng');
  const [score, setScore] = useState('');
  const [category, setCategory] = useState('GOPENS');
  const [location, setLocation] = useState('');

  useSEO({
    title: 'MHT CET College Predictor 2025 – AI-Powered Admission Predictions | UniScout',
    description: 'Get AI-powered MHT CET college predictions for 2025. Enter your percentile, category & branch to see admission probability for 386 Maharashtra engineering colleges. Free, instant results.',
    canonical: 'https://www.uniscout.co.in/',
  });

  const handlePredict = () => {
    const exam = exams.find(e => e.id === selectedExam);
    if (!exam?.available) return;
    if (selectedExam === 'mhtcet-eng') {
      onPortalSelect('mht-cet');
      // Pass score, category, location as query params to pre-fill the form
      const params = new URLSearchParams();
      if (score) params.set('percentile', score);
      if (category) params.set('category', category);
      if (location) params.set('location', location);
      const qs = params.toString();
      navigate(`/mht-cet${qs ? `?${qs}` : ''}`);
    } else {
      navigate(exam.route);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SchemaOrg id="home-faq" schema={faqSchema([
        { question: 'How does the MHT CET college predictor work?', answer: 'Enter your CET percentile, category, and branch preference. Our AI analyzes 4 years of cutoff data to predict your admission probability at each college.' },
        { question: 'Is UniScout free to use?', answer: 'Yes, UniScout is completely free. No sign-up required — just enter your score and get instant predictions.' },
        { question: 'Which categories are supported?', answer: 'All 11 Maharashtra reservation categories: Open, SC, ST, OBC, SEBC, EWS, NT1, NT2, NT3, VJ/DT, and TFWS.' },
        { question: 'Can I download the preference list?', answer: 'Yes — generate your Safe, Target & Dream picks and download as a PDF for the DTE portal.' },
      ])} />

      {/* ── Navbar ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/[0.06] bg-background/75 backdrop-blur-2xl">
        <div className="max-w-7xl mx-auto px-5 flex items-center h-[60px] gap-6">
          <button onClick={() => navigate('/')} className="flex items-center gap-2.5 shrink-0">
            <div className="size-7 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-[0_0_12px_rgba(90,135,239,0.5)]">
              <Sparkles className="size-3.5 text-white" />
            </div>
            <span className="text-sm font-semibold tracking-tight">UniScout</span>
            <span className="hidden md:inline-block text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-blue-500/15 border border-blue-500/25 text-blue-400">BETA</span>
          </button>

          <div className="hidden md:flex items-center gap-0.5 flex-1">
            {[
              { label: 'Home',       route: '/'           },
              { label: 'Predictor',  route: '/mht-cet'    },
              { label: 'Form Filling',route: '/smart-form' },
              { label: 'Compare',    route: '/compare'    },
            ].map(item => (
              <button key={item.label} onClick={() => navigate(item.route)}
                className="px-3.5 py-1.5 rounded-lg text-[13px] font-medium text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all">
                {item.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 ml-auto">
            <button className="size-8 rounded-lg hover:bg-white/5 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
              <Bell className="size-4" />
            </button>
            <button onClick={() => { onPortalSelect('mht-cet'); navigate('/mht-cet'); }}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-[13px] font-medium hover:opacity-90 transition-opacity shadow-[0_0_16px_rgba(90,135,239,0.35)]">
              <Brain className="size-3.5" />
              Predict Now
            </button>
          </div>
        </div>
      </nav>

      <div className="pt-[60px]">
        {/* ── Hero ── */}
        <section className="relative min-h-[calc(100vh-60px)] flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute top-[20%] left-1/2 -translate-x-1/2 w-[900px] h-[700px] bg-blue-600/[0.12] rounded-full blur-[140px]" />
            <div className="absolute top-[30%] left-[20%] w-[500px] h-[500px] bg-violet-600/[0.09] rounded-full blur-[120px]" />
            <div className="absolute top-[40%] right-[15%] w-[400px] h-[400px] bg-indigo-600/[0.08] rounded-full blur-[100px]" />
            <div className="absolute inset-0 opacity-[0.018]"
              style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.4) 1px, transparent 1px)', backgroundSize: '64px 64px' }} />
          </div>

          <div className="relative max-w-7xl mx-auto px-5 py-20 flex flex-col items-center text-center">
            <div className="mb-7 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-violet-500/30 bg-violet-500/[0.08] text-violet-300 text-xs font-medium">
              <Sparkles className="size-3" />
              AI-Powered Admissions Intelligence
            </div>

            <h1 className="text-[52px] md:text-[72px] font-semibold tracking-[-0.03em] leading-[1.05] mb-6 max-w-4xl">
              Predict Your Admission.
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-violet-400 to-blue-400">
                Decide With Confidence.
              </span>
            </h1>

            <p className="text-base md:text-lg text-muted-foreground max-w-xl mb-12 leading-relaxed">
              UniScout analyzes years of entrance exam cutoff data to predict your exact admission probability
              across 386 colleges. Stop guessing. Start planning.
            </p>

            {/* Prediction card */}
            <div className="w-full max-w-[580px]">
              <div className="bg-card/70 backdrop-blur-2xl border border-white/[0.09] rounded-2xl p-6 shadow-[0_32px_80px_rgba(0,0,0,0.6)]">
                {/* Exam tabs */}
                <div className="flex gap-2 mb-5 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
                  {exams.map(exam => (
                    <button key={exam.id}
                      onClick={() => exam.available && setSelectedExam(exam.id)}
                      disabled={!exam.available}
                      className={`shrink-0 px-3 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                        !exam.available
                          ? 'opacity-35 cursor-not-allowed text-muted-foreground border border-white/[0.05]'
                          : selectedExam === exam.id
                            ? 'bg-primary text-white shadow-[0_0_12px_rgba(90,135,239,0.4)]'
                            : 'text-muted-foreground hover:text-foreground hover:bg-white/5 border border-white/10'
                      }`}>
                      {exam.name}
                      {!exam.available && <span className="ml-1.5 text-[10px] opacity-80">Soon</span>}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1.5 font-medium">Percentile / Score</label>
                    <input type="text" value={score} onChange={e => setScore(e.target.value)} placeholder="e.g. 98.45"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.05] border border-white/10 text-sm focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/15 placeholder:text-muted-foreground/40 transition-all text-foreground" />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1.5 font-medium">Category</label>
                    <select value={category} onChange={e => setCategory(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.05] border border-white/10 text-sm focus:outline-none focus:border-primary/60 text-foreground transition-all">
                      {[
                        { label: 'Open (General)', value: 'GOPENS' },
                        { label: 'OBC',            value: 'GOBCS'  },
                        { label: 'SC',             value: 'GSCS'   },
                        { label: 'ST',             value: 'GSTS'   },
                        { label: 'NT-1',           value: 'GNT1S'  },
                        { label: 'NT-2',           value: 'GNT2S'  },
                        { label: 'NT-3',           value: 'GNT3S'  },
                        { label: 'SEBC',           value: 'GSEBCS' },
                        { label: 'EWS',            value: 'EWS'    },
                        { label: 'TFWS',           value: 'TFWS'   },
                      ].map(c => (
                        <option key={c.value} value={c.value} style={{ backgroundColor: '#0d0d1b' }}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Location row */}
                <div className="mb-4">
                  <label className="block text-xs text-muted-foreground mb-1.5 font-medium">Preferred District</label>
                  <select value={location} onChange={e => setLocation(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.05] border border-white/10 text-sm focus:outline-none focus:border-primary/60 text-foreground transition-all">
                    <option value="" style={{ backgroundColor: '#0d0d1b' }}>All Maharashtra</option>
                    {['Mumbai','Pune','Nagpur','Thane','Nashik','Aurangabad','Navi Mumbai','Kolhapur','Solapur','Ahmednagar','Amravati','Jalgaon','Latur','Nanded','Satara','Sangli','Dhule','Akola','Yavatmal','Parbhani','Osmanabad','Panvel','Vasai','Raigad'].map(d => (
                      <option key={d} value={d} style={{ backgroundColor: '#0d0d1b' }}>{d}</option>
                    ))}
                  </select>
                </div>

                <button onClick={handlePredict}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 text-white font-semibold text-sm hover:opacity-90 transition-all flex items-center justify-center gap-2 group shadow-[0_4px_24px_rgba(90,135,239,0.4)]">
                  <Brain className="size-4" />
                  Predict My Admissions
                  <ArrowRight className="size-4 group-hover:translate-x-0.5 transition-transform" />
                </button>

                <p className="text-center text-xs text-muted-foreground/60 mt-3">Free · No signup required · Instant results</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Stats ── */}
        <section className="border-y border-white/[0.06] bg-card/30">
          <div className="max-w-7xl mx-auto px-5 py-12">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {stats.map(s => (
                <div key={s.label} className="text-center">
                  <div className="text-4xl md:text-5xl font-semibold tracking-tight mb-1.5 bg-gradient-to-br from-foreground to-muted-foreground bg-clip-text text-transparent">{s.value}</div>
                  <div className="text-sm text-muted-foreground">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Features ── */}
        <section className="max-w-7xl mx-auto px-5 py-24">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-blue-500/20 bg-blue-500/[0.08] text-blue-400 text-xs font-medium mb-5">
              <Layers className="size-3" />Intelligence Suite
            </div>
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-4">Everything you need to navigate admissions</h2>
            <p className="text-muted-foreground max-w-lg mx-auto leading-relaxed">Four precision tools working together to give you the full picture.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {features.map((f, i) => (
              <div key={i} className="p-7 rounded-2xl bg-card border border-white/[0.07] hover:border-white/[0.14] transition-all hover:-translate-y-0.5">
                <div className={`size-11 rounded-xl bg-gradient-to-br ${f.grad} flex items-center justify-center mb-6 shadow-lg`}>
                  <f.icon className="size-5 text-white" />
                </div>
                <h3 className="text-[15px] font-semibold mb-2.5">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── How it works ── */}
        <section className="border-y border-white/[0.06] bg-gradient-to-b from-card/20 to-transparent">
          <div className="max-w-7xl mx-auto px-5 py-24">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-4">How UniScout works</h2>
              <p className="text-muted-foreground max-w-md mx-auto">From your percentile to your perfect preference list in three steps.</p>
            </div>
            <div className="grid md:grid-cols-3 gap-10">
              {steps.map((step, i) => (
                <div key={i} className="relative flex flex-col items-center text-center group">
                  {i < steps.length - 1 && (
                    <div className="hidden md:block absolute top-7 left-[calc(50%+3.5rem)] right-[-3.5rem] h-px bg-gradient-to-r from-white/10 to-transparent" />
                  )}
                  <div className="size-14 rounded-2xl bg-gradient-to-br from-blue-600/15 to-violet-600/15 border border-blue-500/20 flex items-center justify-center mb-6 group-hover:border-blue-500/40 transition-colors">
                    <span className="text-[13px] font-mono font-semibold text-blue-400">{step.num}</span>
                  </div>
                  <h3 className="text-[15px] font-semibold mb-2.5">{step.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Exams ── */}
        <section className="max-w-7xl mx-auto px-5 py-24">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-semibold tracking-tight mb-3">Supported Exams</h2>
            <p className="text-muted-foreground">Live intelligence for MHT-CET, with more launching soon.</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {exams.map(exam => (
              <div key={exam.id}
                onClick={() => { if (!exam.available) return; if (exam.id === 'mhtcet-eng') onPortalSelect('mht-cet'); navigate(exam.route); }}
                className={`relative p-5 rounded-2xl border transition-all ${exam.available ? 'bg-card border-white/[0.08] hover:border-primary/30 hover:-translate-y-0.5 cursor-pointer' : 'bg-card/40 border-white/[0.04] opacity-55'}`}>
                {!exam.available && (
                  <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-semibold">SOON</div>
                )}
                {exam.available && (
                  <div className="absolute top-3.5 right-3.5 size-2 rounded-full bg-emerald-500 shadow-[0_0_8px_2px_rgba(34,197,94,0.35)]" />
                )}
                <div className="size-9 rounded-xl bg-gradient-to-br from-blue-500/15 to-violet-500/15 border border-blue-500/20 flex items-center justify-center mb-4">
                  <GraduationCap className="size-4 text-blue-400" />
                </div>
                <div className="text-[13px] font-semibold leading-snug mb-1">{exam.name}</div>
                <div className="text-xs text-muted-foreground">{exam.desc}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="max-w-7xl mx-auto px-5 py-28 flex justify-center">
          <div className="relative w-full max-w-3xl">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/25 to-violet-600/25 rounded-3xl blur-3xl" />
            <div className="relative p-12 md:p-16 rounded-3xl bg-gradient-to-br from-blue-950/60 to-violet-950/60 border border-white/[0.09] text-center">
              <div className="size-14 rounded-2xl bg-gradient-to-br from-blue-600/30 to-violet-600/30 border border-blue-500/20 flex items-center justify-center mx-auto mb-6">
                <Sparkles className="size-7 text-blue-400" />
              </div>
              <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-4">Your admission story starts here</h2>
              <p className="text-muted-foreground mb-8 max-w-md mx-auto leading-relaxed">Join thousands of students who used UniScout to predict, plan, and secure their dream college seats.</p>
              <button onClick={() => { onPortalSelect('mht-cet'); navigate('/mht-cet'); }}
                className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 text-white font-semibold hover:opacity-90 transition-opacity inline-flex items-center gap-2.5 group shadow-[0_4px_32px_rgba(90,135,239,0.4)]">
                Start Your Prediction
                <ArrowRight className="size-4 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>
        </section>

        {/* ── Footer ── */}
        <footer className="border-t border-white/[0.06]">
          <div className="max-w-7xl mx-auto px-5 py-7 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="size-5 rounded-md bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
                <Sparkles className="size-3 text-white" />
              </div>
              <span className="font-semibold text-foreground">UniScout</span>
              <span className="opacity-30">·</span>
              AI-Powered Admissions Intelligence
            </div>
            <div className="flex items-center gap-5">
              <span>© {new Date().getFullYear()} UniScout. All rights reserved.</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
