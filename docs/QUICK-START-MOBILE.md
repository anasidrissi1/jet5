# 📱 Guide Rapide - Test Mobile JET5

## 🚀 Lancer le site pour test mobile

### 1️⃣ Démarrer le serveur
```bash
cd frontend
npm run dev
```

Le serveur affichera :
```
VITE v5.x.x  ready in xxx ms

➜  Local:   http://localhost:5173/
➜  Network: http://192.168.1.XXX:5173/
```

### 2️⃣ Ouvrir sur votre téléphone

**Important** : Votre téléphone et ordinateur doivent être sur le **même réseau WiFi**

1. Notez l'adresse **Network** affichée (ex: `http://192.168.1.100:5173`)
2. Ouvrez cette adresse dans le navigateur de votre téléphone
3. Le site s'affiche en version mobile ! 🎉

### 3️⃣ Installer comme application (optionnel)

#### Sur Android :
1. Ouvrez le site dans Chrome
2. Menu (⋮) → "Installer l'application"
3. Validez l'installation

#### Sur iOS :
1. Ouvrez le site dans Safari
2. Bouton Partager → "Sur l'écran d'accueil"
3. Appuyez sur "Ajouter"

## ✅ Points à tester

- [ ] Le menu burger s'ouvre et se ferme
- [ ] Les formulaires sont utilisables au doigt
- [ ] Les boutons sont assez grands
- [ ] Les tables ont un scroll horizontal
- [ ] Pas de zoom involontaire sur les inputs
- [ ] Navigation fluide entre les pages
- [ ] Les cartes s'affichent en 1 colonne

## 🐛 Si ça ne marche pas

### Le téléphone ne trouve pas l'adresse
- Vérifiez que vous êtes sur le même WiFi
- Désactivez temporairement le pare-feu Windows
- Essayez avec l'adresse IP complète

### Le site est lent
- Normal en développement
- En production ce sera beaucoup plus rapide

### Les modifications ne s'affichent pas
- Rafraîchissez la page (tirer vers le bas)
- Videz le cache du navigateur

## 🎨 Breakpoints utilisés

- **Mobile** : < 768px
- **Tablette** : 768px - 1024px  
- **Desktop** : > 1024px

## 📞 Besoin d'aide ?

Consultez [MOBILE-RESPONSIVE.md](./MOBILE-RESPONSIVE.md) pour plus de détails
