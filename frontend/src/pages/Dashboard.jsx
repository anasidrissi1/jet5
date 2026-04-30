import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MonthSelector from '../components/common/MonthSelector';
import DashboardSkeleton from '../components/dashboard/DashboardSkeleton';
import { dashboardService } from '../services/dashboardService';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import '../styles/DashboardNew.css';

function Dashboard() {
  const navigate = useNavigate();
  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState({
    stats: {
      revenus_mois: 0,
      depenses_mois: 0,
      benefice_net: 0,
      voitures_disponibles: 0,
      total_voitures: 0,
    },
    reservations: { retours_aujourdhui: [] },
    paiements: { total_en_attente: 0, nombre_en_attente: 0, items: [] },
    alerts: [],
    chart: [],
  });

  useEffect(() => {
    let active = true;

    async function loadDashboard() {
      setLoading(true);
      setError(null);
      try {
        const payload = await dashboardService.getAllStats(selectedMonth, selectedYear);
        if (!active) return;
        setData({
          stats: payload.stats || data.stats,
          reservations: payload.reservations || { retours_aujourdhui: [] },
          paiements: payload.paiements || { total_en_attente: 0, nombre_en_attente: 0, items: [] },
          alerts: Array.isArray(payload.alerts) ? payload.alerts : [],
          chart: Array.isArray(payload.chart) ? payload.chart : [],
        });
      } catch {
        if (!active) return;
        setError('Impossible de charger le dashboard pour le moment.');
      } finally {
        if (active) setLoading(false);
      }
    }

    loadDashboard();
    return () => {
      active = false;
    };
  }, [selectedMonth, selectedYear]);

  const onMonthChange = (month, year) => {
    setSelectedMonth(month);
    setSelectedYear(year);
  };

  const formatCurrency = (value) =>
    new Intl.NumberFormat('fr-MA', {
      style: 'currency',
      currency: 'MAD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Number(value || 0));

  if (loading) return <DashboardSkeleton />;

  if (error) {
    return (
      <div className="dashboard-new">
        <div className="dashboard-new-header">
          <div>
            <h1>Tableau de Bord</h1>
            <p>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-new">
      <div className="dashboard-new-header">
        <div>
          <h1>Tableau de Bord</h1>
          <p>Vue instantanee avec endpoint agrege unique.</p>
        </div>
        <MonthSelector month={selectedMonth} year={selectedYear} onChange={onMonthChange} />
      </div>

      <div className="kpis-grid">
        <div className="kpi-card kpi-revenus">
          <div className="kpi-content">
            <div className="kpi-label">Revenus du mois</div>
            <div className="kpi-value">{formatCurrency(data.stats.revenus_mois)}</div>
          </div>
        </div>

        <div className="kpi-card kpi-depenses">
          <div className="kpi-content">
            <div className="kpi-label">Depenses du mois</div>
            <div className="kpi-value">{formatCurrency(data.stats.depenses_mois)}</div>
          </div>
        </div>

        <div className={`kpi-card ${data.stats.benefice_net >= 0 ? 'kpi-benefice-positive' : 'kpi-benefice-negative'}`}>
          <div className="kpi-content">
            <div className="kpi-label">Benefice net</div>
            <div className="kpi-value">{formatCurrency(data.stats.benefice_net)}</div>
          </div>
        </div>

        <div className="kpi-card kpi-voitures">
          <div className="kpi-content">
            <div className="kpi-label">Voitures disponibles</div>
            <div className="kpi-value">{data.stats.voitures_disponibles}/{data.stats.total_voitures}</div>
          </div>
        </div>
      </div>

      <div className="graph-section">
        <div className="graph-card">
          <div className="graph-header">
            <h2>Evolution Financiere</h2>
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={data.chart} margin={{ top: 20, right: 16, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
              <XAxis dataKey="mois" stroke="var(--text-secondary)" />
              <YAxis stroke="var(--text-secondary)" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  color: 'var(--text-primary)',
                }}
              />
              <Bar dataKey="revenus" fill="var(--color-success)" name="Revenus" />
              <Bar dataKey="depenses" fill="var(--color-danger)" name="Depenses" />
              <Bar dataKey="benefice" fill="var(--color-info)" name="Benefice" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="info-grid">
        <div className="info-column">
          <div className="info-card">
            <div className="info-card-header">
              <h3>Retours aujourd'hui</h3>
              <span className="info-badge">{data.reservations.retours_aujourdhui.length}</span>
            </div>
            <div className="info-card-body">
              {data.reservations.retours_aujourdhui.length === 0 ? (
                <div className="info-empty">Aucun retour aujourd'hui</div>
              ) : (
                <div className="retours-list">
                  {data.reservations.retours_aujourdhui.map((retour) => (
                    <div
                      key={retour.reservation_id}
                      className="retour-item"
                      onClick={() => navigate(`/admin/reservations/edit/${retour.reservation_id}`)}
                    >
                      <div className="retour-info">
                        <div className="retour-voiture">{retour.voiture}</div>
                        <div className="retour-client">{retour.client}</div>
                      </div>
                      <div className="retour-action">→</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="info-column">
          <div className="info-card paiements-card">
            <div className="info-card-header">
              <h3>Paiements en attente</h3>
              <span className="info-badge warning-badge">{data.paiements.nombre_en_attente}</span>
            </div>
            <div className="info-card-body">
              <div className="paiements-total">
                <div className="paiements-total-label">Total a encaisser</div>
                <div className="paiements-total-value">{formatCurrency(data.paiements.total_en_attente)}</div>
                <button className="btn-paiements" onClick={() => navigate('/admin/payments')}>
                  Voir les details →
                </button>
              </div>
            </div>
          </div>

          <div className="info-card">
            <div className="info-card-header">
              <h3>Alertes urgentes</h3>
              <span className="info-badge alert-badge">{data.alerts.length}</span>
            </div>
            <div className="info-card-body">
              {data.alerts.length === 0 ? (
                <div className="info-empty">Aucune alerte</div>
              ) : (
                <div className="alertes-list">
                  {data.alerts.slice(0, 6).map((alert) => (
                    <div key={`${alert.type}-${alert.id || alert.date_expiration}`} className={`alerte-item alerte-${alert.type}`}>
                      <div className="alerte-info">
                        <div className="alerte-title">{alert.titre}</div>
                        <div className="alerte-detail">{alert.voiture}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
