import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, 
  Home,
  ChevronDown,
  Filter,
  Search,
  Sparkles,
  GraduationCap,
  CheckCircle,
  AlertCircle,
  MinusCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { CollegeRecommendation, RecommendationRequest } from '../services/api';
import { CollegeCard } from './CollegeCard';
import { FloatingCompareBar } from './FloatingCompareBar';
import { StrategyTab } from './StrategyTab';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { useSEO } from '../seo/useSEO';

interface ResultsPageProps {
  colleges: CollegeRecommendation[];
  lastQuery: RecommendationRequest | null;
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
      {/* Header */}
      <header className="w-full relative z-10 bg-white/10 backdrop-blur-xl border-b border-white/20 sticky top-0">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <motion.button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-blue-200 hover:text-blue-100 transition-all backdrop-blur-sm"
          >
            <Home className="w-5 h-5" />
            <span className="hidden sm:inline font-semibold">Home</span>
          </motion.button>
          <div className="flex items-center gap-2 px-4 py-2 bg-cyan-500/20 border border-cyan-400/30 rounded-xl">
            <Sparkles className="w-4 h-4 text-cyan-300" />
            <span className="text-sm font-bold text-cyan-300">
              {colleges.length} colleges
            </span>
          </div>
        </div>
      </header>

      <main className="w-full max-w-7xl px-6 py-8">
        <motion.div className="text-center mb-8">
          <h1 className="text-4xl lg:text-5xl font-black bg-gradient-to-r from-blue-400 via-cyan-400 to-purple-400 bg-clip-text text-transparent">
            Your Predicted Colleges
          </h1>
          {!mlAvailable && (
            <p className="mt-2 text-slate-400 text-sm italic">Basic predictions loaded. ML-enhanced probabilities are temporarily unavailable.</p>
          )}
        </motion.div>

