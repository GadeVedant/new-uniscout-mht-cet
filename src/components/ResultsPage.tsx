import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  GitCompare,
  Filter,
  SlidersHorizontal,
  Check,
  ArrowLeft,
  Download,
  Share2,
  HelpCircle,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { CollegeRecommendation, RecommendationRequest } from '../services/api';
import type { QueryWithMeta } from '../App';
import { CollegeCard } from './CollegeCard';
import { FloatingCompareBar } from './FloatingCompareBar';
import { StrategyTab } from './StrategyTab';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { useSEO } from '../seo/useSEO';

interface ResultsPageProps {
  colleges: CollegeRecommendation[];
  lastQuery: QueryWithMeta | null;
  portalType: 'mht-cet' | 'jee' | 'pharmacy';
  comparisonSelection: CollegeRecommendation[];
  setComparisonSelection: React.Dispatch<React.SetStateAction<CollegeRecommendation[]>>;
}

type SortOption = 'chance' | 'cutoff-high' | 'cutoff-low' | 'name' | 'fees' | 'seats';
type FilterBand = 'all' | 'Safe' | 'Likely' | 'Moderate' | 'Risky' | 'High' | 'Medium' | 'Low';

export function getAdmissionBand(college: CollegeRecommendation): string {
  if (college.admissionBand) return college.admissionBand;
  return college.admissionChance; // High, Medium, Low
}

