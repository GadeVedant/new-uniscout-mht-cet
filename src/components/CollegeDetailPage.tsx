import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation, Navigate } from 'react-router-dom';
import {
  ChevronRight, MapPin, Building2, GraduationCap,
  DollarSign, Users, Award, TrendingUp, AlertCircle,
  RefreshCw, Trophy, Briefcase, Brain, Star,
} from 'lucide-react';
import {
  AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { api, CollegeRecommendation, CutoffHistoryEntry } from '../services/api';
import { useSEO } from '../seo/useSEO';
import { SchemaOrg, collegeSchema, breadcrumbSchema, faqSchema } from '../seo/SchemaOrg';
import { SimilarColleges } from './SimilarColleges';

// ---------------------------------------------------------------------------
// Pure helpers (exported for testing)
// ---------------------------------------------------------------------------

export function computeYAxisDomain(data: CutoffHistoryEntry[]): [number, number] {
  if (data.length === 0) return [0, 100];
  const vals = data.map((d) => d.cutoffPercentile);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  return [Math.floor(min) - 2, Math.ceil(max) + 2];
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface CollegeDetailPageProps {
  colleges: CollegeRecommendation[];
}

// ── Design system tokens ────────────────────────────────────────────────────

const BAND_CONFIG = {
  Safe:     { bg: 'bg-emerald-500/[0.12]', border: 'border-emerald-500/30', text: 'text-emerald-400', dot: 'bg-emerald-500' },
  Likely:   { bg: 'bg-blue-500/[0.12]',    border: 'border-blue-500/30',    text: 'text-blue-400',    dot: 'bg-blue-500'    },
  Moderate: { bg: 'bg-amber-500/[0.12]',   border: 'border-amber-500/30',   text: 'text-amber-400',   dot: 'bg-amber-500'   },
  Risky:    { bg: 'bg-red-500/[0.12]',     border: 'border-red-500/30',     text: 'text-red-400',     dot: 'bg-red-500'     },
} as const;

const CONFIDENCE_CONFIG = {
  'High confidence':              'text-emerald-400',
  'Medium confidence':            'text-amber-400',
  'Low confidence (estimated)':   'text-muted-foreground',
} as const;

// ── Sub-components ──────────────────────────────────────────────────────────

function SectionCard({ children, className = '', ...props }: { children: React.ReactNode; className?: string; [key: string]: unknown }) {
  return (
    <div className={`bg-card border border-white/[0.07] rounded-2xl p-6 ${className}`} {...props}>
      {children}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-[15px] font-semibold text-foreground mb-4">{children}</h3>;
}

function AdmissionBadge({ category }: { category: string }) {
  const cfg = BAND_CONFIG[category as keyof typeof BAND_CONFIG] ?? BAND_CONFIG.Moderate;
  const labels: Record<string, string> = { Safe: 'Safe', Likely: 'Likely', Moderate: 'Moderate', Risky: 'Risky' };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
      <span className={`size-1.5 rounded-full ${cfg.dot}`} />
      {labels[category] ?? category}
    </span>
  );
}

// ── Hero Section ────────────────────────────────────────────────────────────

function HeroSection({ college }: { college: CollegeRecommendation }) {
  return (
    <div className="flex items-start gap-6 flex-wrap">
      <div className="size-16 rounded-2xl bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center shrink-0 shadow-[0_4px_24px_rgba(90,135,239,0.35)]">
        <Building2 className="size-8 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-4 flex-wrap mb-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-semibold text-foreground mb-2 tracking-tight leading-tight">{college.name}</h1>
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5"><MapPin className="size-3.5" />{college.location}{college.district && college.district !== college.location ? `, ${college.district}` : ''}</span>
              {college.collegeType && <span data-testid="college-type-badge" className="flex items-center gap-1.5"><Building2 className="size-3.5" />{college.collegeType}</span>}
              <span className="px-1.5 py-0.5 rounded-md bg-white/[0.05] border border-white/10 text-[11px]">Code: {college.code}</span>
            </div>
          </div>
          <AdmissionBadge category={college.admissionBand ?? college.admissionChance ?? 'Moderate'} />
        </div>
        <p className="text-primary font-semibold text-lg">{college.branch}</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Probability Bar
// ---------------------------------------------------------------------------

function ProbabilityBar({
  studentPercentile,
  p10,
  p90,
}: {
  studentPercentile: number;
  p10: number;
  p90: number;
}) {
  const clamp = (v: number) => Math.max(0, Math.min(100, v));
  const bandLeft = clamp(p10);
  const bandWidth = clamp(p90) - bandLeft;
  const markerLeft = clamp(studentPercentile);

  return (
    <div className="relative h-6 bg-white/10 rounded-full overflow-visible my-3" aria-label="Probability bar">
      {/* P10–P90 shaded band */}
      <div
        className="absolute top-0 h-full bg-cyan-400/30 rounded-full"
        style={{ left: `${bandLeft}%`, width: `${bandWidth}%` }}
      />
      {/* Student percentile marker */}
      <div
        className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg shadow-white/40 border-2 border-cyan-400 z-10"
        style={{ left: `calc(${markerLeft}% - 6px)` }}
        aria-label={`Your percentile: ${studentPercentile}`}
      />
      {/* Labels */}
      <div className="absolute -bottom-5 left-0 text-xs text-white/50">0</div>
      <div className="absolute -bottom-5 right-0 text-xs text-white/50">100</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Chances Section
// ---------------------------------------------------------------------------

function ChancesSection({
  college,
  studentPercentile,
}: {
  college: CollegeRecommendation;
  studentPercentile?: number;
}) {
  if (college.admissionBand) {
    const cfg = BAND_CONFIG[college.admissionBand] ?? BAND_CONFIG.Moderate;
    const confClass = college.confidenceLabel
      ? (CONFIDENCE_CONFIG[college.confidenceLabel as keyof typeof CONFIDENCE_CONFIG] ?? 'text-slate-400')
      : 'text-slate-400';

    return (
      <SectionCard>
        <SectionTitle>Your Chances</SectionTitle>

        {/* Band badge */}
        <div className={`inline-flex items-center gap-2 px-4 py-2 ${cfg.bg} border ${cfg.border} rounded-full mb-4`}>
          <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
          <span className={`font-bold text-lg ${cfg.text}`}>{college.admissionBand}</span>
        </div>

        {/* Probability bar */}
        {college.p10 != null && college.p90 != null && (college.p10 > 0 || college.p90 > 0) && studentPercentile != null && (
          <div className="mb-8">
            <ProbabilityBar
              studentPercentile={studentPercentile}
              p10={college.p10}
              p90={college.p90}
            />
          </div>
        )}

        {/* P10/P90 range — only show when values are meaningful (non-zero) */}
        {college.p10 != null && college.p90 != null && (college.p10 > 0 || college.p90 > 0) && (
          <p className="text-sm text-white/70 mb-3">
            Cutoff range: <span className="text-white font-semibold">P10: {college.p10.toFixed(1)}</span>
            {' – '}
            <span className="text-white font-semibold">P90: {college.p90.toFixed(1)}</span>
          </p>
        )}

        {/* Confidence label */}
        {college.confidenceLabel && (
          <p className={`text-sm font-medium mb-4 ${confClass}`}>{college.confidenceLabel}</p>
        )}

        {/* Top factors */}
        {college.topFactors && college.topFactors.length > 0 && (
          <div>
            <p className="text-xs text-white/50 uppercase tracking-wider mb-2">Key Factors</p>
            <div className="flex flex-wrap gap-2">
              {college.topFactors.slice(0, 3).map((f) => (
                <span key={f} className="px-3 py-1 bg-white/10 rounded-full text-xs text-white/80 border border-white/10">
                  {f}
                </span>
              ))}
            </div>
          </div>
        )}
      </SectionCard>
    );
  }

  // Legacy fallback
  const legacyColor = college.admissionChance === 'High'
    ? 'text-emerald-300'
    : college.admissionChance === 'Medium'
    ? 'text-amber-300'
    : 'text-red-300';

  return (
    <SectionCard>
      <SectionTitle>Your Chances</SectionTitle>
      <div className="flex items-center gap-3">
        <span className={`text-2xl font-bold ${legacyColor}`}>{college.admissionChance}</span>
        <span className="text-xs text-white/40 border border-white/20 rounded-full px-2 py-0.5">Basic prediction</span>
      </div>
    </SectionCard>
  );
}

// ---------------------------------------------------------------------------
// Cutoff History Section
// ---------------------------------------------------------------------------

function CutoffHistorySection({
  data,
  loading,
  error,
  onRetry,
}: {
  data: CutoffHistoryEntry[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}) {
  const domain = computeYAxisDomain(data);

  return (
    <SectionCard>
      <SectionTitle>Cutoff History</SectionTitle>

      {loading && (
        <div className="animate-pulse space-y-3" aria-label="Loading cutoff history">
          <div className="h-4 bg-white/10 rounded w-3/4" />
          <div className="h-40 bg-white/10 rounded-xl" />
        </div>
      )}

      {!loading && error && (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <AlertCircle className="w-8 h-8 text-red-400" />
          <p className="text-red-300 text-sm">{error}</p>
          <button
            onClick={onRetry}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-sm text-white transition-colors"
            aria-label="Retry loading cutoff history"
          >
            <RefreshCw className="w-4 h-4" /> Retry
          </button>
        </div>
      )}

      {!loading && !error && data.length === 0 && (
        <p className="text-white/50 text-sm py-4">No historical data available for this combination.</p>
      )}

      {!loading && !error && data.length === 1 && (
        <div className="py-4">
          <p className="text-white/70 text-sm mb-2">
            2025 cutoff: <span className="text-cyan-300 font-bold">{data[0].cutoffPercentile.toFixed(2)}</span>
          </p>
          <p className="text-white/40 text-xs">Historical data for previous years is not yet available for this branch/category combination.</p>
        </div>
      )}

      {!loading && !error && data.length > 1 && (
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis dataKey="year" stroke="rgba(255,255,255,0.5)" tick={{ fontSize: 12 }} />
            <YAxis domain={domain} stroke="rgba(255,255,255,0.5)" tick={{ fontSize: 12 }} />
            <Tooltip
              contentStyle={{ background: 'rgba(15,23,42,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
              labelStyle={{ color: '#94a3b8' }}
              itemStyle={{ color: '#67e8f9' }}
            />
            <Line
              type="monotone"
              dataKey="cutoffPercentile"
              stroke="#22d3ee"
              strokeWidth={2}
              dot={{ fill: '#22d3ee', r: 4 }}
              activeDot={{ r: 6 }}
              name="Cutoff %ile"
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </SectionCard>
  );
}
// ---------------------------------------------------------------------------

function PlacementSection({ college }: { college: CollegeRecommendation }) {
  const hasAvg = college.avgPackage != null;
  const hasHighest = college.highestPackage != null;
  if (!hasAvg && !hasHighest) return null;

  return (
    <SectionCard data-testid="placement-section">
      <SectionTitle>Placements</SectionTitle>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {hasAvg && (
          <div className="flex items-center gap-3 bg-white/5 rounded-xl p-4">
            <Briefcase className="w-6 h-6 text-cyan-400 shrink-0" />
            <div>
              <p className="text-xs text-white/50">Avg Package</p>
              <p className="text-white font-bold">{college.avgPackage}</p>
            </div>
          </div>
        )}
        {hasHighest && (
          <div className="flex items-center gap-3 bg-white/5 rounded-xl p-4">
            <Trophy className="w-6 h-6 text-yellow-400 shrink-0" />
            <div>
              <p className="text-xs text-white/50">Highest Package</p>
              <p className="text-white font-bold">{college.highestPackage}</p>
            </div>
          </div>
        )}
      </div>
    </SectionCard>
  );
}

// ---------------------------------------------------------------------------
// College Info Section
// ---------------------------------------------------------------------------

function CollegeInfoSection({ college }: { college: CollegeRecommendation }) {
  const items = [
    { icon: <DollarSign className="w-4 h-4 text-green-400" />, label: 'Fees', value: college.fees || 'Not available' },
    { icon: <Users className="w-4 h-4 text-blue-400" />, label: 'Seats', value: college.seats ? String(college.seats) : 'Not available' },
    { icon: <Building2 className="w-4 h-4 text-purple-400" />, label: 'Branch', value: college.branch },
    { icon: <Award className="w-4 h-4 text-amber-400" />, label: 'Category', value: college.category },
    { icon: <GraduationCap className="w-4 h-4 text-cyan-400" />, label: 'CAP Round', value: `Round ${college.capRound}` },
  ];

  return (
    <SectionCard>
      <SectionTitle>College Info</SectionTitle>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {items.map(({ icon, label, value }) => (
          <div key={label} className="bg-white/5 rounded-xl p-3 flex items-start gap-3">
            <span className="mt-0.5 shrink-0">{icon}</span>
            <div>
              <p className="text-xs text-white/50">{label}</p>
              <p className="text-sm text-white font-medium">{value}</p>
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

// ---------------------------------------------------------------------------
// Round 2 Strategy Section
// ---------------------------------------------------------------------------

function Round2StrategySection({ college }: { college: CollegeRecommendation }) {
  if (!college.round2Opportunity) return null;

  const message = college.round2Delta != null
    ? `This college's cutoff typically drops ${college.round2Delta.toFixed(1)} percentile points in Round 2.`
    : "This college's cutoff typically drops in Round 2.";

  return (
    <SectionCard
      data-testid="round2-section"
      className="border-teal-400/30 bg-teal-500/10"
    >
      <div className="flex items-start gap-3">
        <TrendingUp className="w-5 h-5 text-teal-400 shrink-0 mt-0.5" />
        <div>
          <h2 className="text-lg font-bold text-teal-300 mb-1">Round 2 Strategy</h2>
          <p className="text-sm text-teal-200/80">{message}</p>
        </div>
      </div>
    </SectionCard>
  );
}

// ---------------------------------------------------------------------------
// College FAQ Section — content SEO
// ---------------------------------------------------------------------------

function CollegeFAQSection({ college }: { college: CollegeRecommendation }) {
  const faqs = [
    {
      question: `What is the MHT CET cutoff for ${college.name} ${college.branch}?`,
      answer: `The MHT CET 2025 cutoff for ${college.name} ${college.branch} (${college.category} category) is ${college.cutoffPercentile} percentile. This is based on CAP Round ${college.capRound} data.`,
    },
    {
      question: `What are the fees for ${college.branch} at ${college.name}?`,
      answer: college.fees
        ? `The annual fees for ${college.branch} at ${college.name} is approximately ₹${college.fees}. Fees may vary based on category and year of admission.`
        : `Fee information for ${college.name} is not available in our current dataset. Please check the official DTE Maharashtra website or contact the college directly.`,
    },
    {
      question: `How many seats are available for ${college.branch} at ${college.name}?`,
      answer: college.seats
        ? `${college.name} has ${college.seats} seats for ${college.branch} under the CAP quota.`
        : `Seat intake data for ${college.name} ${college.branch} is not available. Please refer to the DTE Maharashtra seat matrix.`,
    },
    {
      question: `What is the admission probability for ${college.name} with my percentile?`,
      answer: `Uniscout's AI model predicts your admission probability based on 4 years of historical cutoff data. The current admission band for ${college.name} ${college.branch} is "${college.admissionBand}". Enter your percentile on the MHT CET predictor page for a personalized probability score.`,
    },
    ...(college.avgPackage ? [{
      question: `What is the average placement package at ${college.name}?`,
      answer: `The average placement package at ${college.name} is ${college.avgPackage}${college.highestPackage ? `, with the highest package recorded at ${college.highestPackage}` : ''}. Placement data is based on available records and may vary by branch and year.`,
    }] : []),
  ];

  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <SectionCard>
      <SchemaOrg id={`faq-${college.code}`} schema={faqSchema(faqs)} />
      <SectionTitle>Frequently Asked Questions</SectionTitle>
      <div className="space-y-3">
        {faqs.map((faq, i) => (
          <div key={i} className="border border-white/10 rounded-xl overflow-hidden">
            <button
              onClick={() => setOpenIndex(openIndex === i ? null : i)}
              className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/5 transition-colors"
              aria-expanded={openIndex === i}
            >
              <span className="text-sm font-medium text-slate-200 pr-4">{faq.question}</span>
              <span className={`text-slate-400 shrink-0 transition-transform ${openIndex === i ? 'rotate-180' : ''}`}>
                ▾
              </span>
            </button>
            {openIndex === i && (
              <div className="px-4 pb-4 text-sm text-slate-400 leading-relaxed border-t border-white/10 pt-3">
                {faq.answer}
              </div>
            )}
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

// ---------------------------------------------------------------------------
// Main CollegeDetailPage
// ---------------------------------------------------------------------------

export function CollegeDetailPage({ colleges }: CollegeDetailPageProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const college = colleges.find((c) => c.id === id);

  // Where to go back: prefer the referrer stored in location.state.from,
  // fall back to /results (handles direct URL access and Smart Form navigation).
  const backTarget: string = (location.state as { from?: string } | null)?.from ?? '/results';

  const [cutoffHistory, setCutoffHistory] = useState<CutoffHistoryEntry[]>([]);
  const [cutoffLoading, setCutoffLoading] = useState(true);
  const [cutoffError, setCutoffError] = useState<string | null>(null);

  const fetchCutoffHistory = useCallback(async () => {
    if (!college) return;
    setCutoffLoading(true);
    setCutoffError(null);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10_000);

    try {
      const res = await api.getCutoffHistory(
        college.code,
        college.branch,
        college.category,
        college.capRound,
        controller.signal,
      );
      if (res.success && res.data) {
        setCutoffHistory(res.data);
      } else {
        setCutoffError('Could not load cutoff history.');
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        setCutoffError('Request timed out. Please retry.');
      } else {
        setCutoffError('Could not load cutoff history.');
      }
    } finally {
      clearTimeout(timeoutId);
      setCutoffLoading(false);
    }
  }, [college?.code, college?.branch, college?.category, college?.capRound]);

  useEffect(() => {
    if (college) {
      fetchCutoffHistory();
    }
  }, [fetchCutoffHistory, college]);

  // SEO: dynamic title + meta per college page
  const seoTitle = college
    ? `${college.name} – ${college.branch} MHT CET Cutoff 2025 & Admission | Uniscout`
    : 'College Details | Uniscout';
  const seoDescription = college
    ? `${college.name} ${college.branch} MHT CET 2025 cutoff is ${college.cutoffPercentile} percentile (${college.category}, ${college.location}). See 3-year cutoff trend, admission probability, fees${college.fees ? ` ₹${college.fees}` : ''}, seats${college.seats ? ` ${college.seats}` : ''}, and CAP Round 2 strategy.`
    : 'College details and cutoff information.';
  useSEO({
    title: seoTitle,
    description: seoDescription,
    canonical: college ? `https://www.Uniscout.co.in/college/${college.id}` : undefined,
  });

  if (!college) {
    return <Navigate to="/results" replace />;
  }

  // Derive student percentile from percentileDifference + cutoffPercentile
  const studentPercentile = college.cutoffPercentile + college.percentileDifference;

  return (
    <div className="min-h-screen bg-background text-foreground pt-[60px]">
      {/* Structured data */}
      <SchemaOrg id={`college-${college.code}`} schema={collegeSchema({ name: college.name, code: college.code, location: college.location, district: college.district, branch: college.branch, fees: college.fees, seats: college.seats, cutoffPercentile: college.cutoffPercentile, avgPackage: college.avgPackage })} />
      <SchemaOrg id={`breadcrumb-${college.code}`} schema={breadcrumbSchema([
        { name: 'Home', url: 'https://www.Uniscout.co.in/' },
          { name: 'MHT CET Predictor', url: 'https://www.Uniscout.co.in/mht-cet' },
          { name: college.name, url: `https://www.Uniscout.co.in/college/${college.id}` },
        ])}
      />
      {/* Back button — not sticky, scrolls away */}
      <div className="px-5 pt-4 pb-2 max-w-7xl mx-auto">
        <button
          onClick={() => navigate(backTarget)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 hover:text-white hover:bg-cyan-500/30 text-[13px] font-medium transition-colors"
          aria-label="Back to results"
        >
          <ChevronRight className="size-4 rotate-180" />
          Back to College List
        </button>
      </div>

      {/* College header */}
      <div className="border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-5 py-8">
          <HeroSection college={college} />

          {/* Quick stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
            {[
              { label: 'Avg Package', value: college.avgPackage ? `${college.avgPackage} LPA` : 'N/A', icon: Briefcase, color: 'text-blue-400' },
              { label: 'Annual Fees',  value: college.fees || 'N/A',                                    icon: DollarSign, color: 'text-emerald-400' },
              { label: 'Total Seats',  value: college.seats ? String(college.seats) : 'N/A',            icon: Users,     color: 'text-violet-400' },
              { label: 'Highest Pkg',  value: college.highestPackage ? `${college.highestPackage} LPA` : 'N/A', icon: Trophy, color: 'text-amber-400' },
            ].map(s => (
              <div key={s.label} className="p-4 rounded-xl bg-card border border-white/[0.07]">
                <div className="flex items-center gap-2 mb-1.5">
                  <s.icon className={`size-3.5 ${s.color}`} />
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{s.label}</span>
                </div>
                <div className="text-base font-semibold text-foreground">{s.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main content — two column layout */}
      <main className="max-w-7xl mx-auto px-5 py-8">
        <div className="grid lg:grid-cols-3 gap-7">
          {/* Main column */}
          <div className="lg:col-span-2 space-y-5">
            <ChancesSection college={college} studentPercentile={studentPercentile} />
            <CutoffHistorySection data={cutoffHistory} loading={cutoffLoading} error={cutoffError} onRetry={fetchCutoffHistory} />
            <PlacementSection college={college} />
            <CollegeInfoSection college={college} />
            <Round2StrategySection college={college} />
            <SimilarColleges current={college} all={colleges} />
            <CollegeFAQSection college={college} />
          </div>

          {/* Right panel */}
          <div className="space-y-5">
            {/* Admission chance widget */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-950/60 to-violet-950/60 border border-blue-500/20 sticky top-[80px]">
              <div className="flex items-center gap-2 mb-4">
                <Brain className="size-4 text-blue-400" />
                <span className="text-[13px] font-semibold text-foreground">Your Admission Chance</span>
              </div>
              <div className="text-5xl font-semibold text-primary mb-2 tabular-nums">
                {college.admissionProbability ? `${Math.round(college.admissionProbability)}%` : '—'}
              </div>
              <AdmissionBadge category={college.admissionBand ?? college.admissionChance ?? 'Moderate'} />
              {college.admissionProbability && (
                <div className="mt-4 h-1.5 bg-white/[0.08] rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-blue-500 to-violet-500 rounded-full"
                    style={{ width: `${college.admissionProbability}%` }} />
                </div>
              )}
              <div className="mt-5 pt-4 border-t border-white/[0.07] space-y-2.5">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Your percentile</span>
                  <span className="font-mono text-foreground">{studentPercentile.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Closing cutoff</span>
                  <span className={`font-mono ${studentPercentile >= college.cutoffPercentile ? 'text-emerald-400' : 'text-red-400'}`}>
                    {college.cutoffPercentile?.toFixed(2)}
                  </span>
                </div>
                {college.percentileDifference !== 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Gap</span>
                    <span className={`font-mono ${college.percentileDifference >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {college.percentileDifference >= 0 ? '+' : ''}{college.percentileDifference.toFixed(2)} pts
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default CollegeDetailPage;
