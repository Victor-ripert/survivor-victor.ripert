import { render, screen } from '@testing-library/react';
import { CertificationBadge } from '../../src/components/CertificationBadge.js';

describe('CertificationBadge', () => {
  it('shows the earned badge name when COMPLETED and a badge is supplied', () => {
    render(<CertificationBadge status="COMPLETED" badge="Certifié JEB — Or" />);
    expect(screen.getByText('Certifié JEB — Or')).toBeInTheDocument();
  });

  it('falls back to a generic label when COMPLETED but no badge name is given', () => {
    render(<CertificationBadge status="COMPLETED" />);
    expect(screen.getByText('Certifié JEB')).toBeInTheDocument();
  });

  it.each([
    ['PENDING', 'Certification non commencée'],
    ['IN_PROGRESS', 'Certification en cours'],
    ['REJECTED', 'Certification non obtenue'],
  ] as const)('shows the right label for %s', (status, label) => {
    render(<CertificationBadge status={status} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it('ignores a stray badge name for a non-COMPLETED status', () => {
    render(<CertificationBadge status="IN_PROGRESS" badge="Certifié JEB" />);
    expect(screen.getByText('Certification en cours')).toBeInTheDocument();
  });

  it('exposes itself to assistive tech as a status region', () => {
    render(<CertificationBadge status="PENDING" />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});
