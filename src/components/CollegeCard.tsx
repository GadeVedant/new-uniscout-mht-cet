import { AnimatePresence, motion } from 'motion/react';
import {
  MapPin, Building2, BookOpen, ExternalLink, GitCompare,
  Bookmark, DollarSign, Users, TrendingUp, TrendingDown, Minus,
} from 'lucide-react';
import { CollegeRecommendation } from '../services/api';
import { Checkbox } from './ui/checkbox';

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

// ── Shared helpers ────────────────────────────────────────────────────────────

function AdmissionBadge({ category }: { category: string }) {
  const cfg: Record<string, { label: string; cls: string }> = {
    Safe:     { label: 'Safe',     cls: 'text-emerald-400 bg-emerald-500/[0.12] border-emerald-500/30' },
    Likely:   { label: 'Likely',   cls: 'text-blue-400   bg-blue-500/[0.12]   border-blue-500/30'   },
    Moderate: { label: 'Moderate', cls: 'text-amber-400  bg-amber-500/[0.12]  border-amber-500/30'  },
    Risky:    { label: 'Risky',    cls: 'text-red-400    bg-red-500/[0.12]    border-red-500/30'    },
    High:     { label: 'Safe',     cls: 'text-emerald-400 bg-emerald-500/[0.12] border-emerald-500/30' },
    Medium:   { label: 'Moderate', cls: 'text-amber-400  bg-amber-500/[0.12]  border-amber-500/30'  },
    Low:      { label: 'Risky',    cls: 'text-red-400    bg-red-500/[0.12]    border-red-500/30'    },
  };
  const c = cfg[category] ?? cfg.Moderate;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${c.cls}`}>
      <span className="size-1.5 rounded-full bg-current opacity-80" />
      {c.label}
    </span>
  );
}

function ProbBar({ value, category }: { value: number; category: string }) {
  const bar: Record<string, string> = {
    Safe: 'bg-emerald-500', Likely: 'bg-blue-500', Moderate: 'bg-amber-500', Risky: 'bg-red-500',
    High: 'bg-emerald-500', Medium: 'bg-amber-500', Low: 'bg-red-500',
  };
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex-1 h-1.5 bg-white/[0.08] rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${bar[category] ?? 'bg-primary'}`}
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="text-xs font-medium tabular-nums w-8 text-right text-muted-foreground">{Math.round(value)}%</span>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function CollegeCard({
  college, delay, isExpanded, onToggle, onViewDetails, isCompared, onCompareToggle, compareDisabled,
}: CollegeCardProps) {
  const isMlAvailable = !!college.admissionBand;
  const band = college.admissionBand ||
    (college.admissionChance === 'High' ? 'Safe' : college.admissionChance === 'Medium' ? 'Moderate' : 'Risky');

  // When ML probability is available use it (including near-zero values).
  // When absent, fall back to a band-based estimate so the bar is never blank.
  const hasMlProbability = college.admissionProbability != null && college.admissionProbability > 0;
  const probability = hasMlProbability
    ? college.admissionProbability!
    : (band === 'Safe' ? 90 : band === 'Likely' ? 75 : band === 'Moderate' ? 60 : 35);

  const renderTrend = () => {
    switch (college.cutoffTrend) {
      case 'rising':  return <TrendingUp  className="size-3 text-red-400"     aria-label="Rising (Harder)"  />;
      case 'falling': return <TrendingDown className="size-3 text-emerald-400" aria-label="Falling (Easier)" />;
      case 'stable':  return <Minus       className="size-3 text-slate-400"   aria-label="Stable"           />;
      default: return null;
    }
  };

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
      className="group p-5 rounded-2xl bg-card border border-white/[0.07] hover:border-white/[0.14] transition-all"
    >
      <div className="flex items-start gap-4">
        {/* Compare checkbox */}
        {onCompareToggle && (
          <div className="pt-0.5 shrink-0" onClick={e => e.stopPropagation()}>
            <Checkbox
              checked={isCompared}
              onCheckedChange={onCompareToggle}
              disabled={compareDisabled && !isCompared}
              className="border-white/20 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
            />
          </div>
        )}

        <div className="flex-1 min-w-0">
          {/* Top row */}
          <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
            <div className="flex-1 min-w-0">
              <button
                onClick={onToggle}
                className="text-[15px] font-semibold hover:text-primary transition-colors text-left leading-snug text-foreground"
              >
                {college.name}
              </button>
              <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground flex-wrap">
                <span className="flex items-center gap-1"><MapPin className="size-3" />{college.location}</span>
                {college.district && college.district !== college.location && (
                  <span className="flex items-center gap-1"><Building2 className="size-3" />{college.district}</span>
                )}
                <span className="flex items-center gap-1"><BookOpen className="size-3" />{college.branch}</span>
                {college.collegeType && (
                  <span className="px-1.5 py-0.5 rounded-md bg-white/[0.05] border border-white/10 text-[10px]">
                    {college.collegeType}
                  </span>
                )}
              </div>
            </div>
            <div className="shrink-0">
              <AdmissionBadge category={band} />
            </div>
          </div>

          {/* Probability bar */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-muted-foreground">Admission Probability</span>
              {college.admissionProbabilityP10 && college.admissionProbabilityP90 ? (
                <span className="text-xs text-muted-foreground/60 font-mono">
                  {Math.round(college.admissionProbabilityP10)}%–{Math.round(college.admissionProbabilityP90)}%
                </span>
              ) : (
                <span className="text-xs text-muted-foreground/40 font-mono" title="Estimated from cutoff band">~est</span>
              )}
            </div>
            <ProbBar value={probability} category={band} />
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 pt-3.5 border-t border-white/[0.05]">
            <div>
              <div className="text-[10px] text-muted-foreground mb-0.5 uppercase tracking-wider flex items-center gap-1">
                Cutoff {renderTrend()}
                {college.estimatedCutoff && (
                  <span className="text-amber-400/70 normal-case not-italic" title="Estimated from Open category">~est</span>
                )}
              </div>
              <div className="text-sm font-mono font-semibold">
                {college.cutoffPercentile?.toFixed(2)}%ile
              </div>
            </div>
            {college.fees && college.fees !== 'N/A' ? (
              <div>
                <div className="text-[10px] text-muted-foreground mb-0.5 uppercase tracking-wider">Fees/yr</div>
                <div className="text-sm font-semibold">{college.fees}</div>
              </div>
            ) : (
              <div>
                <div className="text-[10px] text-muted-foreground mb-0.5 uppercase tracking-wider">Fees/yr</div>
                <div className="text-sm font-semibold text-muted-foreground" title="Fee data not available from DTE Maharashtra">Not reported</div>
              </div>
            )}
            {college.avgPackage ? (
              <div>
                <div className="text-[10px] text-muted-foreground mb-0.5 uppercase tracking-wider">Avg Pkg</div>
                <div className="text-sm font-semibold text-emerald-400">{college.avgPackage} LPA</div>
              </div>
            ) : college.seats ? (
              <div>
                <div className="text-[10px] text-muted-foreground mb-0.5 uppercase tracking-wider">Seats</div>
                <div className="text-sm font-semibold">{college.seats}</div>
              </div>
            ) : null}
          </div>

          {/* Round 2 badge */}
          {college.round2Opportunity && (
            <div className="mt-3 px-2.5 py-1.5 rounded-lg bg-teal-500/[0.08] border border-teal-500/20 text-teal-400 text-xs font-medium inline-flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-teal-400" />
              Round 2 Opportunity
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 mt-4 pt-3.5 border-t border-white/[0.05]">
            {onViewDetails && (
              <button
                onClick={(e) => { e.stopPropagation(); onViewDetails(college); }}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
              >
                <ExternalLink className="size-3" />View Details
              </button>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); onToggle(); }}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
            >
              {isExpanded ? 'Less ↑' : 'More ↓'}
            </button>
          </div>
        </div>
      </div>

      {/* Expanded details */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-4 pt-4 border-t border-white/[0.06] space-y-3 pl-8">
              {college.highestPackage && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Highest Package</span>
                  <span className="font-semibold text-emerald-400">{college.highestPackage} LPA</span>
                </div>
              )}
              {college.seats && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Seats</span>
                  <span className="font-semibold">{college.seats}</span>
                </div>
              )}
              {isMlAvailable && college.topFactors && college.topFactors.length > 0 && (
                <div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Key Factors</div>
                  <div className="flex flex-wrap gap-1.5">
                    {college.topFactors.map((factor, i) => (
                      <span key={i} className="text-xs px-2 py-0.5 bg-white/[0.05] border border-white/10 rounded-md text-muted-foreground">
                        {factor}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {isMlAvailable && college.confidenceLabel && (
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">AI Confidence</span>
                  <span className={
                    college.confidenceLabel.toLowerCase().includes('high') ? 'text-emerald-400' :
                    college.confidenceLabel.toLowerCase().includes('medium') ? 'text-amber-400' :
                    'text-muted-foreground'
                  }>{college.confidenceLabel}</span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
  );
}
