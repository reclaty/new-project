# GAÏA Drone Controller

PWA React / TypeScript de **simulation**, préparée pour une intégration future du drone Action 3225715. Elle ne pilote pas le drone réel : son protocole de commande, sa vidéo, sa télémétrie, ses ports et ses formats restent inconnus. La passerelle `192.168.80.1` fournie par l'utilisateur n'est pas une preuve de service ou d'API et l'application ne la contacte pas. Ne pas utiliser cette application comme commande de vol réelle.

## Démarrage et vérification

Prérequis : Node.js 20.19+ (ou 22.12+) et npm.

```sh
npm ci
npm run dev          # développement
npm test             # tests du transport
npm run build        # TypeScript strict + production + service worker
npm run preview      # aperçu local de dist/
```

En simulation, choisissez **Connecter la simulation**, puis **Décoller** pour faire évoluer la télémétrie virtuelle. Le joystick gauche règle altitude et rotation ; le droit la direction et la vitesse. Les deux reviennent au neutre au relâchement, à l'annulation du pointeur, à la perte de focus ou à la mise en arrière-plan. L'atterrissage, la déconnexion et le changement de mode neutralisent également les entrées. Les valeurs, la batterie et le signal sont fictifs. Il ne s'agit pas d'un modèle physique de l'appareil.

La photo télécharge une image PNG du canevas simulé. La vidéo enregistre ce même canevas, sans les éléments HUD, et se télécharge à l'arrêt si `captureStream` et `MediaRecorder` sont disponibles ; sinon un message explique l'indisponibilité. Les formats et le comportement de téléchargement varient selon le navigateur et la version d'iOS. Les captures ne proviennent jamais d'une caméra réelle.

## Déploiement et installation iPhone

1. Exécuter `npm ci && npm run build` et publier le contenu de `dist/` à la **racine** d'un hébergement statique HTTPS (par exemple Cloudflare Pages, Netlify ou Vercel). Configurer le repli des routes vers `index.html` si nécessaire. Les chemins de ressources sont conçus pour une racine de domaine, pas un sous-répertoire.
2. Ouvrir l'URL HTTPS dans Safari sur l'iPhone **avec Internet**, attendre le chargement complet puis utiliser Partager → « Sur l'écran d'accueil ». Ouvrir l'application installée une première fois avec Internet pour permettre l'installation du service worker et de son cache.
3. Ensuite rejoindre le Wi-Fi du drone dans les réglages iOS et rouvrir l'application depuis l'écran d'accueil. Le service worker précache l'interface, les polices et le paysage de simulation pour fonctionner hors ligne après installation réussie. Le cache peut être supprimé par iOS ; si l'app ne s'ouvre plus hors ligne, la recharger avec Internet. Le Wi-Fi du drone peut ne pas fournir d'accès Internet.
4. Tourner l'iPhone en paysage. L'orientation du manifest est une préférence, non une garantie sur iOS. L'API plein écran peut ne pas être disponible dans Safari iPhone ; le mode autonome après ajout à l'écran d'accueil est la voie recommandée. Le bouton affiche une explication en cas d'échec.

Le service worker est actif en production, pas dans le serveur de développement. Tester la mise à jour, le cache, l'installation et les captures sur l'iPhone et la version d'iOS visés : les tests automatisés de ce dépôt ne remplacent pas un essai matériel.

## Architecture et garde-fous

- `src/transport.ts` : contrat `DroneTransport`, commandes, vitesse et télémétrie ; contrats optionnels `DroneVideoSource` et `DroneCapture` pour des adaptateurs futurs. `SimulationTransport` est un modèle entièrement local. `UnavailableTransport` ne réalise aucune E/S réseau et refuse la connexion et les actions de vol.
- `src/Joystick.tsx` : Pointer Events avec capture du pointeur, multitouch indépendant, retour au neutre et gestion des interruptions. Les joysticks sont désactivés en mode réel et lorsque la simulation est déconnectée.
- `src/Camera.tsx` : paysage généré et animé dans un canevas, clairement identifié comme simulation. `src/App.tsx` orchestre la session, les captures locales et l'interface.
- Aucun décollage automatique, découverte réseau, scan de ports, commande ou flux réel. L'accès Wi-Fi effectif du téléphone n'est pas détectable depuis cette page : l'indicateur de connexion représente seulement l'état de la simulation.

Avant toute intégration réelle : identifier et documenter les protocoles à partir de sources ou captures autorisées ; vérifier le transport, les messages, les limites de vitesse, la neutralisation et les comportements de perte de liaison ; établir la compatibilité iOS ; ajouter un adaptateur séparé et des tests, puis réaliser des essais encadrés sans hélices avant tout vol. Le retour au neutre de l'interface ne garantit pas un arrêt matériel : celui-ci devra être implémenté et validé dans le protocole réel, y compris pour une perte de réseau ou de processus.

## Contraintes réseau Safari iOS

- **WebSocket** : API disponible, mais nécessite un serveur parlant WebSocket et un protocole applicatif connu. Une page HTTPS ne peut généralement pas utiliser `ws://` non sécurisé (contenu mixte). `wss://` nécessite un service et un certificat acceptés ; rien ne prouve que le drone en propose.
- **WebRTC** : Safari expose les API WebRTC, mais il faut un pair compatible, une signalisation, une négociation et des codecs compatibles. Ce n'est pas un accès générique à un flux UDP quelconque. Voir [WebKit — WebRTC](https://webkit.org/blog/7763/a-closer-look-into-webrtc/).
- **HTTP** : `fetch` est soumis à CORS et aux règles de contenu mixte. Depuis une PWA HTTPS, des requêtes HTTP vers une IP privée peuvent être bloquées ; les médias HTTP peuvent être mis à niveau vers HTTPS. Voir [MDN — Mixed content](https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Mixed_content) et [WebKit Safari 18](https://webkit.org/blog/15865/webkit-features-in-safari-18-0/).
- **UDP brut** : pas d'API JavaScript Safari générale pour ouvrir un socket UDP arbitraire. WebRTC utilise éventuellement UDP sous son propre protocole, ce qui ne permet pas d'envoyer les datagrammes propriétaires du drone. Si le drone ne parle qu'UDP brut, une PWA seule ne suffira probablement pas ; une passerelle ou application native compatible serait à étudier, contrairement à l'objectif sans installation native.
- **Réseau local** : rejoindre manuellement le Wi-Fi ne donne pas au site le SSID, l'état réel du drone, ni une permission universelle d'accès. Les restrictions, autorisations, protections de confidentialité et comportements évoluent selon iOS/Safari (notamment en navigation privée). Voir [WebKit — Private Browsing](https://webkit.org/blog/15697/private-browsing-2-0/). Tester sur les versions visées, sans contourner les protections.

Aucune de ces API ne démontre la compatibilité de ce drone. L'installation d'une PWA et la simulation ne nécessitent pas que le drone soit accessible.
