import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import {
  ArrowLeft, Home, MapPin, Building2, GraduationCap,
  DollarSign, Users, Award, TrendingUp, AlertCircle,
  RefreshCw, Trophy, Briefcase, ChevronRight,
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { api, CollegeRecommendation, CutoffHistoryEntry } from '../services/api';
import { useSEO } from '../seo/useSEO';
import { SchemaOrg, collegeSchema, breadcrumbSchema } from '../seo/SchemaOrg';
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

// ---------------------------------------------------------------------------
// Admission band config
// ---------------------------------------------------------------------------

const BAND_CONFIG = {
  Safe:     { bg: 'bg-emerald-500/20', border: 'border-emerald-400/40', text: 'text-emerald-300', dot: 'bg-emerald-400' },
  Likely:   { bg: 'bg-blue-500/20',    border: 'border-blue-400/40',    text: 'text-blue-300',    dot: 'bg-blue-400'    },
  Moderate: { bg: 'bg-amber-500/20',   border: 'border-amber-400/40',   text: 'text-amber-300',   dot: 'bg-amber-400'   },
  Risky:    { bg: 'bg-red-500/20',     border: 'border-red-400/40',     text: 'text-red-300',     dot: 'bg-red-400'     },
} as const;

const CONFIDENCE_CONFIG = {
  'High confidence':              'text-emerald-300',
  'Medium confidence':            'text-amber-300',
  'Low confidence (estimated)':   'text-slate-400',
} as const;

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SectionCard({ children, className = '', ...props }: { children: React.ReactNode; className?: string; [key: string]: unknown }) {
  return (
    <div className={`bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 ${className}`} {...props}>
      {children}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-lg font-bold text-white mb-4">{children}</h2>;
}

// ---------------------------------------------------------------------------
// Hero Section
// ---------------------------------------------------------------------------

function HeroSection({ college }: { college: CollegeRecommendation }) {
  return (
    <SectionCard className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border-blue-400/20">
      <div className="flex flex-wrap items-start gap-3 mb-3">
        {college.collegeType && (
          <span
            data-testid="college-type-badge"
            className="px-3 py-1 bg-blue-500/20 border border-blue-400/30 rounded-full text-xs font-semibold text-blue-300"
          >
            {college.collegeType}
          </span>
        )}
        <span className="px-3 py-1 bg-white/10 rounded-full text-xs font-medium text-white/70">
          Code: {college.code}
        </span>
      </div>

      <h1 className="text-2xl md:text-3xl font-bold text-white mb-2 leading-tight">
        {college.name}
      </h1>

      <p className="text-cyan-300 font-semibold text-lg mb-3">{college.branch}</p>

      <div className="flex items-center gap-2 text-white/70 text-sm">
        <MapPin className="w-4 h-4 text-blue-300 shrink-0" />
        <span>{college.location}{college.district && college.district !== college.location ? `, ${college.district}` : ''}</span>
      </div>
    </SectionCard>
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
// Main CollegeDetailPage
// ---------------------------------------------------------------------------

export function CollegeDetailPage({ colleges }: CollegeDetailPageProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const college = colleges.find((c) => c.id === id);

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
    ? `${college.name} – ${college.branch} MHT CET Cutoff 2025 & Admission | UniScout`
    : 'College Details | UniScout';
  const seoDescription = college
    ? `${college.name} ${college.branch} MHT CET 2025 cutoff is ${college.cutoffPercentile} percentile (${college.category}, ${college.location}). See 3-year cutoff trend, admission probability, fees${college.fees ? ` ₹${college.fees}` : ''}, seats${college.seats ? ` ${college.seats}` : ''}, and CAP Round 2 strategy.`
    : 'College details and cutoff information.';
  useSEO({
    title: seoTitle,
    description: seoDescription,
    canonical: college ? `https://www.uniscout.co.in/college/${college.id}` : undefined,
  });

  if (!college) {
    return <Navigate to="/results" replace />;
  }

  // Derive student percentile from percentileDifference + cutoffPercentile
  const studentPercentile = college.cutoffPercentile + college.percentileDifference;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-950 to-slate-950 text-white">
      {/* Structured data for this college page */}
      <SchemaOrg
        id={`college-${college.code}`}
        schema={collegeSchema({
          name: college.name,
          code: college.code,
          location: college.location,
          district: college.district,
          branch: college.branch,
          fees: college.fees,
          seats: college.seats,
          cutoffPercentile: college.cutoffPercentile,
          avgPackage: college.avgPackage,
        })}
      />
      <SchemaOrg
        id={`breadcrumb-${college.code}`}
        schema={breadcrumbSchema([
          { name: 'Home', url: 'https://www.uniscout.co.in/' },
          { name: 'MHT CET Predictor', url: 'https://www.uniscout.co.in/mht-cet' },
          { name: college.name, url: `https://www.uniscout.co.in/college/${college.id}` },
        ])}
      />
      {/* Sticky header */}
      <header className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-xl border-b border-white/10 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <motion.button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-sm font-medium text-white transition-colors"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            aria-label="Back to results"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Results
          </motion.button>

          <motion.button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-sm font-medium text-white/70 transition-colors"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            aria-label="Go to home"
          >
            <Home className="w-4 h-4" />
            Home
          </motion.button>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* 1. Hero */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <HeroSection college={college} />
        </motion.div>

        {/* 2. Chances */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <ChancesSection college={college} studentPercentile={studentPercentile} />
        </motion.div>

        {/* 3. Cutoff History */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <CutoffHistorySection
            data={cutoffHistory}
            loading={cutoffLoading}
            error={cutoffError}
            onRetry={fetchCutoffHistory}
          />
        </motion.div>

        {/* 4. Placement */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <PlacementSection college={college} />
        </motion.div>

        {/* 5. College Info */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <CollegeInfoSection college={college} />
        </motion.div>

        {/* 6. Round 2 Strategy */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Round2StrategySection college={college} />
        </motion.div>

        {/* 7. Internal linking — similar colleges */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
          <SimilarColleges current={college} all={colleges} />
        </motion.div>
      </main>
    </div>
  );
}

export default CollegeDetailPage;
