import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from '@/context/AppContext';
import { OfflineProvider } from '@/context/OfflineContext';
import { UpdatePrompt } from '@/components/ui/UpdatePrompt';

import { PasswordPage } from '@/pages/PasswordPage';
import { HomePage } from '@/pages/HomePage';
import { MyFlightsPage } from '@/pages/MyFlightsPage';
import { FlightDetailPage } from '@/pages/FlightDetailPage';
import { AddFlightPage } from '@/pages/AddFlightPage';
import { EditFlightPage } from '@/pages/EditFlightPage';
import { AddTripPage } from '@/pages/AddTripPage';
import { TripDetailPage } from '@/pages/TripDetailPage';
import { AddHotelPage } from '@/pages/AddHotelPage';
import { AddCarRentalPage } from '@/pages/AddCarRentalPage';
import { CarRentalDetailPage } from '@/pages/CarRentalDetailPage';
import { DocumentsPage } from '@/pages/DocumentsPage';
import { MemberDocumentsPage } from '@/pages/MemberDocumentsPage';
import { AddDocumentPage } from '@/pages/AddDocumentPage';
import { DocumentDetailPage } from '@/pages/DocumentDetailPage';
import { WhatsNewPage } from '@/pages/WhatsNewPage';
import { HotelDetailPage } from '@/pages/HotelDetailPage';
import { LoyaltyCardsPage } from '@/pages/LoyaltyCardsPage';
import { AddLoyaltyCardPage } from '@/pages/AddLoyaltyCardPage';

function AppRoutes() {
  const { isUnlocked } = useApp();

  if (!isUnlocked) {
    return <PasswordPage />;
  }

  return (
    <Routes>
      {/* Home */}
      <Route path="/" element={<HomePage />} />
      <Route path="/member/:id" element={<MyFlightsPage />} />

      {/* Trips */}
      <Route path="/trips/new" element={<AddTripPage />} />
      <Route path="/trips/:tripId" element={<TripDetailPage />} />
      <Route path="/trips/:tripId/flights/add" element={<AddFlightPage />} />
      <Route path="/trips/:tripId/hotels/add" element={<AddHotelPage />} />
      <Route path="/trips/:tripId/car-rentals/add" element={<AddCarRentalPage />} />

      {/* Flights */}
      <Route path="/flights/:id" element={<FlightDetailPage />} />
      <Route path="/flights/:id/edit" element={<EditFlightPage />} />

      {/* Documents */}
      <Route path="/documents" element={<DocumentsPage />} />
      <Route path="/documents/member/:memberId" element={<MemberDocumentsPage />} />
      <Route path="/documents/add" element={<AddDocumentPage />} />
      <Route path="/documents/view/:docId" element={<DocumentDetailPage />} />

      {/* Hotels */}
      <Route path="/hotels/:hotelId" element={<HotelDetailPage />} />

      {/* Car rentals */}
      <Route path="/car-rentals/:rentalId" element={<CarRentalDetailPage />} />

      {/* Loyalty cards */}
      <Route path="/loyalty-cards/add" element={<AddLoyaltyCardPage />} />
      <Route path="/loyalty-cards/:memberId" element={<LoyaltyCardsPage />} />

      {/* Version history */}
      <Route path="/whats-new" element={<WhatsNewPage />} />

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
          <UpdatePrompt />
        </AppProvider>
      </OfflineProvider>
    </BrowserRouter>
  );
}
