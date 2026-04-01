import { useState } from 'react';
import { HomePage } from './components/HomePage';
import { MhtCetPortal } from './components/MhtCetPortal';
import { SscPortal } from './components/SscPortal';
import { ComingSoon } from './components/ComingSoon';
import { ResultsPage } from './components/ResultsPage';
import { api, CollegeRecommendation } from './services/api';

export type Portal = 'home' | 'mht-cet' | 'ssc' | 'results';

export interface MhtCetFormData {
  percentile: string;
  year: string;
  capRound: string;
  category: string;
  branchPreference: string;
  location: string;
}

export interface SscFormData {
  totalMarks: string;
  year: string;
  regularRound: string;
  category: string;
  branchPreference: string;
  location: string;
}

export interface College {
  id: string;
  name: string;
  code: string;
  branch: string;
  location: string;
  district: string;
  category: string;
  cutoffPercentile: number;
  percentileDifference: number;
  collegeType: string;
  fees: string;
  seats: number;
  admissionChance: 'High' | 'Medium' | 'Low';
}

export default function App() {
  const [currentView, setCurrentView] = useState<Portal>('home');
  const [showComingSoon, setShowComingSoon] = useState(false);
  const [portalType, setPortalType] = useState<'mht-cet' | 'ssc'>('mht-cet');
  const [colleges, setColleges] = useState<CollegeRecommendation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePortalSelect = (portal: 'mht-cet' | 'ssc') => {
    setPortalType(portal);
    setCurrentView(portal);
    setShowComingSoon(false);
    setError(null);
  };

  const handleMhtCetSubmit = async (data: MhtCetFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await api.getRecommendations({
        percentile: parseFloat(data.percentile),
        year: data.year,
        capRound: data.capRound,
        category: data.category,
        branchPreference: data.branchPreference,
        location: data.location,
      });

      if (response.success && response.data) {
        setColleges(response.data);
        setCurrentView('results');
      } else {
        setError(response.error || 'Failed to get recommendations');
      }
    } catch (err) {
      console.error('Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to connect to server. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSscSubmit = (_data: SscFormData) => {
    // Show coming soon page for SSC portal
    setShowComingSoon(true);
    setCurrentView('home');
  };

  const handleBackToHome = () => {
    setCurrentView('home');
    setShowComingSoon(false);
    setError(null);
  };

  const handleBackToPortal = () => {
    setCurrentView(portalType);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-950 to-slate-950 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {currentView === 'home' && (
        showComingSoon ? (
          <ComingSoon 
            portalType={portalType}
            onBack={handleBackToHome}
          />
        ) : (
          <HomePage onPortalSelect={handlePortalSelect} />
        )
      )}
      
      {currentView === 'mht-cet' && (
        <MhtCetPortal 
          onSubmit={handleMhtCetSubmit}
          onBack={handleBackToHome}
          isLoading={isLoading}
          error={error}
        />
      )}
      
      {currentView === 'ssc' && (
        <SscPortal 
          onSubmit={handleSscSubmit}
          onBack={handleBackToHome}
        />
      )}

      {currentView === 'results' && (
        <ResultsPage 
          colleges={colleges}
          portalType={portalType}
          onBack={handleBackToPortal}
          onHome={handleBackToHome}
        />
      )}
    </div>
  );
}