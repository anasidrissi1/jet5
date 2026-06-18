import logoUrl from '../assets/jet5logo.png';

/**
 * Génère une facture PDF professionnelle pour une réservation
 */
export const generateInvoicePDF = async (invoiceData) => {
  const { reservation, payments, client, car, secondaryDriver } = invoiceData;

  const { jsPDF } = await import('jspdf');

  const doc = new jsPDF();

  // Couleurs
  const primaryColor = [15, 118, 110];

  // Petite configuration de la société (fixe)
  const COMPANY = {
    name: 'JET5',
    address: '11 Rue du Liban, Casablanca 20250',
    ice: 'ICE: 123456789',
    phone: 'Tél: 06 25 99 07 09',
    website: 'www.jet5.ma',
    email: 'jet5.casa@gmail.com'
  };

  // Charger le logo (transforme l'URL en dataURL) — si échec, on revert sur le texte
  const getImageDataUrl = async (url) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      return await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  };

  const logoDataUrl = await getImageDataUrl(logoUrl);

  // Style inspiré du scan : en-tête clair, logo en haut à gauche, date en haut à droite
  doc.setDrawColor(200, 200, 200);

  if (logoDataUrl) {
    // Afficher le logo (dimension et position compatibles A4 petites marges)
    doc.addImage(logoDataUrl, 'PNG', 15, 10, 48, 20);
  } else {
    // Fallback texte
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text(COMPANY.name, 20, 30);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Location de Voitures', 20, 36);
  }

  // Afficher les infos fixes société sous le logo
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const companyInfoX = 15;
  const companyInfoY = 34;
  doc.text(COMPANY.address, companyInfoX, companyInfoY + 6);
  doc.text(COMPANY.ice, companyInfoX, companyInfoY + 11);
  doc.text(COMPANY.phone, companyInfoX, companyInfoY + 16);
  

  // Date en haut à droite (format similaire au scan)
  const invoiceDate = reservation.invoice_date || reservation.date_creation || reservation.date || new Date().toLocaleDateString('fr-FR');
  doc.setFontSize(9);
  doc.text(`Casablanca le : ${new Date(invoiceDate).toLocaleDateString('fr-FR')}`, 150, 30);

  // Facture and ICE client under the logo
  doc.setFontSize(10);
  if (client?.ice) doc.text(`ICE Client : ${client.ice}`, 20, 56);

  // Encadré client (droite)
  // Grand encadré client (droite) avec nom d'entreprise centré, style du scan
  const boxX = 120;
  const boxY = 40;
  const boxW = 75;
  const boxH = 36;
  doc.setDrawColor(200, 200, 200);
  doc.rect(boxX, boxY, boxW, boxH);
  // Client entreprise (si exists) - placer en haut du document, mais garder les détails client à gauche
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  const clientTitle = client?.entreprise || '';
  if (clientTitle) {
    doc.text(clientTitle, boxX + 4, boxY + 10);
  }
  // Dans la même boîte, afficher les informations véhicule (format similaire au scan)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('INFORMATIONS VEHICULE', boxX + 6, boxY + 14);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Vehicule: ${car?.marque || ''} ${car?.modele || ''}`.trim(), boxX + 6, boxY + 20);
  doc.text(`Immatriculation: ${car?.immatriculation || '-'}`, boxX + 6, boxY + 26);
  doc.text(`Couleur: ${car?.couleur || 'N/A'}`, boxX + 6, boxY + 32);
  
  // Informations Client - placer sous la boîte véhicule pour éviter chevauchement
  const clientInfoY = boxY + boxH + 6;
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('INFORMATIONS CLIENT', 15, clientInfoY);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Nom: ${client.nom} ${client.prenom}`, 15, clientInfoY + 8);
  doc.text(`CIN: ${client.cin || 'N/A'}`, 15, clientInfoY + 15);
  doc.text(`Telephone: ${client.telephone || 'N/A'}`, 15, clientInfoY + 22);
  doc.text(`Email: ${client.email || 'N/A'}`, 15, clientInfoY + 29);
  
  let currentY = clientInfoY + 29;
  
  if (secondaryDriver) {
    currentY += 7;
    doc.setFont('helvetica', 'bold');
    doc.text('Conducteur Secondaire:', 15, currentY);
    currentY += 7;
    doc.setFont('helvetica', 'normal');
    doc.text(`${secondaryDriver.nom} ${secondaryDriver.prenom}`, 15, currentY);
  }
  
  // Les informations véhicule sont affichées dans la boîte à droite (au dessus)
  
  // Tableau style facture (Désignation | Durée de location | Prix par jour ttc | Prix TTC)
  currentY = Math.max(currentY, boxY + boxH) + 20;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);

  // calculer largeur et centrer la table horizontalement
  const pageWidth = doc.internal.pageSize.width;
  // colonnes en pixels (largeur fixe pour clarté)
  const colWidths = {
    designation: 86,
    duree: 48,
    prixParJour: 30,
    prixTTC: 30
  };
  const tableW = colWidths.designation + colWidths.duree + colWidths.prixParJour + colWidths.prixTTC;
  const tableX = (pageWidth - tableW) / 2;

  // positions des colonnes
  const col1 = tableX; // Désignation (left)
  const col2 = col1 + colWidths.designation; // Durée
  const col3 = col2 + colWidths.duree; // Prix par jour
  const col4 = col3 + colWidths.prixParJour; // Prix TTC

  // Header row
  const headerH = 10;
  doc.setFillColor(243, 244, 246);
  doc.rect(tableX, currentY, tableW, headerH, 'F');
  doc.setTextColor(0, 0, 0);
  // Titres centrés dans leur colonne
  doc.text('Désignation', col1 + colWidths.designation / 2, currentY + 7, { align: 'center' });
  doc.text('Durée de location', col2 + colWidths.duree / 2, currentY + 7, { align: 'center' });
  doc.text('Prix par jour TTC', col3 + colWidths.prixParJour / 2, currentY + 7, { align: 'center' });
  doc.text('Prix TTC', col4 + colWidths.prixTTC / 2, currentY + 7, { align: 'center' });

  // Préparer les contenus et gérer le wrapping
  const rowStartY = currentY + headerH + 6;
  doc.setFont('helvetica', 'normal');
  const designation = `${car?.marque || ''} ${car?.modele || ''}`.trim() || 'N/A';
  const period = reservation.date_debut && reservation.date_fin ? `DU ${reservation.date_debut} AU ${reservation.date_fin}` : reservation.periode || '';
  const durationLabel = reservation.duree_label || `${reservation.nombre_jours || 0} jour(s)`;
  const prixParJour = `${parseFloat(reservation.prix_journalier || 0).toFixed(2)} MAD`;
  const prixTTC = `${parseFloat(reservation.montant_total || 0).toFixed(2)} MAD`;

  const dLines = doc.splitTextToSize(designation, colWidths.designation - 8);
  const pLines = doc.splitTextToSize(period || durationLabel, colWidths.duree - 8);
  const ppLines = doc.splitTextToSize(prixParJour, colWidths.prixParJour - 8);
  const ptLines = doc.splitTextToSize(prixTTC, colWidths.prixTTC - 8);
  const maxLines = Math.max(dLines.length, pLines.length, ppLines.length, ptLines.length);
  const lineHeight = 5;
  const rowHeight = maxLines * lineHeight + 6;

  // Dessiner bordures de la table (header + row)
  const tableTop = currentY;
  const tableHeight = headerH + rowHeight + 6;
  doc.setDrawColor(200, 200, 200);
  doc.rect(tableX, tableTop, tableW, tableHeight);
  // vertical separators
  doc.line(col2, tableTop, col2, tableTop + tableHeight);
  doc.line(col3, tableTop, col3, tableTop + tableHeight);
  doc.line(col4, tableTop, col4, tableTop + tableHeight);

  // écrire chaque cellule (gestion de l'alignement : texte à gauche, montants à droite)
  for (let i = 0; i < maxLines; i++) {
    const y = rowStartY + i * lineHeight;
    if (dLines[i]) doc.text(dLines[i], col1 + 4, y);
    if (pLines[i]) doc.text(pLines[i], col2 + 4, y);
    if (ppLines[i]) doc.text(ppLines[i], col3 + colWidths.prixParJour - 6, y, { align: 'right' });
    if (ptLines[i]) doc.text(ptLines[i], col4 + colWidths.prixTTC - 6, y, { align: 'right' });
  }

  currentY = tableTop + tableHeight + 12;

  // Totaux (box)
  const totalsW = 80;
  // aligner la boîte des totaux avec le bord droit de la table
  const totalsX = tableX + tableW - totalsW;
  doc.setDrawColor(200, 200, 200);
  doc.rect(totalsX, currentY - 2, totalsW, 34);

  const totalHT = parseFloat(reservation.montant_total || 0);
  const tva = +(totalHT * 0.2).toFixed(2);
  const totalTTC = +(totalHT + tva).toFixed(2);

  doc.setFont('helvetica', 'normal');
  // mettre les labels à gauche et montants à droite dans la boîte
  doc.text('Total HT', totalsX + 8, currentY + 8);
  doc.text(`${totalHT.toFixed(2)} MAD`, totalsX + totalsW - 8, currentY + 8, { align: 'right' });
  doc.text('TVA 20%', totalsX + 8, currentY + 16);
  doc.text(`${tva.toFixed(2)} MAD`, totalsX + totalsW - 8, currentY + 16, { align: 'right' });
  doc.setFont('helvetica', 'bold');
  doc.text('Total TTC', totalsX + 8, currentY + 26);
  doc.text(`${totalTTC.toFixed(2)} MAD`, totalsX + totalsW - 8, currentY + 26, { align: 'right' });

  currentY += 44;

  // Montant en toutes lettres (simple conversion)
  const amountInWords = numberToFrenchWords(Math.round(totalTTC));
  doc.setFont('helvetica', 'normal');
  doc.text(`Arrêté la présente facture à la somme de : ${amountInWords} MAD TTC`, 15, currentY);
  
  // Historique des paiements
  currentY += 10;
  doc.setFillColor(243, 244, 246);
  doc.rect(15, currentY, 180, 8, 'F');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('HISTORIQUE DES PAIEMENTS', 15, currentY + 6);
  
  currentY += 15;
  doc.setFontSize(10);
  
  if (payments && payments.length > 0) {
    // En-têtes
    doc.setFont('helvetica', 'bold');
    doc.text('Date', 20, currentY);
    doc.text('Montant', 70, currentY);
    doc.text('Methode', 120, currentY);
    doc.text('Reference', 160, currentY);
    currentY += 7;
    
    // Ligne de séparation
    doc.setDrawColor(200, 200, 200);
    doc.line(15, currentY - 2, 195, currentY - 2);
    
    // Données
    doc.setFont('helvetica', 'normal');
    payments.forEach(p => {
      doc.text(p.date_paiement || 'N/A', 20, currentY);
      doc.text(`${parseFloat(p.montant || 0).toFixed(2)} MAD`, 70, currentY);
      doc.text(p.methode_paiement || 'N/A', 120, currentY);
      doc.text(p.reference || '-', 160, currentY);
      currentY += 7;
    });
    
    // Total
    currentY += 5;
    const totalPaid = payments.reduce((sum, p) => sum + parseFloat(p.montant || 0), 0);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(`Total paye: ${totalPaid.toFixed(2)} MAD`, 140, currentY);
    
    currentY += 7;
    const remaining = parseFloat(reservation.montant_total || 0) - totalPaid;
    if (remaining > 0) {
      doc.setTextColor(220, 38, 38);
      doc.text(`Reste a payer: ${remaining.toFixed(2)} MAD`, 140, currentY);
    } else {
      doc.setTextColor(5, 150, 105);
      doc.text('Paiement complet', 140, currentY);
    }
    doc.setTextColor(0, 0, 0);
  } else {
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(107, 114, 128);
    doc.text('Aucun paiement enregistre', 20, currentY);
    doc.setTextColor(0, 0, 0);
  }
  
  // Commentaires
  if (reservation.commentaire) {
    currentY += 15;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Commentaires:', 15, currentY);
    
    currentY += 7;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const splitComment = doc.splitTextToSize(reservation.commentaire, 180);
    doc.text(splitComment, 15, currentY);
  }
  
  // Pied de page
  const pageHeight = doc.internal.pageSize.height;
  doc.setFillColor(...primaryColor);
  doc.rect(0, pageHeight - 20, 210, 20, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`Merci pour votre confiance | ${COMPANY.website}`, 105, pageHeight - 12, { align: 'center' });
  doc.text(`${COMPANY.website} | ${COMPANY.email}`, 105, pageHeight - 7, { align: 'center' });
  
  // Sauvegarder
  const fileName = `Facture_${reservation.id}_${client.nom}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
};

  // Petite fonction utilitaire pour convertir un entier en mots français (approx.)
  const numberToFrenchWords = (n) => {
    if (!Number.isFinite(n)) return '';
    if (n === 0) return 'zéro';
    const units = ['','un','deux','trois','quatre','cinq','six','sept','huit','neuf','dix','onze','douze','treize','quatorze','quinze','seize'];
    if (n < 17) return units[n];
    if (n < 20) return 'dix-' + units[n-10];
    if (n < 100) {
      const tens = ['','dix','vingt','trente','quarante','cinquante','soixante','soixante-dix','quatre-vingt','quatre-vingt-dix'];
      const t = Math.floor(n/10);
      const u = n % 10;
      if (t === 7 || t === 9) return tens[t].replace('-','') + (u ? '-' + units[10+u] : '');
      return tens[t] + (u ? (t === 8 ? (u === 0 ? '' : '-' + units[u]) : '-' + units[u]) : '');
    }
    if (n < 1000) {
      const h = Math.floor(n/100);
      const rest = n % 100;
      return (h > 1 ? units[h] + ' cent' : 'cent') + (rest ? ' ' + numberToFrenchWords(rest) : '');
    }
    if (n < 1000000) {
      const thousands = Math.floor(n/1000);
      const rest = n % 1000;
      return (thousands > 1 ? numberToFrenchWords(thousands) + ' mille' : 'mille') + (rest ? ' ' + numberToFrenchWords(rest) : '');
    }
    return n.toString();
  };

export default generateInvoicePDF;
