import { render, screen } from '@testing-library/react';
import { CertificationBadge } from './CertificationBadge.js';

describe('CertificationBadge', () => {
  it('shows the badge name and score once certification is obtained', () => {
    render(<CertificationBadge status="COMPLETED" badge="Or JEB" score={86} />);

    expect(screen.getByText('Or JEB — 86/100')).toBeInTheDocument();
  });

  it('falls back to a wording when a completed attempt carries no badge', () => {
    render(<CertificationBadge status="COMPLETED" badge={null} score={null} />);

    expect(screen.getByText('Certifié')).toBeInTheDocument();
  });

  it.each([
    ['IN_PROGRESS' as const, 'Certification en cours'],
    ['PENDING' as const, 'Non certifié'],
    ['REJECTED' as const, 'Certification refusée'],
  ])('spells out the %s status in words rather than by colour', (status, label) => {
    render(<CertificationBadge status={status} badge="Or JEB" score={86} />);

    expect(screen.getByText(label)).toBeInTheDocument();
  });
});
