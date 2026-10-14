import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { redondear } from '../../../shared/calculos.js';
import { CATEGORIAS_GASTO, SERVICIOS } from '../../../shared/gastos.js';
import { diaMes, hoy, nombreMes, soles } from '../formato.js';
import Campo from '../componentes/Campo.jsx';

const NOMBRES = Object.fromEntries(CATEGORIAS_GASTO.map((c) => [c.id, c.nombre]));

const nuevoGasto = (categoria = 'personal') => ({ fecha: hoy(), categoria, descripcion: '', monto: '' });

const sumar = (gastos) => redondear(gastos.reduce((acc, g) => acc + Number(g.monto), 0));

export default function Gastos() {
  const [mes, setMes] = useState(() => hoy().slice(0, 7));
  const [datos, setDatos] = useState({ gastos: [], ventasMes: 0, trabajadores: [] });
  const [recarga, setRecarga] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const [form, setForm] = useState(nuevoGasto);
  const [guardando, setGuardando] = useState(false);
  const [estado, setEstado] = useState({ tipo: '', texto: '', campo: null });

  useEffect(() => {
    if (!mes) return;
    let vigente = true;
    setCargando(true);
    setError('');
    api(`/gastos?mes=${mes}`)
      .then((d) => vigente && setDatos(d))
      .catch((err) => vigente && setError(err.message))
      .finally(() => vigente && setCargando(false));
    return () => { vigente = false; };
  }, [mes, recarga]);

  const cambiar = (nombre, valor) => {
    setForm((f) => ({ ...f, [nombre]: valor }));
    if (estado.tipo) setEstado({ tipo: '', texto: '', campo: null });
  };

  const guardar = async (e) => {
    e.preventDefault();
    setGuardando(true);
    try {
      await api('/gastos', { method: 'POST', body: { ...form, monto: Number(form.monto) || 0 } });
      // Se conserva la fecha y la categoría para anotar varios pagos seguidos.
      setForm((f) => ({ ...nuevoGasto(f.categoria), fecha: f.fecha }));
      setEstado({ tipo: 'ok', texto: 'Gasto anotado', campo: null });
      if (form.fecha.slice(0, 7) === mes) setRecarga((n) => n + 1);
      else setMes(form.fecha.slice(0, 7));
    } catch (err) {
      setEstado({ tipo: 'error', texto: err.message, campo: err.campo });
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = async (gasto) => {
    const detalle = gasto.descripcion ? ` (${gasto.descripcion})` : '';
    if (!window.confirm(`¿Eliminar ${NOMBRES[gasto.categoria]}${detalle} de ${soles(gasto.monto)}?`)) return;
    try {
      await api(`/gastos/${gasto.id}`, { method: 'DELETE' });
      setRecarga((n) => n + 1);
    } catch (err) {
      setError(err.message);
    }
  };

  const { gastos, ventasMes, trabajadores } = datos;
  const total = sumar(gastos);
  const personal = gastos.filter((g) => g.categoria === 'personal');
  // Lo que queda líquido: ventas del mes (menús + combos + extras + gaseosas) − gastos.
  const liquido = redondear(Number(ventasMes) - total);

  // Total pagado a cada trabajador en el mes.
  const porTrabajador = Object.entries(
    personal.reduce((acc, g) => ({ ...acc, [g.descripcion]: (acc[g.descripcion] ?? 0) + Number(g.monto) }), {}),
  ).sort((a, b) => b[1] - a[1]);

  const esPersonal = form.categoria === 'personal';

  return (
    <div className="gastos">
      <div className="dia-cabecera">
        <div>
          <p className="sobretitulo">Gastos y pagos</p>
          <h1 className="fecha-titulo">{mes ? nombreMes(mes) : 'Elige un mes'}</h1>
        </div>
        <label className="selector-fecha">
          <span className="solo-lectores">Mes</span>
          <input type="month" value={mes} max={hoy().slice(0, 7)} onChange={(e) => setMes(e.target.value)} />
        </label>
      </div>

      <div className="resumen">
        <div className="resumen-item">
          <span>Pago de personal</span>
          <strong>{soles(sumar(personal))}</strong>
        </div>
        <div className="resumen-item">
          <span>Servicios</span>
          <strong>{soles(sumar(gastos.filter((g) => SERVICIOS.includes(g.categoria))))}</strong>
        </div>
        <div className="resumen-item">
          <span>Gastos varios</span>
          <strong>{soles(sumar(gastos.filter((g) => g.categoria === 'varios')))}</strong>
        </div>
        <div className="resumen-item resumen-destacado">
          <span>Total gastos</span>
          <strong>{soles(total)}</strong>
        </div>
        <div className="resumen-item">
          <span>Ventas del mes</span>
          <strong>{soles(ventasMes)}</strong>
        </div>
        <div className="resumen-item">
          <span>Queda líquido</span>
          <strong className={liquido < 0 ? 'negativo' : undefined}>{soles(liquido)}</strong>
        </div>
      </div>

      <form className="tarjeta form-gasto" onSubmit={guardar}>
        <h2>Anotar un gasto</h2>
        <div className="rejilla-gasto">
          <label className="campo">
            <span className="campo-etiqueta">Fecha</span>
            <input type="date" value={form.fecha} max={hoy()} required
              onChange={(e) => cambiar('fecha', e.target.value)} />
          </label>
          <label className="campo">
            <span className="campo-etiqueta">Tipo</span>
            <select value={form.categoria} onChange={(e) => cambiar('categoria', e.target.value)}>
              {CATEGORIAS_GASTO.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </label>
          <label className={`campo${estado.campo === 'descripcion' ? ' campo-error' : ''}`}>
            <span className="campo-etiqueta">{esPersonal ? 'Nombre del trabajador' : 'Detalle (opcional)'}</span>
            <input type="text" maxLength={120} value={form.descripcion} required={esPersonal}
              list={esPersonal ? 'lista-trabajadores' : undefined}
              placeholder={esPersonal ? 'Ej.: María' : 'Ej.: recibo de octubre'}
              onChange={(e) => cambiar('descripcion', e.target.value)} />
          </label>
          <Campo nombre="monto" etiqueta="Monto" valor={form.monto} onChange={cambiar}
            error={estado.campo === 'monto'} />
        </div>
        <datalist id="lista-trabajadores">
          {trabajadores.map((t) => <option key={t} value={t} />)}
        </datalist>
        <div className="form-gasto-pie">
          <p className={`estado estado-${estado.tipo || 'nada'}`} role="status">{estado.texto}</p>
          <button type="submit" className="boton" disabled={guardando || !form.monto}>
            {guardando ? 'Guardando…' : 'Anotar gasto'}
          </button>
        </div>
      </form>

      {error && <p className="alerta" role="alert">{error}</p>}

      {porTrabajador.length > 0 && (
        <section className="tarjeta" aria-labelledby="t-trabajadores">
          <h2 id="t-trabajadores">Pagado a cada trabajador</h2>
          <ul className="lista-trabajadores">
            {porTrabajador.map(([nombre, monto]) => (
              <li key={nombre}><span>{nombre}</span><strong>{soles(monto)}</strong></li>
            ))}
          </ul>
        </section>
      )}

      <div className="tarjeta tarjeta-tabla" aria-busy={cargando}>
        {!cargando && gastos.length === 0 ? (
          <div className="vacio"><p>No hay gastos anotados en este mes.</p></div>
        ) : (
          <table className="tabla">
            <thead>
              <tr>
                <th scope="col">Fecha</th>
                <th scope="col">Tipo</th>
                <th scope="col" className="col-opcional">Detalle</th>
                <th scope="col" className="num">Monto</th>
                <th scope="col"><span className="solo-lectores">Acciones</span></th>
              </tr>
            </thead>
            <tbody>
              {gastos.map((g) => (
                <tr key={g.id}>
                  <td>{diaMes(g.fecha)}</td>
                  <td className="col-tipo">
                    {NOMBRES[g.categoria]}
                    {g.descripcion && <span className="detalle-movil">{g.descripcion}</span>}
                  </td>
                  <td className="col-opcional">{g.descripcion}</td>
                  <td className="num"><strong>{soles(g.monto)}</strong></td>
                  <td className="acciones">
                    <button type="button" className="boton-eliminar" onClick={() => eliminar(g)} title="Eliminar"
                      aria-label={`Eliminar ${NOMBRES[g.categoria]} ${g.descripcion} ${soles(g.monto)}`}>
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
