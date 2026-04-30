import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Loader from './components/Loader';
import Notification from './components/Notification';
import { useAuth } from './contexts/AuthContext';
import { useNotification } from './contexts/NotificationContext';
import './App.css';

const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Cars = lazy(() => import('./pages/Cars'));
const CarDetails = lazy(() => import('./pages/CarDetails'));
const AddCar = lazy(() => import('./pages/AddCar'));
const Clients = lazy(() => import('./pages/Clients'));
const AddClient = lazy(() => import('./pages/AddClient'));
const EditClient = lazy(() => import('./pages/EditClient'));
const ClientInscription = lazy(() => import('./pages/ClientInscription'));
const Reservations = lazy(() => import('./pages/ReservationsProfessional'));
const ReservationsOnline = lazy(() => import('./pages/ReservationsOnline'));
const AddReservation = lazy(() => import('./pages/AddReservation'));
const ReservationDetail = lazy(() => import('./pages/ReservationDetail'));
const Payments = lazy(() => import('./pages/Payments'));
const AddPayment = lazy(() => import('./pages/AddPayment'));
const EditPayment = lazy(() => import('./pages/EditPayment'));
const Autorisations = lazy(() => import('./pages/Autorisations'));
const AddAutorisation = lazy(() => import('./pages/AddAutorisation'));
const Assurances = lazy(() => import('./pages/Assurances'));
const AddAssurance = lazy(() => import('./pages/AddAssurance'));
const Entretiens = lazy(() => import('./pages/Entretiens'));
const AddEntretien = lazy(() => import('./pages/AddEntretien'));
const EntretienDetail = lazy(() => import('./pages/EntretiensDetail'));
const VisitesTechniques = lazy(() => import('./pages/VisitesTechniques'));
const AddVisiteTechnique = lazy(() => import('./pages/AddVisiteTechnique'));
const RentabiliteVoitures = lazy(() => import('./pages/RentabiliteVoitures'));
const Agents = lazy(() => import('./pages/Agents'));
const AddAgent = lazy(() => import('./pages/AddAgent'));
const Notifications = lazy(() => import('./pages/Notifications'));
const NotificationDetail = lazy(() => import('./pages/notifications/NotificationDetail'));
const ContactMessages = lazy(() => import('./pages/ContactMessages'));
const PublicHome = lazy(() => import('./pages/PublicHome'));
const PublicCars = lazy(() => import('./pages/PublicCars'));
const PublicCarDetails = lazy(() => import('./pages/PublicCarDetails'));
const PublicBooking = lazy(() => import('./pages/PublicBooking'));
const PublicBookingConfirmation = lazy(() => import('./pages/PublicBookingConfirmation'));
const PublicContact = lazy(() => import('./pages/PublicContact'));
const NotFound = lazy(() => import('./pages/NotFound'));

function RouteFallback() {
  return <Loader text="Chargement de la page..." />;
}

const publicRoutes = [
  { path: '/', element: <PublicHome /> },
  { path: '/cars', element: <PublicCars /> },
  { path: '/cars/:id', element: <PublicCarDetails /> },
  { path: '/booking/:id', element: <PublicBooking /> },
  { path: '/booking-confirmation/:id', element: <PublicBookingConfirmation /> },
  { path: '/contact', element: <PublicContact /> },
  { path: '/inscription', element: <ClientInscription /> },
];

const adminRoutes = [
  { path: 'dashboard', element: <Dashboard /> },
  { path: 'cars', element: <Cars /> },
  { path: 'cars/:id', element: <CarDetails /> },
  { path: 'cars/add', element: <AddCar /> },
  { path: 'cars/edit/:id', element: <AddCar /> },
  { path: 'clients', element: <Clients /> },
  { path: 'clients/add', element: <AddClient /> },
  { path: 'clients/edit/:id', element: <EditClient /> },
  { path: 'autorisations', element: <Autorisations /> },
  { path: 'autorisations/add', element: <AddAutorisation /> },
  { path: 'assurances', element: <Assurances /> },
  { path: 'assurances/add', element: <AddAssurance /> },
  { path: 'entretiens', element: <Entretiens /> },
  { path: 'entretiens/add', element: <AddEntretien /> },
  { path: 'entretiens/view/:id', element: <EntretienDetail /> },
  { path: 'entretiens/edit/:id', element: <AddEntretien /> },
  { path: 'visites-techniques', element: <VisitesTechniques /> },
  { path: 'visites-techniques/add', element: <AddVisiteTechnique /> },
  {
    path: 'reservations',
    element: (
      <Reservations
        sourceFilter="admin"
        title="Réservations agence"
        subtitle="Réservations créées par l'équipe interne"
      />
    )
  },
  { path: 'reservations/online', element: <ReservationsOnline /> },
  { path: 'reservations/add', element: <AddReservation /> },
  { path: 'reservations/view/:id', element: <ReservationDetail /> },
  { path: 'reservations/edit/:id', element: <AddReservation /> },
  { path: 'payments', element: <Payments /> },
  { path: 'payments/add', element: <AddPayment /> },
  { path: 'payments/edit/:id', element: <EditPayment /> },
  { path: 'rentabilite', element: <RentabiliteVoitures /> },
  { path: 'agents', element: <Agents /> },
  { path: 'agents/add', element: <AddAgent /> },
  { path: 'notifications', element: <Notifications /> },
  { path: 'notifications/:id', element: <NotificationDetail /> },
  { path: 'contact-messages', element: <ContactMessages /> },
];

function App() {
  const { user, loading } = useAuth();
  const { notifications } = useNotification();

  if (loading) {
    return <RouteFallback />;
  }

  return (
    <BrowserRouter>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          {publicRoutes.map((route) => (
            <Route key={route.path} path={route.path} element={route.element} />
          ))}

          <Route path="/login" element={user ? <Navigate to="/admin/dashboard" replace /> : <Login />} />

          <Route path="/admin" element={user ? <Layout /> : <Navigate to="/login" replace />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            {adminRoutes.map((route) => (
              <Route key={route.path} path={route.path} element={route.element} />
            ))}
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>

      <div className="app-notifications-stack">
        {notifications.map((notification) => (
          <Notification
            key={notification.id}
            id={notification.id}
            message={notification.message}
            type={notification.type}
            duration={notification.duration}
          />
        ))}
      </div>
    </BrowserRouter>
  );
}

export default App;
