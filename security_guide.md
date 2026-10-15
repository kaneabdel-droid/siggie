# Guide Opérationnel de Sécurité et de Haute Performance DembaSolution

Ce guide fournit la procédure pas-à-pas pour configurer votre base de données **Supabase Pro** (Option 1) et votre infrastructure réseau (**Cloudflare, DNS, E-mails**) afin d'obtenir la **sécurité maximale** et la **vitesse d'exécution la plus rapide** pour le domaine `dembasolution.com` et l'ensemble de ses sous-domaines.

---

## 1. Supabase Pro : Configuration Haute Sécurité & Latence Minimale
 
### A. Emplacement de vos bases : Dublin (`eu-west-1`)
Vos bases de données principales (SIGGIE, D-QUINCA, D-INTRANTS, D-AGRO, PCAS, D-PHARMA, D-ÉLEVAGE) sont hébergées sur le datacenter AWS **Dublin (`eu-west-1`)**. (D-SCHOLAR est sur Francfort `eu-central-1`).
 
Pour obtenir le minimum de temps d'attente (latence < 1 ms) :
- Vos fonctions Vercel pour ces applications sont configurées sur la région **`dub1`** (Dublin).
- L'application Next.js et la base de données s'exécutent ainsi dans le **même datacenter AWS physique**.
 
### B. Activation du Connection Pooler Supavisor (Port 6543)
1. Dans votre dashboard Supabase, rendez-vous dans **Project Settings > Database**.
2. Repérez la section **Connection Pooling (Supavisor)**.
3. Configurez :
   - **Pool Mode** : `Transaction` (recommandé pour les applications serverless / Next.js).
   - **Default Pool Size** : 20 à 40 connexions.
4. Dans votre fichier d'environnement de production sur Vercel, utilisez l'URL du pooler :
   ```env
   # Chaîne de connexion directe poolée Dublin (eu-west-1) :
   POSTGRES_URL="postgres://postgres.[votre-ref]:[mot-de-passe]@aws-0-eu-west-1.pooler.supabase.com:6543/postgres?sslmode=require"
   ```
   *(Pour D-SCHOLAR à Francfort : remplacer par `aws-0-eu-central-1.pooler.supabase.com`).*
   *Gain immédiat : suppression du délai de poignée de main TCP/TLS pour chaque requête.*

### C. Pare-feu IP (Network Restrictions)
1. Rendez-vous dans **Project Settings > Database > Network Restrictions**.
2. Par défaut, la base autorise toutes les IP avec SSL (`0.0.0.0/0`).
3. Pour une sécurité absolue, restreignez les accès directs au port `5432` / `6543` aux seules IP fixes autorisées de vos administrateurs, ou utilisez les variables de déploiement sécurisées.

### D. Sauvegardes Continues (PITR - Point-In-Time Recovery)
1. Rendez-vous dans **Database > Backups**.
2. Activez le **Point-In-Time Recovery (PITR)**.
3. Vous disposez alors de la capacité de restaurer la base de données à n'importe quelle seconde exacte des 7 à 30 derniers jours en cas d'erreur de manipulation ou d'attaque.

---

## 2. Configuration Cloudflare : Bouclier WAF, Anti-DDoS & Anti-Scraping

Tous vos sous-domaines (`*.dembasolution.com`) doivent être protégés par le proxy Cloudflare (nuage orange activé sur vos enregistrements DNS).

### A. Activation du Super Bot Fight Mode (Anti-Scraping)
1. Dans Cloudflare, rendez-vous dans **Security > Bots**.
2. Activez le **Bot Fight Mode** (ou **Super Bot Fight Mode** si forfaits Pro/Business) :
   - **Definitely automated** : Choisir **Block** (bloque tous les aspirateurs et scripts automatisés).
   - **Verified bots** (Google, Bing) : Choisir **Allow**.
   - **AI Scrapers and Crawlers** : Choisir **Block**.

