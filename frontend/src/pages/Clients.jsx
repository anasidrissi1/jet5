import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import apiClient from '../api/apiClient';
import { useNotification } from '../contexts/NotificationContext';
import Loader from '../components/Loader';
import exportExcel from '../utils/exportExcel';
import { buildMediaUrl } from '../config/env';
import '../styles/clients-professional.css';

const resolveMediaUrl = (path) => buildMediaUrl(path);

const CLIENT_DOCUMENT_META = {
  cin: { legacyField: 'cin_document', className: 'doc-cin', icon: '🆔', label: 'CIN' },
  permis: { legacyField: 'permis_document', className: 'doc-permis', icon: '🚗', label: 'Permis' },
  passeport: { legacyField: 'passeport_document', className: 'doc-passeport', icon: '✈️', label: 'Passeport' },
};

const getClientDocuments = (client, type) => {
  const meta = CLIENT_DOCUMENT_META[type];
  if (!meta) {
    return [];
  }

  const documents = [];
  const seen = new Set();
  const pushDocument = (path) => {
    if (!path) {
      return;
    }
    const url = resolveMediaUrl(path);
    if (seen.has(url)) {
      return;
    }
    seen.add(url);
    documents.push({
      url,
      className: meta.className,
      icon: meta.icon,
      label: meta.label,
    });
  };

  pushDocument(client[meta.legacyField]);
  (client.documents || [])
    .filter((document) => document.document_type === type)
    .forEach((document) => pushDocument(document.file));

  return documents;
};

const getAllClientDocuments = (client) => [
  ...getClientDocuments(client, 'cin'),
  ...getClientDocuments(client, 'permis'),
  ...getClientDocuments(client, 'passeport'),
];

const QRCodeModal = ({ isOpen, onClose }) => {
  const qrRef = useRef(null);

  if (!isOpen) return null;

  const inscriptionUrl = `${window.location.origin}/inscription`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inscriptionUrl);
    alert('Lien copie !');
  };

  const handlePrint = () => {
    const svgElement = qrRef.current?.querySelector('svg');
    const svgData = svgElement ? new XMLSerializer().serializeToString(svgElement) : '';
    const svgBase64 = svgData ? btoa(unescape(encodeURIComponent(svgData))) : '';
    const svgUrl = svgBase64 ? `data:image/svg+xml;base64,${svgBase64}` : '';

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head><title>QR Code Inscription - JET5</title></head>
        <body style="font-family: Arial, sans-serif; display:flex; justify-content:center; align-items:center; min-height:100vh; margin:0; background:#f5f5f5;">
          <div style="background:#fff; border-radius:16px; padding:24px; text-align:center; box-shadow:0 8px 24px rgba(0,0,0,.12); max-width:420px; width:92%;">
            <h2 style="margin-top:0;">QR Code Inscription Client</h2>
            <div style="width:220px; height:220px; margin:0 auto 14px; display:flex; align-items:center; justify-content:center; border:1px solid #ddd; border-radius:12px;">
              ${svgUrl ? `<img src="${svgUrl}" alt="QR Code" style="width:200px;height:200px;" />` : '<p>QR Code</p>'}
            </div>
            <p style="font-size:12px; color:#666; word-break:break-all; margin:0;">${inscriptionUrl}</p>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 250);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.65)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#1a1a2e',
          borderRadius: '18px',
          padding: '24px',
          width: '92%',
          maxWidth: '440px',
          textAlign: 'center',
          border: '1px solid #3a3a5c',
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <h3 style={{ color: '#fff', marginTop: 0 }}>QR Code Inscription</h3>
        <p style={{ color: '#a0a0c0', fontSize: '13px' }}>Utilisez ce QR code pour inscrire un client.</p>

        <div
          ref={qrRef}
          style={{
            width: '220px',
            height: '220px',
            background: '#fff',
            margin: '0 auto 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '14px',
          }}
        >
          <QRCodeSVG value={inscriptionUrl} size={190} level="H" includeMargin={false} fgColor="#1a1a2e" bgColor="#ffffff" />
        </div>

        <div style={{ color: '#D4A900', fontSize: '12px', wordBreak: 'break-all', marginBottom: '16px' }}>{inscriptionUrl}</div>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button className="btn-export" onClick={handlePrint}>Imprimer</button>
          <button className="btn-export" onClick={handleCopyLink}>Copier lien</button>
          <button className="btn-export" onClick={onClose}>Fermer</button>
        </div>
      </div>
    </div>
  );
};

