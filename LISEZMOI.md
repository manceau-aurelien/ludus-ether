# Ludus — L'École des Gardiens

Jeu incrémental construit sur le moteur d'*Éclats d'Éther*. Vous dirigez le **Ludus de l'Éther**, une école de gladiateurs. Votre champion combat seul ; vous, vous l'entraînez.

## Lancer le jeu
Double-cliquez sur `index.html` (fonctionne hors ligne). La partie est sauvegardée automatiquement dans le navigateur.
Le jeu d'origine est disponible en bonus depuis le titre : *Bonus : Éclats d'Éther (jeu classique)*.

## Sauvegardes
- **5 écoles indépendantes** (menu *Mes écoles*) : chacune a son champion et sa progression. Idéal pour essayer plusieurs personnages ou avoir une école par partenaire de coopération.
- Sauvegarde automatique dans le navigateur : à chaque achat, à chaque retour au camp, toutes les 10 secondes, et dès que l'onglet est masqué ou fermé. Une copie de secours est conservée en parallèle.
- Le jeu demande au navigateur de conserver ses données durablement. Évitez la navigation privée (tout y est effacé à la fermeture) et le nettoyage des « données de sites ».
- **Exporter** télécharge un fichier de sauvegarde ; **Importer** le recharge dans un emplacement libre (pour une copie de sécurité ou pour changer d'ordinateur ou de navigateur).

## Principe
- Vous choisissez **un** gladiateur parmi les 8 Gardiens. Au départ, il a très peu de vie, réagit lentement, se place mal, ne bloque jamais et n'a ni mana ni pouvoir : il ne remporte son premier duel qu'environ 3 fois sur 10.
- Il combat automatiquement les 5 paliers de la campagne (5 vagues chacun, un boss à la fin), puis l'**Arène des Champions**, sans fin, où plusieurs boss finissent par attaquer ensemble.
- Chaque ennemi vaincu rapporte de l'**expérience (XP)** : 30 XP pour le premier pillard, bien plus pour les boss et les paliers avancés. Une défaite renvoie à la vague 1 du palier mais rapporte une **prime de résilience** fixe (30 XP) ; l'XP déjà gagnée est conservée.
- Après chaque défaite ou palier remporté, le gladiateur rentre au **camp d'entraînement** : repos complet, et c'est **le seul endroit où l'on valide ses points**. L'arbre reste consultable pendant les combats. Le départ du camp se fait par le bouton *Partir au combat* (Entrée) ou automatiquement après 15 s (désactivable avec O ; le compte à rebours est suspendu tant que l'arbre est ouvert). Choisir un autre palier en plein combat fait se replier le gladiateur au camp.
- **Paliers (P)** : revenir sur un palier déjà franchi. **Mode (R)** : *Avancer* (palier suivant après une victoire) ou *Répéter* (rester pour accumuler de l'XP).

## Coopération en ligne
Depuis le titre : *Coopération en ligne*. Chaque joueur doit avoir fondé son école.
- **Héberger** : un code de 5 caractères s'affiche, à donner à votre partenaire.
- **Rejoindre** : saisissez le code de l'hôte.
- Paliers 1 à 3 : chaque joueur amène **uniquement son champion**. **À partir du palier 4** (et dans l'Arène des Champions) : les ennemis ordinaires sont **deux fois plus nombreux**, et chaque joueur amène aussi **ses recrues** (avec leurs propres améliorations). On joue les **paliers de l'hôte**, qui choisit la vitesse et lance les départs ; l'invité peut signaler qu'il est prêt.
- **Dégâts des ennemis ×2, XP gagnée ×2.** Chacun reçoit l'XP dans **sa propre école** et l'utilise dans son propre arbre, au camp (les paliers ne se débloquent que chez l'hôte).
- La défaite survient quand les deux champions sont à terre. Si l'invité se déconnecte, l'hôte continue seul (et le même code reste valable pour revenir).
- Connexion internet nécessaire : la mise en relation passe par le service gratuit PeerJS, puis la partie se joue en direct entre les deux navigateurs. Deux onglets d'un même navigateur partagent la même sauvegarde : pour jouer à deux, utilisez deux ordinateurs (ou deux navigateurs différents).

## L'arbre (T)
- **Intelligence** : réflexes, placement, précision, garde, esquive, fluidité des combos, gestion de la mana, sens tactique (10 niveaux chacun). C'est la branche **la moins chère** : votre gladiateur apprend vite à bien se battre, ce sont ses statistiques qui le freinent.
- **Compétences** : enchaînement, coup final, saisie, saut, course, attaque en course, grand saut, roulade, objets, puis les 4 pouvoirs du personnage (5 niveaux chacun).
- **Renforcements** : le 3e pouvoir de chaque Gardien est un sort de renforcement temporaire (6 s + 1 s par niveau) :
  Kael *Souffle du Zéphyr* (vitesse et esquive) · Brasia *Fureur Ardente* (dégâts) · Nivale *Armure de Givre* (insensible aux projectiles) · Volt *Surcharge* (coups électrisants, mana) · Borak *Peau de Granit* (résistance, inébranlable) · Nyx *Voile d'Ombre* (camouflage, dégâts) · Lyra *Sève Vivifiante* (régénération de l'équipe proche) · Tekk *Bouclier Énergétique* (absorbe les dégâts).
- **Statistiques** : force (coups et pouvoirs), résistance, vitalité, réserve de mana, régénération de mana, agilité.
- **Utilitaire** : accélération du temps (×2, ×3, ×4), prime d'expérience, soins entre les vagues, élixirs, et **l'équipe** (2 recrues).
- **Recrues** : compétences à débloquer, IA moyenne fixe, statistiques limitées au niveau 10. L'XP est commune à toute l'école.

## Commandes
Souris, ou clavier : T arbre, P paliers, R mode, 1 à 4 vitesse, Échap menu, M musique. Dans l'arbre : Tab change d'onglet, flèches pour naviguer, Entrée pour améliorer.
