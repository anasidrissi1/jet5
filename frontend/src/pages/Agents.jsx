import React, { useEffect, useMemo, useState } from "react";
import apiClient from "../api/apiClient";
import exportExcel from "../utils/exportExcel";
import "../styles/pages.css";
import "../styles/cars.css";

function Agents() {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let mounted = true;
    const fetchAgents = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiClient.get('/accounts/agents/');
        const payload = res.data;
        const list = Array.isArray(payload) ? payload : payload?.results ?? payload?.items ?? [];
        if (mounted) setAgents(list || []);
      } catch (err) {
        console.error('Erreur lors du chargement des agents :', err);
        setError(err.response?.data?.detail || err.message || 'Erreur réseau');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchAgents();
    return () => { mounted = false; };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return agents;
    return agents.filter(a => (
      (a.nom || '').toLowerCase().includes(q) ||
      (a.telephone_whatsapp || '').toLowerCase().includes(q)
    ));
  }, [agents, query]);

  const handleExport = async () => {
    if (!filtered || filtered.length === 0) return;
    const rows = filtered.map(a => ({
      ID: a.id,
      Nom: a.nom || '',
      Telephone: a.telephone_whatsapp || '',
      Actif: a.actif ? 'Oui' : 'Non',
      Date_creation: a.date_creation ? new Date(a.date_creation).toLocaleDateString() : ''
    }));
    try {
      await exportExcel('agents.xlsx', rows, 'Agents');
    } catch (err) {
      console.error('Erreur export:', err);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cet agent ?')) return;
    try {
      await apiClient.delete(`/accounts/agents/${id}/`);
      setAgents(agents.filter(a => a.id !== id));
    } catch (err) {
      console.error('Erreur suppression:', err);
      alert('Erreur lors de la suppression de l\'agent');
    }
  };

  const toggleActif = async (agent) => {
    try {
      await apiClient.patch(`/accounts/agents/${agent.id}/`, {
        actif: !agent.actif
      });
      setAgents(agents.map(a => 
        a.id === agent.id ? { ...a, actif: !a.actif } : a
      ));
    } catch (err) {
      console.error('Erreur modification:', err);
      alert('Erreur lors de la modification de l\'agent');
    }
  };

  return (
    <div className="cars-page">
      <div className="cars-header">
        <div>
          <h1 className="cars-title">Agents</h1>
          <p className="cars-sub">Gestion des agents/contact</p>
        </div>

        <div className="cars-actions">
          <input
            className="search-input"
            placeholder="Rechercher par nom ou téléphone..."
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          <button className="add-button" onClick={() => window.location.href = '/agents/add'}>
            Ajouter un agent
          </button>
          <button className="export-button" onClick={handleExport} title="Exporter la liste filtrée">
            Exporter
          </button>
        </div>
      </div>

      <div className="cars-body">
        {loading ? (
          <div className="cars-loading">Chargement des agents...</div>
        ) : error ? (
          <div className="cars-error">Erreur: {error}</div>
        ) : filtered.length === 0 ? (
          <div className="cars-empty">Aucun agent trouvé.</div>
        ) : (
          <div className="table-responsive">
            <table className="cars-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nom</th>
                  <th>Téléphone</th>
                  <th>Statut</th>
                  <th>Date création</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(agent => (
                  <tr key={agent.id}>
                    <td>{agent.id}</td>
                    <td>{agent.nom || '-'}</td>
                    <td>{agent.telephone_whatsapp || '-'}</td>
                    <td>
                      <button
                        className={`badge ${agent.actif ? 'status-libre' : 'status-hors_service'}`}
                        onClick={() => toggleActif(agent)}
                        style={{ cursor: 'pointer', border: 'none' }}
                      >
                        {agent.actif ? 'Actif' : 'Inactif'}
                      </button>
                    </td>
                    <td>
                      {agent.date_creation 
                        ? new Date(agent.date_creation).toLocaleDateString() 
                        : '-'
                      }
                    </td>
                    <td>
                      <button
                        className="delete-button"
                        onClick={() => handleDelete(agent.id)}
                        style={{
                          padding: '4px 12px',
                          backgroundColor: '#dc3545',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                      >
                        Supprimer
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default Agents;
