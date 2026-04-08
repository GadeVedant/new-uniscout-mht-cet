/**
 * PreferenceEntryCard — Task 10 (Smart Form Filling spec)
 * Displays a single ranked preference entry with all required fields.
 * Does NOT render raw weightedScore.
 */
import type { PreferenceEntry } from '../services/api';

interface PreferenceEntryCardProps {
  entry: PreferenceEntry;
  tierAccent: 'safe' | 'target' | 'dream';
}

const BAND_STYLES: Record<string, string> = {
  Safe: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  Likely: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  Moderate: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  Risky: 'bg-red-500/20 text-red-400 border-red-500/30',
};

const TIER_STYLES: Record<string, string> = {
  safe: 'border-emerald-500/20 bg-gradient-to-r from-emerald-500/5 to-transparent',
  target: 'border-amber-500/20 bg-gradient-to-r from-amber-500/5 to-transparent',
  dream: 'border-red-500/20 bg-gradient-to-r from-red-500/5 to-transparent',
};

export function PreferenceEntryCard({ entry, tierAccent }: PreferenceEntryCardProps) {
  const bandStyle = BAND_STYLES[entry.admissionBand] ?? BAND_STYLES.Moderate;

  return (
    <div className={`flex gap-4 p-4 border rounded-xl backdrop-blur-sm ${TIER_STYLES[tierAccent]}`}>
      {/* Rank number */}
      <div className="flex items-center justify-center shrink-0 w-9 h-9 rounded-lg bg-slate-900 border border-white/10 font-black text-white text-sm">
        {entry.rank}
      </div>

      <div className="flex-1 min-w-0">
        {/* College name + branch */}
        <h3 className="font-bold text-white text-base leading-tight mb-0.5 truncate">
          {entry.collegeName}
        </h3>
        <p className="text-slate-400 text-sm mb-2 truncate">{entry.branchName}</p>

        {/* Entry reason */}
        {entry.entryReason && (
          <p className="text-xs italic text-slate-500 mb-3 pl-3 border-l-2 border-slate-700">
            "{entry.entryReason}"
          </p>
        )}

        {/* Stats row */}
        <div className="flex flex-wrap gap-2 text-xs">
          {/* Admission band */}
          <span className={`px-2 py-0.5 rounded-md border font-semibold ${bandStyle}`}>
            {entry.admissionBand}
          </span>

          {/* Cutoff */}
          <span className="bg-white/5 border border-white/10 px-2 py-0.5 rounded-md text-slate-300">
            Cutoff: <strong className="text-white">{entry.cutoffPercentile.toFixed(1)}</strong>
          </span>

          {/* Admission probability */}
          {entry.admissionProbability > 0 && (
            <span className="bg-white/5 border border-white/10 px-2 py-0.5 rounded-md text-slate-300">
              Win: <strong className="text-white">{Math.round(entry.admissionProbability)}%</strong>
            </span>
          )}

          {/* Fees */}
          {entry.fees && entry.fees !== 'N/A' && (
            <span className="bg-white/5 border border-white/10 px-2 py-0.5 rounded-md text-slate-300">
              Fees: <strong className="text-white">{entry.fees}</strong>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
