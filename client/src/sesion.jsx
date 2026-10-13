import { createContext, useContext, useEffect, useState } from 'react';
import { api } from './api.js';

const ContextoSesion = createContext(null);

export function ProveedorSesion({ children }) {
  // undefined = todavía comprobando, null = sin sesión.
  const [usuario, setUsuario] = useState(undefined);

  useEffect(() => {
    api('/auth/yo')
      .then((d) => setUsuario(d.usuario))
      .catch(() => setUsuario(null));

    const alExpirar = () => setUsuario(null);
    window.addEventListener('sesion-expirada', alExpirar);
    return () => window.removeEventListener('sesion-expirada', alExpirar);
  }, []);

  const entrar = async (modo, datos) => {
    const d = await api(`/auth/${modo}`, { method: 'POST', body: datos });
    setUsuario(d.usuario);
  };

  const salir = async () => {
    await api('/auth/logout', { method: 'POST' }).catch(() => {});
    setUsuario(null);
  };

  return <ContextoSesion.Provider value={{ usuario, entrar, salir }}>{children}</ContextoSesion.Provider>;
}

export const useSesion = () => useContext(ContextoSesion);
