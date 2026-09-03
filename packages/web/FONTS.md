# Polices auto-hébergées

La charte de la Direction de la communication impose **Marianne** pour les titres
et **Spectral** pour le corps. Le §8.3 interdisant toute dépendance extérieure au
dépôt, les deux familles sont servies depuis notre propre origine : aucun lien
vers `fonts.googleapis.com`, aucun CDN. Les déclarations `@font-face` vivent dans
`packages/web/src/styles/fonts.css`.

## Spectral — présent dans le dépôt

`Spectral-400-*.woff2`, `Spectral-600-*.woff2`, `Spectral-400italic-*.woff2`,
sous-ensembles `latin` et `latin-ext`.

- Fonderie : Production Type, pour Google Fonts.
- Licence : **SIL Open Font License 1.1** — redistribution et auto-hébergement
  autorisés, y compris commercialement.
- Origine : les fichiers publiés par Google Fonts (Spectral v15), récupérés le
  3 septembre 2026.

Le découpage `latin` / `latin-ext` est celui de Google Fonts : `latin-ext` n'est
téléchargé que si une page affiche réellement un caractère hors Latin-1 — le nom
d'un candidat, typiquement.

## Marianne — absente du dépôt, à déposer ici

**Les fichiers Marianne ne sont pas versionnés, et ce n'est pas un oubli.**

Marianne est distribuée avec le Système de design de l'État (`@gouvfr/dsfr`),
dont la licence porte en tête :

> En raison de son rôle de marqueur d'identité visuelle de l'État, le DSFR ne
> doit pas être utilisé par des entités extérieures à l'administration, et limite
> sa réplicabilité en dehors d'un nom de domaine en `.gouv.fr`.

Committer le binaire dans un dépôt d'école, c'est exactement ce que cette clause
décrit. La décision appartient au ministère, pas à l'équipe : si la Direction de
la communication nous transmet les fichiers avec une autorisation d'usage pour ce
démonstrateur, ils se déposent ici, sous ces noms exacts :

```
Marianne-Regular.woff2
Marianne-Medium.woff2
Marianne-Bold.woff2
Marianne-Regular_Italic.woff2
```

Aucune modification de code n'est nécessaire — les `@font-face` les attendent
déjà. Un simple rechargement suffit.

**En attendant**, le navigateur ne trouve pas ces fichiers, ignore les faces
correspondantes et retombe sur la pile déclarée dans `--font-title`
(`Segoe UI`, `system-ui`, `Helvetica Neue`, `Arial`) : un linéale humaniste,
proche de Marianne en couleur de page. L'interface reste lisible et cohérente,
mais **la moitié typographique de la charte n'est alors pas appliquée** — c'est
ce que dit la remontée n° 07.

### Le message rouge dans la console, en développement

Tant que Marianne manque, la console du navigateur signale une police qu'elle
n'a pas pu décoder — une par face déclarée, au premier rendu. Ce n'est pas une
régression : le serveur de développement de Vite répond `index.html` à toute
URL inconnue, donc le navigateur reçoit du HTML là où il attend un `woff2`, le
rejette et passe à la police suivante. En production le même chemin répond un
404 franc, et le comportement est identique. Le message disparaît le jour où les
fichiers sont déposés.

Un contrôle rapide, une fois les fichiers déposés :

```bash
npm run dev -w @profils-actifs/web
# puis, dans la console du navigateur :
document.fonts.check('700 1rem Marianne')   // true si Marianne est chargée
```
