import { motion } from 'motion/react';
import { ArrowLeft, Home, Trophy, CheckCircle, MapPin, Building2, AlertCircle, TrendingDown, TrendingUp, Minus } from 'lucide-react';
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

export function CollegeComparisonPage({ colleges }: CollegeComparisonPageProps) {
  const navigate = useNavigate();

  const { winners, isTie } = computeBestPick(colleges);
  const bestPick = isTie ? null : winners[0] ?? null;
  const highlights = computeBestValueHighlights(colleges);

  const fmt = (v: string | number | null | undefined) =>
    v == null || v === '' ? '—' : String(v);

  const hlClass = (highlighted: boolean) =>
    highlighted ? 'ring-2 ring-cyan-400/60 bg-cyan-500/10 rounded' : '';

  const maxPkg = Math.max(0, ...colleges.map(c => parsePackageLPA(c.avgPackage ?? null) ?? 0));

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-950 to-slate-950 text-white relative">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-xl border-b border-white/10 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-sm font-medium transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <button
              onClick={() => navigate('/')}
              className="flex flex-center items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-sm font-medium text-white/70 transition-colors"
            >
              <Home className="w-4 h-4" />
              Home
            </button>
          </div>
          <h1 className="font-bold hidden sm:block">College Comparison</h1>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl md:text-5xl font-black bg-gradient-to-r from-blue-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent mb-2">
            Compare Options
          </h1>
          <p className="text-slate-400">Comparing {colleges.length} selected colleges</p>
        </div>

        {/* Best Pick Card */}
        {(bestPick || isTie) && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/30 rounded-2xl p-6 mb-10 backdrop-blur-md relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Trophy className="w-32 h-32 text-emerald-500" />
            </div>
            <div className="flex items-start gap-4 relative z-10">
              <div className="bg-emerald-500/20 p-3 rounded-xl border border-emerald-500/30">
                <Trophy className="w-8 h-8 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-emerald-400 font-bold uppercase tracking-wider text-sm mb-1">AI Best Pick</h2>
                {isTie ? (
                  <>
                    <h3 className="text-xl font-black text-white mb-1">{winners.map(w => w.name).join(' & ')}</h3>
                    <p className="text-slate-300 text-sm">These colleges are equally matched — consider your preferred location or branch.</p>
                  </>
                ) : (
                  <>
                    <h3 className="text-2xl font-black text-white mb-2">{bestPick!.name}</h3>
                    <p className="text-slate-300 text-sm mb-3">{generateEntryReason(bestPick!, maxPkg)}</p>
                    <div className="flex flex-wrap gap-4 text-sm">
                      <span className="flex items-center gap-1 text-slate-300">
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                        Band: <strong className="text-white">{getAdmissionBand(bestPick!)}</strong>
                      </span>
                      <span className="flex items-center gap-1 text-slate-300">
                        <Building2 className="w-4 h-4 text-cyan-400" />
                        Cutoff: <strong className="text-white">{bestPick!.cutoffPercentile.toFixed(2)}</strong>
                      </span>
                      {bestPick!.admissionProbability != null && (
                        <span className="flex items-center gap-1 text-slate-300">
                          <AlertCircle className="w-4 h-4 text-amber-400" />
                          Win Prob: <strong className="text-white">{Math.round(bestPick!.admissionProbability)}%</strong>
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Comparison Table — desktop: table, mobile: stacked cards */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl"
        >
          {/* Mobile: stacked cards */}
          <div className="block md:hidden divide-y divide-white/10">
            {colleges.map((col, idx) => (
              <div key={idx} className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className={`inline-block px-2 py-0.5 text-xs font-bold rounded-lg border mb-1 ${
                      getAdmissionBand(col) === 'Safe' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                      getAdmissionBand(col) === 'Likely' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                      getAdmissionBand(col) === 'Moderate' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                      'bg-red-500/20 text-red-400 border-red-500/30'
                    }`}>{getAdmissionBand(col)}</span>
                    <h3 className="font-bold text-white text-base leading-tight">{col.name}</h3>
                    <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1"><MapPin className="w-3 h-3" />{col.location}</p>
                  </div>
                  <span className="shrink-0 text-xs font-bold text-slate-500">#{idx + 1}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="bg-white/5 rounded-lg p-2">
                    <p className="text-xs text-slate-500 mb-0.5">Branch</p>
                    <p className="text-white font-medium text-xs">{col.branch}</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-2">
                    <p className="text-xs text-slate-500 mb-0.5">Cutoff</p>
                    <p className="text-white font-bold">{col.cutoffPercentile.toFixed(2)}</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-2">
                    <p className="text-xs text-slate-500 mb-0.5">Fees</p>
                    <p className="text-white">{fmt(col.fees)}</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-2">
                    <p className="text-xs text-slate-500 mb-0.5">Seats</p>
                    <p className="text-white">{col.seats || '—'}</p>
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
                      <p className="text-cyan-400 font-medium">{col.avgPackage}</p>
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
                      <span className={`inline-block px-2.5 py-1 text-xs font-bold rounded-lg border w-fit mb-3 ${
                        getAdmissionBand(col) === 'Safe' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                        getAdmissionBand(col) === 'Likely' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                        getAdmissionBand(col) === 'Moderate' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                        'bg-red-500/20 text-red-400 border-red-500/30'
                      }`}>
                        {getAdmissionBand(col)}
                      </span>
                      <h3 className="font-bold text-lg text-white mb-2 leading-tight">{col.name}</h3>
                      <div className="text-slate-400 text-sm flex items-center mt-auto gap-1">
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
                <TableCell className="pl-6 font-medium text-slate-400 border-r border-white/5">Branch</TableCell>
                {colleges.map((col, idx) => (
                  <TableCell key={idx} className="p-4 border-r border-white/5 last:border-0 whitespace-normal">{col.branch}</TableCell>
                ))}
              </TableRow>
              <TableRow className="border-b border-white/5 hover:bg-white/[0.02]">
                <TableCell className="pl-6 font-medium text-slate-400 border-r border-white/5">Cutoff %ile</TableCell>
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
                  <TableCell className="pl-6 font-medium text-slate-400 border-r border-white/5">AI Probability</TableCell>
                  {colleges.map((col, idx) => (
                    <TableCell key={idx} className={`p-4 border-r border-white/5 last:border-0 font-bold ${hlClass(highlights.admissionProbability?.[idx])} ${highlights.admissionProbability?.[idx] ? 'text-emerald-400' : 'text-white'}`}>
                      {col.admissionProbability != null ? `${Math.round(col.admissionProbability)}%` : '—'}
                    </TableCell>
                  ))}
                </TableRow>
              )}
              <TableRow className="border-b border-white/5 hover:bg-white/[0.02]">
                <TableCell className="pl-6 font-medium text-slate-400 border-r border-white/5">Fees (Est.)</TableCell>
                {colleges.map((col, idx) => (
                  <TableCell key={idx} className="p-4 border-r border-white/5 last:border-0">{fmt(col.fees)}</TableCell>
                ))}
              </TableRow>
              <TableRow className="border-b border-white/5 hover:bg-white/[0.02]">
                <TableCell className="pl-6 font-medium text-slate-400 border-r border-white/5">Intake Seats</TableCell>
                {colleges.map((col, idx) => (
                  <TableCell key={idx} className="p-4 border-r border-white/5 last:border-0">{col.seats || '—'}</TableCell>
                ))}
              </TableRow>
              <TableRow className="border-b border-white/5 hover:bg-white/[0.02]">
                <TableCell className="pl-6 font-medium text-slate-400 border-r border-white/5">Avg Package</TableCell>
                {colleges.map((col, idx) => (
                  <TableCell key={idx} className={`p-4 border-r border-white/5 last:border-0 font-medium ${hlClass(highlights.avgPackage?.[idx])}`}>
                    {col.avgPackage ? <span className="text-cyan-400">{col.avgPackage}</span> : '—'}
                  </TableCell>
                ))}
              </TableRow>
              <TableRow className="border-b border-white/5 hover:bg-white/[0.02]">
                <TableCell className="pl-6 font-medium text-slate-400 border-r border-white/5">Highest Package</TableCell>
                {colleges.map((col, idx) => (
                  <TableCell key={idx} className="p-4 border-r border-white/5 last:border-0 font-medium">
                    {col.highestPackage ? <span className="text-emerald-400">{col.highestPackage}</span> : '—'}
                  </TableCell>
                ))}
              </TableRow>
              <TableRow className="hover:bg-white/[0.02]">
                <TableCell className="pl-6 font-medium text-slate-400 border-r border-white/5">Round 2 Opp.</TableCell>
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
        </motion.div>
      </main>
    </div>
  );
}
