import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  GitCompare,
  Filter,
  SlidersHorizontal,
  Check,
  ArrowLeft,
  Download,
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
  portalType: 'mht-cet' | 'jee';
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
  colleges, lastQuery, comparisonSelection, setComparisonSelection 
}: ResultsPageProps) {
  const navigate = useNavigate();
  const [sortBy, setSortBy] = useState<SortOption>('chance');
  const [filterBand, setFilterBand] = useState<FilterBand>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  const branch = lastQuery?.branchPreference ?? 'Engineering';
  const percentile = lastQuery?.percentile;
  useSEO({
    title: percentile
      ? `${branch} Colleges for ${percentile} Percentile MHT CET | Uniscout`
      : 'MHT CET College Results | Uniscout',
    description: `${colleges.length} Maharashtra engineering colleges matching your MHT CET profile. Sorted by admission probability with cutoff trends and CAP round strategy.`,
    noIndex: true, // results are session-specific, not for indexing
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
          return parseFloat(a.fees) - parseFloat(b.fees || '0');
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
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8"/>
        <title>College Predictions - Uniscout</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; color: #1a1a2e; }
          h1 { color: #4f46e5; font-size: 22px; margin-bottom: 4px; }
          .meta { color: #666; font-size: 13px; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th { background: #4f46e5; color: white; padding: 8px 10px; text-align: left; }
          td { padding: 7px 10px; border-bottom: 1px solid #e5e7eb; vertical-align: top; }
          tr:nth-child(even) { background: #f9fafb; }
          .safe { color: #16a34a; font-weight: bold; }
          .likely { color: #2563eb; font-weight: bold; }
          .moderate { color: #d97706; font-weight: bold; }
          .risky { color: #dc2626; font-weight: bold; }
          .high { color: #16a34a; font-weight: bold; }
          .medium { color: #d97706; font-weight: bold; }
          .low { color: #dc2626; font-weight: bold; }
          .footer { margin-top: 30px; font-size: 11px; color: #999; text-align: center; }
        </style>
      </head>
      <body>
        <h1>Uniscout — College Admission Predictions</h1>
        <div class="meta">
          Percentile: ${lastQuery?.percentile ?? '—'} &nbsp;|&nbsp;
          Category: ${lastQuery?.category ?? '—'} &nbsp;|&nbsp;
          Branch: ${lastQuery?.branchPreference ?? '—'} &nbsp;|&nbsp;
          Year: ${lastQuery?.year ?? '—'} &nbsp;|&nbsp;
          CAP Round: ${lastQuery?.capRound ?? '—'} &nbsp;|&nbsp;
          Total Colleges: ${processedColleges.length}
        </div>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>College Name</th>
              <th>Branch</th>
              <th>District</th>
              <th>Type</th>
              <th>Cutoff %ile</th>
              <th>Seats</th>
              <th>Fees</th>
              <th>Avg Package</th>
              <th>Chance</th>
            </tr>
          </thead>
          <tbody>
            ${processedColleges.map((c, i) => {
              const band = getAdmissionBand(c).toLowerCase().replace('/', '');
              return `<tr>
                <td>${i + 1}</td>
                <td><strong>${c.name}</strong> (${c.code})</td>
                <td>${c.branch}</td>
                <td>${c.district}</td>
                <td>${c.collegeType}</td>
                <td>${c.cutoffPercentile?.toFixed(2) ?? '—'}</td>
                <td>${c.seats ?? '—'}</td>
                <td>${c.fees ?? '—'}</td>
                <td>${c.avgPackage ?? '—'}</td>
                <td class="${band}">${getAdmissionBand(c)}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
        <div class="footer">Generated by Uniscout · www.uniscout.co.in · ${new Date().toLocaleDateString('en-IN')}</div>
      </body>
      </html>
    `;
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(printContent);
      win.document.close();
      win.focus();
      setTimeout(() => { win.print(); }, 500);
    }
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
                onClick={() => navigate('/mht-cet/engineering')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 hover:text-white hover:bg-cyan-500/30 text-[12px] font-medium transition-colors"
              >
                <ArrowLeft className="size-3.5" />
                Back
              </button>
              <div>
                <h1 className="text-sm md:text-lg font-semibold text-foreground">
                  Admission Predictions
                  {lastQuery?.percentile && (
                    <span className="ml-2 text-xs md:text-sm font-normal text-muted-foreground">
                      · <span className="text-primary font-mono font-medium">{lastQuery.percentile}</span>%
                    </span>
                  )}
                </h1>
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
                {...{ stats, mlAvailable, bandsAvailable, filterBand, setFilterBand, showFilters, setShowFilters, sortBy, setSortBy, processedColleges, expandedCard, setExpandedCard, comparisonSelection, handleCompareToggle, navigate }} 
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
            {...{ stats, mlAvailable, bandsAvailable, filterBand, setFilterBand, showFilters, setShowFilters, sortBy, setSortBy, processedColleges, expandedCard, setExpandedCard, comparisonSelection, handleCompareToggle, navigate }} 
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
  comparisonSelection, handleCompareToggle
}: any) {
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const sortOptions = [
    { value: 'chance',      label: 'Admission Chance' },
    { value: 'cutoff-high', label: 'Cutoff: High → Low' },
    { value: 'cutoff-low',  label: 'Cutoff: Low → High' },
    { value: 'fees',        label: 'Fees' },
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
          <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-2.5">Admission Chance</div>
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
                onViewDetails={() => navigate(`/college/${college.id}`)}
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
            <p className="text-sm text-muted-foreground">Try adjusting your filters.</p>
          </div>
        )}
      </div>
    </div>
  );
}