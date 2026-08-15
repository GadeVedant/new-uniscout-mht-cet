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

  const handlePredict = () => {
    onPortalSelect('mht-cet');
    navigate('/mht-cet');
  };

  useSEO({
    title: 'MHT CET College Predictor 2025 – AI-Powered Admission Predictions | Uniscout',
    description: 'Get AI-powered MHT CET college predictions for 2025. Enter your percentile, category & branch to see admission probability for 386 Maharashtra engineering colleges. Free, instant results.',
    canonical: 'https://www.uniscout.co.in/',
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SchemaOrg id="home-faq" schema={faqSchema([
        { question: 'How does the MHT CET college predictor work?', answer: 'Enter your CET percentile, category, and branch preference. Our AI analyzes 4 years of cutoff data to predict your admission probability at each college.' },
        { question: 'Is Uniscout free to use?', answer: 'Yes, Uniscout is completely free. No sign-up required — just enter your score and get instant predictions.' },
        { question: 'Which categories are supported?', answer: 'All 11 Maharashtra reservation categories: Open, SC, ST, OBC, SEBC, EWS, NT1, NT2, NT3, VJ/DT, and TFWS.' },
        { question: 'Can I download the preference list?', answer: 'Yes — generate your Safe, Target & Dream picks and download as a PDF for the DTE portal.' },
      ])} />

      {/* ── Navbar ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/[0.06] bg-gradient-to-r from-[#4facfe] via-[#a78bfa] to-[#f093fb] backdrop-blur-2xl">
        <div className="max-w-7xl mx-auto px-5 flex items-center h-[60px] gap-6">
          <button onClick={() => navigate('/')} className="flex items-center gap-2.5 shrink-0">
            <div className="size-7 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-[0_0_12px_rgba(90,135,239,0.5)]">
              <Sparkles className="size-3.5 text-white" />
            </div>
            <span className="text-sm font-bold tracking-tight text-white">Uniscout</span>
          </button>

          <div className="hidden md:flex items-center gap-0.5 flex-1">
            {[
              { label: 'Home',       route: '/'           },
              { label: 'Predictor',  route: '/mht-cet'    },
              { label: 'Form Filling',route: '/smart-form' },
              { label: 'Compare',    route: '/compare'    },
            ].map(item => (
              <button key={item.label} onClick={() => navigate(item.route)}
                className="px-3.5 py-1.5 rounded-lg text-[13px] font-semibold text-slate-800 hover:text-slate-900 hover:bg-black/10 transition-all">
                {item.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 ml-auto">
            <button className="size-8 rounded-lg hover:bg-black/10 flex items-center justify-center transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="size-4" fill="none" viewBox="0 0 24 24" stroke="#ffffff" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
            </button>
            <button onClick={() => { onPortalSelect('mht-cet'); navigate('/mht-cet'); }}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-red-600 text-white text-[13px] font-medium hover:bg-red-500 transition-colors shadow-[0_0_16px_rgba(220,38,38,0.35)]">
              <Brain className="size-3.5" />
              Predict Now
            </button>
          </div>
        </div>
      </nav>

      <div className="pt-[60px]">
        {/* ── Hero ── */}
        <section className="relative min-h-[calc(100vh-60px)] flex items-start justify-center overflow-hidden pt-8">
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute top-[20%] left-1/2 -translate-x-1/2 w-[900px] h-[700px] bg-blue-600/[0.12] rounded-full blur-[140px]" />
            <div className="absolute top-[30%] left-[20%] w-[500px] h-[500px] bg-violet-600/[0.09] rounded-full blur-[120px]" />
            <div className="absolute top-[40%] right-[15%] w-[400px] h-[400px] bg-indigo-600/[0.08] rounded-full blur-[100px]" />
            <div className="absolute inset-0 opacity-[0.018]"
              style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.4) 1px, transparent 1px)', backgroundSize: '64px 64px' }} />
          </div>

          <div className="relative max-w-7xl mx-auto px-4 py-8 flex flex-col items-center text-center w-full overflow-hidden">
            <div className="mb-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-violet-500/30 bg-violet-500/[0.08] text-violet-300 text-xs font-medium">
              <Sparkles className="size-3 shrink-0" />
              <span className="text-xs">AI-Powered Admissions Intelligence</span>
            </div>

            <h1 className="text-[36px] sm:text-[56px] md:text-[100px] font-black tracking-tight leading-none mb-4 select-none w-full">
              <span className="relative inline-flex items-center gap-2 md:gap-4 justify-center flex-wrap">
                <GraduationCap className="w-8 h-8 sm:w-12 sm:h-12 md:w-20 md:h-20 text-cyan-400 drop-shadow-[0_0_18px_rgba(6,182,212,0.8)] shrink-0" />
                <span
                  className="bg-gradient-to-r from-[#6dd5fa] via-[#a78bfa] to-[#f093fb] bg-clip-text text-transparent"
                  style={{ filter: 'drop-shadow(0 0 24px rgba(109,213,250,0.6)) drop-shadow(0 0 48px rgba(167,139,250,0.4))' }}
                >
                  UNISCOUT
                </span>
                <Sparkles className="absolute -top-2 left-[55%] w-4 h-4 sm:w-5 sm:h-5 md:w-7 md:h-7 text-yellow-300 drop-shadow-[0_0_10px_rgba(253,224,71,0.9)]" />
              </span>
            </h1>

            <h3 className="text-sm sm:text-base md:text-2xl font-semibold mb-4 bg-gradient-to-r from-[#6dd5fa] via-[#a78bfa] to-[#f093fb] bg-clip-text text-transparent">
              Sponsored by A.G.O
            </h3>

            <h2 className="text-[24px] sm:text-[36px] md:text-[60px] font-semibold tracking-[-0.02em] leading-[1.15] mb-5 w-full px-2">
              Predict Your Admission.
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-violet-400 to-blue-400">
                Decide With Confidence.
              </span>
            </h2>

            <p className="text-sm md:text-lg text-muted-foreground w-full max-w-xl mb-8 leading-relaxed px-2">
              Uniscout analyzes years of entrance exam cutoff data to predict your exact admission probability
              across 386 colleges. Stop guessing. Start planning.
            </p>

            {/* Prediction card */}
            <div className="w-full max-w-[580px]">
              <div className="bg-card/70 backdrop-blur-2xl border border-white/[0.09] rounded-2xl p-6 shadow-[0_32px_80px_rgba(0,0,0,0.6)]">

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
              <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-4">How Uniscout works</h2>
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
              <p className="text-muted-foreground mb-8 max-w-md mx-auto leading-relaxed">Join thousands of students who used Uniscout to predict, plan, and secure their dream college seats.</p>
              <button onClick={() => { onPortalSelect('mht-cet'); navigate('/mht-cet'); }}
                className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 text-white font-semibold hover:opacity-90 transition-opacity inline-flex items-center gap-2.5 group shadow-[0_4px_32px_rgba(90,135,239,0.4)]">
                Start Your Prediction
                <ArrowRight className="size-4 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>
        </section>

        {/* ── Footer ── */}
        <footer className="border-t border-white/[0.06]" style={{ background: 'linear-gradient(180deg, #0f0a3e 0%, #1a1260 40%, #1e1b6e 100%)' }}>

          {/* Top banner */}
          <div className="flex justify-center pt-10 pb-6 px-5">
            <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 text-cyan-300 text-sm font-medium">
              <Sparkles className="size-4" />
              Uniscout — Your AI-powered college admission companion. Find the right college, faster.
              <Sparkles className="size-4" />
            </div>
          </div>

          <div className="border-t border-white/[0.06] mx-5" />

          {/* Main footer columns */}
          <div className="max-w-7xl mx-auto px-5 py-12 grid grid-cols-1 md:grid-cols-3 gap-12">

            {/* Col 1 — Brand */}
            <div>
              <div className="flex items-center gap-3 mb-2">
                <img
                  src="/ago-logo.png.jpeg"
                  alt="A.G.O Innovations Logo"
                  className="w-14 h-14 rounded-full object-cover border-2 border-white/20 shadow-lg"
                />
                <div>
                  <span className="text-lg font-bold text-cyan-400">A.G.O Innovations</span>
                  <p className="text-sm text-slate-300 mt-0.5">Team Incredible</p>
                </div>
              </div>
              <p className="text-cyan-400 font-semibold text-sm mt-3">One platform. Many possibilities.</p>
            </div>

            {/* Col 2 — Quick Links */}
            <div>
              <h4 className="text-white font-semibold mb-5 text-base">Quick Links</h4>
              <ul className="space-y-3">
                {[
                  { label: 'Home',         route: '/'           },
                  { label: 'Predictor',    route: '/mht-cet'    },
                  { label: 'Form Filling', route: '/smart-form' },
                  { label: 'Compare',      route: '/compare'    },
                ].map(link => (
                  <li key={link.route}>
                    <button
                      onClick={() => navigate(link.route)}
                      className="text-muted-foreground hover:text-white text-sm transition-colors"
                    >
                      {link.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Col 3 — Contact Us */}
            <div>
              <h4 className="text-white font-semibold mb-5 text-base">Contact Us</h4>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <div className="size-9 rounded-xl bg-blue-600 flex items-center justify-center shrink-0">
                    <svg className="size-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                  </div>
                  <div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Email</div>
                    <div className="text-sm text-white">help.agoinnovations@gmail.com</div>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="size-9 rounded-xl bg-green-600 flex items-center justify-center shrink-0">
                    <svg className="size-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
                  </div>
                  <div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Phone</div>
                    <div className="text-sm text-white">+91 9322578756</div>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="size-9 rounded-xl bg-violet-600 flex items-center justify-center shrink-0">
                    <svg className="size-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
                  </div>
                  <div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Phone</div>
                    <div className="text-sm text-white">+91 9372663841</div>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="size-9 rounded-xl bg-orange-500 flex items-center justify-center shrink-0">
                    <svg className="size-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
                  </div>
                  <div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Phone</div>
                    <div className="text-sm text-white">+91 7738340929</div>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="size-9 rounded-xl bg-cyan-600 flex items-center justify-center shrink-0">
                    <svg className="size-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                  </div>
                  <div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Address</div>
                    <div className="text-sm text-white">Mumbai, India</div>
                  </div>
                </li>
              </ul>
            </div>
          </div>

          {/* Connect With Us */}
          <div className="border-t border-white/[0.06] py-10 px-5 text-center">
            <h4 className="text-cyan-400 font-bold text-2xl mb-6">Connect With Us</h4>
            <div className="flex justify-center gap-5 mb-6">
              <a href="mailto:help.agoinnovations@gmail.com" className="size-14 rounded-full bg-red-500 hover:bg-red-400 flex items-center justify-center transition-colors shadow-lg">
                <svg className="size-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
              </a>
              <a href="https://instagram.com/ago.innovations" target="_blank" rel="noreferrer" className="size-14 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 hover:opacity-90 flex items-center justify-center transition-opacity shadow-lg">
                <svg className="size-6 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
              </a>
              <a href="https://youtube.com/@ago.innovations" target="_blank" rel="noreferrer" className="size-14 rounded-full bg-red-600 hover:bg-red-500 flex items-center justify-center transition-colors shadow-lg">
                <svg className="size-6 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
              </a>
              <a href="https://facebook.com/agoinnovations" target="_blank" rel="noreferrer" className="size-14 rounded-full bg-blue-600 hover:bg-blue-500 flex items-center justify-center transition-colors shadow-lg">
                <svg className="size-6 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
              </a>
            </div>
            <div className="space-y-1 text-sm text-muted-foreground mb-8">
              <p><span className="font-semibold text-white">Gmail:</span> help.agoinnovations@gmail.com</p>
              <p><span className="font-semibold text-white">Instagram:</span> ago.innovations</p>
              <p><span className="font-semibold text-white">YouTube:</span> @ago.innovations</p>
              <p><span className="font-semibold text-white">Facebook:</span> A.G.O Innovations</p>
            </div>
            <div className="border-t border-white/[0.06] pt-6">
              <p className="text-white font-bold text-base mb-1">© 2025 A.G.O Innovations. All rights reserved.</p>
              <p className="text-muted-foreground text-sm">Made with <span className="text-red-400">♡</span> in India</p>
            </div>
          </div>

        </footer>
      </div>
    </div>
  );
}
