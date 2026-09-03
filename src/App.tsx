import { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { HomePage } from './components/HomePage';
import { CollegeRecommendation, RecommendationRequest } from './services/api';
import { FeedbackButton } from './components/FeedbackButton';
import { Navbar } from './components/Navbar';

// Lazy-loaded routes — only downloaded when the user navigates to them
const MhtCetPortal = lazy(() => import('./components/MhtCetPortal').then(m => ({ default: m.MhtCetPortal })));
const MhtCetSelector = lazy(() => import('./components/MhtCetSelector').then(m => ({ default: m.MhtCetSelector })));
const MhtCetSubSelector = lazy(() => import('./components/MhtCetSubSelector').then(m => ({ default: m.MhtCetSubSelector })));
const JeePortal = lazy(() => import('./components/JeePortal').then(m => ({ default: m.JeePortal })));
const ResultsPage = lazy(() => import('./components/ResultsPage').then(m => ({ default: m.ResultsPage })));
const CollegeDetailPage = lazy(() => import('./components/CollegeDetailPage').then(m => ({ default: m.CollegeDetailPage })));
const CollegeComparisonPage = lazy(() => import('./components/CollegeComparisonPage').then(m => ({ default: m.CollegeComparisonPage })));
const SmartFormPage = lazy(() => import('./components/SmartFormPage').then(m => ({ default: m.SmartFormPage })));
const ExamLandingPage = lazy(() => import('./components/ExamLandingPage').then(m => ({ default: m.ExamLandingPage })));
const SscPortal = lazy(() => import('./components/SscPortal').then(m => ({ default: m.SscPortal })));
const ComingSoon = lazy(() => import('./components/ComingSoon').then(m => ({ default: m.ComingSoon })));
const MethodologyPage = lazy(() => import('./components/MethodologyPage').then(m => ({ default: m.MethodologyPage })));

// Lazy-load exam configs only when needed
const JEE_CONFIG_PROMISE = import('./components/examConfigs').then(m => m.JEE_CONFIG);
const NEET_CONFIG_PROMISE = import('./components/examConfigs').then(m => m.NEET_CONFIG);
const CAT_CONFIG_PROMISE = import('./components/examConfigs').then(m => m.CAT_CONFIG);

// Simple loading fallback
function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-white/20 border-t-cyan-400 rounded-full animate-spin" />
    </div>
  );
}

// Extend RecommendationRequest with UI-only flags
export type QueryWithMeta = RecommendationRequest & { locationFallback?: boolean };

export interface MhtCetFormData {
  percentile: string;
  year: string;
  capRound: string;
  category: string;
  branchPreferences: string[];  // up to 5
  locations: string[];           // up to 5
}

export interface SscFormData {
  totalMarks: string;
  year: string;
  regularRound: string;
  category: string;
  branchPreference: string;
  location: string;
}

// Scroll to top on every route change
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

// Lazy exam landing page wrappers — load config only when route is visited
function JeeLandingRoute() {
  const [config, setConfig] = useState<any>(null);
  useEffect(() => { JEE_CONFIG_PROMISE.then(setConfig); }, []);
  return config ? <ExamLandingPage config={config} /> : <PageLoader />;
}
function NeetLandingRoute() {
  const [config, setConfig] = useState<any>(null);
  useEffect(() => { NEET_CONFIG_PROMISE.then(setConfig); }, []);
  return config ? <ExamLandingPage config={config} /> : <PageLoader />;
}
function CatLandingRoute() {
  const [config, setConfig] = useState<any>(null);
  useEffect(() => { CAT_CONFIG_PROMISE.then(setConfig); }, []);
  return config ? <ExamLandingPage config={config} /> : <PageLoader />;
}

