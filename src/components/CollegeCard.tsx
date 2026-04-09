import { motion, AnimatePresence } from 'motion/react';
import { 
  MapPin, 
  TrendingUp, 
  TrendingDown,
  Minus,
  CheckCircle,
  AlertCircle,
  MinusCircle,
  DollarSign,
  GraduationCap,
  Users,
  Calendar,
  Building2,
  Tag
} from 'lucide-react';
import { CollegeRecommendation } from '../services/api';
import { Checkbox } from './ui/checkbox';
import { Badge } from './ui/badge';

interface CollegeCardProps {
  college: CollegeRecommendation;
  delay: number;
  isExpanded: boolean;
  onToggle: () => void;
  onViewDetails?: (college: CollegeRecommendation) => void;
  isCompared?: boolean;
  onCompareToggle?: (checked: boolean | 'indeterminate') => void;
  compareDisabled?: boolean;
}

export function CollegeCard({ 
  college, delay, isExpanded, onToggle, onViewDetails, isCompared, onCompareToggle, compareDisabled
}: CollegeCardProps) {
  
  const isMlAvailable = !!college.admissionBand;
  const band = college.admissionBand || 
    (college.admissionChance === 'High' ? 'Safe' : college.admissionChance === 'Medium' ? 'Moderate' : 'Risky');

  const bandConfig = {
    Safe: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30' },
    Likely: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30' },
    Moderate: { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/30' },
    Risky: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30' },
  };
  const config = bandConfig[band];

  const renderTrend = () => {
    switch (college.cutoffTrend) {
      case 'rising': return <span className="text-red-400 font-bold ml-1" title="Rising (Harder)">↑</span>;
      case 'falling': return <span className="text-emerald-400 font-bold ml-1" title="Falling (Easier)">↓</span>;
      case 'stable': return <span className="text-slate-400 font-bold ml-1" title="Stable">→</span>;
      default: return null;
    }
  };

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="relative bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden hover:border-white/20 transition-all text-slate-300 shadow-lg"
    >
      <div 
        className="p-5 cursor-pointer hover:bg-white-[0.02]"
        onClick={onToggle}
      >
        <div className="flex justify-between items-start mb-3">
          <div className="flex flex-wrap gap-2 items-center">
            <span className={`px-2.5 py-1 text-xs font-bold rounded-lg border ${config.bg} ${config.text} ${config.border}`}>
              {isMlAvailable ? band : college.admissionChance}
            </span>
            {college.collegeType && (
              <span className="px-2.5 py-1 text-xs font-medium bg-white/10 text-slate-300 rounded-lg">
                {college.collegeType}
              </span>
            )}
            {college.round2Opportunity && (
              <span className="px-2.5 py-1 text-xs font-bold bg-teal-500/20 text-teal-400 border border-teal-500/30 rounded-lg">
                Round 2 Opp
              </span>
            )}
          </div>
          {onCompareToggle && (
            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              <Checkbox 
                checked={isCompared} 
                onCheckedChange={onCompareToggle} 
                disabled={compareDisabled && !isCompared}
              />
            </div>
          )}
        </div>

        <h3 className="text-lg font-bold text-white mb-1 leading-tight pr-2">
          {college.name}
        </h3>
        
        <div className="flex items-center gap-1 text-slate-400 mb-3 text-sm">
          <MapPin className="w-3.5 h-3.5" />
          <span>{college.location}</span>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-white/5 rounded-lg p-2.5 border border-white/5">
            <div className="text-xs text-slate-400 mb-0.5">Branch</div>
            <div className="text-sm font-semibold text-white truncate" title={college.branch}>
              {college.branch}
            </div>
          </div>
          <div className="bg-white/5 rounded-lg p-2.5 border border-white/5">
            <div className="text-xs text-slate-400 mb-0.5">Cutoff</div>
            <div className="text-sm font-semibold text-white flex items-center gap-1">
              {college.cutoffPercentile?.toFixed(2)} {renderTrend()}
              {college.estimatedCutoff && (
                <span className="text-xs text-amber-400/70 font-normal" title="Estimated from Open category — no SC/reserved data available">
                  ~est.
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mt-4">
          <div className="text-sm font-medium">
            {isMlAvailable ? (
              <span className="text-slate-300">
                {college.admissionProbabilityP10 && college.admissionProbabilityP90 ? 
                  `${Math.round(college.admissionProbabilityP10)}%–${Math.round(college.admissionProbabilityP90)}% chance` :
                  (college.admissionProbability ? `${Math.round(college.admissionProbability)}% chance` : '')}
              </span>
            ) : (
              <span className="text-slate-500 italic text-xs">Basic prediction</span>
            )}
          </div>
          {college.avgPackage && (
            <div className="text-sm font-medium text-emerald-400 flex items-center gap-1">
              <DollarSign className="w-4 h-4" />
              {college.avgPackage} LPA avg
            </div>
          )}
        </div>

        {/* Actions - moved to unexpanded face */}
        {onViewDetails && (
          <button
            onClick={(e) => { e.stopPropagation(); onViewDetails(college); }}
            className="w-full mt-4 py-2.5 px-4 rounded-lg border border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10 font-medium transition-all"
          >
            View Full Details
          </button>
        )}
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-white/10 bg-white/[0.02]"
          >
            <div className="p-5 space-y-4">
              {/* Placement Details */}
              {college.highestPackage && (
                <div className="flex justify-between items-center text-sm border-b border-white/5 pb-3">
                  <span className="text-slate-400">Highest Package</span>
                  <span className="font-semibold text-emerald-400">{college.highestPackage} LPA</span>
                </div>
              )}

              {/* Factors */}
              {isMlAvailable && college.topFactors && college.topFactors.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Key Factors</span>
                  <div className="flex flex-wrap gap-2">
                    {college.topFactors.map((factor, i) => (
                      <span key={i} className="text-xs px-2 py-1 bg-white/5 text-slate-300 border border-white/10 rounded-md">
                        {factor}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Confidence Label */}
              {isMlAvailable && college.confidenceLabel && (
                <div className="text-xs flex items-center gap-1.5 mt-2">
                  <span className="text-slate-500">AI Confidence:</span>
                  <span className={
                    college.confidenceLabel.toLowerCase().includes('high') ? 'text-emerald-400' :
                    college.confidenceLabel.toLowerCase().includes('medium') ? 'text-amber-400' :
                    'text-slate-400 italic'
                  }>
                    {college.confidenceLabel}
                  </span>
                </div>
              )}

              {/* Stats Row */}
              <div className="grid grid-cols-2 gap-4 mt-2">
                <div className="space-y-1">
                  <span className="text-xs text-slate-500">Fees</span>
                  <div className="text-sm font-semibold">{college.fees}</div>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-slate-500">Total Seats</span>
                  <div className="text-sm font-semibold">{college.seats || 'N/A'}</div>
                </div>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
  );
}
