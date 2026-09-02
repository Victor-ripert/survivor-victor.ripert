import { fireEvent, render, screen } from '@testing-library/react';
import { jest } from '@jest/globals';
import { Pagination } from '../../src/components/Pagination.js';

describe('Pagination', () => {
  it('renders nothing when there is only one page', () => {
    const { container } = render(<Pagination page={1} totalPages={1} onPageChange={jest.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('disables "Précédent" on the first page and "Suivant" on the last', () => {
    const { rerender } = render(<Pagination page={1} totalPages={3} onPageChange={jest.fn()} />);
    expect(screen.getByRole('button', { name: 'Précédent' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Suivant' })).toBeEnabled();

    rerender(<Pagination page={3} totalPages={3} onPageChange={jest.fn()} />);
    expect(screen.getByRole('button', { name: 'Précédent' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Suivant' })).toBeDisabled();
  });

  it('calls onPageChange with the adjacent page number', () => {
    const onPageChange = jest.fn();
    render(<Pagination page={2} totalPages={5} onPageChange={onPageChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'Suivant' }));
    expect(onPageChange).toHaveBeenCalledWith(3);

    fireEvent.click(screen.getByRole('button', { name: 'Précédent' }));
    expect(onPageChange).toHaveBeenCalledWith(1);
  });
});
