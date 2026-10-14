import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ProveedorSesion, useSesion } from './sesion.jsx';
import Layout from './componentes/Layout.jsx';
import Acceso from './paginas/Acceso.jsx';
import Dia from './paginas/Dia.jsx';
import Historial from './paginas/Historial.jsx';
import Graficos from './paginas/Graficos.jsx';
import Gastos from './paginas/Gastos.jsx';
import './estilos.css';

function App() {
  const { usuario } = useSesion();

  if (usuario === undefined) return <div className="cargando-pantalla">Cargando…</div>;

  return (
    <Routes>
      <Route path="/acceso" element={usuario ? <Navigate to="/" replace /> : <Acceso />} />
      <Route element={usuario ? <Layout /> : <Navigate to="/acceso" replace />}>
        <Route index element={<Dia />} />
        <Route path="historial" element={<Historial />} />
        <Route path="graficos" element={<Graficos />} />
        <Route path="gastos" element={<Gastos />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

// Solo en producción: en desarrollo el caché estorbaría al editar.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js'));
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <ProveedorSesion>
        <App />
      </ProveedorSesion>
    </BrowserRouter>
  </StrictMode>,
);
