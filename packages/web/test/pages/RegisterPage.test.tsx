import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { jest } from '@jest/globals';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext, type AuthContextValue } from '../../src/context/AuthContext.js';
import { RegisterPage } from '../../src/pages/Auth/RegisterPage.js';

const renderPage = (register: AuthContextValue['register']) =>
  render(
    <MemoryRouter>
      <AuthContext.Provider
        value={{ user: null, status: 'anonymous', login: jest.fn(), register, logout: jest.fn() }}
      >
        <RegisterPage />
      </AuthContext.Provider>
    </MemoryRouter>,
  );

const fill = (label: RegExp | string, value: string): void => {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
};

describe('RegisterPage', () => {
  it('asks a job-seeker for a birth date, and not a recruiter', () => {
    renderPage(jest.fn<AuthContextValue['register']>());

    expect(screen.getByLabelText('Date de naissance')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Recruteur·se'));

    expect(screen.queryByLabelText('Date de naissance')).not.toBeInTheDocument();
  });

  // Brief §7.9.1, demo-blocking: a 15-year-old is refused with a message.
  it('refuses a 15-year-old before any request leaves the browser', async () => {
    const register = jest.fn<AuthContextValue['register']>();
    renderPage(register);

    const fifteen = new Date();
    fifteen.setUTCFullYear(fifteen.getUTCFullYear() - 15);

    fill('Prénom', 'Lucas');
    fill('Nom', 'Morel');
    fill('Adresse e-mail', 'lucas@example.fr');
    fill('Mot de passe', 'Password123!');
    fill('Date de naissance', fifteen.toISOString().slice(0, 10));
    fireEvent.click(screen.getByRole('button', { name: 'Créer mon compte' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/au moins 16 ans/);
    expect(screen.getByLabelText('Date de naissance')).toHaveAttribute('aria-invalid', 'true');
    expect(register).not.toHaveBeenCalled();
  });

  it('registers an adult job-seeker with the fields the API expects', async () => {
    const register = jest.fn<AuthContextValue['register']>().mockResolvedValue({
      id: 'user-1',
      email: 'amina@example.fr',
      firstName: 'Amina',
      lastName: 'Berthier',
      role: 'APPLICANT',
      birthDate: '1998-03-14',
    });
    renderPage(register);

    fill('Prénom', 'Amina');
    fill('Nom', 'Berthier');
    fill('Adresse e-mail', 'amina@example.fr');
    fill('Mot de passe', 'Password123!');
    fill('Date de naissance', '1998-03-14');
    fireEvent.click(screen.getByRole('button', { name: 'Créer mon compte' }));

    await waitFor(() =>
      expect(register).toHaveBeenCalledWith({
        role: 'APPLICANT',
        firstName: 'Amina',
        lastName: 'Berthier',
        email: 'amina@example.fr',
        password: 'Password123!',
        birthDate: '1998-03-14',
      }),
    );
  });
});
