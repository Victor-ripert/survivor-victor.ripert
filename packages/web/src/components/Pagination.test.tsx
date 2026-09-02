import { render, screen } from '@testing-library/react';
import { Pagination } from './Pagination.js';

const meta = (page: number, pages: number) => ({ page, pages, limit: 20, total: pages * 20 });

describe('Pagination', () => {
  it('stays hidden when everything fits on one page', () => {
    const { container } = render(
      <Pagination pagination={meta(1, 1)} onPageChange={() => undefined} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('stays hidden when nothing matched', () => {
    const { container } = render(
      <Pagination
        pagination={{ page: 1, pages: 0, limit: 20, total: 0 }}
        onPageChange={() => undefined}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('disables the previous button on the first page', () => {
    render(<Pagination pagination={meta(1, 4)} onPageChange={() => undefined} />);

    expect(screen.getByRole('button', { name: 'Précédent' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Suivant' })).toBeEnabled();
  });

  it('disables the next button on the last page', () => {
    render(<Pagination pagination={meta(4, 4)} onPageChange={() => undefined} />);

    expect(screen.getByRole('button', { name: 'Suivant' })).toBeDisabled();
  });

  it('announces the position in the result set', () => {
    render(<Pagination pagination={meta(2, 4)} onPageChange={() => undefined} />);

    expect(screen.getByText('Page 2 sur 4')).toBeInTheDocument();
  });
});
