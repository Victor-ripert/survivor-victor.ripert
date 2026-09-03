# Remontée n° 07 — La charte de la Direction de la communication

**À** Benjamin Sellami
**De** Équipe ProfilsActifs — Ewan
**Date** mercredi 2 septembre 2026 · **Relancé le** jeudi 3 septembre 2026, matin
**Charte reçue le** jeudi 3 septembre 2026 · **Objet** §4.3 — application de la charte

**Statut : levé. La charte est appliquée. Deux points restent à trancher par
la Direction de la communication, listés ci-dessous.**

---

## La charte est arrivée, et elle est appliquée

Nous avons reçu quatre règles :

1. bleu institutionnel **#1B3A6B** en primaire, **jamais en fond de bouton** ;
2. **Marianne** pour les titres, **Spectral** pour le corps ;
3. **bloc-marque** en haut à gauche, zone de protection respectée ;
4. bloc-marque **jamais posé sur une photo**.

Les quatre sont dans le code, pas dans une maquette. Ce qui suit décrit
l'implémentation et ce qu'elle vous demande encore.

### 1. Le bleu, et l'interdit sur les boutons

`#1B3A6B` est la valeur exacte du jeton `--brand-blue`
(`packages/web/src/styles/global.css`). Il porte les titres, les filets, la
marque, les barres des tableaux de bord et le badge de certification JEB.

L'interdit sur les boutons a une conséquence de conception qu'il faut assumer :
la hiérarchie des actions ne peut plus venir d'un aplat. Elle vient du filet et
du mot. L'action principale est le seul bouton à porter un filet bleu de 2 px et
un libellé bleu ; l'action secondaire garde un filet gris d'un pixel ; l'action
tertiaire n'a pas de filet du tout. Au survol, l'action principale prend un
fond `#E6ECF5` — une teinte pâle dérivée, qui n'est pas la couleur de la charte.
**Le bleu institutionnel n'est le fond d'aucun bouton, dans aucun état.**

Un contrôle automatique parcourt les quatorze routes de l'application, inspecte
le style calculé de chaque bouton et échoue si l'un d'eux a `#1B3A6B` en fond.
Il passe.

### 2. Les typographies — un point pour vous

Le §8.3 interdit de charger une police depuis un domaine extérieur. Les deux
familles sont donc servies depuis notre propre origine, jamais depuis un CDN.

**Spectral est livrée** dans le dépôt (`packages/web/public/fonts/`, sous-
ensembles latin et latin-ext, régulier, semi-gras et italique). Sa licence — SIL
Open Font License 1.1 — autorise l'auto-hébergement sans réserve.

**Marianne n'est pas livrée, et nous vous demandons de trancher.** Marianne est
distribuée avec le Système de design de l'État, dont la licence porte en tête :

> En raison de son rôle de marqueur d'identité visuelle de l'État, le DSFR ne
> doit pas être utilisé par des entités extérieures à l'administration, et limite
> sa réplicabilité en dehors d'un nom de domaine en `.gouv.fr`.

Verser le binaire dans un dépôt d'école, c'est exactement ce que cette clause
décrit. Nous ne prenons pas cette décision à votre place.

Le code l'attend : les règles `@font-face` sont écrites, il suffit de déposer
quatre fichiers dans `packages/web/public/fonts/` sous les noms indiqués par
`packages/web/FONTS.md`, sans toucher une ligne. **Tant qu'ils ne sont pas là,
les titres retombent sur une linéale humaniste système** — l'interface reste
cohérente, mais la moitié typographique de la charte n'est pas appliquée. Les
captures du deck le montrent en l'état.

### 3 et 4. Le bloc-marque

Il est en haut à gauche de chaque page, sur la première ligne du bandeau, seul
sur sa ligne : la navigation est descendue d'un cran pour lui laisser la place.

La zone de protection est portée par le bloc lui-même (`--brand-clearance`,
16 px de retrait sur ses quatre côtés) plutôt que par ce qui l'entoure : elle
tient donc partout où le bloc est posé, sans dépendre du souvenir de celui qui
le pose. Le même contrôle automatique vérifie, sur les quatorze routes, qu'aucun
élément de la page n'entre dans ce périmètre.

« Jamais posé sur une photo » est garanti par construction et non par
convention : le bloc peint son propre fond opaque. Posé sur une image, il
resterait une réserve, pas une surimpression.

