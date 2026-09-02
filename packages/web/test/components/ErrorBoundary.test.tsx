import { jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { ErrorBoundary } from '../../src/components/ErrorBoundary.js';

const Boom = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) throw new Error('rendering blew up');
  return <p>Contenu de la page</p>;
};

let consoleError: jest.SpiedFunction<typeof console.error>;

beforeEach(() => {
  // React logs the caught error itself; the boundary logs it too. Neither is
  // the assertion here, and both would drown the run.
  consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  consoleError.mockRestore();
});

describe('ErrorBoundary', () => {
  it('renders its children while nothing throws', () => {
    render(
      <ErrorBoundary>
        <Boom shouldThrow={false} />
      </ErrorBoundary>,
    );

    expect(screen.getByText('Contenu de la page')).toBeInTheDocument();
  });

  // Without a boundary React unmounts the whole tree: a blank page, no way back.
  it('replaces a crash with a message instead of a blank page', () => {
    render(
      <ErrorBoundary>
        <Boom shouldThrow />
      </ErrorBoundary>,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Cette page n’a pas pu s’afficher');
    expect(consoleError).toHaveBeenCalled();
  });

  it('retries on demand, and shows the page again once it renders', () => {
    const Retryable = () => {
      const [shouldThrow, setShouldThrow] = useState(true);

      return (
        <ErrorBoundary
          fallback={(reset) => (
            <button
              type="button"
              onClick={() => {
                setShouldThrow(false);
                reset();
              }}
            >
              Réessayer
            </button>
          )}
        >
          <Boom shouldThrow={shouldThrow} />
        </ErrorBoundary>
      );
    };

    render(<Retryable />);
    fireEvent.click(screen.getByRole('button', { name: 'Réessayer' }));

    expect(screen.getByText('Contenu de la page')).toBeInTheDocument();
  });

  // The layout passes the current path, so navigating away from a broken page
  // recovers rather than leaving the reader stuck on the error screen.
  it('clears the error when the reset key changes', () => {
    const { rerender } = render(
      <ErrorBoundary resetKey="/mon-profil">
        <Boom shouldThrow />
      </ErrorBoundary>,
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();

    rerender(
      <ErrorBoundary resetKey="/certification">
        <Boom shouldThrow={false} />
      </ErrorBoundary>,
    );

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByText('Contenu de la page')).toBeInTheDocument();
  });
});
