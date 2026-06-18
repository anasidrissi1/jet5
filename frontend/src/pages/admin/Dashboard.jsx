import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MonthSelector from '../../components/common/MonthSelector';
import Loader from '../../components/Loader';
import { carsService, reservationsService } from '../../services/api';
import { useNotification } from '../../contexts/NotificationContext';

const DAY_MS = 24 * 60 * 60 * 1000;

const toDate = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const toIsoDate = (value) => {
  const date = toDate(value);
  return date ? date.toISOString().slice(0, 10) : '';
};

const getReservationLabel = (content) => {
  if (!content) return '';
  const parts = content.trim().split(/\s+/);
  return parts.length > 1 ? parts[parts.length - 1] : parts[0];
};

function Dashboard() {
  const navigate = useNavigate();
  const { addNotification } = useNotification();

  const now = new Date();
  const todayIso = toIsoDate(now);

  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [loading, setLoading] = useState(true);
  const [cars, setCars] = useState([]);
  const [reservations, setReservations] = useState([]);

  useEffect(() => {
    const fetchAllPages = async (loader, baseParams = {}) => {
      const all = [];
      let page = 1;
      let hasNext = true;
      const MAX_PAGES = 200;

      while (hasNext && page <= MAX_PAGES) {
        const response = await loader({ ...baseParams, page, page_size: 200 });
        const payload = response.data;

        if (Array.isArray(payload)) return payload;
        if (!Array.isArray(payload?.results)) return [];

        all.push(...payload.results);
        hasNext = Boolean(payload.next);
        page += 1;
      }

      return all;
    };

    const loadPlanningData = async () => {
      setLoading(true);
      try {
        const [carsList, reservationsList] = await Promise.all([
          fetchAllPages(carsService.list),
          fetchAllPages(reservationsService.list, { origin: 'admin' }),
        ]);

        setCars(carsList);
        setReservations(reservationsList);
      } catch (error) {
        console.error(error);
        addNotification('Erreur lors du chargement du planning.', 'error');
      } finally {
        setLoading(false);
      }
    };

    loadPlanningData();
  }, [addNotification]);

  const monthMeta = useMemo(() => {
    const monthStart = new Date(selectedYear, selectedMonth - 1, 1);
    const monthEnd = new Date(selectedYear, selectedMonth, 0);
    const daysInMonth = monthEnd.getDate();

    const days = Array.from({ length: daysInMonth }, (_, i) => {
      const date = new Date(selectedYear, selectedMonth - 1, i + 1);
      return {
        day: i + 1,
        iso: toIsoDate(date),
        label: date.toLocaleDateString('fr-FR', { weekday: 'short' }),
      };
    });

    const uniqueDays = Array.from(new Map(days.map((day) => [day.iso, day])).values());
    uniqueDays.sort((a, b) => a.day - b.day);

    return { monthStart, monthEnd, days: uniqueDays };
  }, [selectedMonth, selectedYear]);

  const carDayReservationMap = useMemo(() => {
    const map = new Map();

    reservations
      .filter((reservation) => String(reservation.statut || '').toLowerCase() !== 'annule')
      .forEach((reservation) => {
        const start = toDate(reservation.date_debut);
        const end = toDate(reservation.date_fin || reservation.date_debut);
        if (!start || !end) return;

        if (end < monthMeta.monthStart || start > monthMeta.monthEnd) return;

        const cursor = new Date(Math.max(start.getTime(), monthMeta.monthStart.getTime()));
        const stop = new Date(Math.min(end.getTime(), monthMeta.monthEnd.getTime()));

        while (cursor <= stop) {
          const iso = toIsoDate(cursor);
          const key = `${reservation.voiture}-${iso}`;
          if (!map.has(key)) map.set(key, reservation);
          cursor.setTime(cursor.getTime() + DAY_MS);
        }
      });

    return map;
  }, [reservations, monthMeta.monthEnd, monthMeta.monthStart]);

  const carRows = useMemo(() => {
    const sortedCars = [...cars].sort((a, b) => {
      const labelA = `${a.marque || ''} ${a.modele || ''}`.trim();
      const labelB = `${b.marque || ''} ${b.modele || ''}`.trim();
      return labelA.localeCompare(labelB, 'fr');
    });

    return sortedCars.map((car) => {
      const days = monthMeta.days.map((day) => {
        const reservation = carDayReservationMap.get(`${car.id}-${day.iso}`);
        let status = 'disponible';
        if (reservation) {
          status = day.iso === todayIso ? 'aujourdhui' : 'reserve';
        } else if (day.iso === todayIso) {
          status = 'aujourdhui';
        }

        return { ...day, reservation, status };
      });

      return { car, days };
    });
  }, [carDayReservationMap, cars, monthMeta.days, todayIso]);

  if (loading) {
    return (
      <div className="dashboard-planning dashboard-planning--loading">
        <Loader />
      </div>
    );
  }

  return (
    <div className="dashboard-planning">
      <div className="dashboard-page-header">
        <div className="dashboard-page-header-left">
          <h1 className="dashboard-page-title">Dashboard planning</h1>
          <p className="dashboard-page-subtitle">Planning visuel des réservations par voiture et par jour</p>
        </div>

        <div className="dashboard-page-header-actions">
          <MonthSelector
            month={selectedMonth}
            year={selectedYear}
            onChange={(month, year) => {
              setSelectedMonth(month);
              setSelectedYear(year);
            }}
          />
        </div>
      </div>

      <div className="planning-hero-card">
        <div>
          <h2>Planning mensuel des véhicules</h2>
          <p>Vue en temps réel de la disponibilité, des réservations et de la journée en cours.</p>
        </div>
      </div>

      <div className="planning-legend">
        <span><i className="dot dot-disponible" /> Disponible</span>
        <span><i className="dot dot-reserve" /> Réservé</span>
        <span><i className="dot dot-aujourdhui" /> Aujourd'hui</span>
      </div>

      <div className="planning-table-shell">
        <div className="planning-table-scroller">
          <table className="planning-table">
            <thead>
              <tr>
                <th className="planning-col-car">Voiture</th>
                {monthMeta.days.map((day, index) => (
                  <th key={`${day.iso}-${index}`} className={day.iso === todayIso ? 'planning-col-day is-today' : 'planning-col-day'}>
                    {day.day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {carRows.map(({ car, days }) => (
                <tr key={car.id}>
                  <td className="planning-col-car">
                    <div className="planning-car-meta">
                      <strong>{`${car.marque || ''} ${car.modele || ''}`.trim() || 'Voiture'}</strong>
                      <span>{car.immatriculation || '-'}</span>
                    </div>
                  </td>
                  {days.map((day, index) => {
                    const content = day.reservation?.client_nom || day.reservation?.client_name || '';
                    const label = getReservationLabel(content);
                    return (
                      <td
                        key={`${car.id}-${day.iso}-${index}`}
                        className={`planning-cell status-${day.status}`}
                        title={content || `Statut: ${day.status}`}
                        onClick={() => day.reservation?.id && navigate(`/admin/reservations/view/${day.reservation.id}`)}
                      >
                        {label ? <span className="planning-cell-text">{label}</span> : null}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
