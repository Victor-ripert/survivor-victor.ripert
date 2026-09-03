# Invalidation des tentatives en cours — justification (§8.4)

**Choix retenu** : modifier une question active invalide toute tentative `IN_PROGRESS` (réponses purgées, tentative passée en `ABANDONED`, candidat notifié) — plutôt que conserver les réponses existantes ou laisser le candidat terminer sur l'ancienne version du questionnaire.

Une tentative en cours est invalidée dès qu'une question active est modifiée, plutôt que conservée ou poursuivie sur l'ancienne version. Le score se calcule sur l'ensemble des questions actives au moment de la soumission : garder les réponses reviendrait à noter un candidat sur un barème qui a changé sous ses pieds, et le laisser finir sur l'ancienne version obligerait à versionner tout le questionnaire pour un cas marginal. L'invalidation s'applique à toute tentative en cours — pas seulement celles ayant déjà répondu à la question modifiée — car le référentiel de notation change pour tous, et le candidat est notifié pour pouvoir recommencer proprement.

**Portée exacte** : déclenchée quand une question était active avant l'édition, ou le devient après (`isActive: false → true`) — les deux cas modifient le référentiel de score utilisé pour toute tentative en cours.

**Implémentation** : `packages/api/src/services/certification/invalidation.ts`, appelée depuis `updateQuestion` dans `packages/api/src/services/certification/questions.ts`, dans la même transaction que la modification de la question.
