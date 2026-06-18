import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { carsService, reservationsService } from "../../services/api";
import { useNotification } from "../../contexts/NotificationContext";
import Loader from "../../components/Loader";
import DeleteConfirmModal from "../../components/DeleteConfirmModal";
import CarDetailModal from "../../components/CarDetailModal";
import exportExcel from "../../utils/exportExcel";
import { fetchAllPages } from "../../utils/fetchAllPages";
import "../../styles/cars-unified.css";
import "../../styles/autorisations.css";
import "../../styles/car-detail-modal.css";

const NORMALIZABLE_STATUSES = new Set([
  'libre',
  'disponible',
  'available',
  'free',
  'louee',
  'louée',
  'loue',
  'reservee',
  'réservée',
  'reserve',
]);

function Cars() {
  const navigate = useNavigate();
  const { addNotification } = useNotification();
  
  // Sécurise l'initialisation de cars pour éviter les erreurs
  const [cars, setCars] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [, setUser] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUser(payload);
      } catch {
        // Ignore invalid token
      }
    }
  }, []);

  const stats = useMemo(() => {
    return {
      total: cars.length,
      available: cars.filter(car => car.statut === 'disponible').length,
      rented: cars.filter(car => car.statut === 'louee').length,
      maintenance: cars.filter(car => car.statut === 'entretien').length,
    };
  }, [cars]);

  // Sécurise l'utilisation de cars dans useMemo
  const filteredCars = useMemo(() => {
    let result = Array.isArray(cars) ? cars : [];
    if (search) {
      const lowerSearch = search.toLowerCase();
      result = result.filter(car =>
        (car.marque && car.marque.toLowerCase().includes(lowerSearch)) ||
        (car.modele && car.modele.toLowerCase().includes(lowerSearch)) ||
        (car.immatriculation && car.immatriculation.toLowerCase().includes(lowerSearch)) ||
        (car.couleur && car.couleur.toLowerCase().includes(lowerSearch))
      );
    }
    if (statusFilter !== 'all') {
      result = result.filter(car => car.statut === statusFilter);
    }
    return result;
  }, [cars, search, statusFilter]);

  // Ajoute un log pour vérifier la réponse API
  const fetchCars = useCallback(async () => {
    setLoading(true);
    try {
      const [voitures, reservationsDataRaw] = await Promise.all([
        fetchAllPages(carsService.list),
        fetchAllPages(reservationsService.list).catch(() => []),
      ]);

      setReservations(reservationsDataRaw);

      const activeStatuses = new Set(['planifiee', 'en_cours']);
      const activeCarIds = new Set(
        reservationsDataRaw
          .filter((reservation) => activeStatuses.has((reservation.statut || '').toLowerCase()))
          .map((reservation) => String(reservation.voiture))
      );

      const enhancedCars = voitures.map((car) => {
        const normalizedStatus = (car.statut || '').toLowerCase();
        const isActive = activeCarIds.has(String(car.id));

        // Normalize to two logical states: 'disponible' or 'louee'
        const statut_normalized = isActive ? 'louee' : (
          NORMALIZABLE_STATUSES.has(normalizedStatus) ? 'disponible' : 'louee'
        );

        const statut_display = statut_normalized === 'disponible' ? 'Disponible' : 'Louée';

        return {
          ...car,
          statut: statut_normalized,
          statut_display,
        };
      });

      setCars(enhancedCars);
      setError(null);
    } catch (error) {
      console.error('Erreur lors du chargement des voitures :', error);
      setError('Impossible de charger les voitures');
      setCars([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCars();
  }, [fetchCars]);

  // Add this function inside Cars component
  function handleExport() {
    // Example: Export cars data to Excel using a utility
    if (cars.length === 0) {
      addNotification({ type: 'warning', message: 'Aucune voiture à exporter.' });
      return;
    }
    // If you have a utility function, use it here
    if (typeof exportExcel === 'function') {
      exportExcel(cars, 'Liste_voitures');
      addNotification({ type: 'success', message: 'Export Excel réussi !' });
    } else {
      addNotification({ type: 'error', message: 'La fonction d\'exportation Excel est manquante.' });
    }
  }

  const [pendingDeleteCar, setPendingDeleteCar] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [activeCar, setActiveCar] = useState(null);

  function requestCarDeletion(target) {
    if (!target) {
      return;
    }
    setPendingDeleteCar(target);
    if (typeof document !== "undefined") {
      document.body.style.overflow = "hidden";
    }
  }

  function closeDeleteModal(force = false) {
    if (deleteLoading && !force) {
      return;
    }
    setPendingDeleteCar(null);
    if (typeof document !== "undefined") {
      document.body.style.overflow = "";
    }
  }

  async function confirmDeleteCar() {
    if (!pendingDeleteCar) {
      return;
    }
    setDeleteLoading(true);
    try {
      await carsService.delete(pendingDeleteCar.id);
      setCars(previous => previous.filter(car => car.id !== pendingDeleteCar.id));
      addNotification({ type: "success", message: "Voiture supprimée avec succès." });
      closeDeleteModal(true);
    } catch (err) {
      console.error("Erreur lors de la suppression de la voiture :", err);
      const message = err?.response?.data?.detail || "Impossible de supprimer cette voiture.";
      addNotification({ type: "error", message });
    } finally {
      setDeleteLoading(false);
    }
  }

  function openCarDetails(target) {
    if (!target) {
      return;
    }
    // open detail view: navigate to route and also set modal state when needed
    setActiveCar(target);
    navigate(`/admin/cars/${target.id}`);
  }

  function closeCarDetails() {
    setActiveCar(null);
    if (typeof document !== "undefined") {
      document.body.style.overflow = "";
    }
  }

  // Ajout de la variable paginatedCars pour éviter les erreurs si elle est utilisée dans le rendu
  const paginatedCars = filteredCars;

  const selectedCarReservations = useMemo(() => {
    if (!activeCar) return [];
    return reservations.filter((r) => String(r.voiture) === String(activeCar.id));
  }, [activeCar, reservations]);

  const selectedCarStats = useMemo(() => {
    if (!activeCar) return null;
    const totals = selectedCarReservations.reduce(
      (acc, r) => {
        const total = Number(r.montant_total) || 0;
        const paid = Math.min(total, Number(r.avance) || 0);
        const rest = Math.max(total - paid, 0);
        const statut = (r.statut || '').toLowerCase();
        if (statut === 'en_cours' || statut === 'planifiee' || statut === 'planifiée') {
          acc.active += 1;
        } else if (statut === 'termine' || statut === 'terminée') {
          acc.ended += 1;
        } else {
          acc.upcoming += 1;
        }
        acc.paid += paid;
        acc.unpaid += rest;

        if (r.date_fin) {
          const end = new Date(r.date_fin);
          if (!Number.isNaN(end.getTime())) {
            if (!acc.nextDue || end < acc.nextDue) {
              acc.nextDue = end;
            }
          }
        }
        return acc;
      },
      { paid: 0, unpaid: 0, active: 0, upcoming: 0, ended: 0, nextDue: null }
    );

    return {
      ...totals,
      nextDueFormatted: totals.nextDue
        ? totals.nextDue.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
        : null,
      reservationsCount: selectedCarReservations.length,
    };
  }, [activeCar, selectedCarReservations]);

  const handleNavigateToUnpaid = (carId) => {
    navigate('/admin/reservations', {
      state: {
        carFilter: carId ? String(carId) : null,
        unpaidOnly: true,
        from: 'cars-unpaid'
      }
    });
  };

  // ...other logic (handleSort, etc.)

  return (
    <div className="cars-page">
      {/* Header */}
      <div className="cars-header">
        <h1 className="cars-title">Gestion des voitures</h1>
        <p className="cars-subtitle">Suivi et gestion du parc automobile</p>
      </div>

      {/* Actions & Search */}
      <div className="cars-actions-bar">
        <input
          className="cars-search-bar input"
          type="text"
          placeholder="Rechercher par immatriculation, marque, modèle, couleur..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {/* Filtre Statut */}
        <select
          className="cars-status-filter input"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
        >
          <option value="all">Tous les statuts</option>
          <option value="disponible">Disponible</option>
          <option value="louee">Louée</option>
        </select>
        <button className="btn-add-car btn-primary" onClick={() => navigate('/admin/cars/add')}>Nouvelle voiture</button>
        <button className="btn-export-excel btn-secondary" onClick={handleExport}>Exporter Excel</button>
      </div>

      {/* Cartes Statistiques */}
      <div className="kpis-grid">
        <div className="kpi-card">
          <div className="kpi-content">
            <p className="kpi-label">Total</p>
            <h2 className="kpi-value">{stats.total}</h2>
            <p className="kpi-sub">Véhicules enregistrés</p>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-content">
            <p className="kpi-label">Disponibles</p>
            <h2 className="kpi-value">{stats.available}</h2>
            <p className="kpi-sub">Prêts à louer</p>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-content">
            <p className="kpi-label">Louées</p>
            <h2 className="kpi-value">{stats.rented}</h2>
            <p className="kpi-sub">Actuellement louées</p>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-content">
            <p className="kpi-label">Entretien</p>
            <h2 className="kpi-value">{stats.maintenance}</h2>
            <p className="kpi-sub">En maintenance</p>
          </div>
        </div>
      </div>

      {/* Tableau des voitures */}
      <div className="cars-table-section">
        {loading ? (
          <Loader />
        ) : error ? (
          <div className="error-state">
            <span className="error-icon">!</span>
            <p>Erreur: {error}</p>
            <button className="btn-retry" onClick={fetchCars}>Réessayer</button>
          </div>
        ) : paginatedCars.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">•</span>
            <h3>Aucune voiture trouvée</h3>
            <p>
              {search || statusFilter !== 'all' 
                ? 'Aucun résultat ne correspond à vos critères de recherche' 
                : 'Commencez par ajouter votre premier véhicule'}
            </p>
            {!search && statusFilter === 'all' && (
              <button className="btn-add-empty" onClick={() => navigate('/admin/cars/add')}>
                Ajouter une voiture
              </button>
            )}
          </div>
        ) : (
          <div className="table-card cars-mobile-cards-wrapper">
            <table className="data-table table-header-sticky mobile-cards-table">
              <thead>
                <tr>
                  <th>Marque</th>
                  <th>Modèle</th>
                  <th>Immatriculation</th>
                  <th>Couleur</th>
                  <th>Kilométrage</th>
                  <th>Statut</th>
                  <th>Prix/Jour</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCars.map(car => (
                  <tr
                    key={car.id}
                    className="data-row"
                    data-mobile-card="car"
                    onClick={() => openCarDetails(car)}
                  >
                    <td data-label="Marque">{car.marque || '-'}</td>
                    <td data-label="Modèle">{car.modele || '-'}</td>
                    <td data-label="Immatriculation">
                      <strong>{car.immatriculation || 'N/A'}</strong>
                    </td>
                    <td data-label="Couleur">{car.couleur || '-'}</td>
                    <td data-label="Kilométrage">{car.kilometrage?.toLocaleString('fr-MA') || '-'}</td>
                    <td data-label="Statut">
                      <span className="pill pill-status">{car.statut_display || car.statut || '-'}</span>
                    </td>
                    <td data-label="Prix/Jour">
                      <span className="pill pill-price">{car.prix_journalier ? `${car.prix_journalier} MAD` : '-'}</span>
                    </td>
                    <td data-label="Actions">
                      <div className="table-actions">
                        <button
                          title="Modifier"
                          onClick={(event) => {
                            event.stopPropagation();
                            navigate(`/admin/cars/edit/${car.id}`);
                          }}
                          className="btn-secondary"
                        >
                          Modifier
                        </button>
                        <button
                          title="Supprimer"
                          onClick={(event) => {
                            event.stopPropagation();
                            requestCarDeletion(car);
                          }}
                          className="btn-danger"
                        >
                          Supprimer
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {pendingDeleteCar && (
        <DeleteConfirmModal
          title="Supprimer cette voiture ?"
          description={
            <>
              Cette action retirera la voiture <strong>{pendingDeleteCar.marque} {pendingDeleteCar.modele}</strong>
              {pendingDeleteCar.immatriculation ? (
                <> immatriculée <strong>{pendingDeleteCar.immatriculation}</strong></>
              ) : null}
              . Cette opération est définitive.
            </>
          }
          icon=""
          confirmLabel={deleteLoading ? "Suppression..." : "Supprimer"}
          cancelLabel="Annuler"
          onCancel={closeDeleteModal}
          onConfirm={confirmDeleteCar}
          confirmVariant="danger"
          disableActions={deleteLoading}
        />
      )}
      {activeCar && (
        <CarDetailModal
          car={activeCar}
          stats={selectedCarStats}
          reservations={selectedCarReservations}
          onNavigateUnpaid={() => handleNavigateToUnpaid(activeCar.id)}
          onClose={closeCarDetails}
          onEdit={(target) => {
            closeCarDetails();
            navigate(`/admin/cars/edit/${target.id}`);
          }}
        />
      )}
    </div>
  );
}

export default Cars;
