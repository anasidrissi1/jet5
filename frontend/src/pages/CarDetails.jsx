import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import apiClient from "../api/apiClient";
import { useNotification } from "../contexts/NotificationContext";
import Loader from "../components/Loader";
import "../styles/pages.css";
import "../styles/cars.css";
import "../styles/car-details.css";

const STATUS_MAP = {
  libre: { label: "Disponible", color: "#10b981" },
  disponible: { label: "Disponible", color: "#10b981" },
  louee: { label: "Louée", color: "#D4A900" },
  loue: { label: "Louée", color: "#D4A900" },
  reservee: { label: "Réservée", color: "#f59e0b" },
  reserve: { label: "Réservée", color: "#f59e0b" },
  entretien: { label: "Entretien", color: "#D4A900" },
  maintenance: { label: "Maintenance", color: "#D4A900" },
};

const formatMoney = (value) => {
  if (value == null || value === "") return "0,00 MAD";
  const numeric = Number(value);
  return Number.isFinite(numeric)
    ? `${numeric.toLocaleString("fr-MA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MAD`
    : `${value} MAD`;
};

const formatDate = (value) => {
  if (!value) return "—";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? "—"
    : parsed.toLocaleDateString("fr-FR", { year: "numeric", month: "long", day: "numeric" });
};

const msPerDay = 1000 * 60 * 60 * 24;
const getRentalDays = (startDate, endDate) => {
  if (!startDate || !endDate) return 0;
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;

  // Normalise à minuit pour éviter les décalages liés au fuseau
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  const diffDays = Math.floor((end - start) / msPerDay);
  return diffDays >= 0 ? diffDays + 1 : 0;
};

function CarDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addNotification } = useNotification();

  const [car, setCar] = useState(null);
  const [reservations, setReservations] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [carRes, resRes, entRes] = await Promise.all([
          apiClient.get(`/cars/voitures/${id}/`),
          apiClient.get("/reservations/"),
          apiClient.get("/cars/entretiens/"),
        ]);

        setCar(carRes.data);

        const resList = Array.isArray(resRes.data)
          ? resRes.data
          : resRes.data?.results ?? [];

        const carReservations = resList.filter(
          (r) => String(r.voiture) === String(id)
        );
        setReservations(carReservations);

        const entList = Array.isArray(entRes.data)
          ? entRes.data
          : entRes.data?.results ?? [];
        const carEntretien = entList.filter((e) => String(e.voiture) === String(id));
        setExpenses(carEntretien);
      } catch (err) {
        console.error("Erreur chargement:", err);
        addNotification("Erreur lors du chargement des données", "error");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, addNotification]);

  const stats = useMemo(() => {
    if (!reservations.length) {
      return {
        totalRevenus: 0,
        totalImpaye: 0,
        nombreLocations: 0,
        actives: 0,
        terminees: 0,
        avenir: 0,
        moyenneDuree: 0,
        totalJoursLoues: 0,
        tauxPaiement: 0,
      };
    }

    let totalRevenus = 0;
    let totalImpaye = 0;
    let actives = 0;
    let terminees = 0;
    let avenir = 0;
    let totalJours = 0;

    reservations.forEach((r) => {
      const total = Number(r.montant_total) || 0;
      const paid = Math.min(total, Number(r.avance) || 0);
      const rest = Math.max(total - paid, 0);

      totalRevenus += paid;
      totalImpaye += rest;

      const statut = (r.statut || "").toLowerCase();
      if (statut === "en_cours") actives++;
      else if (statut === "termine" || statut === "terminée") terminees++;
      else if (statut === "planifiee" || statut === "planifiée") avenir++;

      totalJours += getRentalDays(r.date_debut, r.date_fin);
    });

    const moyenneDuree = reservations.length > 0 ? Math.round(totalJours / reservations.length) : 0;
    const totalAttendu = totalRevenus + totalImpaye;
    const tauxPaiement = totalAttendu > 0 ? ((totalRevenus / totalAttendu) * 100).toFixed(1) : 100;

    return {
      totalRevenus,
      totalImpaye,
      nombreLocations: reservations.length,
      actives,
      terminees,
      avenir,
      moyenneDuree,
      totalJoursLoues: totalJours,
      tauxPaiement,
    };
  }, [reservations]);

  const expensesTotal = useMemo(() => {
    if (!expenses.length) return 0;
    return expenses.reduce((sum, e) => {
      const cout = Number(e.cout) || 0;
      const main = Number(e.main_oeuvre) || 0;
      return sum + cout + main;
    }, 0);
  }, [expenses]);

  const netResult = useMemo(() => {
    return Number(stats.totalRevenus || 0) - Number(expensesTotal || 0);
  }, [stats.totalRevenus, expensesTotal]);

  const handleNavigateToUnpaid = () => {
    navigate("/admin/payments", {
      state: {
        carFilter: id,
        unpaidOnly: true,
        from: "car-details",
      },
    });
  };

  if (loading) {
    return (
      <div className="cars-page">
        <Loader />
      </div>
    );
  }

  if (!car) {
    return (
      <div className="cars-page">
        <div className="cars-header">
          <h1>Véhicule introuvable</h1>
        </div>
      </div>
    );
  }

  const statusInfo = STATUS_MAP[(car.statut || "").toLowerCase()] || {
    label: car.statut || "Inconnu",
    color: "#6b7280",
  };

  return (
    <div className="cars-page">
      <div className="cars-header">
        <button
          onClick={() => navigate("/admin/cars")}
          className="btn-secondary"
          style={{ marginRight: "auto" }}
        >
          ← Retour aux véhicules
        </button>
        <div style={{ flex: 1 }}>
          <h1 className="cars-title">
            {car.marque} {car.modele}
          </h1>
          <p className="cars-sub">
            {car.immatriculation} • Détails essentiels du véhicule
          </p>
        </div>
        <button
          onClick={() => navigate(`/admin/cars/edit/${car.id}`)}
          className="btn-primary"
        >
          Modifier
        </button>
      </div>

      <div className="cars-body">
        {/* Statut et infos rapides */}
        <div className="car-details-quick-stats">
          <div className="car-details-stat-card">
            <div className="stat-icon" style={{ background: statusInfo.color }}>ST</div>
            <div>
              <div className="stat-label">Statut</div>
              <div className="stat-value" style={{ color: statusInfo.color }}>
                {statusInfo.label}
              </div>
            </div>
          </div>
          <div className="car-details-stat-card">
            <div className="stat-icon" style={{ background: "#D4A900" }}>KM</div>
            <div>
              <div className="stat-label">Kilométrage</div>
              <div className="stat-value">{car.kilometrage || 0} km</div>
            </div>
          </div>
          <div className="car-details-stat-card">
            <div className="stat-icon" style={{ background: "#10b981" }}>MAD</div>
            <div>
              <div className="stat-label">Prix journalier</div>
              <div className="stat-value">{formatMoney(car.prix_journalier)}</div>
            </div>
          </div>
          <div className="car-details-stat-card">
            <div className="stat-icon" style={{ background: "#f59e0b" }}>LOC</div>
            <div>
              <div className="stat-label">Locations totales</div>
              <div className="stat-value">{stats.nombreLocations}</div>
            </div>
          </div>
        </div>

        {/* KPI Financiers essentiels */}
        <div className="car-details-section">
          <h2 className="section-title-large">Synthèse véhicule</h2>
          <div className="car-details-kpi-grid">
            <div className="car-details-kpi-card revenue">
              <div className="kpi-header"><span className="kpi-label">Revenus encaissés</span></div>
              <div className="kpi-value">{formatMoney(stats.totalRevenus)}</div>
              <div className="kpi-footer">{stats.nombreLocations} location{stats.nombreLocations > 1 ? "s" : ""}</div>
            </div>

            <div className="car-details-kpi-card unpaid clickable" onClick={handleNavigateToUnpaid} title="Voir les impayés">
              <div className="kpi-header"><span className="kpi-label">Impayés restants</span></div>
              <div className="kpi-value">{formatMoney(stats.totalImpaye)}</div>
              <div className="kpi-footer">Cliquez pour filtrer les impayés</div>
            </div>

            <div className="car-details-kpi-card neutral">
              <div className="kpi-header"><span className="kpi-label">Dépenses (entretiens)</span></div>
              <div className="kpi-value">{formatMoney(expensesTotal)}</div>
              <div className="kpi-footer">Entretiens enregistrés</div>
            </div>

            <div className="car-details-kpi-card info">
              <div className="kpi-header"><span className="kpi-label">Résultat net</span></div>
              <div className="kpi-value">{formatMoney(netResult)}</div>
              <div className="kpi-footer">Revenus - Dépenses</div>
            </div>

            <div className="car-details-kpi-card neutral">
              <div className="kpi-header"><span className="kpi-label">Statuts locations</span></div>
              <div className="kpi-value">{stats.actives} actives / {stats.terminees} terminées / {stats.avenir} à venir</div>
              <div className="kpi-footer">Suivi rapide</div>
            </div>

            <div className="car-details-kpi-card neutral">
              <div className="kpi-header"><span className="kpi-label">Jours loués cumulés</span></div>
              <div className="kpi-value">{stats.totalJoursLoues || 0} jour{(stats.totalJoursLoues || 0) > 1 ? "s" : ""}</div>
              <div className="kpi-footer">Taux paiement {stats.tauxPaiement}%</div>
            </div>
          </div>
        </div>

        {/* Dépenses entretiens */}
        <div className="car-details-section">
          <h2 className="section-title-large">Dépenses (entretiens)</h2>
          {expenses.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">•</div>
              <p>Aucune dépense d'entretien enregistrée pour ce véhicule</p>
            </div>
          ) : (
            <div className="table-card">
              <table className="car-details-table data-table table-header-sticky">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Montant</th>
                    <th>Main d'oeuvre</th>
                    <th>Total</th>
                    <th>Statut</th>
                    <th>Note</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((e) => {
                    const cout = Number(e.cout) || 0;
                    const main = Number(e.main_oeuvre) || 0;
                    return (
                      <tr key={e.id}>
                        <td>{formatDate(e.date_entretien)}</td>
                        <td>{e.type_entretien || "—"}</td>
                        <td>{formatMoney(cout)}</td>
                        <td>{formatMoney(main)}</td>
                        <td><strong>{formatMoney(cout + main)}</strong></td>
                        <td>{e.statut_entretien || "—"}</td>
                        <td>{e.description || ""}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="table-info" style={{ marginTop: "8px" }}>
                Total dépenses entretien: {formatMoney(expensesTotal)}
              </div>
            </div>
          )}
        </div>

        {/* Historique des locations */}
        <div className="car-details-section">
          <h2 className="section-title-large">Historique des locations</h2>
          {reservations.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">•</div>
              <p>Aucune location enregistrée pour ce véhicule</p>
            </div>
          ) : (
            <div className="table-card">
              <table className="car-details-table data-table table-header-sticky">
                <thead>
                  <tr>
                    <th>Client</th>
                    <th>Période</th>
                    <th>Durée</th>
                    <th>Statut</th>
                    <th>Montant Total</th>
                    <th>Payé</th>
                    <th>Reste</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {reservations.map((r) => {
                    const total = Number(r.montant_total) || 0;
                    const paid = Math.min(total, Number(r.avance) || 0);
                    const rest = Math.max(total - paid, 0);

                    const joursLocation = getRentalDays(r.date_debut, r.date_fin);
                    const duree = joursLocation > 0 ? `${joursLocation} jour${joursLocation > 1 ? "s" : ""}` : "—";

                    return (
                      <tr key={r.id}>
                        <td>
                          <strong>{r.client_nom || `#${r.client}`}</strong>
                          <br />
                          <small>{r.client_telephone || ""}</small>
                        </td>
                        <td>
                          {formatDate(r.date_debut)}
                          <br />
                          <small>→ {formatDate(r.date_fin)}</small>
                        </td>
                        <td>{duree}</td>
                        <td>
                          <span className={`status-badge status-${r.statut}`}>
                            {r.statut || "—"}
                          </span>
                        </td>
                        <td><strong>{formatMoney(total)}</strong></td>
                        <td className="amount-paid">{formatMoney(paid)}</td>
                        <td className={rest > 0 ? "amount-rest-warning" : "amount-rest-muted"}>
                          {formatMoney(rest)}
                        </td>
                        <td>
                          <button
                            onClick={() => navigate(`/admin/reservations/${r.id}`)}
                            className="btn-sm btn-view"
                          >
                            Voir
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Notes */}
        {car.commentaires && (
          <div className="car-details-section">
            <h2 className="section-title-large">Notes et remarques</h2>
            <div className="notes-box">{car.commentaires}</div>
          </div>
        )}
      </div>
    </div>
  );
}

export default CarDetails;
