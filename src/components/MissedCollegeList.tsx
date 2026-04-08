/**
 * MissedCollegeList — Task 10 (CAP Round 2 Strategy spec)
 * Colleges missed in Round 1 that may become reachable in Round 2.
 */
import { motion } from 'motion/react';
import type { MissedCollege, Round2Opportunity } from '../services/api';

interface MissedCollegeListProps {
  missedColleges: MissedCollege[];
  round2Opportunities: Round2Opportunity[];
}

export function MissedCollegeList({ missedColleges, round2Opportunities }: MissedCollegeListProps) {
  // Set of college codes that also appear in opportunities list
  const opportunityCodes = new Set(round2Opportunities.map((o) => o.collegeCode));

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.1, duration: 0.4 }}
      className="bg-white/5 border border-white/10 rounded-2xl p-6"
    >
      <h3 className="text-xl font-bold text-white mb-4">Missed in Round 1</h3>

      {missedColleges.length === 0 ? (
        <p className="text-slate-400 text-sm">
          No colleges found within 8 points of your percentile with a historical Round 2 drop of 3+ points.
        </p>
      ) : (
        <ul className="space-y-4">
          {missedColleges.map((c, i) => {
            const isInRange = opportunityCodes.has(c.collegeCode);
            return (
              <motion.li
                key={`${c.collegeCode}-${i}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.05 }}
                className="bg-white/5 rounded-xl p-4 border border-white/5"
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <span className="font-bold text-white leading-tight">{c.collegeName}</span>
                  {isInRange && (
                    <span className="shrink-0 text-xs font-semibold px-2 py-0.5 bg-teal-500/20 text-teal-400 border border-teal-500/30 rounded-full">
                      Within your range
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-400 mb-3">{c.branchName}</p>

                <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span className="text-slate-500">
                    R1 cutoff: <span className="text-slate-300 font-medium">{c.round1Cutoff.toFixed(2)}</span>
                  </span>
                  <span className="text-cyan-400 font-medium">
                    Exp. R2: {c.expectedRound2Cutoff.toFixed(2)}{' '}
                    <span className="text-emerald-400">(↓ {c.expectedDrop.toFixed(1)} pts)</span>
                  </span>
                </div>

                {c.round2Probability >= 50 && (
                  <div className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-3 py-1 rounded-full">
                    Good chance in Round 2 ({c.round2Probability}%)
                  </div>
                )}
              </motion.li>
            );
          })}
        </ul>
      )}
    </motion.div>
  );
}
