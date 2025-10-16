# Backend API - Gestion Utilisateurs, Messages, Dossiers et Notifications 📁

Ce projet est un backend complet développé avec Node.js, Express, et MongoDB (MERN stack sans le frontend) pour la gestion d'utilisateurs, d'une messagerie interne, de dossiers/fichiers et de notifications au sein d'une organisation.

Il intègre une authentification JWT sécurisée, une gestion des rôles (admin, directeur, user), des fonctionnalités d'upload de fichiers robustes et des outils d'import/export de données via Excel.

## 🔹 Table des matières

Fonctionnalités principales

Configuration et installation

Variables d'environnement

Structure du projet

Modèles de données

Middlewares

Routes API

Exemples d'utilisation

## 🔹 Configuration et installation

1. **Cloner le projet**

```bash
git clone <url-du-projet>
cd backend
Installer les dépendances

bash
Copier le code
npm install
Créer le fichier .env (dans config/.env)

env
Copier le code
PORT=5000
MONGO_URI=mongodb://localhost:27017/nom_de_la_base
TOKEN_SECRET=ton_secret_jwt
FRONTEND_URL=http://localhost:5173
Lancer le serveur

bash
Copier le code
npm run dev
Le serveur démarre sur le port défini dans .env (par défaut 3000)

Les fichiers uploadés sont accessibles via http://localhost:3000/uploads/...

🔹 Structure du projet
pgsql
Copier le code
backend/
│
├─ config/
│   └─ db.js          # Connexion MongoDB
├─ controllers/
│   ├─ authControllers.js
│   ├─ userControllers.js
│   ├─ messageController.js
│   ├─ dossierController.js
│   └─ notificationController.js
├─ middlewares/
│   ├─ authMiddlewares.js
│   └─ uploads.js
├─ models/
│   ├─ User.js
│   ├─ Message.js
│   ├─ Dossier.js
│   └─ Notification.js
├─ routes/
│   ├─ auth.route.js
│   ├─ user.route.js
│   ├─ message.routes.js
│   ├─ dossier.routes.js
│   └─ notification.routes.js
├─ public/uploads/    # Fichiers uploadés
└─ server.js
🔹 Modèles de données
1. User
type: admin | directeur | user

nom, prenom, email, password

telephone, isActif, photo, adresse, pays, region, etablissement

Méthodes : login(), génération automatique email, hachage password

2. Message
sujet, contenu, expediteur, destinataires

threadId pour conversations

piecesJointes (PDF, image)

Flags : estBrouillon, estLu, estFavori, estArchive, estSupprime

dateEnvoi, dateSuppression

3. Dossier
nom, proprietaire, parent (dossier parent)

fichiers: nom, url, type, taille, propriétaire

partage: liste des utilisateurs avec accès

4. Notification
user, message, data, lu, createdAt

🔹 Middlewares
requireAuth : vérifie JWT et attache req.user

requireAdmin : vérifie si req.user.type === "admin"

checkRole(...roles) : vérifie les rôles spécifiques

uploads : gère l’upload de photos, PDF, Excel (max 5MB)

🔹 Routes API
Auth
Méthode URL Description
POST /api/auth/login Connexion
GET /api/auth/logout Déconnexion
PATCH /api/auth/toggle/:id Activer/désactiver utilisateur (admin)

Users
Méthode URL Description
POST /api/users/ Créer un utilisateur (upload photo)
GET /api/users/ Récupérer tous les utilisateurs
GET /api/users/me Récupérer utilisateur connecté
GET /api/users/:id Récupérer utilisateur par ID
PUT /api/users/:id Mettre à jour utilisateur
DELETE /api/users/:id Supprimer utilisateur
POST /api/users/reset-password Réinitialiser mot de passe
POST /api/users/import Importer utilisateurs depuis Excel/CSV

Messages
Méthode URL Description
GET /api/messages/recus Messages reçus
GET /api/messages/envoyes Messages envoyés
GET /api/messages/brouillons Brouillons
GET /api/messages/favoris Favoris
GET /api/messages/archives Archivés
GET /api/messages/corbeille Corbeille
GET /api/messages/conversation/:threadId Conversation complète
POST /api/messages/ Envoyer message (upload max 5 fichiers)
PUT /api/messages/:id/lu Marquer comme lu
PUT /api/messages/:id/archive Archiver/désarchiver
PUT /api/messages/:id/favori Ajouter/retirer favori
PUT /api/messages/:id/supprimer Déplacer vers corbeille
PUT /api/messages/:id/restaurer Restaurer depuis corbeille
DELETE /api/messages/:id Supprimer définitivement
GET /api/messages/:id Récupérer message spécifique
GET /api/messages/count/* Statistiques messages (non lus, brouillons, archivés, etc.)

Dossiers
Méthode URL Description
POST /api/dossiers/ Créer dossier
GET /api/dossiers/ Récupérer tous les dossiers
PUT /api/dossiers/:id/rename Renommer dossier
DELETE /api/dossiers/:id Supprimer dossier
POST /api/dossiers/:dossierId/fichiers Ajouter fichier
DELETE /api/dossiers/:dossierId/fichiers/:fichierId Supprimer fichier
PUT /api/dossiers/:id/partager Partager dossier avec utilisateurs

Notifications
Méthode URL Description
GET /api/notifications/ Toutes les notifications de l’utilisateur
PATCH /api/notifications/read/:id Marquer une notification comme lue
PATCH /api/notifications/read-all Marquer toutes comme lues
DELETE /api/notifications/:id Supprimer notification

🔹 Variables d’environnement
Variable Description
PORT Port du serveur (ex: 5000)
MONGO_URI URL de connexion MongoDB
TOKEN_SECRET Secret pour JWT
FRONTEND_URL URL de l’application frontend autorisée

🔹 Fonctionnalités principales
Authentification JWT sécurisée

Gestion de rôles : admin / directeur / user

CRUD complet sur utilisateurs

Gestion des messages avec : brouillons, favoris, archive, corbeille

Upload fichiers : photos, PDF, Excel/CSV

Gestion des dossiers et partage de fichiers

Notifications avec marquage lu/non lu

Import massifs utilisateurs depuis Excel

🔹 Exemple d’utilisation
Envoyer un message
http
Copier le code
POST /api/messages/
Headers:
Authorization: Bearer <token>
Body (form-data):
- sujet: "Réunion"
- contenu: "Le compte rendu ..."
- piecesJointes: fichier1.pdf, fichier2.jpg
Récupérer tous les utilisateurs
http
Copier le code
GET /api/users/
Headers:
Authorization: Bearer <token>
Marquer notification comme lue
http
Copier le code
PATCH /api/notifications/read/64f5a3e1b8a3f1c123456789
Headers:
Authorization: Bearer <token>
✅ Notes
Respecter l’ordre des routes (statistiques / actions globales / routes avec ID)

Tous les uploads sont limités à 5MB par fichier

Tous les endpoints nécessitant authentification utilisent requireAuth

Admin peut activer/désactiver utilisateurs via /auth/toggle/:id

Auteur : Camara Karifa
Projet : Application de gestion utilisateurs et messagerie
```
