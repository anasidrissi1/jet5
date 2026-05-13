import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import apiClient from '../api/apiClient';
import '../styles/planning-dashboard.css';

const extractList = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== 'object') return [];
  if (Array.isArray(payload.results)) return payload.results;
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.items)) return payload.items;
  return [];
};

function Dashboard() {
  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [cars, setCars] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Récupérer voitures et réservations
  useEffect(() => {
    let active = true;

    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const [carsRes, resvRes] = await Promise.all([
          apiClient.get('/cars/voitures/'),
          apiClient.get('/reservations/?ordering=-date_debut&limit=1000'),
        ]);

        if (!active) return;

        console.log('carsRes.data:', carsRes.data);
        console.log('carsRes:', carsRes);

        const carsList = extractList(carsRes.data);
        const reservationsList = extractList(resvRes.data);

        console.log('✓ Cars loaded:', carsList.length, 'items');
        console.log('✓ Reservations loaded:', reservationsList.length, 'items');

        setCars(carsList);
        setReservations(reservationsList);
      } catch (err) {
        if (active) {
          console.error('✗ Dashboard error:', err);
          setError(err.message || 'Erreur lors du chargement du planning');
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadData();
    return () => {
      active = false;
    };
  }, []);

  // Calculer les jours du mois
  const daysInMonth = (month, year) => new Date(year, month, 0).getDate();
  const days = Array.from({ length: daysInMonth(selectedMonth, selectedYear) }, (_, i) => i + 1);

  // Vérifier si une voiture est réservée à une date donnée
  const isCarReservedOnDate = (carId, day) => {
    return reservations.some((rsv) => {
      if (rsv.voiture !== carId) return false;
      const startDate = new Date(rsv.date_debut);
      const endDate = new Date(rsv.date_fin);
      const checkDate = new Date(selectedYear, selectedMonth - 1, day);
      return checkDate >= startDate && checkDate <= endDate;
    });
  };

  // Vérifier si jour = aujourd'hui
  const isTodayDate = (day) => {
    return (
      day === today.getDate() &&
      selectedMonth === today.getMonth() + 1 &&
      selectedYear === today.getFullYear()
    );
  };

  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  const monthName = new Date(selectedYear, selectedMonth - 1).toLocaleDateString('fr-MA', {
    month: 'long',
    year: 'numeric',
  });

  const headerSubtitle = `${cars.length} vehicules - ${reservations.length} reservations`;

  const renderHeader = () => (
    <div className="planning-header">
      <div className="planning-header-left">
        <h1 className="planning-title">
          <span className="planning-title-icon" aria-hidden="true">PL</span>
          Planning des Reservations
        </h1>
        <p className="planning-subtitle">{headerSubtitle}</p>
      </div>
      <div className="month-navigation">
        <button className="nav-btn" onClick={handlePrevMonth} title="Mois precedent">
          <ChevronLeft size={20} />
        </button>
        <span className="current-month">{monthName}</span>
        <button className="nav-btn" onClick={handleNextMonth} title="Mois suivant">
          <ChevronRight size={20} />
        </button>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="planning-dashboard">
        {renderHeader()}
        <div className="loading-spinner">Chargement...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="planning-dashboard">
        {renderHeader()}
        <p className="error-message">Erreur: {error}</p>
      </div>
    );
  }

  return (
    <div className="planning-dashboard">
      {renderHeader()}

      <div className="planning-wrapper">
        <div className="planning-table">
          <div className="planning-header-row">
            <div className="planning-car-cell sticky-header">Vehicule</div>
            {days.map((day) => (
              <div
                key={`header-${day}`}
                className={`planning-day-header ${isTodayDate(day) ? 'today' : ''}`}
              >
                {day}
              </div>
            ))}
          </div>

          {cars.map((car) => (
            <div key={car.id} className="planning-row">
              <div className="planning-car-cell sticky">
                <div className="car-name">{car.marque} {car.modele}</div>
                <div className="car-id">#{car.immatriculation}</div>
              </div>
              {days.map((day) => {
                const isReserved = isCarReservedOnDate(car.id, day);
                const isToday = isTodayDate(day);
                return (
                  <div
                    key={`${car.id}-${day}`}
                    className={`planning-day-cell ${isReserved ? 'reserved' : 'free'} ${
                      isToday ? 'today' : ''
                    }`}
                    title={
                      isReserved
                        ? `Réservée le ${day}/${selectedMonth}/${selectedYear}`
                        : `Disponible le ${day}/${selectedMonth}/${selectedYear}`
                    }
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="planning-legend">
        <div className="legend-item">
          <div className="legend-color free" />
          <span>Disponible</span>
        </div>
        <div className="legend-item">
          <div className="legend-color reserved" />
          <span>Réservée</span>
        </div>
        <div className="legend-item">
          <div className="legend-color today" />
          <span>Aujourd'hui</span>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
