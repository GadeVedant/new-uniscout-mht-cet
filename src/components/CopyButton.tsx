/**
 * CopyButton — Task 11 (Smart Form Filling spec)
 * Formats the preference list as plain text and copies to clipboard.
 * Not rendered when preferences is empty.
 * Shows success/failure toast for 3 seconds.
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Copy, CheckCircle, AlertCircle } from 'lucide-react';
import type { PreferenceEntry } from '../services/api';

interface CopyButtonProps {
  safePicks: PreferenceEntry[];
  targetPicks: PreferenceEntry[];
  dreamPicks: PreferenceEntry[];
}

function formatEntry(e: PreferenceEntry): string {
  return `${e.rank}. ${e.collegeName} — ${e.branchName} (Cutoff: ${e.cutoffPercentile.toFixed(1)}, ${e.admissionBand}, Fees: ${e.fees})`;
}

function buildPlainText(
  safePicks: PreferenceEntry[],
  targetPicks: PreferenceEntry[],
  dreamPicks: PreferenceEntry[],
): string {
  const sections: string[] = [];
  if (safePicks.length > 0) {
    sections.push('=== SAFE PICKS ===');
    sections.push(...safePicks.map(formatEntry));
  }
  if (targetPicks.length > 0) {
    sections.push('=== TARGET PICKS ===');
    sections.push(...targetPicks.map(formatEntry));
  }
  if (dreamPicks.length > 0) {
    sections.push('=== DREAM PICKS ===');
    sections.push(...dreamPicks.map(formatEntry));
  }
  return sections.join('\n');
}

type ToastState = 'idle' | 'success' | 'error';

export function CopyButton({ safePicks, targetPicks, dreamPicks }: CopyButtonProps) {
  const [toast, setToast] = useState<ToastState>('idle');
  const total = safePicks.length + targetPicks.length + dreamPicks.length;

  // Not rendered when list is empty
  if (total === 0) return null;

  const handleCopy = async () => {
    const text = buildPlainText(safePicks, targetPicks, dreamPicks);
    try {
      await navigator.clipboard.writeText(text);
      setToast('success');
    } catch {
      setToast('error');
    }
    setTimeout(() => setToast('idle'), 3000);
  };

  return (
    <>
      <button
        onClick={handleCopy}
        aria-label="Copy preference list to clipboard"
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-slate-900 font-bold rounded-full shadow-lg hover:bg-slate-100 transition-colors"
      >
        <Copy className="w-4 h-4" />
        Copy List
      </button>

      {/* Toast */}
      <AnimatePresence>
        {toast !== 'idle' && (
          <motion.div
            key="toast"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-5 py-3 rounded-xl shadow-xl text-sm font-medium ${
              toast === 'success'
                ? 'bg-emerald-500 text-white'
                : 'bg-red-500 text-white'
            }`}
            role="status"
            aria-live="polite"
          >
            {toast === 'success' ? (
              <>
                <CheckCircle className="w-4 h-4" />
                List copied to clipboard!
              </>
            ) : (
              <>
                <AlertCircle className="w-4 h-4" />
                Could not copy to clipboard. Please select and copy the list manually.
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
