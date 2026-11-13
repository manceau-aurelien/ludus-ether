# Éclats d'Éther — Les Gardiens Élémentaires

Jeu de baston en 2,5D dans l'esprit de Little Fighter 2, avec ses propres combattants, pouvoirs et histoire.

## Lancer le jeu
Double-cliquez sur `index.html` (aucune installation nécessaire, fonctionne hors ligne dans Chrome, Edge ou Firefox).

## Modes
- **Histoire** (1 ou 2 joueurs) : 5 étapes de 5 vagues chacune, un boss par étape, dialogues, un allié qui vous rejoint à l'étape 4. Terminer l'histoire rend les 5 boss jouables.
- **Versus** : jusqu'à 4 combattants (joueurs ou ordinateur), en solo ou par équipes, dans 6 arènes.
- **Survie** : vagues d'ennemis sans fin, un boss toutes les 5 vagues, record sauvegardé.

## Commandes (positions des touches)
| Action  | Joueur 1 | Joueur 2 |
|---------|----------|----------|
| Déplacement | Z Q S D (W A S D en QWERTY) | Flèches |
| Attaque (A) | J | Pavé 1 ou `;` |
| Saut (J)    | K | Pavé 2 ou `:` |
| Défense (D) | L | Pavé 3 ou `!` |

Échap ou P : pause (avec la liste des pouvoirs). M : couper la musique.

**Touches personnalisables** : menu *Options → Configurer les touches* (ou *Commandes*, puis Attaque). Choisissez l'action et le joueur, validez, puis appuyez sur la nouvelle touche. Si la touche servait déjà à une autre action, les deux actions échangent leurs touches. Les réglages sont sauvegardés dans le navigateur, et un bouton permet de revenir aux touches par défaut. Échap, P, M et Tab sont réservées.

**Pouvoirs** : enchaîner rapidement Défense, une direction, puis Attaque ou Saut. Par exemple, D → A signifie Défense, Avant, Attaque.

## Les Gardiens
| Gardien | Élément | D → A | D ↑ A | D → J | D ↓ A / D ↓ J |
|---|---|---|---|---|---|
| Kael | Vent | Lame de Vent | Cyclone Ascendant | Pas du Zéphyr | Grande Tornade |
| Brasia | Feu | Boule de Feu | Colonne Ardente | Comète | Pluie de Braises |
| Nivale | Glace | Éclat de Givre (gèle) | Pics de Glace | Glissade Polaire | Mur de Glace (D ↓ J) |
| Volt | Foudre | Arc Électrique | Jugement Céleste | Éclair | Champ Statique |
| Borak | Terre | Rocher | Pic de Roche | Charge du Taureau | Séisme |
| Nyx | Ombre | Orbe du Néant | Faux Spectrale | Pas de l'Ombre | Double Ténébreux (D ↓ J) |
| Lyra | Nature | Lianes Étreignantes | Floraison Épineuse | Graine Explosive | Bénédiction (soin, D ↓ J) |
| Tekk | Technologie | Roquette Chercheuse | Rayon Laser | Propulseur | Mine |

## Structure du code
- `js/core.js` : constantes, clavier, sons et musique synthétisés
- `js/render.js` : poses, dessin des personnages, effets, décors
- `js/entities.js` : combattants, projectiles, objets
- `js/data.js` : pouvoirs, personnages, étapes et textes de l'histoire
- `js/ai.js` : intelligence artificielle
- `js/game.js` : moteur de combat, caméra, interface
- `js/scenes.js` : menus et modes de jeu
