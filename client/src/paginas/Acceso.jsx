import { useState } from 'react';
import { useSesion } from '../sesion.jsx';

export default function Acceso() {
  const { entrar } = useSesion();
  const [modo, setModo] = useState('login');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const esRegistro = modo === 'registro';

  const enviar = async (e) => {
    e.preventDefault();
    setError('');
    setEnviando(true);
    try {
      await entrar(modo, Object.fromEntries(new FormData(e.currentTarget)));
    } catch (err) {
      setError(err.message);
      setEnviando(false);
    }
  };

  const cambiarModo = () => {
    setModo(esRegistro ? 'login' : 'registro');
    setError('');
  };

  return (
    <div className="acceso">
      <div className="acceso-tarjeta">
        <img src="/icono.svg" alt="" width="48" height="48" />
        <h1>Caja del Día</h1>
        <p className="acceso-sub">
          {esRegistro ? 'Crea tu cuenta para empezar a registrar.' : 'Registra tus ventas y cuadra la caja sin cuaderno.'}
        </p>

        <form onSubmit={enviar} className="formulario">
          {esRegistro && (
            <label className="campo">
              <span className="campo-etiqueta">Nombre</span>
              <input name="nombre" autoComplete="name" required />
            </label>
          )}
          <label className="campo">
            <span className="campo-etiqueta">Correo</span>
            <input name="email" type="email" autoComplete="email" required />
          </label>
          <label className="campo">
            <span className="campo-etiqueta">Contraseña</span>
            <input
              name="password"
              type="password"
              autoComplete={esRegistro ? 'new-password' : 'current-password'}
              minLength={esRegistro ? 8 : undefined}
              required
            />
            {esRegistro && <span className="campo-nota">Mínimo 8 caracteres.</span>}
          </label>

          {error && <p className="alerta" role="alert">{error}</p>}

          <button type="submit" className="boton" disabled={enviando}>
            {enviando ? 'Un momento…' : esRegistro ? 'Crear cuenta' : 'Iniciar sesión'}
          </button>
        </form>

        <p className="acceso-cambio">
          {esRegistro ? '¿Ya tienes cuenta?' : '¿Aún no tienes cuenta?'}{' '}
          <button type="button" className="boton-texto" onClick={cambiarModo}>
            {esRegistro ? 'Inicia sesión' : 'Regístrate'}
          </button>
        </p>
      </div>
    </div>
  );
}
