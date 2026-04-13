/**
 * PreferenceList — Smart Form Filling results with PDF download.
 */
import { motion } from 'motion/react';
import { Rocket, Target, CheckCircle, AlertCircle, WifiOff, Download } from 'lucide-react';
import type { FormFillingRequest, FormFillingResponse, PreferenceEntry } from '../services/api';
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

const TIER_COLORS: Record<string, string> = {
  safe: '#10b981',
  target: '#f59e0b',
  dream: '#ef4444',
};

function buildPrintHTML(
  result: FormFillingResponse,
  request?: FormFillingRequest,
): string {
  const all = [
    ...result.safePicks.map(p => ({ ...p, tier: 'Safe' as const })),
    ...result.targetPicks.map(p => ({ ...p, tier: 'Target' as const })),
    ...result.dreamPicks.map(p => ({ ...p, tier: 'Dream' as const })),
  ];

  const tierColor = (tier: string) =>
    tier === 'Safe' ? '#10b981' : tier === 'Target' ? '#f59e0b' : '#ef4444';

  const bandColor = (band: string) =>
    band === 'Safe' ? '#10b981' : band === 'Likely' ? '#3b82f6' : band === 'Moderate' ? '#f59e0b' : '#ef4444';

  const rows = all.map(p => `
    <tr>
      <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;font-weight:700;color:#111">${p.rank}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb">
        <div style="font-weight:600;color:#111;font-size:13px">${p.collegeName}</div>
        <div style="color:#6b7280;font-size:11px;margin-top:2px">${p.branchName}</div>
      </td>
      <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;text-align:center">
        <span style="background:${tierColor(p.tier)}22;color:${tierColor(p.tier)};padding:2px 8px;border-radius:12px;font-size:11px;font-weight:700">${p.tier}</span>
      </td>
      <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;text-align:center">
        <span style="background:${bandColor(p.admissionBand)}22;color:${bandColor(p.admissionBand)};padding:2px 8px;border-radius:12px;font-size:11px;font-weight:700">${p.admissionBand}</span>
      </td>
      <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;text-align:center;font-weight:600;color:#111">${p.cutoffPercentile.toFixed(1)}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;text-align:center;color:#6b7280">${p.admissionProbability > 0 ? p.admissionProbability + '%' : '—'}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;color:#6b7280;font-size:12px">${p.fees || '—'}</td>
    </tr>
  `).join('');

  const meta = request ? `
    <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:20px">
      <span style="background:#e0f2fe;color:#0369a1;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600">${request.percentile} %ile</span>
      <span style="background:#f3e8ff;color:#7c3aed;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600">${CATEGORY_LABELS[request.category] ?? request.category}</span>
      ${request.branchPreferences.map(b => `<span style="background:#dbeafe;color:#1d4ed8;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600">${b}</span>`).join('')}
      ${(request.preferredDistricts ?? []).map(d => `<span style="background:#d1fae5;color:#065f46;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600">📍 ${d}</span>`).join('')}
    </div>
  ` : '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <title>UniScout – CAP Preference List</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #111; padding: 32px; font-size: 13px; }
    h1 { font-size: 22px; font-weight: 800; color: #1e1b4b; margin-bottom: 4px; }
    .subtitle { color: #6b7280; font-size: 12px; margin-bottom: 16px; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    th { background: #f9fafb; padding: 10px; text-align: left; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; border-bottom: 2px solid #e5e7eb; }
    th:nth-child(3), th:nth-child(4), th:nth-child(5), th:nth-child(6) { text-align: center; }
    .footer { margin-top: 24px; font-size: 11px; color: #9ca3af; text-align: center; }
    @media print { body { padding: 16px; } }
  </style>
</head>
<body>
  <h1>UniScout – CAP Preference List</h1>
  <p class="subtitle">Generated on ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })} · Enter colleges in this exact order on the DTE portal</p>
  ${meta}
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>College / Branch</th>
        <th>Tier</th>
        <th>Band</th>
        <th>Cutoff</th>
        <th>Win %</th>
        <th>Fees</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <p class="footer">uniscout.in · Cutoffs are based on historical CAP data. Verify on dte.maharashtra.gov.in before submission.</p>
</body>
</html>`;
}

function downloadPDF(result: FormFillingResponse, request?: FormFillingRequest) {
  const html = buildPrintHTML(result, request);
  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => {
    win.print();
    win.close();
  }, 300);
}

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
          <span className="text-slate-400">Total: <strong className="text-white">{total}</strong></span>
          {result.safePicks.length > 0 && <span className="text-emerald-400">Safe: <strong>{result.safePicks.length}</strong></span>}
          {result.targetPicks.length > 0 && <span className="text-amber-400">Target: <strong>{result.targetPicks.length}</strong></span>}
          {result.dreamPicks.length > 0 && <span className="text-red-400">Dream: <strong>{result.dreamPicks.length}</strong></span>}
        </motion.div>
      )}

      {/* ML unavailable banner */}
      {(mlUnavailable || !result.mlAvailable) && (
        <div className="flex items-center gap-3 p-3 bg-slate-800/60 border border-white/10 rounded-xl text-slate-400 text-xs mb-6">
          <WifiOff className="w-4 h-4 shrink-0 text-slate-500" />
          <p>Results are based on historical cutoff data. Live AI predictions will be available soon.</p>
        </div>
      )}

      {/* Budget warning */}
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
      <div className="space-y-12 pb-24">
        {result.safePicks.length > 0 && (
          <section>
            <h3 className="flex items-center gap-2 text-xl font-bold text-emerald-400 mb-4">
              <CheckCircle className="w-5 h-5" aria-hidden="true" /> Safe Picks
            </h3>
            <div className="space-y-3">
              {result.safePicks.map((p) => <PreferenceEntryCard key={p.rank} entry={p} tierAccent="safe" />)}
            </div>
          </section>
        )}
        {result.targetPicks.length > 0 && (
          <section>
            <h3 className="flex items-center gap-2 text-xl font-bold text-amber-400 mb-4">
              <Target className="w-5 h-5" aria-hidden="true" /> Target Picks
            </h3>
            <div className="space-y-3">
              {result.targetPicks.map((p) => <PreferenceEntryCard key={p.rank} entry={p} tierAccent="target" />)}
            </div>
          </section>
        )}
        {result.dreamPicks.length > 0 && (
          <section>
            <h3 className="flex items-center gap-2 text-xl font-bold text-red-400 mb-4">
              <Rocket className="w-5 h-5" aria-hidden="true" /> Dream Picks
            </h3>
            <div className="space-y-3">
              {result.dreamPicks.map((p) => <PreferenceEntryCard key={p.rank} entry={p} tierAccent="dream" />)}
            </div>
          </section>
        )}
      </div>

      {/* Floating action bar */}
      {total > 0 && (
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="fixed bottom-4 left-0 right-0 z-50 flex items-center justify-center gap-2 px-4"
        >
          <CopyButton
            safePicks={result.safePicks}
            targetPicks={result.targetPicks}
            dreamPicks={result.dreamPicks}
          />
          <button
            onClick={() => downloadPDF(result, request)}
            aria-label="Download preference list as PDF"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-bold rounded-full shadow-lg transition-all text-sm whitespace-nowrap"
          >
            <Download className="w-4 h-4 shrink-0" />
            <span>Download PDF</span>
          </button>
        </motion.div>
      )}
    </div>
  );
}
