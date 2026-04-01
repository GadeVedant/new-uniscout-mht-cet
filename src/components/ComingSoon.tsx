import React from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Clock, Construction } from 'lucide-react';

interface ComingSoonProps {
  portalType: 'mht-cet' | 'ssc';
  onBack: () => void;
}

export function ComingSoon({ portalType, onBack }: ComingSoonProps) {
  const portalName = portalType === 'mht-cet' ? 'MHT CET' : '10th SSC';

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-slate-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-slate-100 sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors font-medium"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Home</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-6 py-16 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          {/* Icon */}
          <div className="w-24 h-24 bg-gradient-to-br from-indigo-100 to-violet-100 rounded-2xl flex items-center justify-center mx-auto">
            <Construction className="w-12 h-12 text-indigo-600" />
          </div>

          {/* Title */}
          <div className="space-y-4">
            <h1 className="text-4xl lg:text-5xl font-bold text-slate-900">
              Coming Soon
            </h1>
            <p className="text-xl text-slate-600">
              {portalName} Portal is under development
            </p>
          </div>

          {/* Description */}
          <div className="max-w-lg mx-auto space-y-4">
            <p className="text-slate-500 leading-relaxed">
              We're working hard to bring you personalized college recommendations 
              for the {portalName} portal. Stay tuned for updates!
            </p>
          </div>

          {/* Action */}
          <div className="pt-8">
            <button
              onClick={onBack}
              className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold rounded-xl hover:from-indigo-700 hover:to-violet-700 transition-all shadow-lg shadow-indigo-500/25"
            >
              Back to Home
            </button>
          </div>
        </motion.div>
      </main>
    </div>
  );
}