export default function App() {
  const [portalType, setPortalType] = useState<'mht-cet' | 'jee'>('mht-cet');

  // Restore colleges from sessionStorage on hard reload (e.g. direct /college/:id navigation)
  const [colleges, setColleges] = useState<CollegeRecommendation[]>(() => {
    try {
      const saved = sessionStorage.getItem('Uniscout_colleges');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [lastQuery, setLastQuery] = useState<QueryWithMeta | null>(() => {
    try {
      const saved = sessionStorage.getItem('Uniscout_query');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });
  const [comparisonSelection, setComparisonSelection] = useState<CollegeRecommendation[]>([]);

  // Persist colleges to sessionStorage whenever they change
  const setCollegesAndPersist = (results: CollegeRecommendation[]) => {
    setColleges(results);
    try { sessionStorage.setItem('Uniscout_colleges', JSON.stringify(results)); } catch {}
  };
  const setLastQueryAndPersist = (query: QueryWithMeta | null) => {
    setLastQuery(query);
    try { sessionStorage.setItem('Uniscout_query', JSON.stringify(query)); } catch {}
  };

  return (
    <BrowserRouter>
      <ScrollToTop />
      <div className="min-h-screen bg-background text-foreground relative">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        </div>

        {/* Global navbar — hidden on homepage which has its own */}
        <Navbar />

        <Suspense fallback={<PageLoader />}>
          <Routes>            <Route path="/" element={
              <HomePage 
                onPortalSelect={(portal) => setPortalType(portal)} 
                onSmartFormSelect={() => {}}
              />
            } />
            
            <Route path="/mht-cet" element={<MhtCetSelector />} />

            <Route path="/mht-cet/select" element={<MhtCetSubSelector />} />

            <Route path="/mht-cet/engineering" element={
              <MhtCetPortal
                onBack={() => {}}
                onRecommendationsReady={(results, query) => {
                  setCollegesAndPersist(results);
                  setLastQueryAndPersist(query);
                }}
              />
            } />

            <Route path="/mht-cet/pharmacy" element={
              <ComingSoon portalType="mht-cet" title="MHT CET Pharmacy" subtitle="Pharmacy college admissions for PCB students" backRoute="/mht-cet/select" />
            } />

            <Route path="/jee" element={
              <JeePortal onBack={() => {}} />
            } />

            {/* Exam-specific SEO landing pages */}
            <Route path="/jee-college-predictor" element={<JeeLandingRoute />} />
            <Route path="/neet-college-predictor" element={<NeetLandingRoute />} />
            <Route path="/cat-college-predictor" element={<CatLandingRoute />} />

            <Route path="/results" element={
              <ResultsPage 
                colleges={colleges}
                lastQuery={lastQuery}
                portalType={portalType}
                comparisonSelection={comparisonSelection}
                setComparisonSelection={setComparisonSelection}
              />
            } />

            <Route path="/college/:id" element={
              <CollegeDetailPage colleges={colleges} />
            } />

            <Route path="/compare" element={
              <CollegeComparisonPage
                colleges={comparisonSelection}
                onBack={() => {}}
                onHome={() => {}}
              />
            } />

            <Route path="/smart-form" element={<SmartFormPage />} />

            {/* SSC Portal */}
            <Route path="/ssc" element={
              <ComingSoon portalType="ssc" title="10th SSC / Diploma" subtitle="Junior college admissions for Arts, Commerce & Science" />
            } />

            {/* Coming Soon portals */}
            <Route path="/dse" element={<ComingSoon portalType="mht-cet" onBack={() => {}} />} />
            <Route path="/pharmacy" element={<ComingSoon portalType="mht-cet" onBack={() => {}} />} />
            <Route path="/neet" element={<ComingSoon portalType="mht-cet" onBack={() => {}} />} />

            {/* Methodology / transparency */}
            <Route path="/how-it-works" element={<MethodologyPage />} />

            {/* Catch-all redirect */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>

        {/* Global feedback button — visible on every page */}
        <FeedbackButton />
      </div>
    </BrowserRouter>
  );
}