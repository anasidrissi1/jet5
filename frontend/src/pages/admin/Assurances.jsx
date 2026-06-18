import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { carsService, assurancesService } from "../../services/api";
import { useNotification } from "../../contexts/NotificationContext";
import Loader from "../../components/Loader";
import PieChart from "../../components/charts/PieChart";
import exportExcel from "../../utils/exportExcel";
import "../../styles/autorisations.css";
function Assurances() {
  const navigate = useNavigate();
  const [assurances, setAssurances] = useState([]);
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [pendingDelete, setPendingDelete] = useState(null);
  const [processingDelete, setProcessingDelete] = useState(false);
  const { addNotification } = useNotification();

  useEffect(() => {
    let mounted = true;

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const carsRes = await carsService.list();
        const carsPayload = carsRes.data;
        const carsList = Array.isArray(carsPayload)
          ? carsPayload
          : carsPayload?.results ?? carsPayload?.items ?? [];

        const assurancesRes = await assurancesService.list();
        const assurancesPayload = assurancesRes.data;
        const assurancesList = Array.isArray(assurancesPayload)
          ? assurancesPayload
          : assurancesPayload?.results ?? assurancesPayload?.items ?? [];

        if (mounted) {
          setCars(carsList || []);
          setAssurances(assurancesList || []);
        }
      } catch (err) {
        console.error("Erreur lors du chargement des données :", err);
        const message = err.response?.data?.detail || err.message || "Erreur réseau";
        setError(message);
        addNotification(message, "error");
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      mounted = false;
    };
  }, [addNotification]);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.body.style.overflow = "";
    }
  }, []);

  const getCarDetails = (assurance) => {
    return (
      assurance.voiture_details || cars.find((car) => car.id === assurance.voiture) || null
    );
  };

  const parseLocalDate = (value) => {
    if (!value) {
      return null;
    }
    const raw = String(value).slice(0, 10);
    const parts = raw.split('-');
    if (parts.length === 3) {
      const parsed = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      parsed.setHours(0, 0, 0, 0);
      return parsed;
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return null;
    }
    parsed.setHours(0, 0, 0, 0);
    return parsed;
  };

  const getStatus = (dateExpiration) => {
    const expiration = parseLocalDate(dateExpiration);
    if (!expiration) {
      return { status: "expiré", color: "danger", emoji: "❌", days: 0 };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((expiration - today) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { status: "expiré", color: "danger", emoji: "❌", days: Math.abs(diffDays) };
    }

    if (diffDays <= 15) {
      return { status: "à renouveler", color: "warning", emoji: "⚠️", days: diffDays };
    }

    return { status: "actif", color: "success", emoji: "✅", days: diffDays };
  };

  const normalizedAssurances = useMemo(() => {
    return assurances.map((assurance) => ({
      ...assurance,
      car: assurance.car || getCarDetails(assurance),
    }));
  }, [assurances, cars]);

  const stats = useMemo(() => {
    let actives = 0;
    let expiring = 0;
    let expirees = 0;
    let montantTotal = 0;

    normalizedAssurances.forEach((assurance) => {
      const { status } = getStatus(assurance.date_expiration);
      const montant = Number.parseFloat(assurance.montant);

      if (!Number.isNaN(montant)) {
        montantTotal += montant;
      }

      if (status === "actif") {
        actives += 1;
        return;
      }

      if (status === "à renouveler") {
        expiring += 1;
        return;
      }

      expirees += 1;
    });

    return {
      total: normalizedAssurances.length,
      actives,
      expiring,
      expirees,
      montantTotal: Math.round(montantTotal * 100) / 100,
    };
  }, [normalizedAssurances]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    return normalizedAssurances.filter((assurance) => {
      const statusInfo = getStatus(assurance.date_expiration);

      const matchesStatus =
        filter === "all" ||
        (filter === "actives" && statusInfo.status === "actif") ||
        (filter === "expiring" && statusInfo.status === "à renouveler") ||
        (filter === "expired" && statusInfo.status === "expiré");

      if (!matchesStatus) {
        return false;
      }

      if (!q) {
        return true;
      }

      const car = assurance.car;
      const searchPool = [
        car?.immatriculation,
        car?.marque,
        car?.modele,
        assurance.compagnie,
        assurance.numero_contrat,
      ];

      return searchPool.some((item) => (item || "").toLowerCase().includes(q));
    });
  }, [normalizedAssurances, filter, query]);


  const handleAddNew = () => {
    navigate("/admin/assurances/add");
  };

  const handleEdit = (assurance) => {
    navigate("/admin/assurances/add", { state: { assuranceToEdit: assurance } });
  };

  const formatDate = (value) => {
    if (!value) {
      return "-";
    }
    try {
      const parsed = new Date(value);
      if (Number.isNaN(parsed.getTime())) {
        return value;
      }
      return parsed.toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch (err) {
      return value;
    }
  };

  const buildDeletePayload = (assurance) => {
    if (!assurance) {
      return null;
    }
    const linkedCar = assurance.car || getCarDetails(assurance) || null;
    return {
      id: assurance.id,
      compagnie: assurance.compagnie || "",
      numeroContrat: assurance.numero_contrat || "",
      car: linkedCar,
    };
  };

  const requestDelete = (assurance) => {
    const payload = buildDeletePayload(assurance);
    if (!payload) {
      addNotification("Impossible d'initialiser la suppression", "error");
      return;
    }
    setPendingDelete(payload);
    if (typeof document !== "undefined") {
      document.body.style.overflow = "hidden";
    }
  };

  const closeDeleteModal = () => {
    if (processingDelete) {
      return;
    }
    setPendingDelete(null);
    if (typeof document !== "undefined") {
      document.body.style.overflow = "";
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) {
      return;
    }

    setProcessingDelete(true);
    try {
      await assurancesService.delete(pendingDelete.id);
      setAssurances((prev) => prev.filter((item) => item.id !== pendingDelete.id));
      addNotification({ type: "success", message: "Assurance supprimée" });
    } catch (err) {
      console.error("Erreur suppression assurance:", err);
      addNotification({ type: "error", message: "Suppression impossible" });
    } finally {
      setProcessingDelete(false);
      setPendingDelete(null);
      if (typeof document !== "undefined") {
        document.body.style.overflow = "";
      }
    }
  };

  const handleExport = async () => {
    if (!filtered.length) {
      addNotification("Aucune donnée à exporter", "warning");
      return;
    }

    const rows = filtered.map((assurance) => {
      const statusInfo = getStatus(assurance.date_expiration);
      const car = assurance.car;

      return {
        ID: assurance.id,
        Immatriculation: car?.immatriculation || "-",
        Marque: car?.marque || "-",
        Modele: car?.modele || "-",
        Compagnie: assurance.compagnie || "-",
        Numero_Contrat: assurance.numero_contrat || "-",
        Date_Debut: assurance.date_debut || "-",
        Date_Expiration: assurance.date_expiration || "-",
        Statut: statusInfo.status,
        Jours_Restants: statusInfo.status === "expiré" ? -statusInfo.days : statusInfo.days,
        Montant: assurance.montant || "-",
      };
    });

    try {
      await exportExcel("assurances.xlsx", rows, "Assurances");
      addNotification("Export réussi", "success");
    } catch (err) {
      console.error("Erreur export:", err);
      addNotification("Erreur lors de l'export", "error");
    }
  };

  const pieValues = useMemo(() => [stats.actives, stats.expiring, stats.expirees], [stats]);

  if (loading) {
    return (
      <div className="cars-page">
        <Loader />
      </div>
    );
  }

  return (
    <div className="cars-page">
      <div className="cars-header">
        <div>
          <h1 className="cars-title">🛡️ Assurances</h1>
          <p className="cars-sub">Suivi des assurances automobiles et des échéances critiques</p>
        </div>

        <div className="cars-actions">
          <input
            className="search-input"
            placeholder="Rechercher (immatriculation, compagnie, contrat...)"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <select
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            className="filter-select"
          >
            <option value="all">Tous</option>
            <option value="actives">✅ Actives</option>
            <option value="expiring">⚠️ À renouveler (≤ 15 j)</option>
            <option value="expired">❌ Expirées</option>
          </select>
          <button className="add-button" onClick={handleAddNew}>
            Ajouter
          </button>
          <button className="export-button" onClick={handleExport} title="Exporter la liste">
            Exporter
          </button>
        </div>
      </div>

      <div className="kpis-grid">
        <div className="kpi-card">
          <div className="kpi-content">
            <p className="kpi-label">Montant Total</p>
            <h2 className="kpi-value">
              {stats.montantTotal.toLocaleString("fr-FR", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </h2>
            <p className="kpi-sub">MAD engagés sur les contrats</p>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-content">
            <p className="kpi-label">Assurances Actives</p>
            <h2 className="kpi-value">{stats.actives}</h2>
            <p className="kpi-sub">{stats.total ? ((stats.actives / stats.total) * 100).toFixed(1) : 0}% des dossiers</p>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-content">
            <p className="kpi-label">À Renouveler</p>
            <h2 className="kpi-value">{stats.expiring}</h2>
            <p className="kpi-sub">Expiration ≤ 15 jours</p>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-content">
            <p className="kpi-label">Assurances Expirées</p>
            <h2 className="kpi-value">{stats.expirees}</h2>
            <p className="kpi-sub">Action immédiate requise</p>
          </div>
        </div>
      </div>

      <div className="cars-body">
        {error ? (
          <div className="cars-error">Erreur: {error}</div>
        ) : filtered.length === 0 ? (
          <div className="cars-empty">Aucune assurance trouvée.</div>
        ) : (
          <>
            <div
              className="table-container-autorisation assurances-table"
              style={{ maxHeight: "60vh", overflowY: "auto" }}
            >
              <table className="table-autorisation">
                <thead>
                  <tr>
                    <th>Immatriculation</th>
                    <th>Marque / Modèle</th>
                    <th>Compagnie</th>
                    <th>Date début</th>
                    <th>Date expiration</th>
                    <th>Montant</th>
                    <th>Jours restants</th>
                    <th>Statut</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((assurance) => {
                    const car = assurance.car;
                    const statusInfo = getStatus(assurance.date_expiration);

                    return (
                      <tr key={assurance.id}>
                        <td>
                          <span className="table-chip">{car?.immatriculation || "-"}</span>
                        </td>
                        <td>
                          <div className="assurance-vehicle">
                            <span className="vehicle-name">{car?.marque || "-"} {car?.modele || ""}</span>
                            <span className="vehicle-sub">{assurance.numero_contrat || "-"}</span>
                          </div>
                        </td>
                        <td>{assurance.compagnie || "-"}</td>
                        <td>{formatDate(assurance.date_debut)}</td>
                        <td>{formatDate(assurance.date_expiration)}</td>
                        <td>
                          {assurance.montant ? (
                            <span className="badge badge-amount">
                              {Number(assurance.montant).toLocaleString("fr-FR", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })} MAD
                            </span>
                          ) : (
                            <span className="badge badge-empty">-</span>
                          )}
                        </td>
                        <td>
                          {statusInfo.status === 'expiré' ? (
                            <span className="text-danger">Expiré depuis {statusInfo.days} j</span>
                          ) : (
                            <span>{statusInfo.days} j</span>
                          )}
                        </td>
                        <td>
                          <span className={`badge status-${statusInfo.color}`}>
                            {statusInfo.emoji} {statusInfo.status}
                          </span>
                        </td>
                        <td>
                          <div className="assurances-actions">
                            <button
                              type="button"
                              className="assurance-action-btn action-edit"
                              title="Modifier l'assurance"
                              onClick={() => handleEdit(assurance)}
                            >
                              ✏️
                            </button>
                            <button
                              type="button"
                              className="assurance-action-btn action-delete"
                              title="Supprimer l'assurance"
                              onClick={() => requestDelete(assurance)}
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            
          </>
        )}
      </div>

      {pendingDelete && (
        <div
          className="assurance-modal-overlay"
          role="alertdialog"
          aria-modal="true"
          onClick={closeDeleteModal}
        >
          <div
            className="assurance-confirm-card"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="assurance-confirm-icon">🗑️</div>
            <h3 className="assurance-confirm-title">Supprimer cette assurance ?</h3>
            <p className="assurance-confirm-text">
              Cette action supprimera définitivement l'assurance liée au véhicule
              {" "}
              <strong>
                {pendingDelete.car?.immatriculation
                  ? `${pendingDelete.car.immatriculation}`
                  : pendingDelete.numeroContrat
                    ? `contrat ${pendingDelete.numeroContrat}`
                    : "sélectionné"}
              </strong>
              {" "}et elle ne pourra pas être annulée.
            </p>
            <div className="assurance-confirm-actions">
              <button
                type="button"
                className="assurance-confirm-btn cancel"
                onClick={closeDeleteModal}
                disabled={processingDelete}
              >
                Annuler
              </button>
              <button
                type="button"
                className="assurance-confirm-btn danger"
                onClick={confirmDelete}
                disabled={processingDelete}
              >
                {processingDelete ? "Suppression..." : "Supprimer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Assurances;