**Le bloc est typographique.** Vous nous avez transmis les couleurs et les
familles, pas de logotype vectoriel — c'est le point que la version du
2 septembre de cette remontée, reproduite plus bas, vous demandait déjà.
Dessiner nous-mêmes une marque de l'État n'est pas notre rôle. Le bloc actuel
aligne le nom du ministère, un filet bleu et la signature du service. Il se
remplace par votre logotype dès que nous l'avons.

### L'écart d'accessibilité, à déclarer

Nous vous avions signalé le 2 septembre qu'une charte pouvait entrer en conflit
avec la déclaration d'accessibilité due à Florine Pontaillac. C'est arrivé, sur
un point et un seul.

`#1B3A6B` mesure **1,6:1** sur le fond du thème sombre — très en dessous du
4,5:1 exigé par le RGAA AA. Nous ne l'y utilisons donc pas : le thème sombre
porte une teinte plus claire de **la même teinte chromatique** (216°), mesurée à
7,0:1. Le thème clair utilise `#1B3A6B` tel quel, à 11,3:1 sur le papier.

Conformément à ce que nous vous annoncions, **nous appliquons la charte et nous
déclarons l'écart**, plutôt que de déclarer une conformité que la mesure ne
soutient pas. Tous les autres couples texte/fond de l'interface sont à 4,5:1 ou
au-dessus, dans les deux thèmes.

### Ce que nous attendons de vous

1. **Les fichiers Marianne**, avec l'autorisation d'usage pour ce
   démonstrateur — ou l'instruction écrite de nous en passer.
2. **Le logotype vectoriel**, pour remplacer le bloc-marque typographique.
3. **Un accusé de l'écart de contraste** en thème sombre, pour que la
   déclaration d'accessibilité de vendredi puisse le mentionner.

---

## Ce qui avait changé le 3 septembre au matin

Votre courriel du 3 septembre demande six captures « qui montrent la charte
appliquée, celle que je vous ai envoyée mardi », et ajoute : « si vos écrans ne
sont pas encore à la charte, la capture vous oblige à les y mettre avant midi ».

**Nous n'avions alors jamais reçu cette charte.** Ni mardi, ni depuis. Nous vous
l'avions déjà écrit hier — c'est la remontée que vous lisez, dans sa version du
2 septembre, reproduite ci-dessous.

Nous ne mettons pas votre parole en doute : un envoi a pu se perdre, ou partir
sur une autre adresse. Mais le fait est là, et il a une conséquence directe :
**les captures du deck montreront l'interface sobre**, parce qu'il n'existe
aucune autre interface à capturer. Nous préférons vous l'écrire à 9h que vous le
laisser découvrir à la projection.

**Ce que nous vous demandons, dans l'ordre de préférence :**

1. **Renvoyez la charte avant 11h00.** Si elle tient dans ce que nous décrivons
   plus bas, nous pouvons appliquer les couleurs et les capturer avant midi. Une
   typographie complète, non.
2. **À défaut, confirmez par écrit que les captures sobres conviennent** pour
   cette remise. Nous appliquerons la charte la semaine prochaine, et la slide 6
   le dira.

Ce que nous ne ferons pas : retoucher les captures pour faire croire à une
charte appliquée. Vous demandez des captures et non des dessins précisément pour
cette raison, et nous sommes d'accord avec vous.

---

## La demande initiale, inchangée depuis le 2 septembre

Le §4.3 porte deux instructions contradictoires, et votre note tranche la
contradiction : la charte de la Direction de la communication est **obligatoire
et prime** sur l'orientation « ressembler à TikTok » ; elle _« sera transmise
séparément »_.

**Ce que nous faisons en attendant.** L'interface reste sobre : typographie
système, palette neutre, contrastes conformes RGAA AA. Partir maintenant sur un
clone de TikTok serait le refaire à la réception de la charte, et nous
n'aurions ni le temps ni l'argument.

**Ce que la charte devra nous dire**, pour être applicable en l'état :
palette avec les valeurs hexadécimales, familles typographiques et fichiers de
polices — **auto-hébergeables**, le §8.3 interdisant de charger une police
depuis un domaine extérieur —, logotype dans un format vectoriel, et les
contrastes minimaux exigés s'ils diffèrent du RGAA AA.

**Un point de vigilance à signaler par avance** : si la charte impose des
couplages de couleurs sous 4.5:1, ils entreront en conflit avec la déclaration
d'accessibilité que nous devons à Florine Pontaillac vendredi. Dans ce cas nous
appliquerons la charte et déclarerons l'écart, plutôt que de déclarer une
conformité que la mesure ne soutient pas.
