import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from '@/context/AppContext';
import { OfflineProvider } from '@/context/OfflineContext';

import { PasswordPage } from '@/pages/PasswordPage';
import { HomePage } from '@/pages/HomePage';
import { MyFlightsPage } from '@/pages/MyFlightsPage';
import { FlightDetailPage } from '@/pages/FlightDetailPage';
import { AddFlightPage } from '@/pages/AddFlightPage';
import { EditFlightPage } from '@/pages/EditFlightPage';

function AppRoutes() {
  const { isUnlocked } = useApp();

  if (!isUnlocked) {
    return <PasswordPage />;
  }

  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/member/:id" element={<MyFlightsPage />} />
      <Route path="/flights/add" element={<AddFlightPage />} />
      <Route path="/flights/:id" element={<FlightDetailPage />} />
      <Route path="/flights/:id/edit" element={<EditFlightPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <OfflineProvider>
        <AppProvider>
          <AppRoutes />
        </AppProvider>
      </OfflineProvider>
    </BrowserRouter>
  );
}
