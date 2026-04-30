import React, { useMemo, useState } from 'react';
import axios from 'axios';
import { getApiBaseUrl } from '../config/env';
import jet5Logo from '../assets/jet5logo.png';
import '../styles/pages.css';
import '../styles/cars.css';

const API_BASE_URL = getApiBaseUrl();

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
  cin_document: null,
  permis_document: null,
  passeport_document: null
};

const INITIAL_FILE_NAMES = {
  cin_document: '',
  permis_document: '',
  passeport_document: ''
};

const ClientInscription = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [form, setForm] = useState(() => ({ ...INITIAL_FORM }));
  const [files, setFiles] = useState(() => ({ ...INITIAL_FILES }));
  const [fileNames, setFileNames] = useState(() => ({ ...INITIAL_FILE_NAMES }));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const styles = useMemo(() => {
    const accentGradient = 'var(--gradient-teal)';
    const cardBg = 'var(--bg-card)';
    const panelBg = 'var(--bg-secondary)';
    const border = 'var(--surface-muted-border)';
    const textPrimary = 'var(--text-primary)';
    const textSecondary = 'var(--text-secondary)';
    const inputBg = 'var(--bg-secondary)';
    const inputText = 'var(--text-primary)';

    return {
      accentGradient,
      textPrimary,
      textSecondary,
      page: {
        minHeight: '100vh',
        background: 'var(--bg-primary)',
        padding: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      },
      card: {
        background: cardBg,
        borderRadius: '16px',
        width: '100%',
        maxWidth: '900px',
        boxShadow: 'var(--shadow-xl)'
      },
      header: {
        background: accentGradient,
        padding: '24px',
        borderRadius: '16px 16px 0 0',
        color: 'var(--on-accent)',
        textAlign: 'center'
      },
      logo: {
        width: '64px',
        height: '64px',
        marginBottom: '12px'
      },
      logoImage: {
        width: '100%',
        height: '100%',
        objectFit: 'contain',
        display: 'block'
      },
      stepsWrapper: {
        padding: '24px',
        borderBottom: `1px solid ${border}`,
        background: panelBg,
        borderRadius: 0
      },
      stepsTrack: {
        position: 'absolute',
        top: '20px',
        left: '10%',
        right: '10%',
        height: '3px',
        background: 'var(--surface-muted-bg)',
        zIndex: 0
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
        background: 'var(--surface-success-bg)',
        borderRadius: '6px',
        fontSize: '13px',
        color: 'var(--success-color)',
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
        justifyContent: 'center',
        alignItems: 'center',
        gap: '12px',
        background: panelBg,
        borderRadius: '0 0 16px 16px',
        flexWrap: 'wrap'
      },
      verificationBox: (variant) => {
        if (variant === 'info') {
          return {
            padding: '20px',
            background: 'var(--surface-info-bg)',
            borderRadius: '12px',
            border: '1px solid var(--surface-info-border)'
          };
        }
        return {
          padding: '20px',
          background: 'var(--surface-success-bg)',
          borderRadius: '12px',
          border: '1px solid var(--surface-success-border)'
        };
      },
      successRing: {
        width: '100px',
        height: '100px',
        background: 'var(--gradient-success)',
        borderRadius: '50%',
        margin: '0 auto 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '50px',
        color: 'var(--text-primary)',
        boxShadow: 'var(--shadow-lg)'
      },
      outlineButton: {
        padding: '12px 24px',
        background: cardBg,
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
        color: 'var(--on-accent)',
        cursor: 'pointer',
        boxShadow: 'var(--shadow-md)',
        transition: 'all 0.2s'
      },
      secondaryButton: {
        padding: '12px 24px',
        background: 'var(--bg-secondary)',
        border: '2px solid var(--primary-color)',
        borderRadius: '10px',
        fontSize: '15px',
        fontWeight: '600',
        color: 'var(--primary-color)',
        cursor: 'pointer',
        transition: 'all 0.2s'
      },
      successButton: (disabled) => ({
        padding: '14px 32px',
        background: disabled
          ? 'var(--surface-muted-bg)'
          : 'var(--gradient-success)',
        border: 'none',
        borderRadius: '10px',
        fontSize: '16px',
        fontWeight: '600',
        color: 'var(--on-accent)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        boxShadow: disabled ? 'none' : 'var(--shadow-md)',
        transition: 'all 0.2s'
      }),
      errorBox: {
        padding: '16px',
        background: 'var(--surface-danger-bg)',
        border: '1px solid var(--surface-danger-border)',
        borderRadius: '10px',
        color: 'var(--color-danger)',
        marginBottom: '20px',
        fontSize: '14px'
      },
      focusBorder: 'var(--focus-ring)',
      inputBorder: border,
      inputBg
    };
  }, []);

  const handleFieldFocus = (event) => {
    event.target.style.borderColor = styles.focusBorder;
    event.target.style.background = 'var(--bg-hover)';
  };

  const handleFieldBlur = (event) => {
    event.target.style.borderColor = styles.inputBorder;
    event.target.style.background = styles.inputBg;
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleFileChange = (event, fieldName) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Le fichier est trop volumineux (max 5MB)');
      event.target.value = '';
      return;
    }

    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      setError('Format non supporté. Utilisez PDF, JPG, JPEG ou PNG');
      event.target.value = '';
      return;
    }

    setFiles((prev) => ({ ...prev, [fieldName]: file }));
    setFileNames((prev) => ({ ...prev, [fieldName]: file.name }));
    setError('');
  };

  const removeFile = (fieldName) => {
    setFiles((prev) => ({ ...prev, [fieldName]: null }));
    setFileNames((prev) => ({ ...prev, [fieldName]: '' }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const formData = new FormData();

      Object.entries(form).forEach(([key, value]) => {
        if (value && value.trim() !== '') {
          formData.append(key, value.trim());
        }
      });

      Object.entries(files).forEach(([key, value]) => {
        if (value) {
          formData.append(key, value);
        }
      });

      // Envoyer vers l'endpoint des demandes (pas directement dans clients)
      await axios.post(`${API_BASE_URL}/clients/requests/`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      setSubmitSuccess(true);
    } catch (err) {
      console.error('Erreur:', err);
      let errorMsg = "Erreur lors de l'envoi. Veuillez réessayer.";

      if (err.response?.data) {
        if (typeof err.response.data === 'object') {
          const details = Object.entries(err.response.data)
            .map(([field, messages]) => {
              const messageText = Array.isArray(messages) ? messages.join(', ') : messages;
              return `${field}: ${messageText}`;
            })
            .join(' | ');
          errorMsg = details || errorMsg;
        } else {
          errorMsg = err.response.data.detail || err.response.data.error || errorMsg;
        }
      }

      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const progress = ((currentStep - 1) / 2) * 100;

  if (submitSuccess) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={styles.header}>
            <div style={styles.logo}>
              <img src={jet5Logo} alt="JET5" style={styles.logoImage} />
            </div>
            <h2 style={{ margin: 0, fontSize: '28px', fontWeight: '700' }}>
              JET5
            </h2>
          </div>
          <div style={{ padding: '60px 32px', textAlign: 'center' }}>
            <div style={styles.successRing}>✓</div>
            <h2 style={{ margin: '0 0 16px 0', fontSize: '28px', color: styles.textPrimary, fontWeight: '700' }}>
              Demande Envoyée !
            </h2>
            <p style={{ margin: '0 0 24px 0', fontSize: '16px', color: styles.textSecondary, lineHeight: '1.6' }}>
              Votre demande d'inscription a été envoyée avec succès.<br />
              Un agent va la vérifier et vous serez enregistré dans notre système.
            </p>
            <div style={{
              padding: '20px',
              background: 'var(--surface-info-bg)',
              borderRadius: '12px',
              border: '1px solid var(--surface-info-border)',
              maxWidth: '400px',
              margin: '0 auto'
            }}>
              <p style={{ margin: 0, color: 'var(--color-info)', fontSize: '14px' }}>
                💡 Vous pouvez maintenant vous rapprocher de l'agent pour finaliser votre location.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.header}>
          <div style={styles.logo}>
            <img src={jet5Logo} alt="JET5" style={styles.logoImage} />
          </div>
          <h2 style={{ margin: 0, fontSize: '28px', fontWeight: '700' }}>
            JET5
          </h2>
          <p style={{ margin: '8px 0 0 0', opacity: 0.9, fontSize: '15px' }}>
            Inscription Client
          </p>
        </div>

        <div style={styles.stepsWrapper}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative' }}>
            <div style={styles.stepsTrack}>
              <div
                style={{
                  height: '100%',
                  background: styles.accentGradient,
                  width: `${progress}%`,
                  transition: 'width 0.3s'
                }}
              />
            </div>

            {[
              { num: 1, label: 'Informations', icon: '👤' },
              { num: 2, label: 'Documents', icon: '📄' },
              { num: 3, label: 'Vérification', icon: '✓' }
            ].map((step) => {
              const isActive = currentStep >= step.num;
              return (
                <div key={step.num} style={{ textAlign: 'center', flex: 1, position: 'relative', zIndex: 1 }}>
                  <div
                    style={{
                      width: '45px',
                      height: '45px',
                      borderRadius: '50%',
                      background: isActive
                        ? styles.accentGradient
                        : 'var(--surface-muted-bg)',
                      color: isActive ? 'var(--text-primary)' : styles.textSecondary,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 8px',
                      fontSize: '20px',
                      fontWeight: '700',
                      boxShadow: isActive ? 'var(--shadow-md)' : 'none',
                      transition: 'all 0.3s'
                    }}
                  >
                    {step.icon}
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: isActive ? 'var(--text-primary)' : styles.textSecondary }}>
                    {step.label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ padding: '32px' }}>
            {error && (
              <div style={styles.errorBox}>
                ❌ {error}
              </div>
            )}

            {currentStep === 1 && (
              <div style={{ animation: 'fadeIn 0.3s' }}>
                <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', color: styles.textPrimary, fontWeight: '700' }}>
                  👤 Vos Informations Personnelles
                </h3>

                <div className="responsive-grid-240" style={{ marginBottom: '20px' }}>
                  <div>
                    <label style={styles.label}>Nom *</label>
                    <input
                      type="text"
                      name="nom"
                      value={form.nom}
                      onChange={handleChange}
                      required
                      placeholder="Votre nom"
                      style={styles.input}
                      onFocus={handleFieldFocus}
                      onBlur={handleFieldBlur}
                    />
                  </div>

                  <div>
                    <label style={styles.label}>Prénom *</label>
                    <input
                      type="text"
                      name="prenom"
                      value={form.prenom}
                      onChange={handleChange}
                      required
                      placeholder="Votre prénom"
                      style={styles.input}
                      onFocus={handleFieldFocus}
                      onBlur={handleFieldBlur}
                    />
                  </div>

                  <div>
                    <label style={styles.label}>Email</label>
                    <input
                      type="email"
                      name="email"
                      value={form.email}
                      onChange={handleChange}
                      placeholder="votre.email@example.com"
                      style={styles.input}
                      onFocus={handleFieldFocus}
                      onBlur={handleFieldBlur}
                    />
                  </div>

                  <div>
                    <label style={styles.label}>Téléphone *</label>
                    <input
                      type="tel"
                      name="telephone"
                      value={form.telephone}
                      onChange={handleChange}
                      required
                      placeholder="06 XX XX XX XX"
                      style={styles.input}
                      onFocus={handleFieldFocus}
                      onBlur={handleFieldBlur}
                    />
                  </div>
                </div>

                <div>
                  <label style={styles.label}>Adresse</label>
                  <textarea
                    name="adresse"
                    value={form.adresse}
                    onChange={handleChange}
                    placeholder="Votre adresse complète"
                    rows={3}
                    style={styles.textarea}
                    onFocus={handleFieldFocus}
                    onBlur={handleFieldBlur}
                  />
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div style={{ animation: 'fadeIn 0.3s' }}>
                <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', color: styles.textPrimary, fontWeight: '700' }}>
                  📄 Vos Documents d'Identité
                </h3>

                {/* CIN Section */}
                <div style={styles.docSection({ background: 'var(--surface-info-bg)', border: 'var(--surface-info-border)' })}>
                  <h4 style={{ margin: '0 0 16px 0', fontSize: '15px', color: 'var(--color-info)', fontWeight: '600' }}>
                    🪪 Carte d'Identité Nationale (CIN)
                  </h4>
                  <div className="responsive-grid-220" style={{ marginBottom: '16px' }}>
                    <div>
                      <label style={styles.label}>Numéro CIN *</label>
                      <input
                        type="text"
                        name="cin_numero"
                        value={form.cin_numero}
                        onChange={handleChange}
                        required
                        placeholder="AB123456"
                        style={styles.input}
                        onFocus={handleFieldFocus}
                        onBlur={handleFieldBlur}
                      />
                    </div>
                    <div>
                      <label style={styles.label}>Date d'expiration</label>
                      <input
                        type="date"
                        name="cin_date_expiration"
                        value={form.cin_date_expiration}
                        onChange={handleChange}
                        style={styles.input}
                        onFocus={handleFieldFocus}
                        onBlur={handleFieldBlur}
                      />
                    </div>
                  </div>
                  <div>
                    <label style={styles.label}>Photo CIN (recto/verso)</label>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => handleFileChange(e, 'cin_document')}
                      style={styles.uploader}
                    />
                    {fileNames.cin_document && (
                      <div style={styles.fileChip}>
                        <span>📎 {fileNames.cin_document}</span>
                        <button
                          type="button"
                          onClick={() => removeFile('cin_document')}
                          style={{ background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer', fontSize: '16px' }}
                        >
                          ✕
                        </button>
                      </div>
                    )}
                    <span style={styles.smallHint}>PDF, JPG ou PNG (max 5MB)</span>
                  </div>
                </div>

                {/* Permis Section */}
                <div style={styles.docSection({ background: 'var(--surface-success-bg)', border: 'var(--surface-success-border)' })}>
                  <h4 style={{ margin: '0 0 16px 0', fontSize: '15px', color: 'var(--success-color)', fontWeight: '600' }}>
                    🚗 Permis de Conduire
                  </h4>
                  <div className="responsive-grid-220" style={{ marginBottom: '16px' }}>
                    <div>
                      <label style={styles.label}>Numéro Permis *</label>
                      <input
                        type="text"
                        name="permis_numero"
                        value={form.permis_numero}
                        onChange={handleChange}
                        required
                        placeholder="Numéro du permis"
                        style={styles.input}
                        onFocus={handleFieldFocus}
                        onBlur={handleFieldBlur}
                      />
                    </div>
                    <div>
                      <label style={styles.label}>Date de délivrance</label>
                      <input
                        type="date"
                        name="permis_date_delivrance"
                        value={form.permis_date_delivrance}
                        onChange={handleChange}
                        style={styles.input}
                        onFocus={handleFieldFocus}
                        onBlur={handleFieldBlur}
                      />
                    </div>
                  </div>
                  <div>
                    <label style={styles.label}>Photo Permis</label>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => handleFileChange(e, 'permis_document')}
                      style={styles.uploader}
                    />
                    {fileNames.permis_document && (
                      <div style={styles.fileChip}>
                        <span>📎 {fileNames.permis_document}</span>
                        <button
                          type="button"
                          onClick={() => removeFile('permis_document')}
                          style={{ background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer', fontSize: '16px' }}
                        >
                          ✕
                        </button>
                      </div>
                    )}
                    <span style={styles.smallHint}>PDF, JPG ou PNG (max 5MB)</span>
                  </div>
                </div>

                {/* Passeport Section (optionnel) */}
                <div style={styles.docSection({ background: 'var(--surface-warning-bg)', border: 'var(--surface-warning-border)' })}>
                  <h4 style={{ margin: '0 0 16px 0', fontSize: '15px', color: 'var(--warning-color)', fontWeight: '600' }}>
                    🛂 Passeport (optionnel - pour étrangers)
                  </h4>
                  <div className="responsive-grid-220" style={{ marginBottom: '16px' }}>
                    <div>
                      <label style={styles.label}>Numéro Passeport</label>
                      <input
                        type="text"
                        name="passeport_numero"
                        value={form.passeport_numero}
                        onChange={handleChange}
                        placeholder="Numéro"
                        style={styles.input}
                        onFocus={handleFieldFocus}
                        onBlur={handleFieldBlur}
                      />
                    </div>
                    <div>
                      <label style={styles.label}>Date d'entrée</label>
                      <input
                        type="date"
                        name="passeport_date_entree"
                        value={form.passeport_date_entree}
                        onChange={handleChange}
                        style={styles.input}
                        onFocus={handleFieldFocus}
                        onBlur={handleFieldBlur}
                      />
                    </div>
                    <div>
                      <label style={styles.label}>Date de sortie</label>
                      <input
                        type="date"
                        name="passeport_date_sortie"
                        value={form.passeport_date_sortie}
                        onChange={handleChange}
                        style={styles.input}
                        onFocus={handleFieldFocus}
                        onBlur={handleFieldBlur}
                      />
                    </div>
                  </div>
                  <div>
                    <label style={styles.label}>Photo Passeport</label>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => handleFileChange(e, 'passeport_document')}
                      style={styles.uploader}
                    />
                    {fileNames.passeport_document && (
                      <div style={styles.fileChip}>
                        <span>📎 {fileNames.passeport_document}</span>
                        <button
                          type="button"
                          onClick={() => removeFile('passeport_document')}
                          style={{ background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer', fontSize: '16px' }}
                        >
                          ✕
                        </button>
                      </div>
                    )}
                    <span style={styles.smallHint}>PDF, JPG ou PNG (max 5MB)</span>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div style={{ animation: 'fadeIn 0.3s' }}>
                <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', color: styles.textPrimary, fontWeight: '700' }}>
                  ✓ Vérification de vos informations
                </h3>
                <p style={{ margin: '0 0 24px 0', color: styles.textSecondary, fontSize: '14px' }}>
                  Veuillez vérifier vos informations avant d'envoyer votre demande.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={styles.verificationBox('info')}>
                    <h4 style={{ margin: '0 0 12px 0', fontSize: '16px', color: styles.textPrimary, fontWeight: '600' }}>
                      👤 Informations personnelles
                    </h4>
                    <div className="responsive-grid-220" style={{ gap: '12px', fontSize: '14px', color: styles.textSecondary }}>
                      <div>
                        <span style={{ fontWeight: '600', color: styles.textPrimary }}>Nom :</span> {form.nom || '-'}
                      </div>
                      <div>
                        <span style={{ fontWeight: '600', color: styles.textPrimary }}>Prénom :</span> {form.prenom || '-'}
                      </div>
                      <div>
                        <span style={{ fontWeight: '600', color: styles.textPrimary }}>Email :</span> {form.email || '-'}
                      </div>
                      <div>
                        <span style={{ fontWeight: '600', color: styles.textPrimary }}>Téléphone :</span> {form.telephone || '-'}
                      </div>
                      <div style={{ gridColumn: '1 / -1' }}>
                        <span style={{ fontWeight: '600', color: styles.textPrimary }}>Adresse :</span> {form.adresse || '-'}
                      </div>
                    </div>
                  </div>

                  <div style={styles.verificationBox('success')}>
                    <h4 style={{ margin: '0 0 12px 0', fontSize: '16px', color: styles.textPrimary, fontWeight: '600' }}>
                      📄 Documents
                    </h4>
                    <div style={{ display: 'grid', gap: '8px', fontSize: '14px', color: styles.textSecondary }}>
                      <div>
                        <span style={{ fontWeight: '600', color: styles.textPrimary }}>CIN :</span> {form.cin_numero || 'Non renseigné'}
                        {form.cin_date_expiration && ` (expire le ${new Date(form.cin_date_expiration).toLocaleDateString('fr-FR')})`}
                        {fileNames.cin_document && <span style={{ marginLeft: '8px', color: 'var(--success-color)' }}>✓ Document joint</span>}
                      </div>
                      <div>
                        <span style={{ fontWeight: '600', color: styles.textPrimary }}>Permis :</span> {form.permis_numero || 'Non renseigné'}
                        {form.permis_date_delivrance && ` (délivré le ${new Date(form.permis_date_delivrance).toLocaleDateString('fr-FR')})`}
                        {fileNames.permis_document && <span style={{ marginLeft: '8px', color: 'var(--success-color)' }}>✓ Document joint</span>}
                      </div>
                      <div>
                        <span style={{ fontWeight: '600', color: styles.textPrimary }}>Passeport :</span> {form.passeport_numero || 'Non renseigné'}
                        {fileNames.passeport_document && <span style={{ marginLeft: '8px', color: 'var(--success-color)' }}>✓ Document joint</span>}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div style={styles.footer}>
            {currentStep > 1 && (
              <button
                type="button"
                onClick={() => setCurrentStep((step) => step - 1)}
                disabled={loading}
                style={{
                  ...styles.secondaryButton,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.6 : 1
                }}
              >
                ← Précédent
              </button>
            )}

            {currentStep < 3 ? (
              <button
                type="button"
                onClick={() => setCurrentStep((step) => step + 1)}
                disabled={loading}
                style={{
                  ...styles.accentButton,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.6 : 1
                }}
              >
                Suivant →
              </button>
            ) : (
              <button type="submit" disabled={loading} style={styles.successButton(loading)}>
                {loading ? 'Envoi en cours...' : '✓ Envoyer ma demande'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default ClientInscription;
