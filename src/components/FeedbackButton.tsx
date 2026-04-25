/**
 * FeedbackButton — Floating button that opens the FeedbackModal.
 * Place once in App.tsx to appear on every page.
 */
import { useState } from 'react';
import { motion } from 'motion/react';
import { MessageSquarePlus } from 'lucide-react';
import { FeedbackModal } from './FeedbackModal';

// Replace with your deployed Google Apps Script web app URL
const APPS_SCRIPT_URL = import.meta.env.VITE_FEEDBACK_SCRIPT_URL ?? '';

export function FeedbackButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <motion.button
        onClick={() => setIsOpen(true)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/40 transition-colors"
        aria-label="Open feedback form"
      >
        <MessageSquarePlus className="w-5 h-5" />
        <span className="text-sm font-semibold hidden sm:inline">Feedback</span>
      </motion.button>

      <FeedbackModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        scriptUrl={APPS_SCRIPT_URL}
      />
    </>
  );
}