// Composant Section Demandes en Attente
const PendingRequestsSection = ({ onRefresh }) => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedRequest, setExpandedRequest] = useState(null);
  const [editData, setEditData] = useState({});
  const { addNotification } = useNotification();

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const response = await apiClient.get('/clients/requests/');
      setRequests(Array.isArray(response.data) ? response.data : response.data.results || []);
    } catch (err) {
      console.error('Error fetching requests:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (request) => {
    try {
      const dataToSend = editData[request.id] || {};
      await apiClient.post(`/clients/requests/${request.id}/approve/`, dataToSend);
      addNotification(`Client ${request.nom} ${request.prenom} validé avec succès !`, 'success');
      fetchRequests();
      onRefresh();
    } catch (err) {
      console.error('Error approving request:', err);
      addNotification('Erreur lors de la validation', 'error');
    }
  };

  const handleReject = async (request) => {
    if (!window.confirm(`Refuser la demande de ${request.nom} ${request.prenom} ?`)) return;
    
    try {
      await apiClient.post(`/clients/requests/${request.id}/reject/`);
      addNotification('Demande refusée', 'info');
      fetchRequests();
    } catch (err) {
      console.error('Error rejecting request:', err);
      addNotification('Erreur lors du refus', 'error');
    }
  };

  const handleEditField = (requestId, field, value) => {
    setEditData(prev => ({
      ...prev,
      [requestId]: {
        ...(prev[requestId] || {}),
        [field]: value
      }
    }));
  };

  const getFieldValue = (request, field) => {
    return editData[request.id]?.[field] ?? request[field] ?? '';
  };

  if (loading) return null;
  if (requests.length === 0) return null;

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
      border: '2px solid rgba(102, 126, 234, 0.3)',
      borderRadius: '16px',
      padding: '20px',
      marginBottom: '24px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ margin: 0, color: '#D4A900', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{
            background: '#D4A900',
            color: '#fff',
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '14px',
            fontWeight: 'bold'
          }}>
            {requests.length}
          </span>
          Demandes d'inscription en attente
        </h3>
        <button onClick={fetchRequests} style={{
          background: 'transparent',
          border: 'none',
          color: '#D4A900',
          cursor: 'pointer',
          fontSize: '18px'
        }} title="Rafraîchir">
          🔄
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {requests.map(request => (
          <div key={request.id} style={{
            background: '#1a1a2e',
            borderRadius: '12px',
            border: '1px solid #3a3a5c',
            overflow: 'hidden'
          }}>
            {/* Header de la demande */}
            <div 
              style={{
                padding: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer'
              }}
              onClick={() => setExpandedRequest(expandedRequest === request.id ? null : request.id)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{
                  width: '50px',
                  height: '50px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #D4A900 0%, #B8900A 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontWeight: 'bold',
                  fontSize: '18px'
                }}>
                  {(request.nom?.[0] || '?').toUpperCase()}{(request.prenom?.[0] || '?').toUpperCase()}
                </div>
                <div>
                  <div style={{ color: '#fff', fontWeight: '600', fontSize: '16px' }}>
                    {request.nom} {request.prenom}
                  </div>
                  <div style={{ color: '#a0a0c0', fontSize: '13px', display: 'flex', gap: '16px', marginTop: '4px' }}>
                    <span>📞 {request.telephone || 'N/A'}</span>
                    <span>🆔 {request.cin_numero || 'N/A'}</span>
                  </div>
                </div>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ color: '#a0a0c0', fontSize: '12px' }}>
                  {new Date(request.date_creation).toLocaleDateString('fr-FR')}
                </span>
                <span style={{ color: '#D4A900', fontSize: '20px' }}>
                  {expandedRequest === request.id ? '▲' : '▼'}
                </span>
              </div>
            </div>

            {/* Détails expandés */}
            {expandedRequest === request.id && (
              <div style={{ padding: '0 16px 16px', borderTop: '1px solid #3a3a5c' }}>
                <div style={{ paddingTop: '16px' }}>
                  <h4 style={{ color: '#FDE68A', margin: '0 0 12px', fontSize: '14px' }}>
                    ✏️ Vérifier et modifier si nécessaire :
                  </h4>
                  
                  <div className="responsive-grid-220" style={{ gap: '12px', marginBottom: '16px' }}>
                    {[
                      { key: 'nom', label: 'Nom' },
                      { key: 'prenom', label: 'Prénom' },
                      { key: 'email', label: 'Email' },
                      { key: 'telephone', label: 'Téléphone' },
                      { key: 'cin_numero', label: 'CIN' },
                      { key: 'permis_numero', label: 'Permis' }
                    ].map(field => (
                      <div key={field.key}>
                        <label style={{ display: 'block', color: '#a0a0c0', fontSize: '12px', marginBottom: '4px' }}>
                          {field.label}
                        </label>
                        <input
                          type="text"
                          value={getFieldValue(request, field.key)}
                          onChange={(e) => handleEditField(request.id, field.key, e.target.value)}
                          style={{
                            width: '100%',
                            padding: '10px 12px',
                            background: '#0f0f1a',
                            border: '1px solid #3a3a5c',
                            borderRadius: '8px',
                            color: '#fff',
                            fontSize: '14px',
                            boxSizing: 'border-box'
                          }}
                        />
                      </div>
                    ))}
                  </div>

                  {/* Documents */}
                  <div style={{ marginBottom: '16px' }}>
                    <h4 style={{ color: '#6ee7b7', margin: '0 0 8px', fontSize: '14px' }}>📄 Documents soumis :</h4>
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                      {request.cin_document && (
                        <a href={resolveMediaUrl(request.cin_document)} target="_blank" rel="noopener noreferrer"
                          style={{
                            padding: '8px 16px',
                            background: 'rgba(59, 130, 246, 0.2)',
                            border: '1px solid rgba(59, 130, 246, 0.4)',
                            borderRadius: '8px',
                            color: '#FDE68A',
                            textDecoration: 'none',
                            fontSize: '13px'
                          }}>
                          🆔 Voir CIN
                        </a>
                      )}
                      {request.permis_document && (
                        <a href={resolveMediaUrl(request.permis_document)} target="_blank" rel="noopener noreferrer"
                          style={{
                            padding: '8px 16px',
                            background: 'rgba(16, 185, 129, 0.2)',
                            border: '1px solid rgba(16, 185, 129, 0.4)',
                            borderRadius: '8px',
                            color: '#6ee7b7',
                            textDecoration: 'none',
                            fontSize: '13px'
                          }}>
                          🚗 Voir Permis
                        </a>
                      )}
                      {request.passeport_document && (
                        <a href={resolveMediaUrl(request.passeport_document)} target="_blank" rel="noopener noreferrer"
                          style={{
                            padding: '8px 16px',
                            background: 'rgba(168, 85, 247, 0.2)',
                            border: '1px solid rgba(168, 85, 247, 0.4)',
                            borderRadius: '8px',
                            color: '#c4b5fd',
                            textDecoration: 'none',
                            fontSize: '13px'
                          }}>
                          ✈️ Voir Passeport
                        </a>
                      )}
                      {!request.cin_document && !request.permis_document && !request.passeport_document && (
                        <span style={{ color: '#a0a0c0', fontSize: '13px' }}>Aucun document soumis</span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                    <button onClick={() => handleReject(request)} style={{
                      padding: '10px 20px',
                      background: 'rgba(245, 196, 0, 0.2)',
                      border: '1px solid rgba(245, 196, 0, 0.4)',
                      borderRadius: '8px',
                      color: '#FDE68A',
                      fontWeight: '600',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}>
                      ❌ Refuser
                    </button>
                    <button onClick={() => handleApprove(request)} style={{
                      padding: '10px 20px',
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      border: 'none',
                      borderRadius: '8px',
                      color: '#fff',
                      fontWeight: '600',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}>
                      ✅ Valider et Créer
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

function Clients() {
  const navigate = useNavigate();
  const { addNotification } = useNotification();
  
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [user, setUser] = useState(null);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'table'
  const [showQRModal, setShowQRModal] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUser(payload);
      } catch {
        // ignore malformed token
      }
    }
  }, []);

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    setLoading(true);
    setError(null);
    try {
      const fetchAllClients = async () => {
        const allItems = [];
        let page = 1;
        let hasNext = true;
        const MAX_PAGES = 200;

        while (hasNext && page <= MAX_PAGES) {
          const response = await apiClient.get('/clients/', {
            params: { page, page_size: 100 },
          });
          const payload = response.data;

          if (Array.isArray(payload)) {
            return payload;
          }

          const pageItems = Array.isArray(payload?.results)
            ? payload.results
            : Array.isArray(payload?.items)
              ? payload.items
              : [];
          allItems.push(...pageItems);

          hasNext = Boolean(payload?.next);
          page += 1;
        }

        return allItems;
      };

      const clientsList = await fetchAllClients();
      setClients(clientsList || []);
    } catch (err) {
      console.error('Error fetching clients:', err);
      const errorMsg = err.response?.data?.detail || err.message || 'Erreur réseau';
      setError(errorMsg);
      addNotification(errorMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredClients = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return clients;
    
    return clients.filter(client => 
      (client.nom || '').toLowerCase().includes(q) ||
      (client.prenom || '').toLowerCase().includes(q) ||
      (client.email || '').toLowerCase().includes(q) ||
      (client.telephone || '').toLowerCase().includes(q) ||
      (client.cin_numero || '').toLowerCase().includes(q) ||
      (client.permis_numero || '').toLowerCase().includes(q)
    );
  }, [clients, search]);

  const handleDelete = async (id) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce client ? Cette action est irréversible.')) {
      try {
        await apiClient.delete(`/clients/${id}/`);
        addNotification('Client supprimé avec succès', 'success');
        fetchClients();
      } catch (err) {
        console.error('Error deleting client:', err);
        addNotification('Erreur lors de la suppression du client', 'error');
      }
    }
  };

  const handleExport = async () => {
    if (!filteredClients || filteredClients.length === 0) {
      addNotification('Aucune donnée à exporter', 'warning');
      return;
    }
    
    const rows = filteredClients.map(client => ({
      Nom: client.nom || '',
      Prénom: client.prenom || '',
      Email: client.email || '',
      Téléphone: client.telephone || '',
      Adresse: client.adresse || '',
      CIN: client.cin_numero || '',
      Permis: client.permis_numero || '',
      Passeport: client.passeport_numero || '',
      Date_Création: client.date_creation ? new Date(client.date_creation).toLocaleDateString() : ''
    }));
    
    try {
      await exportExcel('clients.xlsx', rows, 'Clients');
      addNotification('Export réussi', 'success');
    } catch (err) {
      console.error('Erreur export:', err);
      addNotification('Erreur lors de l\'export', 'error');
    }
  };

  const getInitials = (nom, prenom) => {
    const n = (nom || '').charAt(0).toUpperCase();
    const p = (prenom || '').charAt(0).toUpperCase();
    return n + p || '??';
  };

  const getAvatarColor = (id) => {
    const colors = [
      '#0f766e', '#B8900A', '#F5C400', '#ea580c', 
      '#0891b2', '#D4A900', '#D4A900', '#0d9488'
    ];
    return colors[id % colors.length];
  };

  if (loading) {
    return (
      <div className="clients-professional-page">
        <Loader />
      </div>
    );
  }

  return (
    <div className="clients-professional-page">
      {/* Header */}
      <div className="clients-header">
        <div className="header-left">
          <h1 className="page-title">
            <span className="title-icon">👥</span>
            Gestion des Clients
          </h1>
          <p className="page-subtitle">
            {filteredClients.length} client{filteredClients.length > 1 ? 's' : ''} • 
            {clients.filter(c => c.cin_document || c.permis_document || c.passeport_document).length} avec documents
          </p>
        </div>

        <div className="header-actions">
          <div className="view-toggle">
            <button 
              className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Vue grille"
            >
              ⊞
            </button>
            <button 
              className={`view-btn ${viewMode === 'table' ? 'active' : ''}`}
              onClick={() => setViewMode('table')}
              title="Vue tableau"
            >
              ☰
            </button>
          </div>

          <button
            className="btn-export"
            onClick={() => setShowQRModal(true)}
            style={{ background: 'linear-gradient(135deg, #D4A900 0%, #B8900A 100%)' }}
          >
            QR Inscription
          </button>
          
          <button className="btn-export" onClick={handleExport}>
            📊 Exporter
          </button>
          
          <button className="btn-add" onClick={() => navigate('/admin/clients/add')}>
            ➕ Nouveau Client
          </button>
        </div>
      </div>

      {/* Section des demandes en attente */}
      <PendingRequestsSection onRefresh={fetchClients} />

      {/* Search Bar */}
      <div className="search-section">
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            className="search-input-pro"
            placeholder="Rechercher par nom, email, téléphone, CIN, permis..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button className="search-clear" onClick={() => setSearch('')}>
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="clients-content">
        {error ? (
          <div className="error-state">
            <span className="error-icon">⚠️</span>
            <p>Erreur: {error}</p>
            <button className="btn-retry" onClick={fetchClients}>Réessayer</button>
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">👥</span>
            <h3>Aucun client trouvé</h3>
            <p>Commencez par ajouter votre premier client</p>
            <button className="btn-add-empty" onClick={() => navigate('/admin/clients/add')}>
              ➕ Ajouter un Client
            </button>
          </div>
        ) : (
          <>
            {viewMode === 'grid' ? (
              <div className="clients-grid">
                {filteredClients.map((client) => (
                  (() => {
                    const documents = getAllClientDocuments(client);
                    return (
                  <div key={client.id} className="client-card">
                    <div className="card-header">
                      <div 
                        className="client-avatar"
                        style={{ background: getAvatarColor(client.id) }}
                      >
                        {getInitials(client.nom, client.prenom)}
                      </div>
                      <div className="client-info">
                        <h3 className="client-name">{client.nom} {client.prenom}</h3>
                        <p className="client-email">{client.email || 'Pas d\'email'}</p>
                      </div>
                    </div>

                    <div className="card-body">
                      <div className="info-row">
                        <span className="info-icon">📞</span>
                        <span className="info-text">{client.telephone || 'Pas de téléphone'}</span>
                      </div>
                      
                      <div className="info-row">
                        <span className="info-icon">🆔</span>
                        <span className="info-text">{client.cin_numero || 'Pas de CIN'}</span>
                      </div>
                      
                      <div className="info-row">
                        <span className="info-icon">🚗</span>
                        <span className="info-text">{client.permis_numero || 'Pas de permis'}</span>
                      </div>

                      {client.adresse && (
                        <div className="info-row">
                          <span className="info-icon">📍</span>
                          <span className="info-text">{client.adresse}</span>
                        </div>
                      )}

                      <div className="documents-section">
                        <p className="documents-label">Documents:</p>
                        <div className="documents-badges">
                          {documents.map((document, index) => (
                            <a
                              key={`${document.label}-${index}`}
                              href={document.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`doc-badge ${document.className}`}
                            >
                              {document.icon} {document.label}
                            </a>
                          ))}
                          {documents.length === 0 && (
                            <span className="no-docs">Aucun document</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="card-footer">
                      <button
                        className="btn-card btn-edit"
                        onClick={() => navigate(`/admin/clients/edit/${client.id}`)}
                      >
                        ✏️ Modifier
                      </button>
                      {user?.is_staff && (
                        <button
                          className="btn-card btn-delete"
                          onClick={() => handleDelete(client.id)}
                        >
                          🗑️ Supprimer
                        </button>
                      )}
                    </div>
                  </div>
                    );
                  })()
                ))}
              </div>
            ) : (
              <div
                className="clients-table-container"
                style={{ maxHeight: '60vh', overflowY: 'auto' }}
              >
                <table className="clients-table">
                  <thead>
                    <tr>
                      <th>Client</th>
                      <th>Contact</th>
                      <th>Identité</th>
                      <th>Documents</th>
                      <th>Date Création</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredClients.map((client) => (
                      (() => {
                        const documents = getAllClientDocuments(client);
                        return (
                      <tr key={client.id}>
                        <td>
                          <div className="table-client-info">
                            <div 
                              className="table-avatar"
                              style={{ background: getAvatarColor(client.id) }}
                            >
                              {getInitials(client.nom, client.prenom)}
                            </div>
                            <div>
                              <div className="table-name">{client.nom} {client.prenom}</div>
                              <div className="table-email">{client.email || '-'}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="table-contact">
                            <div>📞 {client.telephone || '-'}</div>
                            {client.adresse && <div className="table-address">📍 {client.adresse}</div>}
                          </div>
                        </td>
                        <td>
                          <div className="table-identity">
                            <div>🆔 {client.cin_numero || '-'}</div>
                            <div>🚗 {client.permis_numero || '-'}</div>
                          </div>
                        </td>
                        <td>
                          <div className="table-documents">
                            {documents.map((document, index) => (
                              <a key={`${document.label}-table-${index}`} href={document.url} target="_blank" rel="noopener noreferrer" className={`doc-badge ${document.className}`} title={document.label}>
                                {document.icon}
                              </a>
                            ))}
                            {documents.length === 0 && (
                              <span className="no-docs-table">-</span>
                            )}
                          </div>
                        </td>
                        <td>
                          {client.date_creation 
                            ? new Date(client.date_creation).toLocaleDateString('fr-FR')
                            : '-'}
                        </td>
                        <td>
                          <div className="table-actions">
                            <button
                              className="btn-table btn-edit-table"
                              onClick={() => navigate(`/admin/clients/edit/${client.id}`)}
                              title="Modifier"
                            >
                              ✏️
                            </button>
                            {user?.is_staff && (
                              <button
                                className="btn-table btn-delete-table"
                                onClick={() => handleDelete(client.id)}
                                title="Supprimer"
                              >
                                🗑️
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                        );
                      })()
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      <QRCodeModal isOpen={showQRModal} onClose={() => setShowQRModal(false)} />
    </div>
  );
}

export default Clients;