### B. Règles de limitation de débit (Rate Limiting)
Pour empêcher les attaques par force brute sur vos pages de connexion :
1. Dans Cloudflare, rendez-vous dans **Security > WAF > Rate limiting rules**.
2. Créez une règle :
   - **Nom** : `Protection Anti-Brute Force Connexion`
   - **Critère** : `URI Path equals "/login"` OR `URI Path equals "/admin/login"`
   - **Seuil** : Plus de 5 requêtes en 10 secondes.
   - **Action** : **Block** (ou **Managed Challenge**) pendant 1 heure.

### C. Activation du DNSSEC (Anti-Subdomain Spoofing)
1. Dans Cloudflare, rendez-vous dans **DNS > Settings**.
2. Activez **DNSSEC**.
3. Copiez les enregistrements DS générés par Cloudflare et collez-les chez votre bureau d'enregistrement de domaine (Registrar).
4. *Effet : aucun attaquant ne peut falsifier les adresses IP de vos sous-domaines par empoisonnement de cache DNS.*

---

## 3. Protection Anti-Usurpation de Marque par E-mail (DMARC, SPF, DKIM)

Pour que personne au monde ne puisse envoyer des e-mails frauduleux en usurpant l'adresse `@dembasolution.com` ou n'importe lequel de ses sous-domaines, ajoutez ces 3 enregistrements DNS :

### A. Enregistrement SPF (TXT)
- **Nom (Hôte)** : `@`
- **Type** : `TXT`
- **Valeur** : `v=spf1 include:resend.com ~all` *(si vous utilisez Resend pour l'envoi d'e-mails de support/notification)*

### B. Enregistrement DKIM (TXT / CNAME)
- Récupérez les clés DKIM générées par votre fournisseur d'e-mails (Resend / Google Workspace) et ajoutez-les dans la zone DNS Cloudflare.

### C. Enregistrement DMARC Strict (TXT)
- **Nom (Hôte)** : `_dmarc`
- **Type** : `TXT`
- **Valeur** :
  ```txt
  v=DMARC1; p=reject; sp=reject; rua=mailto:support@dembasolution.com; adkim=s; aspf=s
  ```
  - `p=reject` : Tout e-mail non signé ou suspect prétendant venir de `@dembasolution.com` est **immédiatement rejeté et détruit** par les serveurs de messagerie mondiaux (Gmail, Outlook, Yahoo).
  - `sp=reject` : Cette protection s'applique **strictement à tous les sous-domaines actuels et futurs** (`@siggie.dembasolution.com`, `@d-quinca.dembasolution.com`, etc.).

---

## 4. Alignement Vercel : Région d'Exécution
 
Pour aligner parfaitement vos applications avec leurs bases de données :
1. **Pour les applications Dublin (SIGGIE, D-QUINCA, D-INTRANTS, D-AGRO, PCAS, D-PHARMA, D-ÉLEVAGE)** :
   Dans le fichier `vercel.json` de chaque application, configurez :
   ```json
   {
     "regions": ["dub1"]
   }
   ```
2. **Pour D-SCHOLAR (base à Francfort `eu-central-1`)** :
   Dans le fichier `vercel.json` du dépôt D-SCHOLAR, configurez :
   ```json
   {
     "regions": ["fra1"]
   }
   ```
   *Ce réglage supprime le transit réseau transfrontalier : l'application et la base sont dans le même centre de données, la latence s'effondre à moins de 1 milliseconde.*

---

## Résumé du niveau de protection atteint

Grâce aux modifications apportées dans le code (en-têtes CSP stricts, masquage `X-Powered-By`, désactivation des sourcemaps en production, module `security.ts` de blocage actif, `robots.txt` anti-IA, frame-busting client `ClientSecurityShield.tsx`) et à ce guide d'infrastructure :
- **Vos données sont étanches** (RLS PostgreSQL au niveau du noyau).
- **Votre code est protégé contre la copie et le clonage** (plus de sourcemaps, frame-ancestors 'none', frame-buster actif).
- **Vos pages sont protégées contre l'aspiration et le scraping** (filtrage des robots IA et scrapers).
- **Vos temps d'accès sont optimisés** avec le pooler de transactions et la colocalisation dans la région la plus proche de l'Afrique de l'Ouest.
