/**
 * ExamLandingPage — reusable landing page for each exam predictor.
 * Each exam gets its own route, H1, meta, and structured data.
 * "Coming soon" exams show a waitlist CTA; live exams link to the predictor.
 */
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, ArrowRight, Construction, CheckCircle } from 'lucide-react';
import { useSEO } from '../seo/useSEO';
import { SchemaOrg } from '../seo/SchemaOrg';

export interface ExamConfig {
  exam: string;                  // "JEE Main & Advanced"
  slug: string;                  // "jee-college-predictor"
  shortName: string;             // "JEE"
  title: string;                 // full <title> tag value
  description: string;           // meta description
  canonical: string;
  h1: string;
  subheading: string;
  liveRoute?: string;            // if set, "Start Predicting" button goes here
  colleges: string[];            // example colleges for this exam
  features: string[];
  faqs: { q: string; a: string }[];
  color?: string;                 // tailwind gradient class (optional)
}

interface ExamLandingPageProps {
  config: ExamConfig;
}

export function ExamLandingPage({ config }: ExamLandingPageProps) {
  const navigate = useNavigate();

  useSEO({
    title: config.title,
    description: config.description,
    canonical: config.canonical,
  });

  const schema = {
    '@type': 'WebPage',
    name: config.title,
    description: config.description,
    url: config.canonical,
    mainEntity: {
      '@type': 'WebApplication',
      name: `${config.exam} College Predictor – UniScout`,
      applicationCategory: 'EducationApplication',
      description: config.description,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR' },
    },
  };

  const faqSchema = {
    '@type': 'FAQPage',
    mainEntity: config.faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };

  return (
    <main className="min-h-screen px-4 py-8 relative z-10">
      <SchemaOrg id={`${config.slug}-page`} schema={schema} />
      <SchemaOrg id={`${config.slug}-faq`} schema={faqSchema} />

      <div className="max-w-4xl mx-auto">
        {/* Back */}
        <header className="mb-10">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-slate-300 transition-all"
            aria-label="Back to home"
          >
            <ArrowLeft className="w-4 h-4" />
            Home
          </button>
        </header>

        {/* Hero */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-14"
        >
          <div className="inline-block px-4 py-1.5 bg-blue-500/15 border border-blue-400/25 rounded-full text-blue-300 text-xs font-semibold uppercase tracking-widest mb-5">
            {config.exam} · College Predictor
          </div>

          <h1 className="text-3xl md:text-5xl font-black text-white mb-4 leading-tight">
            {config.h1}
          </h1>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto mb-8">
            {config.subheading}
          </p>

          {config.liveRoute ? (
            <button
              onClick={() => navigate(config.liveRoute!)}
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold rounded-2xl shadow-lg transition-all"
            >
              Start Predicting
              <ArrowRight className="w-5 h-5" />
            </button>
          ) : (
            <div className="inline-flex items-center gap-3 px-6 py-3 bg-white/5 border border-white/10 rounded-2xl text-slate-400">
              <Construction className="w-5 h-5 text-amber-400" />
              <span>Coming soon — we're building this predictor</span>
            </div>
          )}
        </motion.section>

        {/* Features */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          aria-label="Features"
          className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-14"
        >
          {config.features.map((f) => (
            <div key={f} className="flex items-start gap-3 p-4 bg-white/5 border border-white/10 rounded-xl">
              <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <span className="text-slate-300 text-sm">{f}</span>
            </div>
          ))}
        </motion.section>

        {/* Top colleges for this exam */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mb-14"
        >
          <h2 className="text-xl font-bold text-white mb-4">
            Top Colleges via {config.shortName}
          </h2>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {config.colleges.map((college) => (
              <li
                key={college}
                className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-slate-300 text-sm"
              >
                {college}
              </li>
            ))}
          </ul>
        </motion.section>

        {/* FAQ — structured data + content for ranking */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          aria-label="Frequently asked questions"
        >
          <h2 className="text-xl font-bold text-white mb-5">
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            {config.faqs.map((faq) => (
              <details
                key={faq.q}
                className="group p-4 bg-white/5 border border-white/10 rounded-xl cursor-pointer"
              >
                <summary className="text-white font-medium text-sm list-none flex justify-between items-center">
                  {faq.q}
                  <span className="text-slate-500 group-open:rotate-180 transition-transform">▾</span>
                </summary>
                <p className="mt-3 text-slate-400 text-sm leading-relaxed">{faq.a}</p>
              </details>
            ))}
          </div>
        </motion.section>
      </div>
    </main>
  );
}
