/**
 * FreezeFloatCard — Task 9 (CAP Round 2 Strategy spec)
 * Displays the Freeze/Float recommendation with reasoning and betterOption summary.
 */
import { motion } from 'motion/react';
import { Snowflake, Wind } from 'lucide-react';
import type { FreezeOrFloatResult } from '../services/api';

interface FreezeFloatCardProps {
  freezeOrFloat: FreezeOrFloatResult;
}

export function FreezeFloatCard({ freezeOrFloat }: FreezeFloatCardProps) {
  const isFreeze = freezeOrFloat.recommendation === 'Freeze';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={`rounded-2xl border backdrop-blur-sm p-8 ${
        isFreeze
          ? 'bg-emerald-500/10 border-emerald-500/30'
          : 'bg-cyan-500/10 border-cyan-500/30'
      }`}
      aria-label={`Recommendation: ${freezeOrFloat.recommendation}`}
    >
      <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
        {/* Badge */}
        <div
          className={`flex items-center gap-3 px-6 py-4 rounded-xl border shrink-0 ${
            isFreeze
              ? 'bg-emerald-500/20 border-emerald-500/40'
              : 'bg-cyan-500/20 border-cyan-500/40'
          }`}
          aria-label={`Action: ${freezeOrFloat.recommendation}`}
        >
          {isFreeze
            ? <Snowflake className="w-8 h-8 text-emerald-400" aria-hidden="true" />
            : <Wind className="w-8 h-8 text-cyan-400" aria-hidden="true" />
          }
          <span
            className={`text-3xl font-black uppercase tracking-widest ${
              isFreeze ? 'text-emerald-400' : 'text-cyan-400'
            }`}
          >
            {freezeOrFloat.recommendation}
          </span>
        </div>

        {/* Reasoning */}
        <div className="flex-1">
          <p className="text-lg text-white leading-relaxed mb-3">
            {freezeOrFloat.reasoning}
          </p>

          {/* Better option summary (Float only) */}
          {!isFreeze && freezeOrFloat.betterOption && (
            <div className="mt-3 p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-xl">
              <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400 mb-2">
                Target College
              </p>
              <p className="text-white font-bold">{freezeOrFloat.betterOption.collegeName}</p>
              <p className="text-slate-400 text-sm">{freezeOrFloat.betterOption.branchName}</p>
              <div className="flex flex-wrap gap-4 mt-2 text-sm">
                <span className="text-slate-400">
                  Exp. R2 cutoff:{' '}
                  <span className="text-cyan-300 font-semibold">
                    {freezeOrFloat.betterOption.expectedRound2Cutoff.toFixed(2)}
                  </span>
                </span>
                <span className="text-slate-400">
                  Your chance:{' '}
                  <span className="text-emerald-300 font-semibold">
                    {freezeOrFloat.betterOption.round2Probability}%
                  </span>
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
