import { useContext } from 'react';
import { AuthContext, type AuthContextValue } from '../context/AuthContext.js';

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);

  if (!context) throw new Error('useAuth doit être utilisé dans un <AuthProvider>');

  return context;
};
