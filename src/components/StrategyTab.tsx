/**
 * StrategyTab — Task 12 (CAP Round 2 Strategy spec)
 * Lazy-fetches strategy data on first activation, caches result, handles
 * loading / error / timeout states. Composes FreezeFloatCard,
 * MissedCollegeList, Round2OpportunitiesList.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'motion/react';
import { AlertCircle, RefreshCw, Clock } from 'lucide-react';
import { api, Round2StrategyResponse } from '../services/api';
import { FreezeFloatCard } from './FreezeFloatCard';
import { MissedCollegeList } from './MissedCollegeList';
import { Round2OpportunitiesList } from './Round2OpportunitiesList';

interface StrategyTabProps {
  percentile: number;
  category: string;
  branch: string;
  capRound: string;
}

type FetchState = 'idle' | 'loading' | 'timeout' | 'error' | 'done';

export function StrategyTab({ percentile, category, branch, capRound }: StrategyTabProps) {
  const [fetchState, setFetchState] = useState<FetchState>('idle');
  const [data, setData] = useState<Round2StrategyResponse | null>(null);
  const [dataVersion, setDataVersion] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');
  // Cache flag — only fetch once per mount
  const hasFetched = useRef(false);

  const fetchStrategy = useCallback(async () => {
    setFetchState('loading');
    setErrorMsg('');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10_000);

    try {
      const response = await api.getRound2Strategy({ percentile, category, branch, capRound });
      clearTimeout(timeoutId);

      if (response.success && response.data) {
        setData(response.data);
        setDataVersion(response.metadata?.dataVersion ?? null);
        setFetchState('done');
      } else {
        setErrorMsg(response.error || 'Failed to load strategy data.');
        setFetchState('error');
      }
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      if (err instanceof Error && err.name === 'AbortError') {
        setFetchState('timeout');
        setErrorMsg('Request timed out. Please retry.');
      } else {
        setFetchState('error');
        setErrorMsg(err instanceof Error ? err.message : 'Network error. Please retry.');
      }
    }
  }, [percentile, category, branch, capRound]);

  // Lazy fetch — only on first activation
  useEffect(() => {
    if (!hasFetched.current) {
      hasFetched.current = true;
      fetchStrategy();
    }
  }, [fetchStrategy]);

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (fetchState === 'loading') {
    return (
      <div className="flex flex-col gap-6 animate-pulse" aria-label="Loading strategy data">
        <div className="h-40 bg-white/5 rounded-2xl" />
        <div className="grid md:grid-cols-2 gap-6">
          <div className="h-96 bg-white/5 rounded-2xl" />
          <div className="h-96 bg-white/5 rounded-2xl" />
        </div>
      </div>
    );
  }

  // ── Timeout state ─────────────────────────────────────────────────────────
  if (fetchState === 'timeout') {
    return (
      <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-8 text-center">
        <Clock className="w-10 h-10 mx-auto mb-4 text-amber-400" aria-hidden="true" />
        <p className="text-amber-200 mb-4">{errorMsg}</p>
        <button
          onClick={() => { hasFetched.current = false; fetchStrategy(); }}
          className="inline-flex items-center gap-2 px-6 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-lg transition-colors border border-amber-500/30"
          aria-label="Retry loading strategy"
        >
          <RefreshCw className="w-4 h-4" /> Retry
        </button>
      </div>
    );
  }

  // ── Error state ───────────────────────────────────────────────────────────
  if (fetchState === 'error') {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-8 text-center">
        <AlertCircle className="w-10 h-10 mx-auto mb-4 text-red-400" aria-hidden="true" />
        <p className="text-red-200 mb-4">{errorMsg}</p>
        <button
          onClick={() => { hasFetched.current = false; fetchStrategy(); }}
          className="inline-flex items-center gap-2 px-6 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg transition-colors border border-red-500/30"
          aria-label="Retry loading strategy"
        >
          <RefreshCw className="w-4 h-4" /> Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  // ── Success ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-8">
      {/* 1. FreezeFloatCard */}
      <FreezeFloatCard freezeOrFloat={data.freezeOrFloat} />

      {/* 2. Two-column lists */}
      <div className="grid md:grid-cols-2 gap-8">
        <MissedCollegeList
          missedColleges={data.missedColleges}
          round2Opportunities={data.round2Opportunities}
        />
        <Round2OpportunitiesList
          opportunities={data.round2Opportunities}
          missedColleges={data.missedColleges}
        />
      </div>

      {/* dataVersion footer */}
      {dataVersion != null && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center text-xs text-slate-600"
        >
          Data version: {dataVersion}
        </motion.p>
      )}
    </div>
  );
}
