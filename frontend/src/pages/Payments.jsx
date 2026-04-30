import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { paymentService } from '../services/paymentService';

function Payments() {
  const [rows, setRows] = useState([]);
  const [totals, setTotals] = useState({ total_general_due: 0, total_paid: 0, total_remaining: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [vehicleFilter, setVehicleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [additionalAmount, setAdditionalAmount] = useState('');
  const [forgivenAmount, setForgivenAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CARD');
  const [submitting, setSubmitting] = useState(false);
  const [inlineMessage, setInlineMessage] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await paymentService.getFinancialSummary();
      setRows(data.summary || []);
      setTotals(data.totals || {});
    } catch (err) {
      setError("Impossible de récupérer les paiements pour le moment.");
      setRows([]);
      setTotals({ total_general_due: 0, total_paid: 0, total_remaining: 0 });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const vehicleOptions = useMemo(() => {
    const seen = new Set();
    const options = [];
    rows.forEach((r) => {
      const key = r.vehicule_immatriculation || r.vehicule_nom;
      if (key && !seen.has(key)) {
        seen.add(key);
        options.push({ value: key, label: `${key}${r.vehicule_nom ? ' · ' + r.vehicule_nom : ''}` });
      }
    });
    return options.sort((a, b) => a.label.localeCompare(b.label));
  }, [rows]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (vehicleFilter !== 'all' && r.vehicule_immatriculation !== vehicleFilter && r.vehicule_nom !== vehicleFilter) {
        return false;
      }

      if (statusFilter !== 'all') {
        const status = (r.payment_status || '').toLowerCase();
        if (statusFilter === 'paid' && !status.includes('pay')) return false;
        if (statusFilter === 'in_progress' && !status.includes('cours')) return false;
        if (statusFilter === 'late' && !status.includes('retard')) return false;
      }

      if (!q) return true;
      const haystack = [
        `${r.client_nom || ''} ${r.client_prenom || ''}`,
        r.vehicule_nom,
        r.vehicule_immatriculation,
      ]
        .filter(Boolean)
        .map((v) => v.toLowerCase());

      return haystack.some((h) => h.includes(q));
    });
  }, [rows, vehicleFilter, statusFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));

  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [vehicleFilter, statusFilter, search]);

  const formatCurrency = (value) => {
    const n = Number(value || 0);
    return n.toLocaleString('fr-MA', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' DH';
  };

  const statusTone = (status, reste) => {
    const lower = (status || '').toLowerCase();
    if (lower.includes('pay') && Number(reste || 0) <= 0) return 'success';
    if (Number(reste || 0) > 0) return 'warning';
    return 'neutral';
  };

  const formatDate = (value) => {
    if (!value) return null;
    try {
      const d = new Date(value);
      if (Number.isNaN(d.getTime())) return null;
      return d.toLocaleDateString('fr-FR');
    } catch {
      return null;
    }
  };

  const styles = {
    page: {
      minHeight: 'calc(100vh - 80px)',
      background: 'var(--bg-secondary)',
      padding: '32px 20px 48px',
      color: 'var(--text-primary)',
    },
    shell: {
      maxWidth: 1180,
      margin: '0 auto',
      display: 'flex',
      flexDirection: 'column',
      gap: 18,
    },
    header: {
      background: 'var(--bg-card)',
      border: '1px solid var(--border-color)',
      borderRadius: 18,
      padding: '20px 22px',
      boxShadow: 'var(--shadow-lg)',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: 16,
      flexWrap: 'wrap',
    },
    titleBlock: {
      display: 'grid',
      gap: 6,
    },
    title: { margin: 0, fontSize: 26, fontWeight: 700, letterSpacing: '-0.01em', color: 'var(--text-primary)' },
    subtitle: { margin: 0, color: 'var(--text-secondary)', fontSize: 14, maxWidth: 640 },
    filters: {
      display: 'flex',
      gap: 10,
      flexWrap: 'wrap',
      alignItems: 'center',
    },
    input: {
      padding: '10px 12px',
      borderRadius: 10,
      border: '1px solid var(--border-color)',
      background: 'var(--bg-primary)',
      color: 'var(--text-primary)',
      minWidth: 220,
      outline: 'none',
    },
    select: {
      padding: '10px 12px',
      borderRadius: 10,
      border: '1px solid var(--border-color)',
      background: 'var(--bg-primary)',
      color: 'var(--text-primary)',
      minWidth: 220,
      outline: 'none',
    },
    cards: {
      display: 'grid',
      gap: 12,
      gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    },
    card: (tone) => ({
      background:
        tone === 'primary'
          ? 'linear-gradient(135deg, #D4A900 0%, #8A6E00 100%)'
          : 'var(--bg-card)',
      border: '1px solid var(--border-color)',
      borderRadius: 14,
      padding: '14px 16px',
      boxShadow: 'var(--shadow-md)',
      color: 'var(--text-primary)',
    }),
    cardLabel: { fontSize: 13, opacity: 0.8, marginBottom: 6, color: 'var(--text-secondary)' },
    cardValue: { fontSize: 22, fontWeight: 700, letterSpacing: '-0.01em' },
    tableWrap: {
      background: 'var(--bg-card)',
      border: '1px solid var(--border-color)',
      borderRadius: 14,
      boxShadow: 'var(--shadow-md)',
      overflow: 'hidden',
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse',
      color: 'var(--text-primary)',
      fontSize: 14,
    },
    th: {
      textAlign: 'left',
      padding: '12px 14px',
      background: 'var(--bg-tertiary)',
      borderBottom: '1px solid var(--border-color)',
      fontWeight: 600,
      fontSize: 13,
      letterSpacing: '0.01em',
      color: 'var(--text-secondary)',
    },
    td: {
      padding: '12px 14px',
      borderBottom: '1px solid var(--border-color)',
      verticalAlign: 'middle',
      color: 'var(--text-primary)',
    },
    badge: (tone) => ({
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      padding: '6px 10px',
      borderRadius: 999,
      fontSize: 12,
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.03em',
      color: tone === 'success' ? '#166534' : 'var(--text-primary)',
      background:
        tone === 'success'
          ? 'rgba(34,197,94,0.18)'
          : tone === 'warning'
            ? 'rgba(251,191,36,0.18)'
            : 'rgba(148,163,184,0.18)',
      border: '1px solid var(--border-color)',
    }),
    empty: {
      padding: '26px 20px',
      textAlign: 'center',
      color: '#94a3b8',
    },
    error: {
      padding: '16px',
      background: 'rgba(212,169,0,0.08)',
      border: '1px solid rgba(212, 169, 0, 0.35)',
      borderRadius: 12,
      color: '#8A6E00',
      fontWeight: 600,
    },
    loader: {
      padding: '24px',
      textAlign: 'center',
      color: 'var(--text-secondary)',
      fontWeight: 600,
    },
    actionBtn: {
      padding: '8px 12px',
      borderRadius: 10,
      border: '1px solid var(--primary-color)',
      background: 'linear-gradient(135deg, rgba(245, 196, 0, 0.12), rgba(212,169,0,0.16))',
      color: 'var(--text-primary)',
      fontWeight: 700,
      fontSize: 13,
      cursor: 'pointer',
      transition: 'transform 120ms ease, box-shadow 120ms ease',
    },
    drawerBackdrop: {
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.55)',
      backdropFilter: 'blur(3px)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 30,
    },
    drawer: {
      width: '100%',
      maxWidth: 520,
      maxHeight: '90vh',
      overflow: 'auto',
      background: 'var(--bg-card)',
      border: '1px solid var(--border-color)',
      boxShadow: 'var(--shadow-lg)',
      padding: '22px 20px 28px',
      display: 'flex',
      flexDirection: 'column',
      gap: 16,
      borderRadius: 16,
    },
    drawerTitle: { fontSize: 18, fontWeight: 700, margin: 0 },
    drawerInput: {
      width: '100%',
      padding: '10px 12px',
      borderRadius: 10,
      border: '1px solid var(--border-color)',
      background: 'var(--bg-primary)',
      color: 'var(--text-primary)',
      outline: 'none',
    },
    drawerLabel: { fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6, fontWeight: 600 },
    drawerGrid: { display: 'grid', gap: 12 },
    primaryBtn: {
      width: '100%',
      padding: '12px 14px',
      borderRadius: 12,
      border: 'none',
      background: 'linear-gradient(135deg, #D4A900 0%, #8A6E00 100%)',
      color: '#f9fafb',
      fontWeight: 800,
      cursor: 'pointer',
      fontSize: 15,
    },
    ghostBtn: {
      width: '100%',
      padding: '12px 14px',
      borderRadius: 12,
      border: '1px solid var(--border-color)',
      background: 'transparent',
      color: 'var(--text-primary)',
      fontWeight: 700,
      cursor: 'pointer',
      fontSize: 14,
    },
    inlineMsg: (tone) => ({
      padding: '10px 12px',
      borderRadius: 10,
      border: `1px solid ${tone === 'error' ? 'rgba(212, 169, 0, 0.4)' : 'rgba(34,197,94,0.35)'}`,
      background: tone === 'error' ? 'rgba(212,169,0,0.08)' : 'rgba(34,197,94,0.08)',
      color: tone === 'error' ? '#8A6E00' : '#166534',
      fontWeight: 600,
      fontSize: 13,
    }),
    sectionTitle: { fontSize: 13, color: 'var(--text-secondary)', fontWeight: 700, letterSpacing: '0.01em' },
    historyBox: {
      border: '1px solid var(--border-color)',
      borderRadius: 12,
      background: 'var(--bg-primary)',
      display: 'grid',
      gap: 8,
      padding: 12,
    },
    historyItem: {
      padding: '8px 10px',
      borderRadius: 10,
      border: '1px solid var(--border-color)',
      background: 'var(--bg-card)',
      display: 'grid',
      gap: 4,
    },
    historyMeta: { color: 'var(--text-secondary)', fontSize: 12 },
    historyHighlight: { fontWeight: 700, color: 'var(--text-primary)' },
  };

  const totalToSubmit = (Number(additionalAmount || 0) || 0) + (Number(forgivenAmount || 0) || 0);
  const disableSubmit = submitting || totalToSubmit <= 0;

  const openDrawer = (payment) => {
    setSelectedPayment(payment);
    setAdditionalAmount('0');
    setForgivenAmount('');
    setPaymentMethod(payment?.reservation_payment_method || 'CARD');
    setInlineMessage(null);
    setHistory([]);
    setHistoryError(null);
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setSelectedPayment(null);
    setSubmitting(false);
  };

  const handleSubmitPayment = async () => {
    if (!selectedPayment) return;
    const paymentId = selectedPayment.id || selectedPayment.payment_id;
    if (!paymentId) {
      setInlineMessage({ tone: 'error', text: 'Identifiant de paiement manquant.' });
      return;
    }

    const payload = {
      additional_amount: additionalAmount || 0,
      forgiven_amount: forgivenAmount || 0,
      method: paymentMethod || 'CARD',
    };

    setSubmitting(true);
    setInlineMessage(null);

    try {
      await paymentService.addPayment(paymentId, payload);
      await fetchData();
      setInlineMessage({ tone: 'success', text: 'Paiement ajouté avec succès.' });
      setTimeout(() => closeDrawer(), 600);
    } catch (err) {
      const detail = err?.response?.data?.detail || "Impossible d'ajouter le paiement.";
      setInlineMessage({ tone: 'error', text: detail });
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    const loadHistory = async () => {
      if (!drawerOpen || !selectedPayment) return;
      const paymentId = selectedPayment.id || selectedPayment.payment_id;
      if (!paymentId) return;

      setHistoryLoading(true);
      setHistoryError(null);
      try {
        const items = await paymentService.getPaymentHistory(paymentId);
        setHistory(items);
      } catch (err) {
        setHistoryError("Impossible de récupérer l'historique pour ce paiement.");
      } finally {
        setHistoryLoading(false);
      }
    };

    loadHistory();
  }, [drawerOpen, selectedPayment]);

  return (
    <div style={styles.page}>
      <div style={styles.shell}>
        <div style={styles.header}>
          <div style={styles.titleBlock}>
            <h1 style={styles.title}>Paiements</h1>
            <p style={styles.subtitle}>Vue claire des encaissements par véhicule avec filtre rapide.</p>
          </div>
          <div style={styles.filters}>
            <input
              style={styles.input}
              placeholder="Rechercher client ou immatriculation"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              style={styles.select}
              value={vehicleFilter}
              onChange={(e) => setVehicleFilter(e.target.value)}
            >
              <option value="all">Tous les véhicules</option>
              {vehicleOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <select
              style={styles.select}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">Tous les statuts</option>
              <option value="paid">Payé</option>
              <option value="in_progress">En cours</option>
              <option value="late">En retard</option>
            </select>
          </div>
        </div>

        <div style={styles.cards}>
          <div style={styles.card('primary')}>
            <div style={styles.cardLabel}>Total dû</div>
            <div style={styles.cardValue}>{formatCurrency(totals.total_general_due || 0)}</div>
          </div>
          <div style={styles.card()}>
            <div style={styles.cardLabel}>Total encaissé</div>
            <div style={styles.cardValue}>{formatCurrency(totals.total_paid || 0)}</div>
          </div>
          <div style={styles.card()}>
            <div style={styles.cardLabel}>Reste à encaisser</div>
            <div style={styles.cardValue}>{formatCurrency(totals.total_remaining || 0)}</div>
          </div>
        </div>

        <div style={styles.tableWrap}>
          {loading && <div style={styles.loader}>Chargement...</div>}
          {!loading && error && <div style={styles.error}>{error}</div>}
          {!loading && !error && (
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Client</th>
                  <th style={styles.th}>Véhicule</th>
                  <th style={styles.th}>Période</th>
                  <th style={styles.th}>Total</th>
                  <th style={styles.th}>Payé</th>
                  <th style={styles.th}>Reste</th>
                  <th style={styles.th}>Statut</th>
                  <th style={styles.th}>Méthode</th>
                  <th style={styles.th}></th>
                </tr>
              </thead>
              <tbody>
                {paginatedRows.length === 0 ? (
                  <tr>
                    <td style={styles.empty} colSpan={9}>Aucune ligne à afficher</td>
                  </tr>
                ) : (
                  paginatedRows.map((row, idx) => {
                    const tone = statusTone(row.payment_status, row.reste);
                    return (
                      <tr key={row.id || row.payment_id || idx}>
                        <td style={styles.td}>
                          <div style={{ fontWeight: 600 }}>{`${row.client_nom || ''} ${row.client_prenom || ''}`.trim() || '—'}</div>
                          <div style={{ color: '#94a3b8', fontSize: 12 }}>{row.client_email || ''}</div>
                        </td>
                        <td style={styles.td}>
                          <div style={{ fontWeight: 600 }}>{row.vehicule_nom || '—'}</div>
                          <div style={{ color: '#94a3b8', fontSize: 12 }}>{row.vehicule_immatriculation || ''}</div>
                        </td>
                        <td style={styles.td}>
                          <div>{row.date_debut ? new Date(row.date_debut).toLocaleDateString('fr-FR') : '—'}</div>
                          <div style={{ color: '#94a3b8', fontSize: 12 }}>{row.date_fin ? new Date(row.date_fin).toLocaleDateString('fr-FR') : ''}</div>
                        </td>
                        <td style={styles.td}>{formatCurrency(row.montant_total)}</td>
                        <td style={styles.td}>{formatCurrency(row.avance)}</td>
                        <td style={styles.td}>{formatCurrency(row.reste)}</td>
                        <td style={styles.td}>
                          <div style={{ display: 'grid', gap: 4 }}>
                            <span style={styles.badge(tone)}>{row.payment_status || '—'}</span>
                            {row.monthly_amount && (
                              <span style={{ fontSize: 11, color: '#e5e7eb' }}>
                                {formatCurrency(row.monthly_amount)} / mois
                                {row.next_due_date && (
                                  <>
                                    {' · '}échéance le {formatDate(row.next_due_date)}
                                  </>
                                )}
                                {row.is_overdue && row.remaining_to_catch_up > 0 && (
                                  <>
                                    {' · '}retard {formatCurrency(row.remaining_to_catch_up)}
                                  </>
                                )}
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={styles.td}>{row.reservation_payment_method || '—'}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}

          {!loading && !error && filteredRows.length > pageSize && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px' }}>
              <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                Page {currentPage} / {totalPages} · {filteredRows.length} lignes
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  style={styles.ghostBtn}
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                >
                  Précédent
                </button>
                <button
                  style={styles.ghostBtn}
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                >
                  Suivant
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {drawerOpen && (
        <div style={styles.drawerBackdrop}>
          <div style={styles.drawer}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={styles.drawerTitle}>Ajouter un paiement</h3>
              <button style={styles.ghostBtn} onClick={closeDrawer} disabled={submitting}>Fermer</button>
            </div>

            {selectedPayment && (
              <div style={{ padding: '10px 12px', borderRadius: 12, background: '#0f172a', border: '1px solid rgba(226,232,240,0.08)', display: 'grid', gap: 6 }}>
                <div style={{ fontWeight: 700 }}>{`${selectedPayment.client_nom || ''} ${selectedPayment.client_prenom || ''}`.trim() || 'Client'}</div>
                <div style={{ color: '#94a3b8', fontSize: 13 }}>{selectedPayment.vehicule_immatriculation || selectedPayment.vehicule_nom || ''}</div>
                <div style={{ color: '#e2e8f0', fontSize: 13 }}>Reste: {formatCurrency(selectedPayment.reste)}</div>
              </div>
            )}

            <div style={styles.drawerGrid}>
              <div>
                <div style={styles.drawerLabel}>Montant ajouté</div>
                <input
                  style={styles.drawerInput}
                  type="number"
                  min="0"
                  max={selectedPayment?.reste ?? undefined}
                  step="0.01"
                  value={additionalAmount}
                  onChange={(e) => setAdditionalAmount(e.target.value)}
                  placeholder="0"
                />
                {selectedPayment?.reste !== undefined && (
                  <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 6 }}>
                    Reste actuel: {formatCurrency(selectedPayment.reste)}. Le reste sera mis à jour après validation.
                  </div>
                )}
              </div>

              <div>
                <div style={styles.drawerLabel}>Montant pardonné (optionnel)</div>
                <input
                  style={styles.drawerInput}
                  type="number"
                  min="0"
                  step="0.01"
                  value={forgivenAmount}
                  onChange={(e) => setForgivenAmount(e.target.value)}
                  placeholder="0"
                />
              </div>

              <div>
                <div style={styles.drawerLabel}>Méthode</div>
                <select style={styles.drawerInput} value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                  <option value="CARD">Carte</option>
                  <option value="CASH">Espèces</option>
                  <option value="TRANSFER">Virement</option>
                  <option value="OTHER">Autre</option>
                </select>
              </div>
            </div>

            {inlineMessage && (
              <div style={styles.inlineMsg(inlineMessage.tone)}>{inlineMessage.text}</div>
            )}

            <div style={{ display: 'grid', gap: 10 }}>
              <div style={styles.sectionTitle}>Historique des paiements</div>
              <div style={styles.historyBox}>
                {historyLoading && <div style={{ color: '#cbd5e1', fontWeight: 600 }}>Chargement...</div>}
                {!historyLoading && historyError && <div style={{ color: '#fecdd3', fontWeight: 600 }}>{historyError}</div>}
                {!historyLoading && !historyError && history.length === 0 && (
                  <div style={{ color: '#94a3b8', fontSize: 13 }}>Aucun mouvement pour l'instant.</div>
                )}
                {!historyLoading && !historyError && history.map((h, idx) => (
                  <div key={idx} style={styles.historyItem}>
                    <div style={styles.historyHighlight}>{formatCurrency(h.amount)} {h.forgiven_amount ? `(Pardonné: ${formatCurrency(h.forgiven_amount)})` : ''}</div>
                    <div style={styles.historyMeta}>{h.method || '—'} · {h.created_at ? new Date(h.created_at).toLocaleString('fr-FR') : ''}</div>
                    {h.notes && <div style={{ color: '#e2e8f0', fontSize: 13 }}>{h.notes}</div>}
                  </div>
                ))}
              </div>
            </div>

            {disableSubmit && !submitting && (
              <div style={{ color: '#94a3b8', fontSize: 12, fontWeight: 600 }}>
                Ajoutez un montant ou un montant pardonné avant de valider.
              </div>
            )}

            <div style={{ display: 'grid', gap: 10 }}>
              <button style={styles.primaryBtn} onClick={handleSubmitPayment} disabled={disableSubmit}>
                {submitting ? 'Envoi...' : 'Valider le paiement'}
              </button>
              <button style={styles.ghostBtn} onClick={closeDrawer} disabled={submitting}>Annuler</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Payments;