        {/* Query summary */}
        {lastQuery && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-wrap justify-center gap-2 mb-8"
          >
            <span className="px-3 py-1.5 bg-cyan-500/15 border border-cyan-500/30 rounded-full text-cyan-300 text-sm font-semibold">
              {lastQuery.percentile} %ile
            </span>
            <span className="px-3 py-1.5 bg-purple-500/15 border border-purple-500/30 rounded-full text-purple-300 text-sm font-semibold">
              {lastQuery.category}
            </span>
            <span className="px-3 py-1.5 bg-blue-500/15 border border-blue-500/30 rounded-full text-blue-300 text-sm font-semibold">
              {lastQuery.branchPreference}
            </span>
            <span className="px-3 py-1.5 bg-slate-500/20 border border-slate-500/30 rounded-full text-slate-300 text-sm font-semibold">
              CAP Round {lastQuery.capRound}
            </span>
            {lastQuery.location && (
              <span className="px-3 py-1.5 bg-emerald-500/15 border border-emerald-500/30 rounded-full text-emerald-300 text-sm font-semibold">
                📍 {lastQuery.location}
              </span>
            )}
            <button
              onClick={() => navigate('/')}
              className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-full text-slate-400 text-sm hover:bg-white/10 transition-colors"
            >
              ✏️ Edit
            </button>
          </motion.div>
        )}

        {/* Location fallback notice */}
        {lastQuery?.locationFallback && lastQuery?.location && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-center mb-6"
          >
            <div className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-300 text-sm">
              <span>⚠️</span>
              <span>No colleges found in <strong>{lastQuery.location}</strong> for your branch/category. Showing results from all districts.</span>
            </div>
          </motion.div>
        )}
          <Tabs defaultValue="results" className="w-full">
            <div className="flex justify-center mb-8">
              <TabsList className="bg-white/10 border border-white/20 p-1">
                <TabsTrigger value="results" className="data-[state=active]:bg-cyan-500 data-[state=active]:text-slate-900 font-semibold px-8 py-2.5">
                  Results
                </TabsTrigger>
                <TabsTrigger value="strategy" className="data-[state=active]:bg-cyan-500 data-[state=active]:text-slate-900 font-semibold px-8 py-2.5">
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
  stats, mlAvailable, bandsAvailable, filterBand, setFilterBand, showFilters, setShowFilters, 
  sortBy, setSortBy, processedColleges, expandedCard, setExpandedCard, navigate, 
  comparisonSelection, handleCompareToggle
}: any) {
  return (
    <>
      {/* Stats Cards */}
      <motion.div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <StatCard label={mlAvailable ? "Safe" : "High Chance"} value={stats.b1} variant="success" icon={<CheckCircle className="w-6 h-6" />} />
        <StatCard label={mlAvailable ? "Likely" : "Medium Chance"} value={stats.b2} variant="default" icon={<GraduationCap className="w-6 h-6" />} />
        <StatCard label={mlAvailable ? "Moderate" : "Low Chance"} value={stats.b3} variant="warning" icon={<MinusCircle className="w-6 h-6" />} />
        <StatCard label={mlAvailable ? "Risky" : "Risky"} value={stats.b4} variant="danger" icon={<AlertCircle className="w-6 h-6" />} />
      </motion.div>

      {/* Filters */}
      <motion.div className="bg-white/5 backdrop-blur-md border border-white/20 rounded-2xl p-6 mb-8">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="lg:hidden flex items-center justify-between w-full text-blue-100"
            >
               <span className="flex items-center gap-2 font-semibold">
                 <Filter className="w-4 h-4" /> Filters & Sort
               </span>
               <ChevronDown className={`w-5 h-5 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>

            <div className={`${showFilters ? 'mt-5' : 'hidden'} lg:flex flex-col lg:flex-row gap-5`}>
              <div className="flex-1 lg:max-w-xs">
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Sort by</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="w-full h-11 px-4 bg-white/10 border border-white/20 rounded-xl text-white appearance-none cursor-pointer focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                >
                  <option value="chance" className="bg-slate-900">Admission Chance</option>
                  <option value="cutoff-high" className="bg-slate-900">Cutoff: High to Low</option>
                  <option value="cutoff-low" className="bg-slate-900">Cutoff: Low to High</option>
                  <option value="name" className="bg-slate-900">College Name</option>
                  <option value="fees" className="bg-slate-900">Fees</option>
                  <option value="seats" className="bg-slate-900">Seats</option>
                </select>
              </div>

              <div className="flex-1">
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Filter by Band</label>
                <div className="flex flex-wrap gap-2">
                  {['all', ...bandsAvailable].map((band) => (
                    <button
                      key={band}
                      onClick={() => setFilterBand(band)}
                      className={`h-11 px-5 rounded-xl text-sm font-semibold transition-all border ${
                        filterBand === band
                          ? 'bg-cyan-600/30 border-cyan-500 text-white'
                          : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                      }`}
                    >
                      {band}
                    </button>
                  ))}
                </div>
              </div>
            </div>
      </motion.div>

      {/* Grid */}
      {processedColleges.length > 0 ? (
        <motion.ul className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 pb-24" layout>
          <AnimatePresence mode="popLayout">
            {processedColleges.map((college: any, i: number) => (
              <li key={college.id}>
                <CollegeCard
                  college={college}
                  delay={Math.min(i * 0.05, 0.3)}
                  isExpanded={expandedCard === college.id}
                  onToggle={() => setExpandedCard(expandedCard === college.id ? null : college.id)}
                  onViewDetails={() => navigate(`/college/${college.id}`)}
                  isCompared={comparisonSelection.some((c: any) => c.id === college.id)}
                  onCompareToggle={(checked) => handleCompareToggle(college, checked)}
                  compareDisabled={comparisonSelection.length >= 3}
                />
              </li>
            ))}
          </AnimatePresence>
        </motion.ul>
      ) : (
        <div className="bg-white/5 rounded-3xl p-16 text-center border border-white/10">
          <Search className="w-12 h-12 text-slate-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">No matches found</h3>
          <p className="text-slate-400">Try adjusting your filters or sorting criteria.</p>
        </div>
      )}
    </>
  );
}

function StatCard({ label, value, variant, icon }: any) {
  const styles: Record<string, string> = {
    default: 'from-blue-500/20 to-cyan-500/10 border-blue-500/30 text-blue-400',
    success: 'from-emerald-500/20 to-green-500/10 border-emerald-500/30 text-emerald-400',
    warning: 'from-amber-500/20 to-orange-500/10 border-amber-500/30 text-amber-400',
    danger: 'from-red-500/20 to-rose-500/10 border-red-500/30 text-red-400',
  };

  return (
    <div className={`bg-gradient-to-br ${styles[variant]} border rounded-2xl p-6`}>
      <div className="mb-4">{icon}</div>
      <div className="text-4xl font-black text-white leading-none mb-2">{value}</div>
      <div className="text-xs font-bold uppercase tracking-wider opacity-80">{label}</div>
    </div>
  );
}