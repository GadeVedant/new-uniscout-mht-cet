/**
 * FeedbackModal — Bug reports, suggestions, and general feedback.
 * POSTs directly to Google Apps Script (no backend changes needed).
 * Auto-captures current page from window.location.pathname.
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Bug, Lightbulb, MessageCircle, Send, CheckCircle } from 'lucide-react';

type FeedbackType = 'bug' | 'suggestion' | 'general';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Google Apps Script web app URL */
  scriptUrl: string;
}

const TYPES: { value: FeedbackType; label: string; icon: React.ReactNode; color: string }[] = [
  {
    value: 'bug',
    label: 'Bug 🐞',
    icon: <Bug className="w-4 h-4" />,
    color: 'border-red-500/50 bg-red-500/10 text-red-400 hover:bg-red-500/20',
  },
  {
    value: 'suggestion',
    label: 'Suggestion 💡',
    icon: <Lightbulb className="w-4 h-4" />,
    color: 'border-yellow-500/50 bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20',
  },
  {
    value: 'general',
    label: 'General 💬',
    icon: <MessageCircle className="w-4 h-4" />,
    color: 'border-blue-500/50 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20',
  },
];

const SELECTED_COLOR: Record<FeedbackType, string> = {
  bug: 'border-red-400 bg-red-500/25 text-red-300 ring-1 ring-red-400/50',
  suggestion: 'border-yellow-400 bg-yellow-500/25 text-yellow-300 ring-1 ring-yellow-400/50',
  general: 'border-blue-400 bg-blue-500/25 text-blue-300 ring-1 ring-blue-400/50',
};

export function FeedbackModal({ isOpen, onClose, scriptUrl }: FeedbackModalProps) {
  const [type, setType] = useState<FeedbackType | null>(null);
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');

  function reset() {
    setType(null);
    setMessage('');
    setStatus('idle');
  }

  function handleClose() {
    onClose();
    // Delay reset so animation plays out cleanly
    setTimeout(reset, 300);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!type || !message.trim()) return;

    setStatus('sending');

    const payload = {
      type,
      message: message.trim(),
      page: window.location.pathname,
      timestamp: new Date().toISOString(),
    };

    try {
      // Apps Script doesn't support no-cors POST — send as GET with query params instead
      const params = new URLSearchParams({
        type: payload.type,
        message: payload.message,
        page: payload.page,
        timestamp: payload.timestamp,
      });
      await fetch(`${scriptUrl}?${params.toString()}`, {
        method: 'GET',
        mode: 'no-cors',
      });
      setStatus('success');
    } catch {
      setStatus('error');
    }
  }

  const canSubmit = type !== null && message.trim().length > 0 && status === 'idle';

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={handleClose}
            aria-hidden="true"
          />

          {/* Modal */}
          <motion.div
            key="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="feedback-title"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="pointer-events-auto w-full max-w-md bg-slate-900/95 border border-slate-700/60 rounded-2xl shadow-2xl backdrop-blur-xl">

              {/* Header */}
              <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-700/40">
                <h2 id="feedback-title" className="text-lg font-semibold text-white">
                  Share Feedback
                </h2>
                <button
                  onClick={handleClose}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors"
                  aria-label="Close feedback modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="px-6 py-5">
                {status === 'success' ? (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center gap-3 py-6 text-center"
                  >
                    <CheckCircle className="w-12 h-12 text-emerald-400" />
                    <p className="text-white font-semibold text-lg">Thanks for the feedback!</p>
                    <p className="text-slate-400 text-sm">We'll look into it and improve UniScout.</p>
                    <button
                      onClick={handleClose}
                      className="mt-2 px-5 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/30 transition-colors text-sm font-medium"
                    >
                      Close
                    </button>
                  </motion.div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-5">

                    {/* Type selector */}
                    <div>
                      <p className="text-sm font-medium text-slate-300 mb-2">What is this about?</p>
                      <div className="flex gap-2">
                        {TYPES.map(({ value, label, color }) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => setType(value)}
                            className={`flex-1 py-2 px-3 rounded-xl border text-xs font-medium transition-all ${
                              type === value ? SELECTED_COLOR[value] : color
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Message */}
                    <div>
                      <label htmlFor="feedback-message" className="text-sm font-medium text-slate-300 mb-2 block">
                        Tell us more
                      </label>
                      <textarea
                        id="feedback-message"
                        value={message}
                        onChange={(e) => {
                          setMessage(e.target.value);
                          if (status === 'error') setStatus('idle');
                        }}
                        placeholder="Tell us what's wrong or what we can improve..."
                        rows={4}
                        maxLength={1000}
                        className="w-full bg-slate-800/60 border border-slate-600/50 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 resize-none transition-colors"
                      />
                      <p className="text-xs text-slate-500 mt-1 text-right">{message.length}/1000</p>
                    </div>

                    {/* Page context note */}
                    <p className="text-xs text-slate-500">
                      📍 Page will be auto-captured: <span className="text-slate-400 font-mono">{window.location.pathname}</span>
                    </p>

                    {/* Error */}
                    {status === 'error' && (
                      <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                        Something went wrong. Please try again.
                      </p>
                    )}

                    {/* Submit */}
                    <button
                      type="submit"
                      disabled={!canSubmit}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors"
                    >
                      {status === 'sending' ? (
                        <>
                          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          Send Feedback
                        </>
                      )}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
