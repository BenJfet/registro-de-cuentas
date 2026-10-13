import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { redondear } from '../../../shared/calculos.js';
import { fechaCorta, hoy, nombreMes, soles } from '../formato.js';
import { useSesion } from '../sesion.jsx';

export default function Historial() {
  const { usuario } = useSesion();
  const [mes, setMes] = useState(() => hoy().slice(0, 7));
  const [registros, setRegistros] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [exportando, setExportando] = useState('');

  const exportar = async (formato, todo = false) => {
    setExportando(todo ? 'todo' : formato);
    setError('');
    try {
      const { registros: filas } = await api(todo ? '/registros/exportar' : `/registros/exportar?mes=${mes}`);
      if (!filas.length) throw new Error('No hay registros para exportar');
      const periodo = todo ? 'todo el historial' : nombreMes(mes);
      const archivo = `caja-del-dia-${todo ? 'historial-completo' : mes}`;
      const { exportarExcel, exportarPdf } = await import('../exportar.js');
      if (formato === 'excel') {
        await exportarExcel(filas, { titulo: `Caja del Día · ${periodo}`, archivo: `${archivo}.xlsx` });
      } else {
        await exportarPdf(filas, {
          titulo: `Caja del Día · ${periodo.charAt(0).toUpperCase()}${periodo.slice(1)}`,
          subtitulo: `${usuario.nombre} · ${filas.length} días registrados · generado el ${new Date().toLocaleDateString('es-PE')}`,
          archivo: `${archivo}.pdf`,
        });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setExportando('');
    }
  };

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

      <div className="exportar">
        <span className="exportar-etiqueta">Descargar {mes ? nombreMes(mes) : 'mes'}</span>
        <button type="button" className="boton-secundario" onClick={() => exportar('excel')}
          disabled={!!exportando || !registros.length}>
          {exportando === 'excel' ? 'Generando…' : 'Excel'}
        </button>
        <button type="button" className="boton-secundario" onClick={() => exportar('pdf')}
          disabled={!!exportando || !registros.length}>
          {exportando === 'pdf' ? 'Generando…' : 'PDF'}
        </button>
        <button type="button" className="boton-texto exportar-todo" onClick={() => exportar('excel', true)}
          disabled={!!exportando}>
          {exportando === 'todo' ? 'Generando…' : 'Copia de seguridad: todo el historial en Excel'}
        </button>
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
