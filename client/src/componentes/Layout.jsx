import { NavLink, Outlet } from 'react-router-dom';
import { useSesion } from '../sesion.jsx';

export default function Layout() {
  const { usuario, salir } = useSesion();

  return (
    <div className="app">
      <header className="cabecera">
        <div className="cabecera-interior">
          <span className="marca">
            <img src="/icono.svg" alt="" width="28" height="28" />
            Caja del Día
          </span>
          <nav className="nav">
            <NavLink to="/" end>Día</NavLink>
            <NavLink to="/historial">Historial</NavLink>
            <NavLink to="/graficos">Gráficos</NavLink>
          </nav>
          <div className="usuario">
            <span className="usuario-nombre">{usuario.nombre}</span>
            <button type="button" className="boton-texto" onClick={salir}>Salir</button>
          </div>
        </div>
      </header>
      <main className="contenido">
        <Outlet />
      </main>
    </div>
  );
}
