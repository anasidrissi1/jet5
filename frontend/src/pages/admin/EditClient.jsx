import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { clientsService } from '../../services/api';
import { useNotification } from '../../contexts/NotificationContext';
import Loader from '../../components/Loader';
import PageHeader from '../../components/PageHeader';
import FormInput from '../../components/FormInput';
import DocumentUploadField from '../../components/DocumentUploadField';
import { buildMediaUrl } from '../../config/env';
const resolveMediaUrl = (path) => buildMediaUrl(path);

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];

const getDocumentName = (path) => {
  if (!path) {
    return '';
  }
  const normalized = String(path).split('/').pop() || String(path);
  return decodeURIComponent(normalized);
};

const buildExistingDocuments = (data) => {
  const grouped = {
    cin_documents: [],
    permis_documents: [],
    passeport_documents: [],
  };

  (data.documents || []).forEach((document) => {
    const key = `${document.document_type}_documents`;
    if (grouped[key]) {
      grouped[key].push({
        id: `extra-${document.id}`,
        url: resolveMediaUrl(document.file),
        name: getDocumentName(document.file),
      });
    }
  });

  [
    ['cin_document', 'cin_documents'],
    ['permis_document', 'permis_documents'],
    ['passeport_document', 'passeport_documents'],
  ].forEach(([legacyKey, targetKey]) => {
    const legacyValue = data[legacyKey];
    if (!legacyValue) {
      return;
    }
    const url = resolveMediaUrl(legacyValue);
    if (grouped[targetKey].some((item) => item.url === url)) {
      return;
    }
    grouped[targetKey].unshift({
      id: `legacy-${legacyKey}`,
      url,
      name: getDocumentName(legacyValue),
    });
  });

  return grouped;
};

