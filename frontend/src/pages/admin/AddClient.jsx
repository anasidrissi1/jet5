import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotification } from '../../contexts/NotificationContext';
import { clientsService } from '../../services/api';
import PageHeader from '../../components/PageHeader';
import FormInput from '../../components/FormInput';
import DocumentUploadField from '../../components/DocumentUploadField';
import { useEntityForm } from '../../hooks/useEntityForm';
const INITIAL_FORM = {
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
};

const INITIAL_FILES = {
  cin_documents: [],
  permis_documents: [],
  passeport_documents: []
};

const INITIAL_FILE_NAMES = {
  cin_documents: [],
  permis_documents: [],
  passeport_documents: []
};

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];

const AddClient = () => {
  const navigate = useNavigate();
  const { addNotification } = useNotification();

  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [files, setFiles] = useState(() => ({ ...INITIAL_FILES }));
  const [fileNames, setFileNames] = useState(() => ({ ...INITIAL_FILE_NAMES }));
  const [loading, setLoading] = useState(false);

  const fetchUrl = null;
  const saveUrl = null;
  const { form, setForm } = useEntityForm({
    fetchUrl,
    saveUrl,
    initialValues: INITIAL_FORM
  });

  const styles = useMemo(() => {
    const accentGradient = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    const cardBg = '#ffffff';
    const panelBg = '#f9fafb';
    const border = '#e5e7eb';
    const textPrimary = '#1f2937';
    const textSecondary = '#6b7280';
    const inputBg = '#ffffff';
    const inputText = '#1f2933';

    return {
      accentGradient,
      textPrimary,
      textSecondary,
      card: {
        background: cardBg,
        borderRadius: '16px',
        width: '100%',
        maxWidth: '900px',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.1)'
      },
      header: {
        background: accentGradient,
        padding: '24px',
        borderRadius: '16px 16px 0 0',
        color: 'white'
      },
      label: {
        display: 'block',
        marginBottom: '8px',
        fontWeight: '600',
        color: textPrimary,
        fontSize: '14px'
      },
      input: {
        width: '100%',
        padding: '12px 16px',
        border: `2px solid ${border}`,
        borderRadius: '10px',
        fontSize: '15px',
        outline: 'none',
        transition: 'border-color 0.2s, background-color 0.2s, color 0.2s',
        boxSizing: 'border-box',
        background: inputBg,
        color: inputText
      },
      textarea: {
        width: '100%',
        padding: '12px 16px',
        border: `2px solid ${border}`,
        borderRadius: '10px',
        fontSize: '15px',
        outline: 'none',
        transition: 'border-color 0.2s, background-color 0.2s, color 0.2s',
        resize: 'vertical',
        fontFamily: 'inherit',
        boxSizing: 'border-box',
        background: inputBg,
        color: inputText
      },
      docSection: (tone = {}) => ({
        marginBottom: '24px',
        padding: '20px',
        borderRadius: '12px',
        border: `1px solid ${tone.border ?? border}`,
        background: tone.background ?? panelBg
      }),
      uploader: {
        width: '100%',
        padding: '12px 16px',
        border: `2px dashed ${border}`,
        borderRadius: '10px',
        fontSize: '14px',
        background: inputBg,
        cursor: 'pointer',
        color: inputText,
        boxSizing: 'border-box'
      },
      fileChip: {
        marginTop: '8px',
        padding: '8px 12px',
        background: '#d1fae5',
        borderRadius: '6px',
        fontSize: '13px',
        color: '#065f46',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      },
      smallHint: {
        display: 'block',
        marginTop: '6px',
        color: textSecondary,
        fontSize: '12px'
      },
      footer: {
        padding: '20px 32px',
        borderTop: `1px solid ${border}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px',
        background: panelBg,
        borderRadius: '0 0 16px 16px'
      },
      successRing: {
        width: '80px',
        height: '80px',
        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        borderRadius: '50%',
        margin: '0 auto 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '40px',
        color: 'white',
        boxShadow: '0 8px 20px rgba(16, 185, 129, 0.3)'
      },
      outlineButton: {
        padding: '12px 24px',
        background: '#ffffff',
        border: `2px solid ${border}`,
        borderRadius: '10px',
        fontSize: '15px',
        fontWeight: '600',
        color: textSecondary,
        cursor: 'pointer',
        transition: 'all 0.2s'
      },
      accentButton: {
        padding: '12px 24px',
        background: accentGradient,
        border: 'none',
        borderRadius: '10px',
        fontSize: '15px',
        fontWeight: '600',
        color: '#ffffff',
        cursor: 'pointer',
        boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)',
        transition: 'all 0.2s'
      },
      secondaryButton: {
        padding: '12px 24px',
        background: '#ffffff',
        border: '2px solid #667eea',
        borderRadius: '10px',
        fontSize: '15px',
        fontWeight: '600',
        color: '#667eea',
        cursor: 'pointer',
        transition: 'all 0.2s'
      },
      successButton: (disabled) => ({
        padding: '12px 24px',
        background: disabled ? '#9ca3af' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        border: 'none',
        borderRadius: '10px',
        fontSize: '15px',
        fontWeight: '600',
        color: '#ffffff',
        cursor: disabled ? 'not-allowed' : 'pointer',
        boxShadow: disabled ? 'none' : '0 4px 12px rgba(16, 185, 129, 0.4)',
        transition: 'all 0.2s'
      }),
      focusBorder: '#667eea',
      inputBorder: border,
      inputBg
    };
  }, []);

  const handleFieldFocus = (event) => {
    event.target.style.borderColor = styles.focusBorder;
  };

  const handleFieldBlur = (event) => {
    event.target.style.borderColor = styles.inputBorder;
    event.target.style.background = styles.inputBg;
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const focusField = (fieldName) => {
    const field = document.querySelector(`[name="${fieldName}"]`);
    if (field) {
      field.focus();
      field.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const validateForm = () => {
    const requiredFields = [
      { name: 'nom', label: 'le nom' },
      { name: 'prenom', label: 'le prenom' },
    ];

    const missingField = requiredFields.find(({ name }) => {
      const value = form[name];
      return value === undefined || value === null || String(value).trim() === '';
    });

    if (missingField) {
      addNotification(`Veuillez renseigner ${missingField.label}.`, 'error');
      focusField(missingField.name);
      return false;
    }

    return true;
  };

  const handleFileChange = (event, fieldName) => {
    const selectedFiles = Array.from(event.target.files || []);

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

    event.target.value = '';

    if (validFiles.length === 0) {
      return;
    }

    setFiles((prev) => ({
      ...prev,
      [fieldName]: [...prev[fieldName], ...validFiles],
    }));
    setFileNames((prev) => ({
      ...prev,
      [fieldName]: [...prev[fieldName], ...validFiles.map((file) => file.name)],
    }));
  };

  const removeFile = (fieldName, indexToRemove) => {
    setFiles((prev) => ({
      ...prev,
      [fieldName]: prev[fieldName].filter((_, index) => index !== indexToRemove),
    }));
    setFileNames((prev) => ({
      ...prev,
      [fieldName]: prev[fieldName].filter((_, index) => index !== indexToRemove),
    }));
  };

  const resetForm = () => {
    setForm({ ...INITIAL_FORM });
    setFiles({ ...INITIAL_FILES });
    setFileNames({ ...INITIAL_FILE_NAMES });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();

      Object.entries(form).forEach(([key, value]) => {
        if (value && value.trim() !== '') {
          formData.append(key, value.trim());
        }
      });

      Object.entries(files).forEach(([key, value]) => {
        value.forEach((file) => {
          formData.append(key, file);
        });
      });

      await clientsService.create(formData);

      addNotification('Client ajouté avec succès!', 'success');
      setSubmitSuccess(true);
    } catch (error) {

      let errorMsg = "Erreur lors de l'ajout du client";

      if (error.response?.data) {
        if (typeof error.response.data === 'object' && !error.response.data.detail) {
          const details = Object.entries(error.response.data)
            .map(([field, messages]) => {
              const fieldName =
                field === 'email' ? 'Email' :
                field === 'nom' ? 'Nom' :
                field === 'prenom' ? 'Prénom' :
                field === 'telephone' ? 'Téléphone' :
                field;
              const messageText = Array.isArray(messages) ? messages.join(', ') : messages;
              return `${fieldName}: ${messageText}`;
            })
            .join('\n');

          errorMsg = details || errorMsg;

          if (error.response.data.email && JSON.stringify(error.response.data.email).includes('unique')) {
            errorMsg = '❌ Cet email existe déjà. Veuillez utiliser un autre email.';
          }
        } else {
          errorMsg = error.response.data.detail || error.response.data.error || JSON.stringify(error.response.data);
        }
      } else if (error.message) {
        errorMsg = error.message;
      }

      addNotification(errorMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="cars-page">
      <PageHeader
        title="➕ Ajouter un Client"
        subtitle="Formulaire complet sur une seule page"
        backUrl="/admin/clients"
      />

      <div className="cars-body" style={{ display: 'flex', justifyContent: 'center', padding: '2rem 1rem' }}>
        <div style={styles.card}>
          <div style={styles.header}>
            <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '700' }}>
              👤 Nouveau Client
            </h2>
            <p style={{ margin: '8px 0 0 0', opacity: 0.9, fontSize: '14px' }}>
              Tous les champs sont visibles sans navigation étape par étape
            </p>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            <div style={{ padding: '32px', display: 'grid', gap: '32px' }}>
              {submitSuccess ? (
                <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                  <div style={styles.successRing}>✓</div>
                  <h3 style={{ fontSize: '20px', marginBottom: '12px', color: styles.textPrimary }}>
                    Client ajouté avec succès !
                  </h3>
                  <p style={{ color: styles.textSecondary, fontSize: '15px', marginBottom: '24px' }}>
                    Nous avons bien enregistré le nouveau client. Vous pouvez maintenant consulter sa fiche ou ajouter un autre client.
                  </p>

                  <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => {
                        resetForm();
                        setSubmitSuccess(false);
                      }}
                      style={styles.secondaryButton}
                    >
                      ➕ Ajouter un autre client
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate('/admin/clients')}
                      style={styles.accentButton}
                    >
                      Retour à la liste des clients →
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ animation: 'fadeIn 0.2s', display: 'grid', gap: '12px' }}>
                    <h3 style={{ margin: '0 0 4px 0', fontSize: '18px', color: styles.textPrimary, fontWeight: '700' }}>
                      👤 Informations Personnelles
                    </h3>
                    <p style={{ margin: 0, color: styles.textSecondary, fontSize: '13px' }}>
                      Les champs marqués * sont obligatoires.
                    </p>

                    <div className="responsive-grid-240" style={{ marginTop: '12px' }}>
                      <div>
                        <FormInput
                          label="Nom *"
                          name="nom"
                          value={form.nom}
                          onChange={handleChange}
                          required
                          placeholder="Nom du client"
                        />
                      </div>

                      <div>
                        <FormInput
                          label="Prénom *"
                          name="prenom"
                          value={form.prenom}
                          onChange={handleChange}
                          required
                          placeholder="Prénom du client"
                        />
                      </div>

                      <div>
                        <FormInput
                          type="email"
                          label="Email"
                          name="email"
                          value={form.email}
                          onChange={handleChange}
                          placeholder="email@example.com"
                        />
                      </div>

                      <div>
                        <FormInput
                          type="tel"
                          label="Téléphone"
                          name="telephone"
                          value={form.telephone}
                          onChange={handleChange}
                          placeholder="+212 6XX XXX XXX"
                        />
                      </div>
                    </div>

                    <div>
                      <FormInput
                        type="textarea"
                        label="Adresse"
                        name="adresse"
                        value={form.adresse}
                        onChange={handleChange}
                        placeholder="Adresse complète du client"
                        style={styles.textarea}
                        onFocus={handleFieldFocus}
                        onBlur={handleFieldBlur}
                      />
                    </div>
                  </div>

                  <div style={{ animation: 'fadeIn 0.2s' }}>
                    <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', color: styles.textPrimary, fontWeight: '700' }}>
                      📄 Documents d'identité
                    </h3>

                    <div
                      style={styles.docSection({
                        background: '#f9fafb',
                        border: '#e5e7eb'
                      })}
                    >
                      <h4 style={{ margin: '0 0 16px 0', fontSize: '16px', color: styles.textPrimary, fontWeight: '600' }}>
                        🆔 Carte d'Identité Nationale (CIN)
                      </h4>

                      <div className="responsive-grid-220" style={{ marginBottom: '16px' }}>
                        <div>
                          <FormInput
                            label="Numéro CIN"
                            name="cin_numero"
                            value={form.cin_numero}
                            onChange={handleChange}
                            placeholder="Ex: AB123456"
                            style={styles.input}
                            onFocus={handleFieldFocus}
                            onBlur={handleFieldBlur}
                          />
                        </div>

                        <div>
                          <FormInput
                            type="date"
                            label="Date d'expiration"
                            name="cin_date_expiration"
                            value={form.cin_date_expiration}
                            onChange={handleChange}
                            style={styles.input}
                            onFocus={handleFieldFocus}
                            onBlur={handleFieldBlur}
                          />
                        </div>
                      </div>

                      <DocumentUploadField
                        label="Document CIN (Scan/Photo)"
                        fileNames={fileNames.cin_documents}
                        onFileChange={(event) => handleFileChange(event, 'cin_documents')}
                        onRemoveFile={(index) => removeFile('cin_documents', index)}
                        labelStyle={styles.label}
                        inputStyle={styles.uploader}
                        fileChipStyle={styles.fileChip}
                        removeButtonStyle={{
                          background: 'none',
                          border: 'none',
                          color: '#dc2626',
                          cursor: 'pointer',
                          fontSize: '16px',
                          fontWeight: 'bold'
                        }}
                        hintStyle={styles.smallHint}
                        hint="💡 Formats: PDF, JPG, JPEG, PNG (Max 5MB). Vous pouvez choisir plusieurs fichiers."
                        multiple
                      />
                    </div>

                    <div
                      style={styles.docSection({
                        background: '#f9fafb',
                        border: '#e5e7eb'
                      })}
                    >
                      <h4 style={{ margin: '0 0 16px 0', fontSize: '16px', color: styles.textPrimary, fontWeight: '600' }}>
                        🚗 Permis de Conduire
                      </h4>

                      <div className="responsive-grid-220" style={{ marginBottom: '16px' }}>
                        <div>
                          <FormInput
                            label="Numéro Permis"
                            name="permis_numero"
                            value={form.permis_numero}
                            onChange={handleChange}
                            placeholder="Ex: 123456789"
                            style={styles.input}
                            onFocus={handleFieldFocus}
                            onBlur={handleFieldBlur}
                          />
                        </div>

                        <div>
                          <FormInput
                            type="date"
                            label="Date de délivrance"
                            name="permis_date_delivrance"
                            value={form.permis_date_delivrance}
                            onChange={handleChange}
                            style={styles.input}
                            onFocus={handleFieldFocus}
                            onBlur={handleFieldBlur}
                          />
                        </div>
                      </div>

                      <DocumentUploadField
                        label="Document Permis (Scan/Photo)"
                        fileNames={fileNames.permis_documents}
                        onFileChange={(event) => handleFileChange(event, 'permis_documents')}
                        onRemoveFile={(index) => removeFile('permis_documents', index)}
                        labelStyle={styles.label}
                        inputStyle={styles.uploader}
                        fileChipStyle={styles.fileChip}
                        removeButtonStyle={{
                          background: 'none',
                          border: 'none',
                          color: '#dc2626',
                          cursor: 'pointer',
                          fontSize: '16px',
                          fontWeight: 'bold'
                        }}
                        hintStyle={styles.smallHint}
                        hint="💡 Formats: PDF, JPG, JPEG, PNG (Max 5MB). Vous pouvez choisir plusieurs fichiers."
                        multiple
                      />
                    </div>

                    <div
                      style={styles.docSection({
                        background: '#f9fafb',
                        border: '#e5e7eb'
                      })}
                    >
                      <h4 style={{ margin: '0 0 16px 0', fontSize: '16px', color: styles.textPrimary, fontWeight: '600' }}>
                        ✈️ Passeport
                      </h4>

                      <div className="responsive-grid-220" style={{ marginBottom: '16px' }}>
                        <div>
                          <FormInput
                            type="text"
                            label="Numéro Passeport"
                            name="passeport_numero"
                            value={form.passeport_numero}
                            onChange={handleChange}
                            placeholder="Ex: AB1234567"
                            style={styles.input}
                            onFocus={handleFieldFocus}
                            onBlur={handleFieldBlur}
                          />
                        </div>

                        <div>
                          <FormInput
                            type="date"
                            label="Date d'entrée"
                            name="passeport_date_entree"
                            value={form.passeport_date_entree}
                            onChange={handleChange}
                            style={styles.input}
                            onFocus={handleFieldFocus}
                            onBlur={handleFieldBlur}
                          />
                        </div>

                        <div>
                          <FormInput
                            type="date"
                            label="Date de sortie"
                            name="passeport_date_sortie"
                            value={form.passeport_date_sortie}
                            onChange={handleChange}
                            style={styles.input}
                            onFocus={handleFieldFocus}
                            onBlur={handleFieldBlur}
                          />
                        </div>
                      </div>

                      <DocumentUploadField
                        label="Document Passeport (Scan/Photo)"
                        fileNames={fileNames.passeport_documents}
                        onFileChange={(event) => handleFileChange(event, 'passeport_documents')}
                        onRemoveFile={(index) => removeFile('passeport_documents', index)}
                        labelStyle={styles.label}
                        inputStyle={styles.uploader}
                        fileChipStyle={styles.fileChip}
                        removeButtonStyle={{
                          background: 'none',
                          border: 'none',
                          color: '#dc2626',
                          cursor: 'pointer',
                          fontSize: '16px',
                          fontWeight: 'bold'
                        }}
                        hintStyle={styles.smallHint}
                        hint="💡 Formats: PDF, JPG, JPEG, PNG (Max 5MB). Vous pouvez choisir plusieurs fichiers."
                        multiple
                      />
                    </div>
                  </div>
                </>
              )}
            </div>

            {!submitSuccess && (
              <div className="form-footer-responsive" style={styles.footer}>
                <button
                  type="button"
                  onClick={() => navigate('/admin/clients')}
                  disabled={loading}
                  style={{
                    ...styles.outlineButton,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.6 : 1
                  }}
                >
                  Annuler
                </button>

                <button type="submit" disabled={loading} style={styles.successButton(loading)}>
                  {loading ? 'Enregistrement...' : '✓ Ajouter le Client'}
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddClient;
