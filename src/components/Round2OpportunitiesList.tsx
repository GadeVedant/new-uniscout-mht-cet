/**
 * Round2OpportunitiesList — Task 11 (CAP Round 2 Strategy spec)
 * All colleges in the student's branch+category with a consistent Round 2 cutoff drop.
 */
import { motion } from 'motion/react';
import type { Round2Opportunity, MissedCollege } from '../services/api';

interface Round2OpportunitiesListProps {
  opportunities: Round2Opportunity[];
  missedColleges: MissedCollege[];
}

export function Round2OpportunitiesList({ opportunities, missedColleges }: Round2OpportunitiesListProps) {
  // Set of college codes that also appear in missed colleges list
  const missedCodes = new Set(missedColleges.map((m) => m.collegeCode));

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.2, duration: 0.4 }}
      className="bg-white/5 border border-white/10 rounded-2xl p-6"
    >
      <h3 className="text-xl font-bold text-white mb-4">Round 2 Opportunities</h3>

      {opportunities.length === 0 ? (
        <p className="text-slate-400 text-sm">
          No colleges in your branch and category show a consistent Round 2 cutoff drop of 3+ points based on historical data.
        </p>
      ) : (
        <ul className="space-y-4">
          {opportunities.map((c, i) => {
            const isInRange = missedCodes.has(c.collegeCode);
            return (
              <motion.li
                key={`${c.collegeCode}-${i}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.04 }}
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
                  <span className="text-teal-400 font-medium">
                    Exp. R2: {c.expectedRound2Cutoff.toFixed(2)}{' '}
                    <span className="text-emerald-400">(↓ {c.expectedDrop.toFixed(1)} pts)</span>
                  </span>
                </div>
              </motion.li>
            );
          })}
        </ul>
      )}
    </motion.div>
  );
}
