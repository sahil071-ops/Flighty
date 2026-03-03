import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { OfflineProvider } from '@/context/OfflineContext';
import { FullPageLoader } from '@/components/ui/LoadingSpinner';

import { LoginPage } from '@/pages/LoginPage';
import { SignupPage } from '@/pages/SignupPage';
import { JoinPage } from '@/pages/JoinPage';
import { OnboardingPage } from '@/pages/OnboardingPage';
import { HomePage } from '@/pages/HomePage';
import { MyFlightsPage } from '@/pages/MyFlightsPage';
import { FamilyPage } from '@/pages/FamilyPage';
import { MemberPage } from '@/pages/MemberPage';
import { FlightDetailPage } from '@/pages/FlightDetailPage';
import { AddFlightPage } from '@/pages/AddFlightPage';
import { EditFlightPage } from '@/pages/EditFlightPage';
import { ProfilePage } from '@/pages/ProfilePage';

function AppRoutes() {
  const { user, profile, loading } = useAuth();

  if (loading) return <FullPageLoader />;

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/join" element={<JoinPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  // User is logged in but has no profile yet
  if (!profile) {
    return (
      <Routes>
        <Route path="/join" element={<JoinPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="*" element={<OnboardingPage />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/my-flights" element={<MyFlightsPage />} />
      <Route path="/family" element={<FamilyPage />} />
      <Route path="/family/:memberId" element={<MemberPage />} />
      <Route path="/flights/add" element={<AddFlightPage />} />
      <Route path="/flights/:id" element={<FlightDetailPage />} />
      <Route path="/flights/:id/edit" element={<EditFlightPage />} />
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="/join" element={<JoinPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <OfflineProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </OfflineProvider>
    </BrowserRouter>
  );
}
