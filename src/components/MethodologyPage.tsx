/**
 * MethodologyPage — TASK-23
 * Explains the LightGBM model, training data, MAE, and known limitations.
 * Builds student trust before and after using the predictor.
 */
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  ArrowLeft, Brain, Database, BarChart2, AlertTriangle,
  CheckCircle, Zap, BookOpen, TrendingUp, HelpCircle,
} from 'lucide-react';
import { useSEO } from '../seo/useSEO';
import { SchemaOrg, faqSchema } from '../seo/SchemaOrg';

// ── Section wrapper ────────────────────────────────────────────────────────

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-card border border-white/[0.07] rounded-2xl p-6 ${className}`}>
      {children}
    </div>
  );
}

function SectionHeading({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <h2 className="flex items-center gap-2.5 text-base font-semibold text-foreground mb-4">
      <span className="text-primary">{icon}</span>
      {children}
    </h2>
  );
}

// ── Static data ────────────────────────────────────────────────────────────

const PIPELINE_STEPS = [
  {
    num: '01',
    title: 'Data Collection',
    desc: 'CAP round cutoffs scraped from DTE Maharashtra from 2022–2025 across all three rounds, 386 colleges, 103 branches, and all 11 reservation categories.',
  },
  {
    num: '02',
    title: 'Feature Engineering',
    desc: 'Each row becomes a feature vector: college code, branch, category, CAP round, year, historical average cutoff, seat intake, and location. Categorical features are label-encoded.',
  },
  {
    num: '03',
    title: 'Model Training',
    desc: 'A LightGBM gradient-boosted tree is trained to predict the closing percentile for a given college–branch–category–round–year combination. Training uses 4-fold cross-validation.',
  },
  {
    num: '04',
    title: 'Probability Calibration',
    desc: 'Raw predictions are combined with SHAP feature importances and historical variance (P10–P90 range) to produce a calibrated admission probability score.',
  },
  {
    num: '05',
    title: 'Band Assignment',
    desc: 'The probability is bucketed into Safe (>80%), Likely (50–80%), Moderate (20–50%), and Risky (<20%) bands. The band is set directly from the ML output — no rule-based overrides.',
  },
];

const STATS = [
  { value: '93 K+', label: 'Training records' },
  { value: '4 yrs', label: '2022 – 2025' },
  { value: '386', label: 'Colleges indexed' },
  { value: '4.3', label: 'Mean Absolute Error (percentile pts)' },
];

const LIMITATIONS = [
  'Predictions are based on historical patterns. Sudden policy changes, new branch introductions, or large seat-matrix revisions can shift cutoffs beyond the model\'s confidence interval.',
  'Category-specific data is sparser than Open category. Predictions for smaller categories (NT3, VJ/DT) carry wider confidence intervals.',
  'Cutoff history before 2022 is unavailable, so the model has at most 4 data points per cell. Branches introduced after 2023 have very limited history.',
  'The MAE of ~4.3 percentile points means a predicted cutoff of 85 could realistically land anywhere from 80 to 90. Always treat the P10–P90 range as the decision window, not just the midpoint.',
  'Placement and fees data is self-reported and may lag by 1–2 years. Some colleges have no placement data at all.',
];

const BAND_GUIDE = [
  { band: 'Safe',     prob: '> 80%',   color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', desc: 'Historical data shows most students at this percentile received admission.' },
  { band: 'Likely',   prob: '50–80%',  color: 'text-blue-400',    bg: 'bg-blue-500/10 border-blue-500/20',       desc: 'A reasonable shot — include these as primary targets.' },
  { band: 'Moderate', prob: '20–50%',  color: 'text-amber-400',   bg: 'bg-amber-500/10 border-amber-500/20',     desc: 'Possible but uncertain. Include a few for diversity.' },
  { band: 'Risky',    prob: '< 20%',   color: 'text-red-400',     bg: 'bg-red-500/10 border-red-500/20',         desc: 'Long shot. Still worth listing if it is your dream college.' },
];

// ── Page ────────────────────────────────────────────────────────────────────

export function MethodologyPage() {
  const navigate = useNavigate();

  useSEO({
    title: 'How Uniscout Works — AI Methodology & Data Sources | Uniscout',
    description:
      'Learn how Uniscout predicts MHT CET college admissions using LightGBM trained on 4 years of DTE Maharashtra cutoff data. Model accuracy, known limitations, and band definitions explained.',
    canonical: 'https://www.uniscout.co.in/how-it-works',
  });

  const faqs = [
    {
      question: 'How accurate is the Uniscout college predictor?',
      answer:
        'The LightGBM model has a Mean Absolute Error of ~4.3 percentile points on held-out test data. This means a predicted cutoff of 85 could realistically be between 80 and 90. Use the P10–P90 confidence range displayed on each college card as your decision window.',
    },
    {
      question: 'What data does Uniscout use?',
      answer:
        'Uniscout uses 4 years (2022–2025) of official DTE Maharashtra CAP Round closing percentiles across all three rounds, 386 colleges, 103 branches, and 11 reservation categories — roughly 93,000 records in total.',
    },
    {
      question: 'Why does my college show "—" instead of an admission probability?',
      answer:
        'This happens when the ML model has insufficient training data for that specific college–branch–category combination (typically new branches added after 2023). The band shown is derived from rule-based logic using the raw cutoff difference instead.',
    },
    {
      question: 'Does Uniscout guarantee admission?',
      answer:
        'No. Uniscout provides data-driven probability estimates, not guarantees. Cutoffs can shift due to seat matrix changes, exam difficulty variation, and policy changes. Always verify on dte.maharashtra.gov.in before final submission.',
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground pt-[60px]">
      <SchemaOrg id="methodology-faq" schema={faqSchema(faqs)} />

      <div className="max-w-4xl mx-auto px-5 py-10">
        {/* Back button */}
        <motion.button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-sm font-medium transition-colors mb-8"
          whileHover={{ x: -3 }}
        >
          <ArrowLeft className="size-4" />
          Back
        </motion.button>

        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-blue-500/20 bg-blue-500/[0.08] text-blue-400 text-xs font-medium mb-4">
            <Brain className="size-3" />
            Transparency
          </div>
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight mb-3">
            How Uniscout Predicts Admissions
          </h1>
          <p className="text-muted-foreground leading-relaxed max-w-2xl">
            Uniscout uses a machine-learning model trained on 4 years of official DTE Maharashtra
            cutoff data. This page explains exactly what it does, how accurate it is, and where
            it can be wrong — so you can make informed decisions.
          </p>
        </motion.div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {STATS.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="p-4 rounded-xl bg-card border border-white/[0.07] text-center"
            >
              <div className="text-2xl font-semibold text-primary mb-1">{s.value}</div>
              <div className="text-xs text-muted-foreground leading-tight">{s.label}</div>
            </motion.div>
          ))}
        </div>

        <div className="space-y-6">

          {/* Model pipeline */}
          <Card>
            <SectionHeading icon={<Zap className="size-4" />}>Model Pipeline</SectionHeading>
            <div className="space-y-4">
              {PIPELINE_STEPS.map((step, i) => (
                <motion.div
                  key={step.num}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + i * 0.06 }}
                  className="flex gap-4"
                >
                  <div className="size-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-[11px] font-mono font-bold text-primary">{step.num}</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground mb-0.5">{step.title}</p>
                    <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </Card>

          {/* Band definitions */}
          <Card>
            <SectionHeading icon={<BarChart2 className="size-4" />}>Admission Band Definitions</SectionHeading>
            <div className="grid sm:grid-cols-2 gap-3">
              {BAND_GUIDE.map(b => (
                <div key={b.band} className={`p-4 rounded-xl border ${b.bg}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`font-bold text-sm ${b.color}`}>{b.band}</span>
                    <span className="text-xs text-muted-foreground font-mono ml-auto">{b.prob}</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{b.desc}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground/60 mt-4">
              The P10–P90 range shown on each college card is the 10th–90th percentile of historical
              cutoffs for that cell. Students within this range have historically had mixed outcomes
              — use it as a sensitivity check, not a hard threshold.
            </p>
          </Card>

          {/* Data sources */}
          <Card>
            <SectionHeading icon={<Database className="size-4" />}>Data Sources</SectionHeading>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li className="flex items-start gap-2.5">
                <CheckCircle className="size-4 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong className="text-foreground">Cutoff data:</strong> Official DTE Maharashtra CAP round closing percentiles, 2022–2025, all three rounds.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle className="size-4 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong className="text-foreground">Seat matrix:</strong> Intake data from the DTE Maharashtra seat matrix PDFs, corrected manually where OCR errors were found.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle className="size-4 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong className="text-foreground">Fees:</strong> Annual fee data from DTE Maharashtra disclosure statements (2025–26). Present for ~66% of colleges; others show "Not reported".</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle className="size-4 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong className="text-foreground">Placements:</strong> Self-reported average and highest package data from college portals and AICTE disclosures. Availability varies.</span>
              </li>
            </ul>
          </Card>

          {/* Known limitations */}
          <Card className="border-amber-500/20 bg-amber-500/[0.04]">
            <SectionHeading icon={<AlertTriangle className="size-4 text-amber-400" />}>
              Known Limitations
            </SectionHeading>
            <ul className="space-y-3">
              {LIMITATIONS.map((lim, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="size-1.5 rounded-full bg-amber-500/60 shrink-0 mt-2" />
                  {lim}
                </li>
              ))}
            </ul>
          </Card>

          {/* FAQ */}
          <Card>
            <SectionHeading icon={<HelpCircle className="size-4" />}>Frequently Asked Questions</SectionHeading>
            <div className="space-y-4">
              {faqs.map((faq, i) => (
                <div key={i} className="border-b border-white/[0.06] last:border-0 pb-4 last:pb-0">
                  <p className="text-sm font-semibold text-foreground mb-1.5">{faq.question}</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">{faq.answer}</p>
                </div>
              ))}
            </div>
          </Card>

          {/* CTA */}
          <div className="flex flex-col sm:flex-row items-center gap-4 p-6 rounded-2xl bg-gradient-to-br from-blue-950/60 to-violet-950/60 border border-blue-500/20 text-center sm:text-left">
            <TrendingUp className="size-10 text-blue-400 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground mb-1">Ready to check your chances?</p>
              <p className="text-xs text-muted-foreground">Enter your percentile and get AI-powered predictions for 386 colleges — free, no signup required.</p>
            </div>
            <button
              onClick={() => navigate('/mht-cet/engineering')}
              className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity whitespace-nowrap shrink-0 flex items-center gap-2"
            >
              <Brain className="size-4" />
              Predict Now
            </button>
          </div>

          {/* Disclaimer */}
          <p className="text-xs text-muted-foreground/50 text-center pb-8">
            Uniscout is an independent tool and is not affiliated with DTE Maharashtra, the State CET Cell, or any college.
            Always verify admission information on{' '}
            <a href="https://dte.maharashtra.gov.in" target="_blank" rel="noreferrer" className="underline hover:text-muted-foreground">
              dte.maharashtra.gov.in
            </a>{' '}
            before making any decision.
          </p>

        </div>
      </div>
    </div>
  );
}

export default MethodologyPage;
