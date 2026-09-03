import { Link } from 'react-router-dom';

const MINISTRY = 'Ministère du Job et Bonheur';

/**
 * Bloc-marque, per the charte: top left, protection zone respected, never laid
 * over a photograph. The first is the header's job, the second is the padding
 * the block carries itself, the third is the opaque ground `.brand-block`
 * paints under it — so the block cannot end up floating on media even if it is
 * moved somewhere else.
 *
 * It is typographic on purpose. The charte named the colours and the type
 * families but shipped no vector logotype (remontée n° 07), and drawing a
 * State mark ourselves is not something this demonstrator should do.
 */
export const BrandBlock = () => (
  <Link
    className="brand-block"
    to="/"
    translate="no"
    aria-label={`ProfilsActifs, ${MINISTRY} — retour à l’accueil`}
  >
    <span className="brand-block__state">
      Ministère
      <br />
      du Job
      <br />
      et Bonheur
    </span>
    <span className="brand-block__rule" />
    <span className="brand-block__signature">
      <span className="brand-block__name">ProfilsActifs</span>
      <span className="brand-block__baseline">Profils vidéo et certification JEB</span>
    </span>
  </Link>
);
