import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  GitCompare,
  Filter,
  SlidersHorizontal,
  Check,
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
      ? `${branch} Colleges for ${percentile} Percentile MHT CET | UNISCOUT`
      : 'MHT CET College Results | UNISCOUT',
    description: `${colleges.length} Maharashtra engineering colleges matching your MHT CET profile. Sorted by admission probability with cutoff trends and CAP round strategy.`,
    noIndex: true, // results are session-specific, not for indexing
  });

  const mlAvailable = colleges.some(c => c.admissionBand);
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

  // Statistics
  const stats = useMemo(() => {
    return {
      total: colleges.length,
      b1: colleges.filter(c => getAdmissionBand(c) === (mlAvailable ? 'Safe' : 'High')).length,
      b2: colleges.filter(c => getAdmissionBand(c) === (mlAvailable ? 'Likely' : 'Medium')).length,
      b3: colleges.filter(c => getAdmissionBand(c) === (mlAvailable ? 'Moderate' : 'Medium')).length,
      b4: colleges.filter(c => getAdmissionBand(c) === (mlAvailable ? 'Risky' : 'Low')).length,
    };
  }, [colleges, mlAvailable]);

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

  return (
    <div className="w-full flex-1 flex flex-col items-center">
      {/* Sticky sub-header */}
      <header className="w-full sticky top-0 z-40 border-b border-white/[0.06] bg-card/60 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-5 py-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="size-2 rounded-full bg-emerald-500 shadow-[0_0_6px_2px_rgba(34,197,94,0.3)]" />
                <span className="text-xs text-muted-foreground font-mono tracking-wide">
                  MHT-CET Engineering · {lastQuery?.category ?? 'OPEN'} Category
                </span>
              </div>
              <h1 className="text-lg font-semibold text-foreground">
                Admission Predictions
                {lastQuery?.percentile && (
                  <span className="ml-3 text-sm font-normal text-muted-foreground">
                    Percentile: <span className="text-primary font-mono font-medium">{lastQuery.percentile}</span>
                  </span>
                )}
              </h1>
            </div>
            <div className="flex items-center gap-2.5">
              {comparisonSelection.length > 0 && (
                <button
                  onClick={() => navigate('/compare')}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary/15 border border-primary/25 text-primary text-[13px] font-medium hover:bg-primary/25 transition-colors"
                >
                  <GitCompare className="size-4" />
                  Compare ({comparisonSelection.length})
                </button>
              )}
              <button
                onClick={() => navigate('/')}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-muted-foreground hover:text-foreground text-[13px] font-medium transition-colors"
              >
                ✏️ Edit Search
              </button>
            </div>
          </div>
        </div>
      </header>

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
  return (
    <div className="flex gap-7">
      {/* Sidebar filters */}
      <aside className="hidden lg:flex flex-col w-52 shrink-0 gap-5">
        <div className="sticky top-[120px] space-y-5">
          <div className="flex items-center gap-2 text-[13px] font-semibold text-foreground">
            <SlidersHorizontal className="size-4 text-muted-foreground" />
            Filters
          </div>

          {/* Sort */}
          <div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-2.5">Sort By</div>
            {[
              { value: 'chance',     label: 'Admission Chance' },
              { value: 'cutoff-high',label: 'Cutoff: High → Low' },
              { value: 'cutoff-low', label: 'Cutoff: Low → High' },
              { value: 'fees',       label: 'Fees' },
              { value: 'name',       label: 'College Name' },
            ].map(opt => (
              <button key={opt.value} onClick={() => setSortBy(opt.value)}
                className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg text-[13px] transition-colors mb-0.5 ${
                  sortBy === opt.value
                    ? 'bg-primary/12 text-primary border border-primary/20'
                    : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                }`}>
                <span className={`size-3.5 rounded-sm border flex items-center justify-center shrink-0 ${sortBy === opt.value ? 'bg-primary border-primary' : 'border-white/20'}`}>
                  {sortBy === opt.value && <Check className="size-2.5 text-white" />}
                </span>
                {opt.label}
              </button>
            ))}
          </div>

          {/* Band filter */}
          <div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-2.5">Admission Chance</div>
            {['all', ...bandsAvailable].map((band: string) => (
              <button key={band} onClick={() => setFilterBand(band)}
                className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg text-[13px] transition-colors mb-0.5 capitalize ${
                  filterBand === band
                    ? 'bg-primary/12 text-primary border border-primary/20'
                    : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                }`}>
                <span className={`size-3.5 rounded-sm border flex items-center justify-center shrink-0 ${filterBand === band ? 'bg-primary border-primary' : 'border-white/20'}`}>
                  {filterBand === band && <Check className="size-2.5 text-white" />}
                </span>
                {band === 'all' ? 'All' : band}
              </button>
            ))}
          </div>

          {/* Legend */}
          <div className="p-3.5 rounded-xl bg-card border border-white/[0.07]">
            <div className="text-[11px] text-muted-foreground font-medium mb-3 uppercase tracking-wider">Probability Guide</div>
            {[
              { label: 'Safe',     range: '>85%',   dot: 'bg-emerald-500' },
              { label: 'Likely',   range: '70–85%', dot: 'bg-blue-500'    },
              { label: 'Moderate', range: '50–70%', dot: 'bg-amber-500'   },
              { label: 'Risky',    range: '<50%',   dot: 'bg-red-500'     },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-2 mb-2 last:mb-0">
                <div className={`size-2 rounded-full ${item.dot}`} />
                <span className="text-xs text-muted-foreground">{item.label}</span>
                <span className="text-xs text-muted-foreground/40 ml-auto font-mono">{item.range}</span>
              </div>
            ))}
          </div>
        </div>
      </aside>

      {/* Cards */}
      <div className="flex-1 space-y-3 min-w-0 pb-24">
        {/* Stats row */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            { label: mlAvailable ? 'Safe' : 'High',     value: stats.b1, dot: 'bg-emerald-500' },
            { label: mlAvailable ? 'Likely' : 'Medium', value: stats.b2, dot: 'bg-blue-500'    },
            { label: mlAvailable ? 'Moderate' : 'Med',  value: stats.b3, dot: 'bg-amber-500'   },
            { label: mlAvailable ? 'Risky' : 'Low',     value: stats.b4, dot: 'bg-red-500'     },
          ].map(s => (
            <div key={s.label} className="p-4 rounded-xl bg-card border border-white/[0.07] text-center">
              <div className={`size-2 rounded-full ${s.dot} mx-auto mb-2`} />
              <div className="text-2xl font-semibold text-foreground">{s.value}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between mb-3">
          <p className="text-sm text-muted-foreground">{processedColleges.length} colleges found</p>
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