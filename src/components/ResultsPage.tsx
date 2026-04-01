import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, 
  MapPin, 
  Building2, 
  TrendingUp, 
  TrendingDown, 
  Filter,
  GraduationCap,
  CheckCircle,
  AlertCircle,
  MinusCircle,
  Home,
  ChevronDown,
  X,
  Search,
  Sparkles,
  Star,
  Users,
  DollarSign,
  Award,
  Calendar
} from 'lucide-react';
import { CollegeRecommendation } from '../services/api';

interface ResultsPageProps {
  colleges: CollegeRecommendation[];
  portalType: 'mht-cet' | 'ssc';
  onBack: () => void;
  onHome: () => void;
}

type SortOption = 'chance' | 'cutoff-high' | 'cutoff-low' | 'name';
type FilterChance = 'all' | 'High' | 'Medium' | 'Low';

export function ResultsPage({ colleges, onBack, onHome }: ResultsPageProps) {
  const [sortBy, setSortBy] = useState<SortOption>('chance');
  const [filterChance, setFilterChance] = useState<FilterChance>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  // Process and sort colleges
  const processedColleges = useMemo(() => {
    let filtered = colleges;

    if (filterChance !== 'all') {
      filtered = colleges.filter(c => c.admissionChance === filterChance);
    }

    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'chance':
          const chanceOrder = { High: 0, Medium: 1, Low: 2 };
          const chanceCompare = chanceOrder[a.admissionChance] - chanceOrder[b.admissionChance];
          if (chanceCompare !== 0) return chanceCompare;
          return b.cutoffPercentile - a.cutoffPercentile;
        case 'cutoff-high':
          return b.cutoffPercentile - a.cutoffPercentile;
        case 'cutoff-low':
          return a.cutoffPercentile - b.cutoffPercentile;
        case 'name':
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });
  }, [colleges, sortBy, filterChance]);

  // Statistics
  const stats = useMemo(() => ({
    total: colleges.length,
    high: colleges.filter(c => c.admissionChance === 'High').length,
    medium: colleges.filter(c => c.admissionChance === 'Medium').length,
    low: colleges.filter(c => c.admissionChance === 'Low').length,
  }), [colleges]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-950 to-slate-950 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {/* Header */}
      <header className="relative z-10 bg-white/10 backdrop-blur-xl border-b border-white/20 sticky top-0">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <motion.button
                onClick={onBack}
                className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-blue-200 hover:text-blue-100 transition-all backdrop-blur-sm"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="hidden sm:inline font-semibold">New Search</span>
              </motion.button>
              <div className="h-6 w-px bg-white/20" />
              <motion.button
                onClick={onHome}
                className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-blue-200 hover:text-blue-100 transition-all backdrop-blur-sm"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Home className="w-5 h-5" />
                <span className="hidden sm:inline font-semibold">Home</span>
              </motion.button>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-400/30 rounded-xl backdrop-blur-sm">
              <Sparkles className="w-4 h-4 text-cyan-300" />
              <span className="text-sm font-bold text-cyan-300">
                {colleges.length} colleges found
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8 py-8 lg:py-10">
        {/* Page Title */}
        <motion.div 
          className="text-center mb-12"
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-4xl lg:text-5xl font-black bg-gradient-to-r from-blue-400 via-cyan-400 to-purple-400 bg-clip-text text-transparent mb-4">
            Your Predicted Colleges
          </h1>
          <p className="text-xl text-blue-100">
            Found {colleges.length} colleges matching your criteria
          </p>
        </motion.div>

        {/* Stats Cards */}
        {colleges.length > 0 && (
          <motion.div
            className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-12"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <StatCard label="Total Colleges" value={stats.total} variant="default" icon={<GraduationCap className="w-6 h-6" />} />
            <StatCard label="High Chance" value={stats.high} variant="success" icon={<CheckCircle className="w-6 h-6" />} />
            <StatCard label="Medium Chance" value={stats.medium} variant="warning" icon={<MinusCircle className="w-6 h-6" />} />
            <StatCard label="Low Chance" value={stats.low} variant="danger" icon={<AlertCircle className="w-6 h-6" />} />
          </motion.div>
        )}

        {/* Filters */}
        {colleges.length > 0 && (
          <motion.div
            className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-2xl border border-white/20 rounded-3xl p-6 mb-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            {/* Mobile Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="lg:hidden flex items-center justify-between w-full text-blue-100"
            >
              <span className="flex items-center gap-2 font-semibold">
                <Filter className="w-4 h-4" />
                Filters & Sort
              </span>
              <ChevronDown className={`w-5 h-5 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>

            {/* Filter Controls */}
            <div className={`${showFilters ? 'mt-5' : 'hidden'} lg:flex lg:mt-0 flex-col lg:flex-row lg:items-end gap-5`}>
              {/* Sort Dropdown */}
              <div className="flex-1 lg:max-w-xs">
                <label className="block text-xs font-semibold text-blue-300 uppercase tracking-wide mb-2">Sort by</label>
                <div className="relative">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    className="w-full h-11 px-4 pr-10 bg-white/10 border border-white/20 rounded-xl text-white text-sm font-medium appearance-none cursor-pointer hover:border-white/40 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/50 transition-all backdrop-blur-sm"
                  >
                    <option value="chance" className="bg-slate-900 text-white">Admission Chance</option>
                    <option value="cutoff-high" className="bg-slate-900 text-white">Cutoff: High to Low</option>
                    <option value="cutoff-low" className="bg-slate-900 text-white">Cutoff: Low to High</option>
                    <option value="name" className="bg-slate-900 text-white">College Name</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-300 pointer-events-none" />
                </div>
              </div>

              {/* Filter Pills */}
              <div className="flex-1">
                <label className="block text-xs font-semibold text-blue-300 uppercase tracking-wide mb-2">Filter by chance</label>
                <div className="flex flex-wrap gap-2">
                  {(['all', 'High', 'Medium', 'Low'] as const).map((chance) => (
                    <motion.button
                      key={chance}
                      onClick={() => setFilterChance(chance)}
                      className={`h-11 px-5 rounded-xl text-sm font-semibold transition-all ${
                        filterChance === chance
                          ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-500/30'
                          : 'bg-white/10 text-blue-200 hover:bg-white/20 border border-white/20'
                      }`}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {chance === 'all' ? 'All' : chance}
                    </motion.button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Results Grid */}
        {processedColleges.length > 0 ? (
          <motion.div 
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
            layout
          >
            <AnimatePresence mode="popLayout">
              {processedColleges.map((college, index) => (
                <CollegeCard
                  key={college.id}
                  college={college}
                  delay={Math.min(index * 0.05, 0.5)}
                  isExpanded={expandedCard === college.id}
                  onToggle={() => setExpandedCard(expandedCard === college.id ? null : college.id)}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        ) : (
          <motion.div
            className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-2xl border border-white/20 rounded-3xl p-12 lg:p-16 text-center"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <div className="w-20 h-20 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Search className="w-10 h-10 text-blue-300" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">No colleges found</h3>
            <p className="text-blue-200 mb-8 max-w-md mx-auto">
              We couldn't find colleges matching your current filters. Try adjusting your criteria.
            </p>
            <motion.button
              onClick={onBack}
              className="px-8 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-semibold rounded-xl shadow-lg shadow-cyan-500/30 hover:shadow-xl transition-all"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Try Different Criteria
            </motion.button>
          </motion.div>
        )}
      </main>
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: number;
  variant: 'default' | 'success' | 'warning' | 'danger';
  icon: React.ReactNode;
}

function StatCard({ label, value, variant, icon }: StatCardProps) {
  const styles = {
    default: {
      bg: 'from-blue-500/20 to-cyan-500/20',
      border: 'border-blue-400/30',
      iconColor: 'text-blue-400',
      valueColor: 'text-white',
      labelColor: 'text-white',
    },
    success: {
      bg: 'from-emerald-500/20 to-green-500/20',
      border: 'border-emerald-400/30',
      iconColor: 'text-blue-400',
      valueColor: 'text-white',
      labelColor: 'text-white',
    },
    warning: {
      bg: 'from-amber-500/20 to-orange-500/20',
      border: 'border-amber-400/30',
      iconColor: 'text-blue-400',
      valueColor: 'text-white',
      labelColor: 'text-white',
    },
    danger: {
      bg: 'from-red-500/20 to-rose-500/20',
      border: 'border-red-400/30',
      iconColor: 'text-blue-400',
      valueColor: 'text-white',
      labelColor: 'text-white',
    },
  };

  const s = styles[variant];

  return (
    <motion.div 
      className={`bg-gradient-to-br ${s.bg} ${s.border} border rounded-2xl p-6 lg:p-8 backdrop-blur-xl shadow-lg`}
      whileHover={{ scale: 1.05, y: -5 }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex items-center gap-4 mb-4">
        <div className={`w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center ${s.iconColor}`}>
          {icon}
        </div>
      </div>
      <div className={`text-4xl lg:text-5xl font-black ${s.valueColor} mb-2 leading-none`}>{value}</div>
      <div className={`text-sm lg:text-base font-bold ${s.labelColor} uppercase tracking-wider`}>{label}</div>
    </motion.div>
  );
}

interface CollegeCardProps {
  college: CollegeRecommendation;
  delay: number;
  isExpanded: boolean;
  onToggle: () => void;
}

function CollegeCard({ college, delay, isExpanded, onToggle }: CollegeCardProps) {
  const chanceConfig = {
    High: { 
      gradient: 'from-emerald-500/20 to-green-500/20',
      border: 'border-emerald-400/30',
      text: 'text-emerald-300', 
      icon: CheckCircle,
      accentGradient: 'from-emerald-400 to-green-400',
      rating: 5
    },
    Medium: { 
      gradient: 'from-amber-500/20 to-orange-500/20',
      border: 'border-amber-400/30',
      text: 'text-amber-300', 
      icon: MinusCircle,
      accentGradient: 'from-amber-400 to-orange-400',
      rating: 3
    },
    Low: { 
      gradient: 'from-red-500/20 to-rose-500/20',
      border: 'border-red-400/30',
      text: 'text-red-300', 
      icon: AlertCircle,
      accentGradient: 'from-red-400 to-rose-400',
      rating: 2
    },
  };

  const config = chanceConfig[college.admissionChance];
  const ChanceIcon = config.icon;

  // Generate star rating based on admission chance
  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${
          i < rating 
            ? 'text-yellow-400 fill-yellow-400' 
            : 'text-gray-600'
        }`}
      />
    ));
  };

  return (
    <motion.div
      layout
      className={`college-card bg-gradient-to-br ${config.gradient} backdrop-blur-xl border ${config.border} rounded-3xl overflow-hidden hover:scale-[1.02] transition-all duration-300 cursor-pointer group shadow-2xl text-white`}
      initial={{ opacity: 0, y: 30, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay, duration: 0.4, type: "spring" }}
      onClick={onToggle}
      style={{ color: 'white' }}
    >
      {/* Top Accent Bar */}
      <div className={`h-1.5 bg-gradient-to-r ${config.accentGradient}`} />
      
      {/* Card Content */}
      <div className="p-6">
        {/* Header with Badge and Location */}
        <div className="flex items-start justify-between mb-4">
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r ${config.accentGradient} rounded-full`}>
            <ChanceIcon className="w-4 h-4 text-white" />
            <span className="text-xs font-bold text-white">
              {college.admissionChance}
            </span>
          </div>
          <div className="flex items-center gap-1 text-white">
            <MapPin className="w-4 h-4" />
            <span className="text-sm font-medium">{college.location}</span>
          </div>
        </div>

        {/* College Name */}
        <h3 className="text-lg font-bold text-white mb-2 line-clamp-2 leading-tight group-hover:text-cyan-300 transition-colors">
          {college.name}
        </h3>

        {/* Star Rating */}
        <div className="flex items-center gap-1 mb-4">
          {renderStars(config.rating)}
          <span className="text-sm text-white ml-2 font-medium">{config.rating}.0</span>
        </div>

        {/* Key Stats Grid */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-white/5 rounded-xl p-3 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-1">
              <Building2 className="w-4 h-4 text-blue-300" />
              <span className="text-xs text-white font-medium">Branch</span>
            </div>
            <p className="text-sm font-semibold text-white truncate">{college.branch}</p>
          </div>
          
          <div className="bg-white/5 rounded-xl p-3 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-1">
              <Award className="w-4 h-4 text-blue-300" />
              <span className="text-xs text-white font-medium">Cutoff</span>
            </div>
            <p className="text-sm font-semibold text-white">
              {college.cutoffPercentile.toFixed(1)}
            </p>
          </div>
        </div>

        {/* Type Badge */}
        <div className="flex items-center justify-between">
          <span className="px-3 py-1 bg-white/10 rounded-full text-xs font-medium text-white">
            {college.collegeType || 'Government'}
          </span>
          <span className="text-sm font-bold text-white">
            {college.percentileDifference >= 0 ? '+' : ''}{college.percentileDifference.toFixed(1)} %ile
          </span>
        </div>
      </div>

      {/* Expanded Details */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-white/10"
          >
            <div className="p-6 bg-white/5 backdrop-blur-sm space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <InfoRow 
                  icon={<Users className="w-4 h-4" />}
                  label="Category" 
                  value={college.category}
                />
                <InfoRow 
                  icon={<Calendar className="w-4 h-4" />}
                  label="CAP Round" 
                  value={`Round ${college.capRound}`}
                />
                <InfoRow 
                  icon={<DollarSign className="w-4 h-4" />}
                  label="Fees" 
                  value={college.fees}
                />
                <InfoRow 
                  icon={<GraduationCap className="w-4 h-4" />}
                  label="Seats" 
                  value={`${college.seats}`}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Expand Hint */}
      <div className="px-6 py-3 bg-white/5 border-t border-white/10 text-center backdrop-blur-sm">
        <span className="text-xs font-medium text-white">
          {isExpanded ? 'Click to collapse' : 'Click for more details'}
        </span>
      </div>
    </motion.div>
  );
}

interface InfoRowProps {
  icon?: React.ReactNode;
  label: string;
  value: string;
  valueClass?: string;
}

function InfoRow({ icon, label, value, valueClass = 'text-white' }: InfoRowProps) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 text-blue-300 text-xs">
        {icon}
        <span className="text-white font-medium">{label}</span>
      </div>
      <span className={`text-sm font-semibold truncate block text-white`}>
        {value}
      </span>
    </div>
  );
}