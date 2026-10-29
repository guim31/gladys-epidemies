# Épidémies saisonnières (Sentinelles)

Infections respiratoires aiguës, diarrhée aiguë (gastro-entérite) et varicelle dans votre région, telles que le
**réseau Sentinelles** (Inserm, Sorbonne Université) les mesure chaque semaine avec des médecins généralistes : un
appareil par région, avec le taux hebdomadaire de chaque maladie et sa tendance. Avec des déclencheurs de scène, une
action de scène et un widget de tableau de bord.

> **Information épidémiologique, pas un avis médical.** Ce sont des estimations pour toute une région, avec de larges
> intervalles de confiance. Pour votre santé, demandez à votre médecin.

Non affiliée au réseau Sentinelles.

## Ce que vous obtenez

- **Un appareil par zone** choisie : les 13 régions de France métropolitaine, et la France métropolitaine entière.
- Pour chaque maladie, le **taux de la dernière semaine** (cas vus par les médecins généralistes, pour 100 000
  habitants) et sa **tendance** par rapport à la semaine précédente (en hausse, stable, en baisse).
- La **semaine des données** (« 43 (19 – 25 oct. 2026) »).
- Deux **déclencheurs de scène** (un taux dépasse ou repasse sous un seuil), une **action de scène** (la semaine en
  une phrase) et un **widget de tableau de bord**.

## Prérequis

- Gladys Assistant 5.3.0 ou plus récent.
- Un accès à Internet depuis Gladys. Ni compte ni clé.
- France métropolitaine seulement : le réseau ne couvre pas l'outre-mer.

## Configuration

### Réglages

| Réglage                            | Défaut   | Rôle                                                                            |
| ---------------------------------- | -------- | ------------------------------------------------------------------------------- |
| Zones                              | aucune   | Les régions à suivre (et la France métropolitaine), un appareil chacune.        |
| Langue des noms de fonctionnalités | Français | Noms des nouveaux appareils et fonctionnalités, langue des textes et du résumé. |

Enregistrez, puis ouvrez l'onglet **Découverte** de l'intégration et créez les appareils voulus.

## Appareils

| Fonctionnalité                         | Type   | Valeur                                                |
| -------------------------------------- | ------ | ----------------------------------------------------- |
| Infections respiratoires /100 000 hab. | nombre | Infections respiratoires aiguës (grippe, Covid, VRS…) |
| Infections respiratoires, tendance     | texte  | en hausse, stable ou en baisse                        |
| Diarrhée aiguë /100 000 hab.           | nombre | Diarrhée aiguë (gastro-entérite)                      |
| Diarrhée aiguë, tendance               | texte  | en hausse, stable ou en baisse                        |
| Varicelle /100 000 hab.                | nombre | Varicelle                                             |
| Varicelle, tendance                    | texte  | en hausse, stable ou en baisse                        |
| Semaine des données                    | texte  | Numéro de semaine ISO et ses jours                    |

La **tendance** est « en hausse » ou « en baisse » quand le taux a bougé de 15 % ou plus de la semaine précédente
**et** de 5 pour 100 000 ou plus ; « stable » sinon. Les taux sont des nombres : une condition de scène comme
« infections respiratoires ≥ 200 » fonctionne.

## Widget de tableau de bord

**Épidémies saisonnières** : la zone choisie (sinon la première suivie), avec une ligne par maladie donnant son taux
et sa tendance, en orange à la hausse et en vert à la baisse, et une légende avec la semaine et la source. Un réglage
choisit les maladies affichées, un autre masque la légende.

## Déclencheurs de scène

- **Le taux épidémique dépasse un seuil** : à la publication d'une nouvelle semaine, le taux d'une maladie dans une
  zone franchit le seuil choisi (de 25 à 1 000 pour 100 000) à la hausse. Filtres : zone, maladie, seuil.
- **Le taux épidémique repasse sous un seuil** : la même chose, à la baisse : la vague est passée chez vous.

Variables : zone, maladie, taux, taux précédent, semaine. La première semaine lue après l'installation ne fait que
poser la référence : elle ne déclenche rien. Le taux précédent est celui que l'appareil affichait : une révision des
semaines passées par Sentinelles ne déclenche jamais deux fois un franchissement.

## Action de scène

**Épidémies : obtenir la semaine en une phrase** : donne, pour une zone (vide : la première suivie), une phrase
prête pour une notification, comme « Occitanie, semaine 43 (cas pour 100 000 habitants) : Infections respiratoires
196 (en hausse), Diarrhée aiguë 58 (en hausse), Varicelle 4 (stable). », dans la langue de la configuration, avec le
numéro de semaine et chaque taux en sorties séparées.

## Exemples de scènes

- Chaque jeudi à 8 h, envoyer la phrase de votre région au groupe familial.
- Quand la diarrhée aiguë dépasse 200 dans votre région, rappeler à tous de se laver les mains.
- Quand les infections respiratoires repassent sous 100, annoncer la fin de la vague hivernale.

## Sources, licence et quotas

- Source : **réseau Sentinelles, INSERM, Sorbonne Université**, [www.sentiweb.fr](https://www.sentiweb.fr), API
  publique Sentiweb, lue sans compte. Ce sont des estimations établies à partir des médecins généralistes du réseau
  (avec, pour les régions, de larges intervalles de confiance).
- Mise à jour une fois par semaine, en général le mercredi après-midi. L'API accepte 15 requêtes par 10 minutes et
  demande de ne télécharger que ce qui a changé : l'intégration demande la version des données une fois par heure,
  et ne télécharge les jeux de données (3 par niveau, régions ou France) que si elle a changé. Après une réponse
  « trop de requêtes », elle attend le délai annoncé par l'API, redémarrages compris.
- Le syndrome grippal, indicateur historique de la grippe, n'est plus surveillé : la grippe est comptée dans les
  infections respiratoires aiguës.

## Dépannage

- **Aucune valeur après la création de l'appareil** : attendez quelques secondes le premier téléchargement ; vérifiez
  que Gladys a accès à Internet.
- Le statut de connexion indique que les données Sentinelles sont illisibles : l'API est injoignable ; les dernières
  valeurs sont gardées et l'intégration réessaie toutes les heures.
- Le statut de connexion indique que l'API demande d'attendre : sa limite de requêtes est atteinte (peut-être par un
  autre appareil de votre réseau). L'intégration patiente et réessaie d'elle-même.

## Limites

- Développée et testée contre la vraie API, pas encore dans un Gladys en service : retours bienvenus.
- Les taux régionaux sont des estimations aux intervalles de confiance larges : un petit écart n'est pas
  significatif, d'où la marge de la tendance.
- Pas de « niveau épidémique » officiel : Sentinelles publie des taux, et Santé publique France ne publie pas de
  niveau épidémique régional ouvert qu'une intégration puisse lire. Les seuils des déclencheurs sont à votre choix.
