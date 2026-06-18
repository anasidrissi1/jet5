# QR Code - Inscription Client JET5

## 📱 Comment ça marche ?

### Pour les clients :
1. **Scanner le QR Code** avec l'appareil photo de leur téléphone
2. **Remplir le formulaire** d'inscription
3. **Envoyer** - La demande arrive instantanément à l'agence

### ✅ Avantages :
- ✨ **Pas besoin de WiFi de l'agence** - Le client peut utiliser sa 4G/5G ou n'importe quel WiFi
- 🌍 **Accessible partout** - Même depuis chez eux avant de venir
- ⚡ **Instantané** - L'agence reçoit la demande en temps réel
- 📄 **Documents** - Le client peut uploader ses documents (CIN, Permis, Passeport)

## 🔗 URL du formulaire :
```
https://locasolution.ma/inscription
```

## 📋 Générer le QR Code :

### Sur le serveur de production :
```bash
cd /var/www/JET5/backend
source venv/bin/activate

# Installer qrcode si pas déjà installé
pip install qrcode[pil]

# Générer le QR code
python scripts/generate_qr_code.py
```

Le QR code sera généré dans : `/var/www/JET5/backend/media/qr_codes/inscription_client_qr.png`

## 🖨️ Impression :
1. Téléchargez l'image QR générée
2. Imprimez-la en bonne qualité (A4 recommandé)
3. Placez-la à l'accueil de l'agence avec le message :

---

### 📱 INSCRIPTION RAPIDE

**Scannez ce code pour vous inscrire !**

✅ Gagnez du temps  
✅ Remplissez depuis votre téléphone  
✅ Documents acceptés : CIN, Permis, Passeport  

---

## 🔧 Configuration technique :

### Backend (Django) :
- ✅ Route API : `/api/clients/requests/` avec `AllowAny`
- ✅ CORS activé pour toutes les origines
- ✅ Uploads de fichiers activés

### Frontend (React) :
- ✅ Route publique : `/inscription`
- ✅ Pas d'authentification requise
- ✅ Formulaire complet avec upload de documents

## 📊 Suivi des demandes :

Les demandes d'inscription sont visibles dans :
**Dashboard → Clients → Demandes en attente**

Chaque demande peut être :
- ✅ Approuvée (crée le client automatiquement)
- ❌ Rejetée

## 🔔 Notifications :

Quand un client soumet une demande via le QR code :
1. Une notification apparaît instantanément dans l'app
2. Le compteur de notifications s'incrémente
3. L'agent peut traiter la demande immédiatement
