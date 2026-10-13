import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { redondear } from '../../../shared/calculos.js';
import { fechaCorta, hoy, nombreMes, soles } from '../formato.js';

export default function Historial() {
  const [mes, setMes] = useState(() => hoy().slice(0, 7));
  const [registros, setRegistros] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!mes) return;
    let vigente = true;
    setCargando(true);
    setError('');
    api(`/registros?mes=${mes}`)
      .then((d) => vigente && setRegistros(d.registros))
      .catch((err) => vigente && setError(err.message))
      .finally(() => vigente && setCargando(false));
    return () => { vigente = false; };
  }, [mes]);

  const suma = (clave) => redondear(registros.reduce((acc, r) => acc + Number(r[clave]), 0));
  const totalIngreso = suma('ingreso_total');
  const promedio = registros.length ? redondear(totalIngreso / registros.length) : 0;

  return (
    <div className="historial">
      <div className="dia-cabecera">
        <div>
          <p className="sobretitulo">Historial</p>
          <h1 className="fecha-titulo">{mes ? nombreMes(mes) : 'Elige un mes'}</h1>
        </div>
        <label className="selector-fecha">
          <span className="solo-lectores">Mes</span>
          <input type="month" value={mes} max={hoy().slice(0, 7)} onChange={(e) => setMes(e.target.value)} />
        </label>
      </div>

      <div className="resumen">
        <div className="resumen-item">
          <span>Días registrados</span>
          <strong>{registros.length}</strong>
        </div>
        <div className="resumen-item">
          <span>Ventas del mes</span>
          <strong>{soles(suma('suma_ventas'))}</strong>
        </div>
        <div className="resumen-item resumen-destacado">
          <span>Ingreso total</span>
          <strong>{soles(totalIngreso)}</strong>
        </div>
        <div className="resumen-item">
          <span>Promedio por día</span>
          <strong>{soles(promedio)}</strong>
        </div>
      </div>

      {error && <p className="alerta" role="alert">{error}</p>}

      <div className="tarjeta tarjeta-tabla" aria-busy={cargando}>
        {!cargando && registros.length === 0 ? (
          <div className="vacio">
            <p>No hay registros en este mes.</p>
            <Link to="/" className="boton">Registrar hoy</Link>
          </div>
        ) : (
          <table className="tabla">
            <thead>
              <tr>
                <th scope="col">Fecha</th>
                <th scope="col" className="num col-opcional">Menús</th>
                <th scope="col" className="num col-opcional">Combos</th>
                <th scope="col" className="num">Ventas</th>
                <th scope="col" className="num col-opcional">Ingreso Yape</th>
                <th scope="col" className="num">Ingreso total</th>
              </tr>
            </thead>
            <tbody>
              {registros.map((r) => (
                <tr key={r.fecha}>
                  <td>
                    <Link to={`/?fecha=${r.fecha}`} className="enlace-fecha">{fechaCorta(r.fecha)}</Link>
                  </td>
                  <td className="num col-opcional">{r.menu_cantidad}</td>
                  <td className="num col-opcional">{r.combo_cantidad}</td>
                  <td className="num">{soles(r.suma_ventas)}</td>
                  <td className="num col-opcional">{soles(r.ingreso_yape)}</td>
                  <td className="num"><strong>{soles(r.ingreso_total)}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
