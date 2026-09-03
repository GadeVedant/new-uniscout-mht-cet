import { ArrowLeft, Trophy, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { CollegeRecommendation } from '../services/api';
import { getAdmissionBand } from './ResultsPage';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { computeBestPick, computeBestValueHighlights, generateEntryReason, parsePackageLPA } from '../lib/scoring';

interface CollegeComparisonPageProps {
  colleges: CollegeRecommendation[];
  onBack?: () => void;
  onHome?: () => void;
}

export function CollegeComparisonPage({ colleges, onBack, onHome }: CollegeComparisonPageProps) {
  const navigate = useNavigate();

  const fmt = (v: string | number | null | undefined) =>
    v == null || v === '' ? '—' : String(v);

  const hlClass = (highlighted: boolean) =>
    highlighted ? 'ring-2 ring-primary/60 bg-primary/10 rounded' : '';

  const maxPkg = Math.max(0, ...colleges.map(c => parsePackageLPA(c.avgPackage ?? null) ?? 0));

  // Guard: compute picks only when there are colleges to compare.
  // Calling computeBestPick([]) before this check could throw on empty input.
  const hasCols = colleges.length > 0;
  const { winners, isTie } = hasCols ? computeBestPick(colleges) : { winners: [], isTie: false };
  const bestPick = hasCols && !isTie ? winners[0] ?? null : null;
  const highlights = hasCols ? computeBestValueHighlights(colleges) : {};

  return (
    <div className="min-h-screen bg-background text-foreground relative">

      <main className="max-w-6xl mx-auto px-5 py-8 pt-[80px]">
        {/* Back to Main Page button */}
        <div className="mb-6">
          <button
            onClick={() => onBack ? onBack() : navigate('/results')}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold transition-colors shadow-lg shadow-blue-900/30"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Results
          </button>
        </div>

        <div className="mb-8">
          <h1 className="text-lg font-semibold text-foreground mb-0.5">College Comparison</h1>
          <p className="text-muted-foreground text-sm">Comparing {colleges.length} selected colleges</p>
        </div>

        {/* Empty state */}
        {colleges.length === 0 && (
          <div className="p-16 rounded-2xl bg-card border border-white/[0.07] text-center">
            <div className="size-14 rounded-2xl bg-white/[0.05] flex items-center justify-center mx-auto mb-4">
              <Trophy className="size-7 text-muted-foreground/30" />
            </div>
            <h3 className="text-base font-semibold text-foreground mb-2">No colleges selected</h3>
            <p className="text-sm text-muted-foreground mb-6">Select 2–3 colleges from the results page using the Compare button on each card.</p>
            <button
              onClick={() => navigate(-1)}
              className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Go to Results
            </button>
          </div>
        )}

        {/* Best Pick Card */}
        {colleges.length > 0 && (bestPick || isTie) && (
          <div className="bg-emerald-500/[0.08] border border-emerald-500/20 rounded-2xl p-6 mb-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-[0.06]">
              <Trophy className="w-32 h-32 text-emerald-500" />
            </div>
            <div className="flex items-start gap-4 relative z-10">
              <div className="size-11 rounded-xl bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center shrink-0">
                <Trophy className="size-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-emerald-400 font-semibold text-xs uppercase tracking-wider mb-1">AI Best Pick</p>
                {isTie ? (
                  <>
                    <h3 className="text-lg font-semibold text-foreground mb-1">{winners.map(w => w.name).join(' & ')}</h3>
                    <p className="text-muted-foreground text-sm">These colleges are equally matched — consider your preferred location or branch.</p>
                  </>
                ) : (
                  <>
                    <h3 className="text-xl font-semibold text-foreground mb-2">{bestPick!.name}</h3>
                    <p className="text-muted-foreground text-sm mb-3">{generateEntryReason(bestPick!, maxPkg)}</p>
                    <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">Band: <strong className="text-foreground">{getAdmissionBand(bestPick!)}</strong></span>
                      <span className="flex items-center gap-1">Cutoff: <strong className="text-foreground font-mono">{bestPick!.cutoffPercentile.toFixed(2)}</strong></span>
                      {bestPick!.admissionProbability != null && (
                        <span className="flex items-center gap-1">Probability: <strong className="text-foreground">{Math.round(bestPick!.admissionProbability)}%</strong></span>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Comparison Table */}
        <div className="bg-card border border-white/[0.07] rounded-2xl overflow-hidden shadow-xl">
          {/* Mobile: stacked cards */}
          <div className="block md:hidden divide-y divide-white/[0.06]">
            {colleges.map((col, idx) => (
              <div key={idx} className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full border mb-1 ${
                      getAdmissionBand(col) === 'Safe'     ? 'bg-emerald-500/[0.12] text-emerald-400 border-emerald-500/30' :
                      getAdmissionBand(col) === 'Likely'   ? 'bg-blue-500/[0.12]    text-blue-400    border-blue-500/30'    :
                      getAdmissionBand(col) === 'Moderate' ? 'bg-amber-500/[0.12]   text-amber-400   border-amber-500/30'   :
                      'bg-red-500/[0.12] text-red-400 border-red-500/30'
                    }`}>{getAdmissionBand(col)}</span>
                    <h3 className="font-semibold text-foreground text-sm leading-tight">{col.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1"><MapPin className="w-3 h-3" />{col.location}</p>
                  </div>
                  <span className="shrink-0 text-xs font-mono text-muted-foreground/50">#{idx + 1}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="bg-white/[0.03] rounded-lg p-2">
                    <p className="text-[10px] text-muted-foreground mb-0.5">Branch</p>
                    <p className="text-white font-medium text-xs">{col.branch}</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-2">
                    <p className="text-xs text-slate-500 mb-0.5">Cutoff</p>
                    <p className="text-white font-bold">{col.cutoffPercentile.toFixed(2)}</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-2">
                    <p className="text-xs text-slate-500 mb-0.5">Fees</p>
                    <p className="text-foreground">{fmt(col.fees)}</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-2">
                    <p className="text-xs text-slate-500 mb-0.5">Seats</p>
                    <p className="text-foreground">{col.seats || '—'}</p>
                  </div>
                  {col.admissionProbability != null && (
                    <div className="bg-white/5 rounded-lg p-2">
                      <p className="text-xs text-slate-500 mb-0.5">AI Probability</p>
                      <p className="text-emerald-400 font-bold">{Math.round(col.admissionProbability)}%</p>
                    </div>
                  )}
                  {col.avgPackage && (
                    <div className="bg-white/5 rounded-lg p-2">
                      <p className="text-xs text-slate-500 mb-0.5">Avg Package</p>
                      <p className="text-primary font-medium">{col.avgPackage}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Desktop: table */}
          <div className="hidden md:block overflow-x-auto">
          <Table className="w-full text-base">
            <TableHeader className="bg-slate-900/80 border-b border-white/10">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-48 text-slate-400 font-semibold uppercase tracking-wider text-xs align-bottom pb-4 pl-6 border-r border-white/5">
                  Parameters
                </TableHead>
                {colleges.map((col, idx) => (
                  <TableHead key={idx} className="p-6 align-top border-r border-white/5 last:border-0 min-w-[220px]">
                    <div className="flex flex-col h-full">
                      <span className={`inline-block px-2.5 py-1 text-xs font-medium rounded-full border w-fit mb-3 ${
                        getAdmissionBand(col) === 'Safe'     ? 'bg-emerald-500/[0.12] text-emerald-400 border-emerald-500/30' :
                        getAdmissionBand(col) === 'Likely'   ? 'bg-blue-500/[0.12]    text-blue-400    border-blue-500/30'    :
                        getAdmissionBand(col) === 'Moderate' ? 'bg-amber-500/[0.12]   text-amber-400   border-amber-500/30'   :
                        'bg-red-500/[0.12] text-red-400 border-red-500/30'
                      }`}>
                        {getAdmissionBand(col)}
                      </span>
                      <h3 className="font-semibold text-foreground mb-2 leading-tight">{col.name}</h3>
                      <div className="text-muted-foreground text-xs flex items-center mt-auto gap-1">
                        <MapPin className="w-3.5 h-3.5" />
                        {col.location}
                      </div>
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            
            <TableBody className="[&_tr:last-child]:border-0 text-slate-300">
              <TableRow className="border-b border-white/5 hover:bg-white/[0.02]">
                <TableCell className="pl-6 font-medium text-muted-foreground border-r border-white/5">Branch</TableCell>
                {colleges.map((col, idx) => (
                  <TableCell key={idx} className="p-4 border-r border-white/5 last:border-0 whitespace-normal">{col.branch}</TableCell>
                ))}
              </TableRow>
              <TableRow className="border-b border-white/5 hover:bg-white/[0.02]">
                <TableCell className="pl-6 font-medium text-muted-foreground border-r border-white/5">Cutoff %ile</TableCell>
                {colleges.map((col, idx) => (
                  <TableCell key={idx} className={`p-4 border-r border-white/5 last:border-0 font-bold text-white ${hlClass(highlights.cutoffPercentile?.[idx])}`}>
                    {col.cutoffPercentile.toFixed(2)}
                    {col.cutoffTrend === 'falling' && <span className="text-emerald-400 ml-1.5">↓</span>}
                    {col.cutoffTrend === 'rising' && <span className="text-red-400 ml-1.5">↑</span>}
                    {col.cutoffTrend === 'stable' && <span className="text-slate-400 ml-1.5">→</span>}
                  </TableCell>
                ))}
              </TableRow>
              {colleges.some(c => c.admissionProbability) && (
                <TableRow className="border-b border-white/5 hover:bg-white/[0.02]">
                  <TableCell className="pl-6 font-medium text-muted-foreground border-r border-white/5">AI Probability</TableCell>
                  {colleges.map((col, idx) => (
                    <TableCell key={idx} className={`p-4 border-r border-white/5 last:border-0 font-bold ${hlClass(highlights.admissionProbability?.[idx])} ${highlights.admissionProbability?.[idx] ? 'text-emerald-400' : 'text-white'}`}>
                      {col.admissionProbability != null ? `${Math.round(col.admissionProbability)}%` : '—'}
                    </TableCell>
                  ))}
                </TableRow>
              )}
              <TableRow className="border-b border-white/5 hover:bg-white/[0.02]">
                <TableCell className="pl-6 font-medium text-muted-foreground border-r border-white/5">Fees (Est.)</TableCell>
                {colleges.map((col, idx) => (
                  <TableCell key={idx} className="p-4 border-r border-white/5 last:border-0">{fmt(col.fees)}</TableCell>
                ))}
              </TableRow>
              <TableRow className="border-b border-white/5 hover:bg-white/[0.02]">
                <TableCell className="pl-6 font-medium text-muted-foreground border-r border-white/5">Intake Seats</TableCell>
                {colleges.map((col, idx) => (
                  <TableCell key={idx} className="p-4 border-r border-white/5 last:border-0">{col.seats || '—'}</TableCell>
                ))}
              </TableRow>
              <TableRow className="border-b border-white/5 hover:bg-white/[0.02]">
                <TableCell className="pl-6 font-medium text-muted-foreground border-r border-white/5">Avg Package</TableCell>
                {colleges.map((col, idx) => (
                  <TableCell key={idx} className={`p-4 border-r border-white/5 last:border-0 font-medium ${hlClass(highlights.avgPackage?.[idx])}`}>
                    {col.avgPackage ? <span className="text-primary">{col.avgPackage}</span> : '—'}
                  </TableCell>
                ))}
              </TableRow>
              <TableRow className="border-b border-white/5 hover:bg-white/[0.02]">
                <TableCell className="pl-6 font-medium text-muted-foreground border-r border-white/5">Highest Package</TableCell>
                {colleges.map((col, idx) => (
                  <TableCell key={idx} className="p-4 border-r border-white/5 last:border-0 font-medium">
                    {col.highestPackage ? <span className="text-emerald-400">{col.highestPackage}</span> : '—'}
                  </TableCell>
                ))}
              </TableRow>
              <TableRow className="hover:bg-white/[0.02]">
                <TableCell className="pl-6 font-medium text-muted-foreground border-r border-white/5">Round 2 Opp.</TableCell>
                {colleges.map((col, idx) => (
                  <TableCell key={idx} className="p-4 border-r border-white/5 last:border-0">
                    {col.round2Opportunity
                      ? <span className="px-2 py-0.5 text-xs font-bold bg-teal-500/20 text-teal-400 border border-teal-500/30 rounded-lg">Yes</span>
                      : <span className="text-slate-500 text-sm">No</span>}
                  </TableCell>
                ))}
              </TableRow>
            </TableBody>
          </Table>
          </div>
        </div>
      </main>
    </div>
  );
}
