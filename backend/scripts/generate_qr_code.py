"""
Script pour générer un QR Code pointant vers le formulaire d'inscription client
Le QR code sera accessible via https://locasolution.ma/inscription
"""
import qrcode
import os

# URL publique du formulaire (accessible même sans être connecté au WiFi de l'agence)
INSCRIPTION_URL = "https://locasolution.ma/inscription"

def generate_qr_code():
    """Générer le QR code pour l'inscription client"""
    
    # Créer le QR code
    qr = qrcode.QRCode(
        version=1,  # Taille du QR code (1-40)
        error_correction=qrcode.constants.ERROR_CORRECT_H,  # Haute correction d'erreur
        box_size=10,  # Taille de chaque boîte en pixels
        border=4,  # Bordure en boîtes
    )
    
    # Ajouter les données
    qr.add_data(INSCRIPTION_URL)
    qr.make(fit=True)
    
    # Créer l'image
    img = qrcode.make(INSCRIPTION_URL)
    
    # Sauvegarder
    output_dir = os.path.join(os.path.dirname(__file__), '..', 'media', 'qr_codes')
    os.makedirs(output_dir, exist_ok=True)
    
    output_path = os.path.join(output_dir, 'inscription_client_qr.png')
    img.save(output_path)
    
    print(f"✅ QR Code généré avec succès!")
    print(f"📍 Emplacement: {output_path}")
    print(f"🔗 URL: {INSCRIPTION_URL}")
    print(f"\n📱 Ce QR code permet aux clients de s'inscrire via leur téléphone,")
    print(f"   même s'ils ne sont PAS connectés au WiFi de l'agence.")
    print(f"   Ils ont juste besoin d'une connexion internet (4G/5G/WiFi quelconque)")
    
    return output_path

if __name__ == '__main__':
    generate_qr_code()
