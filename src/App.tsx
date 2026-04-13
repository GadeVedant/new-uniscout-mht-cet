import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { HomePage } from './components/HomePage';
import { MhtCetPortal } from './components/MhtCetPortal';
import { JeePortal } from './components/JeePortal';
import { ResultsPage } from './components/ResultsPage';
import { CollegeDetailPage } from './components/CollegeDetailPage';
import { CollegeComparisonPage } from './components/CollegeComparisonPage';
import { SmartFormPage } from './components/SmartFormPage';
import { ExamLandingPage } from './components/ExamLandingPage';
import { JEE_CONFIG, NEET_CONFIG, CAT_CONFIG } from './components/examConfigs';
import { CollegeRecommendation, RecommendationRequest } from './services/api';

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

// Scroll to top on every route change
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

export default function App() {
  const [portalType, setPortalType] = useState<'mht-cet' | 'jee'>('mht-cet');

  // Restore colleges from sessionStorage on hard reload (e.g. direct /college/:id navigation)
  const [colleges, setColleges] = useState<CollegeRecommendation[]>(() => {
    try {
      const saved = sessionStorage.getItem('uniscout_colleges');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [lastQuery, setLastQuery] = useState<QueryWithMeta | null>(() => {
    try {
      const saved = sessionStorage.getItem('uniscout_query');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });
  const [comparisonSelection, setComparisonSelection] = useState<CollegeRecommendation[]>([]);

  // Persist colleges to sessionStorage whenever they change
  const setCollegesAndPersist = (results: CollegeRecommendation[]) => {
    setColleges(results);
    try { sessionStorage.setItem('uniscout_colleges', JSON.stringify(results)); } catch {}
  };
  const setLastQueryAndPersist = (query: QueryWithMeta | null) => {
    setLastQuery(query);
    try { sessionStorage.setItem('uniscout_query', JSON.stringify(query)); } catch {}
  };

  return (
    <BrowserRouter>
      <ScrollToTop />
      <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-950 to-slate-950 relative overflow-hidden text-slate-300">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        </div>

        <Routes>
          <Route path="/" element={
            <HomePage 
              onPortalSelect={(portal) => setPortalType(portal)} 
              onSmartFormSelect={() => {}} // Now handled by Link in HomePage
            />
          } />
          
          <Route path="/mht-cet" element={
            <MhtCetPortal 
              onBack={() => {}} // Now handled by useNavigate in component
              onRecommendationsReady={(results, query) => {
                setCollegesAndPersist(results);
                setLastQueryAndPersist(query);
              }}
            />
          } />
          
          <Route path="/jee" element={
            <JeePortal onBack={() => {}} />
          } />

          {/* Exam-specific SEO landing pages */}
          <Route path="/jee-college-predictor" element={<ExamLandingPage config={JEE_CONFIG} />} />
          <Route path="/neet-college-predictor" element={<ExamLandingPage config={NEET_CONFIG} />} />
          <Route path="/cat-college-predictor" element={<ExamLandingPage config={CAT_CONFIG} />} />

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
            <CollegeDetailPage
              colleges={colleges}
            />
          } />

          <Route path="/compare" element={
            <CollegeComparisonPage
              colleges={comparisonSelection}
              onBack={() => {}}
              onHome={() => {}}
            />
          } />

          <Route path="/smart-form" element={
            <SmartFormPage />
          } />

          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}