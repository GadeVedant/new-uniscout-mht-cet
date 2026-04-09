/**
 * PreferenceList — Task 9 (Smart Form Filling spec)
 * Renders three tier sections with summary bar, ML unavailable banner,
 * budget warning banner, and empty state.
 */
import { motion } from 'motion/react';
import { Rocket, Target, CheckCircle, AlertCircle, WifiOff } from 'lucide-react';
import type { FormFillingRequest, FormFillingResponse } from '../services/api';
import { PreferenceEntryCard } from './PreferenceEntryCard';
import { CopyButton } from './CopyButton';

interface PreferenceListProps {
  result: FormFillingResponse;
  request?: FormFillingRequest;
  mlUnavailable?: boolean;
  budgetWarning?: boolean;
  onBack: () => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  GOPENS: 'Open', GSCS: 'SC', GSTS: 'ST', GOBCS: 'OBC',
  GSEBCS: 'SEBC', EWS: 'EWS', TFWS: 'TFWS',
  GNT1S: 'NT1', GNT2S: 'NT2', GNT3S: 'NT3', GVJS: 'VJ/DT',
};

export function PreferenceList({ result, request, mlUnavailable, budgetWarning, onBack }: PreferenceListProps) {
  const total = result.safePicks.length + result.targetPicks.length + result.dreamPicks.length;

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8">
      {/* Page title + back */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-3xl font-black text-white">Your Optimized Form</h2>
          <p className="text-slate-400 text-sm mt-1">
            Enter these colleges in this exact order on the CET portal.
          </p>
        </div>
        <button
          onClick={onBack}
          className="text-sm text-slate-400 hover:text-white transition-colors underline underline-offset-2"
        >
          ← Edit form
        </button>
      </div>

      {/* Query summary pills */}
      {request && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap gap-2 mb-6"
        >
          <span className="px-3 py-1.5 bg-cyan-500/15 border border-cyan-500/30 rounded-full text-cyan-300 text-sm font-semibold">
            {request.percentile} %ile
          </span>
          <span className="px-3 py-1.5 bg-purple-500/15 border border-purple-500/30 rounded-full text-purple-300 text-sm font-semibold">
            {CATEGORY_LABELS[request.category] ?? request.category}
          </span>
          <span className="px-3 py-1.5 bg-slate-500/20 border border-slate-500/30 rounded-full text-slate-300 text-sm font-semibold">
            CAP Round {request.capRound}
          </span>
          {request.branchPreferences.map((b) => (
            <span key={b} className="px-3 py-1.5 bg-blue-500/15 border border-blue-500/30 rounded-full text-blue-300 text-sm font-semibold">
              {b.replace(/\b\w/g, (c) => c.toUpperCase())}
            </span>
          ))}
          {request.preferredDistricts?.map((d) => (
            <span key={d} className="px-3 py-1.5 bg-emerald-500/15 border border-emerald-500/30 rounded-full text-emerald-300 text-sm font-semibold">
              📍 {d}
            </span>
          ))}
          <button
            onClick={onBack}
            className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-full text-slate-400 text-sm hover:bg-white/10 transition-colors"
          >
            ✏️ Edit
          </button>
        </motion.div>
      )}

      {/* Summary bar */}
      {total > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap gap-4 mb-6 p-4 bg-white/5 border border-white/10 rounded-xl text-sm"
        >
          <span className="text-slate-400">
            Total: <strong className="text-white">{total}</strong>
          </span>
          {result.safePicks.length > 0 && (
            <span className="text-emerald-400">
              Safe: <strong>{result.safePicks.length}</strong>
            </span>
          )}
          {result.targetPicks.length > 0 && (
            <span className="text-amber-400">
              Target: <strong>{result.targetPicks.length}</strong>
            </span>
          )}
          {result.dreamPicks.length > 0 && (
            <span className="text-red-400">
              Dream: <strong>{result.dreamPicks.length}</strong>
            </span>
          )}
        </motion.div>
      )}

      {/* ML unavailable banner — subtle info, not alarming */}
      {(mlUnavailable || !result.mlAvailable) && (
        <div className="flex items-center gap-3 p-3 bg-slate-800/60 border border-white/10 rounded-xl text-slate-400 text-xs mb-6">
          <WifiOff className="w-4 h-4 shrink-0 text-slate-500" />
          <p>Results are based on historical cutoff data. Live AI predictions will be available soon.</p>
        </div>
      )}

      {/* Budget warning banner */}
      {(budgetWarning || result.budgetWarning) && (
        <div className="flex items-center gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400 text-sm mb-6">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p>Some colleges were excluded because they exceeded your budget. Consider increasing your budget for more options.</p>
        </div>
      )}

      {/* Empty state */}
      {total === 0 && (
        <div className="text-center py-16 text-slate-400">
          <p className="text-lg">No matching colleges found. Try adjusting your filters or increasing your budget.</p>
        </div>
      )}

      {/* Tier sections */}
      <div className="space-y-12">
        {result.safePicks.length > 0 && (
          <section>
            <h3 className="flex items-center gap-2 text-xl font-bold text-emerald-400 mb-4">
              <CheckCircle className="w-5 h-5" aria-hidden="true" /> Safe Picks
            </h3>
            <div className="space-y-3">
              {result.safePicks.map((p) => (
                <PreferenceEntryCard key={p.rank} entry={p} tierAccent="safe" />
              ))}
            </div>
          </section>
        )}

        {result.targetPicks.length > 0 && (
          <section>
            <h3 className="flex items-center gap-2 text-xl font-bold text-amber-400 mb-4">
              <Target className="w-5 h-5" aria-hidden="true" /> Target Picks
            </h3>
            <div className="space-y-3">
              {result.targetPicks.map((p) => (
                <PreferenceEntryCard key={p.rank} entry={p} tierAccent="target" />
              ))}
            </div>
          </section>
        )}

        {result.dreamPicks.length > 0 && (
          <section>
            <h3 className="flex items-center gap-2 text-xl font-bold text-red-400 mb-4">
              <Rocket className="w-5 h-5" aria-hidden="true" /> Dream Picks
            </h3>
            <div className="space-y-3">
              {result.dreamPicks.map((p) => (
                <PreferenceEntryCard key={p.rank} entry={p} tierAccent="dream" />
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Floating action bar: CopyButton + disabled PDF button */}
      {total > 0 && (
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3"
        >
          <CopyButton
            safePicks={result.safePicks}
            targetPicks={result.targetPicks}
            dreamPicks={result.dreamPicks}
          />
          {/* Disabled PDF button — Task 12 */}
          <button
            disabled
            title="Coming soon"
            aria-label="Download PDF — coming soon"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/10 text-slate-500 font-bold rounded-full cursor-not-allowed opacity-50 border border-white/10"
          >
            Download PDF
            <span className="text-xs font-normal">(soon)</span>
          </button>
        </motion.div>
      )}
    </div>
  );
}