function EditClient() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { addNotification } = useNotification();
  
  const [form, setForm] = useState({
    nom: '',
    prenom: '',
    email: '',
    telephone: '',
    adresse: '',
    cin_numero: '',
    cin_date_expiration: '',
    permis_numero: '',
    permis_date_delivrance: '',
    passeport_numero: '',
    passeport_date_entree: '',
    passeport_date_sortie: ''
  });

  const [files, setFiles] = useState({
    cin_documents: [],
    permis_documents: [],
    passeport_documents: []
  });

  const [existingFiles, setExistingFiles] = useState({
    cin_documents: [],
    permis_documents: [],
    passeport_documents: []
  });

  const [fileNames, setFileNames] = useState({
    cin_documents: [],
    permis_documents: [],
    passeport_documents: []
  });

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchClient();
  }, [id]);

  const fetchClient = async () => {
    try {
      const response = await clientsService.get(id);
      const data = response.data;
      setForm({
        nom: data.nom || '',
        prenom: data.prenom || '',
        email: data.email || '',
        telephone: data.telephone || '',
        adresse: data.adresse || '',
        cin_numero: data.cin_numero || '',
        cin_date_expiration: data.cin_date_expiration || '',
        permis_numero: data.permis_numero || '',
        permis_date_delivrance: data.permis_date_delivrance || '',
        passeport_numero: data.passeport_numero || '',
        passeport_date_entree: data.passeport_date_entree || '',
        passeport_date_sortie: data.passeport_date_sortie || ''
      });
      setExistingFiles(buildExistingDocuments(data));
      setLoading(false);
    } catch (err) {
      console.error('Erreur:', err);
      addNotification('Erreur lors du chargement du client', 'error');
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e, fieldName) => {
    const selectedFiles = Array.from(e.target.files || []);

    if (selectedFiles.length === 0) {
      return;
    }

    const validFiles = [];
    selectedFiles.forEach((file) => {
      if (file.size > MAX_FILE_SIZE) {
        addNotification(`${file.name} est trop volumineux (max 5MB)`, 'error');
        return;
      }
      if (!ALLOWED_TYPES.includes(file.type)) {
        addNotification(`${file.name} a un format non supporté`, 'error');
        return;
      }
      validFiles.push(file);
    });

    e.target.value = '';

    if (validFiles.length === 0) {
      return;
    }

    setFiles(prev => ({
      ...prev,
      [fieldName]: [...prev[fieldName], ...validFiles]
    }));

    setFileNames(prev => ({
      ...prev,
      [fieldName]: [...prev[fieldName], ...validFiles.map((file) => file.name)]
    }));
  };

  const removeFile = (fieldName, indexToRemove) => {
    setFiles(prev => ({
      ...prev,
      [fieldName]: prev[fieldName].filter((_, index) => index !== indexToRemove)
    }));
    setFileNames(prev => ({
      ...prev,
      [fieldName]: prev[fieldName].filter((_, index) => index !== indexToRemove)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const formData = new FormData();
      
      // Ajouter les champs texte
      Object.keys(form).forEach(key => {
        if (form[key]) {
          formData.append(key, form[key]);
        }
      });
      
      // Ajouter les nouveaux fichiers
      Object.keys(files).forEach(key => {
        files[key].forEach((file) => {
          formData.append(key, file);
        });
      });

      await clientsService.update(id, formData);

      addNotification('Client modifié avec succès!', 'success');
      navigate('/admin/clients');
    } catch (err) {
      console.error('Erreur:', err);
      const errorMsg = err.response?.data?.detail || err.response?.data?.error || err.message || 'Erreur lors de la modification du client';
      addNotification(errorMsg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Styles formulaire (light mode)
  const sectionStyle = {
    marginBottom: '2rem',
    padding: '1.5rem',
    background: 'var(--gray-50)',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--border-color)'
  };

  const labelStyle = {
    display: 'block',
    marginBottom: '0.5rem',
    fontWeight: '600',
    color: 'var(--text-primary)',
    fontSize: '14px'
  };

  const sectionTitleStyle = {
    marginBottom: '1rem',
    color: 'var(--text-primary)',
    fontSize: 'var(--font-size-md)',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  };

  const inputStyle = {
    width: '100%',
    padding: '12px 16px',
    border: '2px solid var(--border-color)',
    borderRadius: '10px',
    fontSize: '15px',
    outline: 'none',
    background: '#ffffff',
    color: 'var(--text-primary)',
    boxSizing: 'border-box'
  };

  const hintStyle = {
    display: 'block',
    marginTop: '0.5rem',
    color: 'var(--text-tertiary)',
    fontSize: '12px'
  };

  if (loading) {
    return (
      <div className="cars-page">
        <Loader />
      </div>
    );
  }

  return (
    <div className="cars-page">
      <PageHeader
        title="✏️ Modifier un Client"
        subtitle="Modifiez les informations du client"
        backUrl="/admin/clients"
      />

      <div className="cars-body">
        <form onSubmit={handleSubmit}>
          {/* Informations Personnelles */}
          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ marginBottom: '1.5rem', color: 'var(--text-primary)', fontSize: 'var(--font-size-lg)' }}>
              👤 Informations Personnelles
            </h3>
            
            <div className="responsive-grid-240" style={{ gap: '1.5rem' }}>
              <div className="form-group">
                <FormInput
                  label="Nom *"
                  name="nom"
                  value={form.nom}
                  onChange={handleChange}
                  required
                  placeholder="Nom du client"
                  style={inputStyle}
                />
              </div>

              <div className="form-group">
                <FormInput
                  label="Prénom *"
                  name="prenom"
                  value={form.prenom}
                  onChange={handleChange}
                  required
                  placeholder="Prénom du client"
                  style={inputStyle}
                />
              </div>

              <div className="form-group">
                <FormInput
                  type="email"
                  label="Email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="email@example.com"
                  style={inputStyle}
                />
              </div>

              <div className="form-group">
                <FormInput
                  type="tel"
                  label="Téléphone"
                  name="telephone"
                  value={form.telephone}
                  onChange={handleChange}
                  placeholder="+212 6XX XXX XXX"
                  style={inputStyle}
                />
              </div>
            </div>

            <div className="form-group" style={{ marginTop: '1.5rem' }}>
              <FormInput
                type="textarea"
                label="Adresse"
                name="adresse"
                value={form.adresse}
                onChange={handleChange}
                rows="3"
                placeholder="Adresse complète du client"
                style={inputStyle}
              />
            </div>
          </div>

          {/* Documents d'Identité */}
          <div style={{ marginTop: '2rem', paddingTop: '2rem', borderTop: '2px solid var(--border-color)' }}>
            <h3 style={{ marginBottom: '1.5rem', color: 'var(--text-primary)', fontSize: 'var(--font-size-lg)' }}>
              📄 Documents d'Identité
            </h3>

            {/* CIN */}
            <div style={sectionStyle}>
              <h4 style={sectionTitleStyle}>
                🆔 Carte d'Identité Nationale (CIN)
              </h4>
              
              <div className="responsive-grid-240" style={{ gap: '1.5rem' }}>
                <div>
                  <FormInput
                    type="text"
                    label="Numéro CIN"
                    name="cin_numero"
                    value={form.cin_numero}
                    onChange={handleChange}
                    style={inputStyle}
                    placeholder="Ex: AB123456"
                  />
                </div>

                <div>
                  <FormInput
                    type="date"
                    label="Date d'expiration"
                    name="cin_date_expiration"
                    value={form.cin_date_expiration}
                    onChange={handleChange}
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}>Document CIN</label>
                  {existingFiles.cin_documents.length > 0 && (
                    <div style={{ marginBottom: '0.5rem', padding: '0.5rem', background: 'var(--info-light)', borderRadius: 'var(--radius-sm)', fontSize: 'var(--font-size-sm)', display: 'grid', gap: '0.45rem' }}>
                      {existingFiles.cin_documents.map((file) => (
                        <a
                          key={file.id}
                          href={file.url}
                          onClick={(event) => { event.preventDefault(); window.open(file.url, '_blank', 'noopener,noreferrer'); }}
                          style={{ color: 'var(--info-color)', textDecoration: 'none', cursor: 'pointer' }}
                        >
                          📄 {file.name}
                        </a>
                      ))}
                    </div>
                  )}
                  <DocumentUploadField
                    label=""
                    fileNames={fileNames.cin_documents.map((name) => `Nouveau: ${name}`)}
                    onFileChange={(e) => handleFileChange(e, 'cin_documents')}
                    onRemoveFile={(index) => removeFile('cin_documents', index)}
                    labelStyle={{ display: 'none' }}
                    inputStyle={{ ...inputStyle, padding: '0.5rem' }}
                    fileChipStyle={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: 'var(--font-size-sm)', color: '#34d399' }}
                    removeButtonStyle={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', padding: '0.25rem' }}
                    hintStyle={hintStyle}
                    hint="Formats: PDF, JPG, JPEG, PNG (Max 5MB). Vous pouvez ajouter plusieurs fichiers."
                    multiple
                  />
                </div>
              </div>
            </div>

            {/* Permis de Conduire */}
            <div style={sectionStyle}>
              <h4 style={labelStyle}>
                🚗 Permis de Conduire
              </h4>
              
              <div className="responsive-grid-240" style={{ gap: '1.5rem' }}>
                <div className="form-group">
                  <FormInput
                    type="text"
                    label="Numéro Permis"
                    name="permis_numero"
                    value={form.permis_numero}
                    onChange={handleChange}
                    placeholder="Ex: 123456789"
                    style={inputStyle}
                  />
                </div>

                <div className="form-group">
                  <FormInput
                    type="date"
                    label="Date de délivrance"
                    name="permis_date_delivrance"
                    value={form.permis_date_delivrance}
                    onChange={handleChange}
                    style={inputStyle}
                  />
                </div>

                <div className="form-group">
                  <label style={labelStyle}>Document Permis</label>
                  {existingFiles.permis_documents.length > 0 && (
                    <div style={{ marginBottom: '0.5rem', padding: '0.5rem', background: 'var(--success-light)', borderRadius: 'var(--radius-sm)', fontSize: 'var(--font-size-sm)', display: 'grid', gap: '0.45rem' }}>
                      {existingFiles.permis_documents.map((file) => (
                        <a key={file.id} href={file.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--success-color)', textDecoration: 'none' }}>
                          📄 {file.name}
                        </a>
                      ))}
                    </div>
                  )}
                  <DocumentUploadField
                    label=""
                    fileNames={fileNames.permis_documents.map((name) => `Nouveau: ${name}`)}
                    onFileChange={(e) => handleFileChange(e, 'permis_documents')}
                    onRemoveFile={(index) => removeFile('permis_documents', index)}
                    labelStyle={{ display: 'none' }}
                    inputStyle={{ ...inputStyle, padding: '0.5rem' }}
                    fileChipStyle={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: 'var(--font-size-sm)', color: 'var(--success-color)' }}
                    removeButtonStyle={{ background: 'none', border: 'none', color: 'var(--danger-color)', cursor: 'pointer', padding: '0.25rem' }}
                    hintStyle={hintStyle}
                    hint="Formats: PDF, JPG, JPEG, PNG (Max 5MB). Vous pouvez ajouter plusieurs fichiers."
                    multiple
                  />
                </div>
              </div>
            </div>

            {/* Passeport */}
            <div style={sectionStyle}>
              <h4 style={labelStyle}>
                ✈️ Passeport
              </h4>
              
              <div className="responsive-grid-240" style={{ gap: '1.5rem' }}>
                <div className="form-group">
                  <FormInput
                    type="text"
                    label="Numéro Passeport"
                    name="passeport_numero"
                    value={form.passeport_numero}
                    onChange={handleChange}
                    placeholder="Ex: AB1234567"
                    style={inputStyle}
                  />
                </div>

                <div className="form-group">
                  <FormInput
                    type="date"
                    label="Date d'entrée"
                    name="passeport_date_entree"
                    value={form.passeport_date_entree}
                    onChange={handleChange}
                    style={inputStyle}
                  />
                </div>

                <div className="form-group">
                  <FormInput
                    type="date"
                    label="Date de sortie"
                    name="passeport_date_sortie"
                    value={form.passeport_date_sortie}
                    onChange={handleChange}
                    style={inputStyle}
                  />
                </div>

                <div className="form-group">
                  <label style={labelStyle}>Document Passeport</label>
                  {existingFiles.passeport_documents.length > 0 && (
                    <div style={{ marginBottom: '0.5rem', padding: '0.5rem', background: 'var(--warning-light)', borderRadius: 'var(--radius-sm)', fontSize: 'var(--font-size-sm)', display: 'grid', gap: '0.45rem' }}>
                      {existingFiles.passeport_documents.map((file) => (
                        <a key={file.id} href={file.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--warning-color)', textDecoration: 'none' }}>
                          📄 {file.name}
                        </a>
                      ))}
                    </div>
                  )}
                  <DocumentUploadField
                    label=""
                    fileNames={fileNames.passeport_documents.map((name) => `Nouveau: ${name}`)}
                    onFileChange={(e) => handleFileChange(e, 'passeport_documents')}
                    onRemoveFile={(index) => removeFile('passeport_documents', index)}
                    labelStyle={{ display: 'none' }}
                    inputStyle={{ ...inputStyle, padding: '0.5rem' }}
                    fileChipStyle={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: 'var(--font-size-sm)', color: 'var(--success-color)' }}
                    removeButtonStyle={{ background: 'none', border: 'none', color: 'var(--danger-color)', cursor: 'pointer', padding: '0.25rem' }}
                    hintStyle={hintStyle}
                    hint="Formats: PDF, JPG, JPEG, PNG (Max 5MB). Vous pouvez ajouter plusieurs fichiers."
                    multiple
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Boutons d'action */}
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '2rem', paddingTop: '2rem', borderTop: '2px solid var(--border-color)' }}>
            <button
              type="button"
              onClick={() => navigate('/admin/clients')}
              className="btn btn-secondary"
              disabled={submitting}
            >
              Annuler
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
            >
              {submitting ? 'Enregistrement...' : '✓ Modifier le Client'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EditClient;
