from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from io import BytesIO


def generate_invoice_pdf(reservation, payment):
    """
    Generate a simple PDF invoice for the payment.
    Returns bytes of the PDF.
    """
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    styles = getSampleStyleSheet()
    story = []

    # Title
    story.append(Paragraph("Invoice", styles['Title']))
    story.append(Spacer(1, 12))

    # Reservation details
    story.append(Paragraph(f"Reservation ID: {reservation.id}", styles['Normal']))
    story.append(Paragraph(f"Client: {reservation.client.nom} {reservation.client.prenom}", styles['Normal']))
    story.append(Paragraph(f"Car: {reservation.voiture.marque} {reservation.voiture.modele}", styles['Normal']))
    story.append(Paragraph(f"Start Date: {reservation.date_debut}", styles['Normal']))
    story.append(Paragraph(f"End Date: {reservation.date_fin}", styles['Normal']))
    story.append(Spacer(1, 12))

    # Payment details
    story.append(Paragraph(f"Payment ID: {payment.id}", styles['Normal']))
    story.append(Paragraph(f"Amount: {payment.amount}", styles['Normal']))
    story.append(Paragraph(f"Method: {payment.method}", styles['Normal']))
    story.append(Paragraph(f"Status: {payment.status}", styles['Normal']))
    story.append(Paragraph(f"Paid At: {payment.paid_at}", styles['Normal']))

    doc.build(story)
    buffer.seek(0)
    return buffer.getvalue()
