import { motion, AnimatePresence } from 'motion/react';
import { X, ArrowRight } from 'lucide-react';

interface FloatingCompareBarProps {
  selectedCount: number;
  onClear: () => void;
  onCompare: () => void;
}

export function FloatingCompareBar({ selectedCount, onClear, onCompare }: FloatingCompareBarProps) {
  const canCompare = selectedCount === 2 || selectedCount === 3;
  
  return (
    <AnimatePresence>
      {selectedCount > 0 && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
          className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6 pointer-events-none flex justify-center"
        >
          <div className="bg-slate-900/90 backdrop-blur-xl border border-white/20 rounded-2xl p-4 shadow-2xl pointer-events-auto flex flex-col md:flex-row items-center gap-4 w-full max-w-2xl">
            <div className="flex items-center justify-between w-full md:w-auto md:flex-1">
              <div>
                <span className="text-white font-bold text-lg">Compare ({selectedCount})</span>
                <span className="text-slate-400 text-sm ml-2 hidden md:inline-block">
                  {selectedCount === 1 ? 'Select 1 or 2 more to compare' : 'Ready to compare'}
                </span>
              </div>
              <button 
                onClick={onClear}
                className="text-slate-400 hover:text-white p-2 md:hidden"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="bg-white/10 h-px w-full md:w-px md:h-8 hidden md:block" />
            
            <div className="flex items-center gap-3 w-full md:w-auto">
              <button
                onClick={onClear}
                className="hidden md:flex items-center gap-1 text-slate-300 hover:text-white px-3 py-2 text-sm font-medium transition-colors"
              >
                <X className="w-4 h-4" />
                Clear
              </button>
              
              <button
                onClick={onCompare}
                disabled={!canCompare}
                className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all ${
                  canCompare 
                    ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-900 shadow-lg shadow-cyan-500/20' 
                    : 'bg-white/10 text-slate-500 cursor-not-allowed'
                }`}
              >
                Compare Now
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            
            <span className="text-slate-400 text-sm block md:hidden text-center w-full mt-2">
              {selectedCount === 1 ? 'Select 1 or 2 more' : ''}
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