export function ResultsPage({ 
  colleges, lastQuery, portalType, comparisonSelection, setComparisonSelection 
}: ResultsPageProps) {
  const navigate = useNavigate();
  const [sortBy, setSortBy] = useState<SortOption>('chance');
  const [filterBand, setFilterBand] = useState<FilterBand>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  const branch = lastQuery?.branchPreference ?? 'Engineering';
  const percentile = lastQuery?.percentile;
  const isPharmacy = portalType === 'pharmacy';
  useSEO({
    title: percentile
      ? `${branch} Colleges for ${percentile} Percentile MHT CET | Uniscout`
      : 'MHT CET College Results | Uniscout',
    description: isPharmacy
      ? `${colleges.length} Maharashtra pharmacy colleges matching your MHT CET PCB profile.`
      : `${colleges.length} Maharashtra engineering colleges matching your MHT CET profile. Sorted by admission probability with cutoff trends and CAP round strategy.`,
    noIndex: true,
  });

  // mlAvailable is true only when ALL colleges have been ML-enriched.
  // Using some() was causing partial enrichment to flip the UI into ML mode
  // while most colleges still returned legacy band names (High/Medium/Low).
  const mlAvailable = colleges.length > 0 && colleges.every(c => c.admissionBand);
  const bandsAvailable = mlAvailable ? ['Safe', 'Likely', 'Moderate', 'Risky'] : ['High', 'Medium', 'Low'];

  // Process and sort colleges
  const processedColleges = useMemo(() => {
    let filtered = colleges;

    if (filterBand !== 'all') {
      filtered = colleges.filter(c => getAdmissionBand(c) === filterBand);
    }

    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'chance':
          const bandOrder: Record<string, number> = { Safe: 0, High: 0, Likely: 1, Medium: 2, Moderate: 2, Risky: 3, Low: 3 };
          const chanceCompare = bandOrder[getAdmissionBand(a)] - bandOrder[getAdmissionBand(b)];
          if (chanceCompare !== 0) return chanceCompare;
          return b.cutoffPercentile - a.cutoffPercentile;
        case 'cutoff-high':
          return b.cutoffPercentile - a.cutoffPercentile;
        case 'cutoff-low':
          return a.cutoffPercentile - b.cutoffPercentile;
        case 'name':
          return a.name.localeCompare(b.name);
        case 'fees':
          // fees is a formatted string like "₹1,20,000" — strip non-numeric chars before parsing
          const parseFees = (s: string) => parseFloat(s.replace(/[^\d.]/g, '')) || 0;
          return parseFees(a.fees) - parseFees(b.fees || '0');
        case 'seats':
          return (b.seats || 0) - (a.seats || 0);
        default:
          return 0;
      }
    });
  }, [colleges, sortBy, filterBand]);

  // Statistics — count both ML band names and legacy names so the totals
  // are always correct even when only some colleges got ML enrichment.
  const stats = useMemo(() => {
    return {
      total: colleges.length,
      b1: colleges.filter(c => { const b = getAdmissionBand(c); return b === 'Safe'     || b === 'High';   }).length,
      b2: colleges.filter(c =>   getAdmissionBand(c) === 'Likely'                                          ).length,
      b3: colleges.filter(c => { const b = getAdmissionBand(c); return b === 'Moderate' || b === 'Medium'; }).length,
      b4: colleges.filter(c => { const b = getAdmissionBand(c); return b === 'Risky'    || b === 'Low';    }).length,
    };
  }, [colleges]);

  const handleCompareToggle = (college: CollegeRecommendation, checked: boolean | 'indeterminate') => {
    if (checked) {
      if (comparisonSelection.length < 3) {
        setComparisonSelection([...comparisonSelection, college]);
      }
    } else {
      setComparisonSelection(comparisonSelection.filter(c => c.id !== college.id));
    }
  };

  const isRound1 = lastQuery?.capRound === 'I' || colleges[0]?.capRound === 'I';

  const handleDownloadPDF = () => {
    const printContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <title>College Predictions – Uniscout</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 32px; color: #111; font-size: 13px; }
    h1 { font-size: 22px; font-weight: 800; color: #1e1b4b; margin-bottom: 4px; }
    .meta { color: #6b7280; font-size: 12px; margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    th { background: #f9fafb; padding: 10px; text-align: left; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; border-bottom: 2px solid #e5e7eb; }
    td { padding: 8px 10px; border-bottom: 1px solid #e5e7eb; vertical-align: top; }
    .safe { color: #16a34a; font-weight: bold; }
    .likely { color: #2563eb; font-weight: bold; }
    .moderate { color: #d97706; font-weight: bold; }
    .risky { color: #dc2626; font-weight: bold; }
    .high { color: #16a34a; font-weight: bold; }
    .medium { color: #d97706; font-weight: bold; }
    .low { color: #dc2626; font-weight: bold; }
    .footer { margin-top: 24px; font-size: 11px; color: #9ca3af; text-align: center; }
    @media print { body { padding: 16px; } }
  </style>
</head>
<body>
  <h1>Uniscout — College Admission Predictions</h1>
  <p class="meta">
    Percentile: ${lastQuery?.percentile ?? '—'} &nbsp;|&nbsp;
    Category: ${lastQuery?.category ?? '—'} &nbsp;|&nbsp;
    Branch: ${lastQuery?.branchPreference ?? '—'} &nbsp;|&nbsp;
    Year: ${lastQuery?.year ?? '—'} &nbsp;|&nbsp;
    CAP Round: ${lastQuery?.capRound ?? '—'} &nbsp;|&nbsp;
    Total Colleges: ${processedColleges.length}
  </p>
  <table>
    <thead>
      <tr>
        <th>#</th><th>College Name</th><th>Branch</th><th>District</th>
        <th>Type</th><th>Cutoff %ile</th><th>Seats</th><th>Fees</th>
        <th>Avg Pkg</th><th>AI Chance</th><th>Win %</th>
      </tr>
    </thead>
    <tbody>
      ${processedColleges.map((c, i) => {
        const band = getAdmissionBand(c);
        const bandClass = band.toLowerCase().replace('/', '');
        const prob = c.admissionProbability && c.admissionProbability > 0
          ? `${Math.round(c.admissionProbability)}%`
          : '—';
        return `<tr>
          <td>${i + 1}</td>
          <td><strong>${c.name}</strong> (${c.code})</td>
          <td>${c.branch}</td>
          <td>${c.district}</td>
          <td>${c.collegeType ?? '—'}</td>
          <td>${c.cutoffPercentile?.toFixed(2) ?? '—'}</td>
          <td>${c.seats ?? '—'}</td>
          <td>${c.fees ?? '—'}</td>
          <td>${c.avgPackage ?? '—'}</td>
          <td class="${bandClass}">${band}</td>
          <td>${prob}</td>
        </tr>`;
      }).join('')}
    </tbody>
  </table>
  <p class="footer">Generated by Uniscout · www.uniscout.co.in · ${new Date().toLocaleDateString('en-IN')}</p>
</body>
</html>`;

    const blob = new Blob([printContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');
    if (win) {
      win.addEventListener('load', () => {
        setTimeout(() => {
          win.print();
          // Revoke after the print dialog closes (print() blocks until user dismisses).
          // A short delay handles browsers that close the dialog asynchronously.
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        }, 300);
      });
    } else {
      // Mobile fallback: direct download
      const a = document.createElement('a');
      a.href = url;
      a.download = `Uniscout-predictions-${new Date().toISOString().slice(0, 10)}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  };

  const handleWhatsAppShare = () => {
    const count = processedColleges.length;
    const topSafe = processedColleges.find(c => getAdmissionBand(c) === 'Safe' || getAdmissionBand(c) === 'High');
    const lines = [
      `🎓 My MHT CET College Predictions (via Uniscout)`,
      `📊 Percentile: ${lastQuery?.percentile ?? '?'} | Category: ${lastQuery?.category ?? '?'}`,
      `🏫 ${count} colleges found — ${topSafe ? `Top pick: ${topSafe.name}` : 'check the list below'}`,
      ``,
      `🔗 Find your colleges too: https://www.uniscout.co.in/mht-cet`,
    ];
    const text = encodeURIComponent(lines.join('\n'));
    window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="w-full flex-1 flex flex-col items-center pt-[60px]">
      {/* Non-sticky header — scrolls away with content */}
      <div className="w-full border-b border-white/[0.06] bg-card/60 px-4 py-3">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between flex-wrap gap-3">
            {/* Left — Back button */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => navigate(isPharmacy ? '/mht-cet/pharmacy' : '/mht-cet/engineering')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors ${
                  isPharmacy
                    ? 'bg-pink-500/20 border border-pink-400/40 text-pink-300 hover:text-white hover:bg-pink-500/30'
                    : 'bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 hover:text-white hover:bg-cyan-500/30'
                }`}
              >
                <ArrowLeft className="size-3.5" />
                Back
              </button>
              <div>
                <h1 className="text-sm md:text-lg font-semibold text-foreground flex items-center flex-wrap gap-x-2">
                  Admission Predictions
                  {lastQuery?.percentile && (
                    <span className="text-xs md:text-sm font-normal text-muted-foreground">
                      · <span className="text-primary font-mono font-medium">{lastQuery.percentile}</span>%
                    </span>
                  )}
                  <button
                    onClick={() => navigate('/how-it-works')}
                    title="How these predictions work"
                    className="inline-flex items-center gap-1 text-[11px] text-muted-foreground/50 hover:text-muted-foreground transition-colors font-normal"
                  >
                    <HelpCircle className="size-3" />
                    <span className="hidden sm:inline">How it works</span>
                  </button>
                </h1>
                {/* Form fill summary */}
                {lastQuery && (
                  <div className="flex items-center gap-1.5 flex-wrap mt-1">
                    {lastQuery.category && (
                      <span className="px-2 py-0.5 rounded-full bg-violet-500/15 border border-violet-500/25 text-violet-300 text-[11px] font-medium">
                        {lastQuery.category}
                      </span>
                    )}
                    {lastQuery.branchPreference && (
                      <span className="px-2 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/25 text-cyan-300 text-[11px] font-medium capitalize">
                        {lastQuery.branchPreference}
                      </span>
                    )}
                    {lastQuery.capRound && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/25 text-amber-300 text-[11px] font-medium">
                        Round {lastQuery.capRound}
                      </span>
                    )}
                    {lastQuery.location && !lastQuery.locationFallback && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/25 text-emerald-300 text-[11px] font-medium">
                        {lastQuery.location}
                      </span>
                    )}
                    {lastQuery.year && (
                      <span className="px-2 py-0.5 rounded-full bg-slate-500/15 border border-slate-500/25 text-slate-400 text-[11px] font-medium">
                        CAP {lastQuery.year}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Right — Compare + Download */}
            <div className="flex items-center gap-2">
              {comparisonSelection.length > 0 && (
                <button onClick={() => navigate('/compare')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/15 border border-primary/25 text-primary text-[12px] font-medium hover:bg-primary/25 transition-colors">
                  <GitCompare className="size-3.5" />
                  <span className="hidden sm:inline">Compare </span>({comparisonSelection.length})
                </button>
              )}
              <button onClick={handleDownloadPDF}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25 text-[12px] font-medium transition-colors">
                <Download className="size-3.5" />
                <span className="hidden sm:inline">Download </span>PDF
              </button>
              <button onClick={handleWhatsAppShare}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/15 border border-green-500/30 text-green-400 hover:bg-green-500/25 text-[12px] font-medium transition-colors">
                <Share2 className="size-3.5" />
                <span className="hidden sm:inline">Share</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <main className="w-full max-w-7xl px-5 py-7">

        {/* Location fallback notice */}
        {lastQuery?.locationFallback && lastQuery?.location && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-center mb-6"
          >
            <div className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-300 text-sm">
              <span>⚠️</span>
              <span>No colleges found in <strong>{lastQuery.location}</strong> for your selected branch/category. Showing results from all Maharashtra instead.</span>
            </div>
          </motion.div>
        )}

        {isRound1 && lastQuery ? (
          <Tabs defaultValue="results" className="w-full">
            <div className="flex justify-center mb-8">
              <TabsList className="bg-card border border-white/[0.08] p-1 rounded-xl">
                <TabsTrigger value="results" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-semibold px-8 py-2.5 rounded-lg text-[13px]">
                  Results
                </TabsTrigger>
                <TabsTrigger value="strategy" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-semibold px-8 py-2.5 rounded-lg text-[13px]">
                  Round 2 Strategy
                </TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="results" className="mt-0 outline-none">
              <ResultsContent 
                {...{ stats, mlAvailable, bandsAvailable, filterBand, setFilterBand, showFilters, setShowFilters, sortBy, setSortBy, processedColleges, expandedCard, setExpandedCard, comparisonSelection, handleCompareToggle, navigate, isPharmacy }} 
              />
            </TabsContent>
            <TabsContent value="strategy" className="mt-0 outline-none">
              <StrategyTab
                percentile={lastQuery.percentile}
                category={lastQuery.category}
                branch={lastQuery.branchPreference}
                capRound={lastQuery.capRound}
              />
            </TabsContent>
          </Tabs>
        ) : (
          <ResultsContent 
            {...{ stats, mlAvailable, bandsAvailable, filterBand, setFilterBand, showFilters, setShowFilters, sortBy, setSortBy, processedColleges, expandedCard, setExpandedCard, comparisonSelection, handleCompareToggle, navigate, isPharmacy }} 
          />
        )}
      </main>

      <FloatingCompareBar 
        selectedCount={comparisonSelection.length}
        onClear={() => setComparisonSelection([])}
        onCompare={() => navigate('/compare')}
      />
    </div>
  );
}

function ResultsContent({
  stats, mlAvailable, bandsAvailable, filterBand, setFilterBand,
  sortBy, setSortBy, processedColleges, expandedCard, setExpandedCard, navigate,
  comparisonSelection, handleCompareToggle, isPharmacy
}: any) {
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const sortOptions = [
    { value: 'chance',      label: 'Admission Chance' },
    { value: 'cutoff-high', label: 'Cutoff: High → Low' },
    { value: 'cutoff-low',  label: 'Cutoff: Low → High' },
    ...(!isPharmacy ? [{ value: 'fees', label: 'Fees' }] : []),
    { value: 'seats',       label: 'Seats Available' },
    { value: 'name',        label: 'College Name' },
  ];

  const legend = [
    { label: 'Safe',     range: '>85%',   dot: 'bg-emerald-500' },
    { label: 'Likely',   range: '70–85%', dot: 'bg-blue-500'    },
    { label: 'Moderate', range: '50–70%', dot: 'bg-amber-500'   },
    { label: 'Risky',    range: '<50%',   dot: 'bg-red-500'     },
  ];

  function FilterPanel() {
    return (
      <div className="space-y-5">
        <div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-2.5">Sort By</div>
          {sortOptions.map(opt => (
            <button key={opt.value} onClick={() => setSortBy(opt.value)}
              className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg text-[13px] transition-colors mb-0.5 ${
                sortBy === opt.value ? 'bg-primary/12 text-primary border border-primary/20' : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
              }`}>
              <span className={`size-3.5 rounded-sm border flex items-center justify-center shrink-0 ${sortBy === opt.value ? 'bg-primary border-primary' : 'border-white/20'}`}>
                {sortBy === opt.value && <Check className="size-2.5 text-white" />}
              </span>
              {opt.label}
            </button>
          ))}
        </div>
        <div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-2.5 flex items-center gap-1">
            Admission Chance
            <span
              title="Safe = >80% probability · Likely = 50–80% · Moderate = 20–50% · Risky = <20%"
              className="inline-flex items-center justify-center size-3.5 rounded-full bg-white/10 text-[9px] text-muted-foreground cursor-help hover:bg-white/20 transition-colors"
            >?</span>
          </div>
          {['all', ...bandsAvailable].map((band: string) => (
            <button key={band} onClick={() => { setFilterBand(band); setMobileFiltersOpen(false); }}
              className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg text-[13px] transition-colors mb-0.5 capitalize ${
                filterBand === band ? 'bg-primary/12 text-primary border border-primary/20' : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
              }`}>
              <span className={`size-3.5 rounded-sm border flex items-center justify-center shrink-0 ${filterBand === band ? 'bg-primary border-primary' : 'border-white/20'}`}>
                {filterBand === band && <Check className="size-2.5 text-white" />}
              </span>
              {band === 'all' ? 'All' : band}
            </button>
          ))}
        </div>
        <div className="p-3.5 rounded-xl bg-card border border-white/[0.07]">
          <div className="text-[11px] text-muted-foreground font-medium mb-3 uppercase tracking-wider">Probability Guide</div>
          {legend.map(item => (
            <div key={item.label} className="flex items-center gap-2 mb-2 last:mb-0">
              <div className={`size-2 rounded-full ${item.dot}`} />
              <span className="text-xs text-muted-foreground">{item.label}</span>
              <span className="text-xs text-muted-foreground/40 ml-auto font-mono">{item.range}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-7">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-52 shrink-0 gap-5">
        <div className="sticky top-[120px] space-y-5">
          <div className="flex items-center gap-2 text-[13px] font-semibold text-foreground">
            <SlidersHorizontal className="size-4 text-muted-foreground" />
            Filters
          </div>
          <FilterPanel />
        </div>
      </aside>

      {/* Mobile filter drawer */}
      {mobileFiltersOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileFiltersOpen(false)} />
          <div className="relative ml-auto w-72 h-full bg-card border-l border-white/[0.07] p-5 overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <span className="text-[13px] font-semibold text-foreground flex items-center gap-2">
                <SlidersHorizontal className="size-4 text-muted-foreground" />
                Filters
              </span>
              <button onClick={() => setMobileFiltersOpen(false)}
                className="size-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-muted-foreground text-sm transition-colors">
                ✕
              </button>
            </div>
            <FilterPanel />
          </div>
        </div>
      )}

      {/* Cards */}
      <div className="flex-1 space-y-3 min-w-0 pb-24">
        {/* Stats + mobile filter button row */}
        <div className="flex items-center gap-3 mb-4">
          <div className="grid grid-cols-4 gap-2 flex-1">
            {[
              { label: mlAvailable ? 'Safe' : 'High',     value: stats.b1, dot: 'bg-emerald-500' },
              { label: mlAvailable ? 'Likely' : 'Medium', value: stats.b2, dot: 'bg-blue-500'    },
              { label: mlAvailable ? 'Moderate' : 'Med',  value: stats.b3, dot: 'bg-amber-500'   },
              { label: mlAvailable ? 'Risky' : 'Low',     value: stats.b4, dot: 'bg-red-500'     },
            ].map(s => (
              <div key={s.label} className="p-3 rounded-xl bg-card border border-white/[0.07] text-center">
                <div className={`size-2 rounded-full ${s.dot} mx-auto mb-1.5`} />
                <div className="text-lg font-semibold text-foreground">{s.value}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5 hidden sm:block">{s.label}</div>
              </div>
            ))}
          </div>
          {/* Mobile filter button */}
          <button onClick={() => setMobileFiltersOpen(true)}
            className="lg:hidden flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-card border border-white/[0.07] text-muted-foreground hover:text-foreground text-xs font-medium transition-colors shrink-0">
            <Filter className="size-3.5" />
            <span className="hidden xs:inline">Filter</span>
            {filterBand !== 'all' && <span className="size-1.5 rounded-full bg-primary" />}
          </button>
        </div>

        <div className="flex items-center justify-between mb-3">
          <p className="text-sm text-muted-foreground">{processedColleges.length} colleges found</p>
          {filterBand !== 'all' && (
            <button onClick={() => setFilterBand('all')} className="text-xs text-primary hover:underline">Clear filter</button>
          )}
        </div>

        {processedColleges.length > 0 ? (
          <AnimatePresence mode="popLayout">
            {processedColleges.map((college: any, i: number) => (
              <CollegeCard
                key={college.id}
                college={college}
                delay={Math.min(i * 0.03, 0.2)}
                isExpanded={expandedCard === college.id}
                onToggle={() => setExpandedCard(expandedCard === college.id ? null : college.id)}
                onViewDetails={() => navigate(`/college/${college.id}`, { state: { from: '/results' } })}
                isCompared={comparisonSelection.some((c: any) => c.id === college.id)}
                onCompareToggle={(checked) => handleCompareToggle(college, checked)}
                compareDisabled={comparisonSelection.length >= 3}
              />
            ))}
          </AnimatePresence>
        ) : (
          <div className="p-16 rounded-2xl bg-card border border-white/[0.07] text-center">
            <Filter className="size-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-base font-semibold text-foreground mb-2">No matches found</h3>
            {filterBand !== 'all' ? (
              <p className="text-sm text-muted-foreground mb-4">No colleges in the <strong>{filterBand}</strong> band. Try a different filter.</p>
            ) : (
              <div className="text-sm text-muted-foreground space-y-1 mb-4">
                <p>No colleges match your current search. Try:</p>
                <ul className="text-left inline-block mt-2 space-y-1">
                  <li className="flex items-center gap-2"><span className="text-primary">→</span> Select <strong>All Maharashtra</strong> for location</li>
                  <li className="flex items-center gap-2"><span className="text-primary">→</span> Choose a broader branch (e.g. Computer Engineering)</li>
                  <li className="flex items-center gap-2"><span className="text-primary">→</span> Try a different CAP Round</li>
                </ul>
              </div>
            )}
            <button onClick={() => setFilterBand('all')} className="text-xs text-primary hover:underline">Clear filters</button>
          </div>
        )}
      </div>
    </div>
  );
}