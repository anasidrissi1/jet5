import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/apiClient';
import './SearchModal.css';

const SearchModal = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({
    clients: [],
    voitures: [],
    reservations: []
  });
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  const handleSelectResult = useCallback((result) => {
    switch (result.type) {
      case 'client':
        navigate(`/admin/clients/edit/${result.data.id}`);
        break;
      case 'voiture':
        navigate(`/admin/cars/edit/${result.data.id}`);
        break;
      case 'reservation':
        navigate(`/admin/reservations/edit/${result.data.id}`);
        break;
      default:
        break;
    }
    onClose();
  }, [navigate, onClose]);

  // Focus input quand le modal s'ouvre
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      setQuery('');
      setResults({ clients: [], voitures: [], reservations: [] });
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Recherche avec debounce
  useEffect(() => {
    if (!query || query.length < 2) {
      setResults({ clients: [], voitures: [], reservations: [] });
      return;
    }

    const timer = setTimeout(async () => {
      await performSearch(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const performSearch = async (searchQuery) => {
    setLoading(true);
    try {
      const response = await apiClient.get(`/dashboard/search/?q=${encodeURIComponent(searchQuery)}`);
      setResults(response.data);
    } catch (error) {
      console.error('Erreur recherche:', error);
      setResults({ clients: [], voitures: [], reservations: [] });
    } finally {
      setLoading(false);
    }
  };

  // Gérer les touches clavier
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;

      const allResults = [
        ...results.clients.map(c => ({ type: 'client', data: c })),
        ...results.voitures.map(v => ({ type: 'voiture', data: v })),
        ...results.reservations.map(r => ({ type: 'reservation', data: r }))
      ];

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % Math.max(allResults.length, 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + allResults.length) % Math.max(allResults.length, 1));
      } else if (e.key === 'Enter' && allResults[selectedIndex]) {
        e.preventDefault();
        handleSelectResult(allResults[selectedIndex]);
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex, handleSelectResult, onClose]);

  const totalResults = results.clients.length + results.voitures.length + results.reservations.length;

  if (!isOpen) return null;

  return (
    <>
      <div className="search-overlay" onClick={onClose} />
      <div className="search-modal">
        <div className="search-header">
          <div className="search-input-wrapper">
            <input
              ref={inputRef}
              type="text"
              className="search-input"
              placeholder="Rechercher client, voiture, réservation..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <span className="search-shortcut">ESC pour fermer</span>
          </div>
        </div>

        <div className="search-results">
          {loading && (
            <div className="search-loading">
              <div className="spinner"></div>
              <span>Recherche en cours...</span>
            </div>
          )}

          {!loading && query.length > 0 && query.length < 2 && (
            <div className="search-hint">
              Tapez au moins 2 caractères pour rechercher
            </div>
          )}

          {!loading && query.length >= 2 && totalResults === 0 && (
            <div className="search-empty">
              <div className="empty-icon">🔍</div>
              <p>Aucun résultat pour "{query}"</p>
              <span className="empty-hint">Essayez avec un nom, téléphone ou immatriculation</span>
            </div>
          )}

          {!loading && totalResults > 0 && (
            <>
              {/* Clients */}
              {results.clients.length > 0 && (
                <div className="results-section">
                  <div className="results-header">
                    <span className="results-icon">👤</span>
                    <h3>Clients ({results.clients.length})</h3>
                  </div>
                  <div className="results-list">
                    {results.clients.map((client, index) => {
                      const globalIndex = index;
                      return (
                        <div
                          key={client.id}
                          className={`result-item ${selectedIndex === globalIndex ? 'selected' : ''}`}
                          onClick={() => handleSelectResult({ type: 'client', data: client })}
                        >
                          <div className="result-icon">👤</div>
                          <div className="result-content">
                            <div className="result-title">{client.nom} {client.prenom}</div>
                            <div className="result-subtitle">📞 {client.telephone}</div>
                            {client.email && <div className="result-detail">📧 {client.email}</div>}
                          </div>
                          <div className="result-action">→</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Voitures */}
              {results.voitures.length > 0 && (
                <div className="results-section">
                  <div className="results-header">
                    <span className="results-icon">🚗</span>
                    <h3>Voitures ({results.voitures.length})</h3>
                  </div>
                  <div className="results-list">
                    {results.voitures.map((voiture, index) => {
                      const globalIndex = results.clients.length + index;
                      return (
                        <div
                          key={voiture.id}
                          className={`result-item ${selectedIndex === globalIndex ? 'selected' : ''}`}
                          onClick={() => handleSelectResult({ type: 'voiture', data: voiture })}
                        >
                          <div className="result-icon">🚗</div>
                          <div className="result-content">
                            <div className="result-title">{voiture.marque} {voiture.modele}</div>
                            <div className="result-subtitle">🔢 {voiture.immatriculation}</div>
                            <div className="result-detail">
                              <span className={`status-badge status-${voiture.statut}`}>
                                {voiture.statut === 'libre' ? '🟢 Disponible' :
                                 voiture.statut === 'louee' ? '🔴 Louée' :
                                 voiture.statut === 'entretien' ? '🟡 Entretien' :
                                 '⚫ Hors service'}
                              </span>
                            </div>
                          </div>
                          <div className="result-action">→</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Réservations */}
              {results.reservations.length > 0 && (
                <div className="results-section">
                  <div className="results-header">
                    <span className="results-icon">📄</span>
                    <h3>Réservations ({results.reservations.length})</h3>
                  </div>
                  <div className="results-list">
                    {results.reservations.map((reservation, index) => {
                      const globalIndex = results.clients.length + results.voitures.length + index;
                      return (
                        <div
                          key={reservation.id}
                          className={`result-item ${selectedIndex === globalIndex ? 'selected' : ''}`}
                          onClick={() => handleSelectResult({ type: 'reservation', data: reservation })}
                        >
                          <div className="result-icon">📄</div>
                          <div className="result-content">
                            <div className="result-title">#{reservation.id} - {reservation.client_nom}</div>
                            <div className="result-subtitle">🚗 {reservation.voiture_immatriculation}</div>
                            <div className="result-detail">
                              📅 {new Date(reservation.date_debut).toLocaleDateString('fr-FR')} → {new Date(reservation.date_fin).toLocaleDateString('fr-FR')}
                            </div>
                          </div>
                          <div className="result-action">→</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="search-footer">
          <div className="search-tips">
            <span className="tip">
              <kbd>↑</kbd> <kbd>↓</kbd> Naviguer
            </span>
            <span className="tip">
              <kbd>Enter</kbd> Ouvrir
            </span>
            <span className="tip">
              <kbd>ESC</kbd> Fermer
            </span>
          </div>
        </div>
      </div>
    </>
  );
};

export default SearchModal;
