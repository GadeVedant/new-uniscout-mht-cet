/**
 * PreferenceEntryCard — Smart Form Filling result card.
 * Shows college details similar to the MHT-CET results page.
 */
import { useNavigate } from 'react-router-dom';
import { MapPin, DollarSign, Users } from 'lucide-react';
import type { PreferenceEntry } from '../services/api';

interface PreferenceEntryCardProps {
  entry: PreferenceEntry;
  tierAccent: 'safe' | 'target' | 'dream';
}

const BAND_STYLES: Record<string, string> = {
  Safe:     'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  Likely:   'bg-blue-500/20 text-blue-400 border-blue-500/30',
  Moderate: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  Risky:    'bg-red-500/20 text-red-400 border-red-500/30',
};

const TIER_STYLES: Record<string, string> = {
  safe:   'border-emerald-500/20 bg-gradient-to-r from-emerald-500/5 to-transparent',
  target: 'border-amber-500/20 bg-gradient-to-r from-amber-500/5 to-transparent',
  dream:  'border-red-500/20 bg-gradient-to-r from-red-500/5 to-transparent',
};

export function PreferenceEntryCard({ entry, tierAccent }: PreferenceEntryCardProps) {
  const navigate = useNavigate();
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
        <p className="text-slate-400 text-sm mb-1 truncate">{entry.branchName}</p>

        {/* Location */}
        {entry.location && (
          <div className="flex items-center gap-1 text-slate-500 text-xs mb-2">
            <MapPin className="w-3 h-3" />
            <span>{entry.location}</span>
          </div>
        )}

        {/* Entry reason */}
        {entry.entryReason && (
          <p className="text-xs italic text-slate-500 mb-3 pl-3 border-l-2 border-slate-700">
            "{entry.entryReason}"
          </p>
        )}

        {/* Stats row */}
        <div className="flex flex-wrap gap-2 text-xs mb-3">
          <span className={`px-2 py-0.5 rounded-md border font-semibold ${bandStyle}`}>
            {entry.admissionBand}
          </span>
          <span className="bg-white/5 border border-white/10 px-2 py-0.5 rounded-md text-slate-300">
            Cutoff: <strong className="text-white">{entry.cutoffPercentile.toFixed(1)}</strong>
          </span>
          {entry.admissionProbability > 0 && (
            <span className="bg-white/5 border border-white/10 px-2 py-0.5 rounded-md text-slate-300">
              Win: <strong className="text-white">{Math.round(entry.admissionProbability)}%</strong>
            </span>
          )}
          {entry.fees && entry.fees !== 'N/A' && (
            <span className="bg-white/5 border border-white/10 px-2 py-0.5 rounded-md text-slate-300 flex items-center gap-1">
              <DollarSign className="w-3 h-3" />
              <strong className="text-white">{entry.fees}</strong>
            </span>
          )}
          {entry.seats != null && entry.seats > 0 && (
            <span className="bg-white/5 border border-white/10 px-2 py-0.5 rounded-md text-slate-300 flex items-center gap-1">
              <Users className="w-3 h-3" />
              <strong className="text-white">{entry.seats}</strong> seats
            </span>
          )}
          {entry.avgPackage && (
            <span className="bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md text-emerald-400 font-semibold">
              {entry.avgPackage} LPA avg
            </span>
          )}
        </div>

        {/* View Details button */}
        {entry.collegeId && (
          <button
            onClick={() => navigate(`/college/${entry.collegeId}`)}
            className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors underline underline-offset-2"
          >
            View Full Details →
          </button>
        )}
      </div>
    </div>
  );
}
