import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import { CAMPOS, calcularTotales, redondear } from '../../../shared/calculos.js';
import { fechaCorta, fechaLarga, hoy, soles } from '../formato.js';
import Campo from '../componentes/Campo.jsx';

const vacio = () => Object.fromEntries(CAMPOS.map((c) => [c, '']));

// Los ceros se muestran como campo vacío para que el formulario sea más limpio.
const aTexto = (v) => (v === null || v === undefined || Number(v) === 0 ? '' : String(v));

function formularioDesde(registro, anterior) {
  if (registro) return Object.fromEntries(CAMPOS.map((c) => [c, aTexto(registro[c])]));
  return {
    ...vacio(),
    sencillo_anterior: aTexto(anterior?.suma_sencillo),
    yape_anterior: aTexto(anterior?.yape),
  };
}

function Total({ etiqueta, valor, destacado = false }) {
  return (
    <div className={`total${destacado ? ' total-destacado' : ''}`}>
      <span>{etiqueta}</span>
      <output>{soles(valor)}</output>
    </div>
  );
}

// Compara el total de ventas + sencillo con el ingreso total.
function Cuadre({ esperado, ingreso }) {
  const diferencia = redondear(ingreso - esperado);
  if (esperado === 0 && ingreso === 0) return null;
  if (diferencia === 0) {
    return <p className="cuadre cuadre-ok">Coincide con el ingreso total</p>;
  }
  return (
    <p className="cuadre cuadre-diferencia">
      {diferencia > 0 ? 'Sobran' : 'Faltan'} {soles(Math.abs(diferencia))} respecto al ingreso total ({soles(ingreso)})
    </p>
  );
}

export default function Dia() {
  const [params, setParams] = useSearchParams();
  const fecha = params.get('fecha') || hoy();

  const [form, setForm] = useState(vacio);
  const [base, setBase] = useState(vacio);
  const [anterior, setAnterior] = useState(null);
  const [existe, setExiste] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [estado, setEstado] = useState({ tipo: '', texto: '', campo: null });
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    let vigente = true;
    setCargando(true);
    setEstado({ tipo: '', texto: '', campo: null });
    api(`/registros/${fecha}`)
      .then(({ registro, anterior }) => {
        if (!vigente) return;
        const inicial = formularioDesde(registro, anterior);
        setForm(inicial);
        setBase(inicial);
        setAnterior(anterior);
        setExiste(Boolean(registro));
      })
      .catch((err) => vigente && setEstado({ tipo: 'error', texto: err.message, campo: null }))
      .finally(() => vigente && setCargando(false));
    return () => { vigente = false; };
  }, [fecha]);

  const t = useMemo(() => calcularTotales(form), [form]);
  const sucio = CAMPOS.some((c) => form[c] !== base[c]);

  // Avisar antes de cerrar la pestaña con cambios sin guardar.
  useEffect(() => {
    if (!sucio) return;
    const aviso = (e) => e.preventDefault();
    window.addEventListener('beforeunload', aviso);
    return () => window.removeEventListener('beforeunload', aviso);
  }, [sucio]);

  const cambiar = (nombre, valor) => {
    setForm((f) => ({ ...f, [nombre]: valor }));
    if (estado.tipo) setEstado({ tipo: '', texto: '', campo: null });
  };

  const cambiarFecha = (nueva) => {
    if (!nueva || nueva === fecha) return;
    if (sucio && !window.confirm('Tienes cambios sin guardar. ¿Cambiar de día igualmente?')) return;
    setParams(nueva === hoy() ? {} : { fecha: nueva });
  };

  const guardar = async (e) => {
    e.preventDefault();
    setGuardando(true);
    try {
      const cuerpo = Object.fromEntries(CAMPOS.map((c) => [c, form[c] === '' ? 0 : Number(form[c])]));
      await api(`/registros/${fecha}`, { method: 'PUT', body: cuerpo });
      setBase(form);
      setExiste(true);
      setEstado({ tipo: 'ok', texto: 'Guardado', campo: null });
    } catch (err) {
      setEstado({ tipo: 'error', texto: err.message, campo: err.campo });
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = async () => {
    if (!window.confirm(`¿Eliminar el registro del ${fechaLarga(fecha)}? No se puede deshacer.`)) return;
    try {
      await api(`/registros/${fecha}`, { method: 'DELETE' });
      const inicial = formularioDesde(null, anterior);
      setForm(inicial);
      setBase(inicial);
      setExiste(false);
      setEstado({ tipo: 'ok', texto: 'Registro eliminado', campo: null });
    } catch (err) {
      setEstado({ tipo: 'error', texto: err.message, campo: null });
    }
  };

  // Sugerencia del último día registrado, con botón para usarla si el valor difiere.
  const sugerencia = (campo, valor) => {
    if (!anterior) return 'Sin registros anteriores';
    const texto = `Último registro (${fechaCorta(anterior.fecha)}): ${soles(valor)}`;
    if (Number(form[campo] || 0) === Number(valor)) return texto;
    return (
      <>
        {texto}{' '}
        <button type="button" className="boton-texto" onClick={() => cambiar(campo, aTexto(valor))}>Usar</button>
      </>
    );
  };

  const campo = (nombre, etiqueta, extra = {}) => (
    <Campo
      nombre={nombre}
      etiqueta={etiqueta}
      valor={form[nombre]}
      onChange={cambiar}
      error={estado.campo === nombre}
      {...extra}
    />
  );

  return (
    <form className="dia" onSubmit={guardar} aria-busy={cargando}>
      <div className="dia-cabecera">
        <div>
          <p className="sobretitulo">{existe ? 'Registro guardado' : 'Nuevo registro'}</p>
          <h1 className="fecha-titulo">{fechaLarga(fecha)}</h1>
        </div>
        <label className="selector-fecha">
          <span className="solo-lectores">Cambiar fecha</span>
          <input type="date" value={fecha} max={hoy()} onChange={(e) => cambiarFecha(e.target.value)} />
        </label>
      </div>

      <div className={`secciones${cargando ? ' secciones-cargando' : ''}`}>
        <section className="tarjeta" aria-labelledby="t-ventas">
          <h2 id="t-ventas"><span className="paso">1</span> Ventas</h2>

          <div className="filas-ventas">
            <div className="fila-venta fila-encabezado" aria-hidden="true">
              <span />
              <span>Cantidad</span>
              <span>Total</span>
            </div>
            <div className="fila-venta">
              <span className="fila-nombre">Menú</span>
              {campo('menu_cantidad', 'Cantidad de menús', { entero: true, oculto: true })}
              {campo('menu_total', 'Total de menús', { oculto: true })}
            </div>
            <div className="fila-venta">
              <span className="fila-nombre">Combos</span>
              {campo('combo_cantidad', 'Cantidad de combos', { entero: true, oculto: true })}
              {campo('combo_total', 'Total de combos', { oculto: true })}
            </div>
            <div className="fila-venta">
              <span className="fila-nombre">Extra</span>
              <span className="fila-vacia" aria-hidden="true" />
              {campo('extra_total', 'Total de extras', { oculto: true })}
            </div>
            <div className="fila-venta">
              <span className="fila-nombre">Gaseosa</span>
              <span className="fila-vacia" aria-hidden="true" />
              {campo('gaseosa_total', 'Total de gaseosas', { oculto: true })}
            </div>
          </div>

          <Total etiqueta="Suma" valor={t.sumaVentas} destacado />

          <div className="separador" />

          {campo('sencillo_anterior', 'Sencillo del día anterior', {
            nota: sugerencia('sencillo_anterior', anterior?.suma_sencillo),
          })}
          {campo('sencillo_agregado', 'Sencillo agregado (opcional)', {
            nota: 'Si se puso más sencillo del que quedó ayer.',
          })}
          <Total etiqueta="Sencillo inicial" valor={t.sencilloInicial} />

          <div className="separador" />

          <Total etiqueta="Total ventas + sencillo" valor={t.totalVentasSencillo} destacado />
          <Cuadre esperado={t.totalVentasSencillo} ingreso={t.ingresoTotal} />
        </section>

        <section className="tarjeta" aria-labelledby="t-sencillo">
          <h2 id="t-sencillo"><span className="paso">2</span> Sencillo</h2>
          <div className="rejilla-sencillo">
            {campo('sencillo_1', 'Monto 1')}
            {campo('sencillo_2', 'Monto 2')}
            {campo('sencillo_3', 'Monto 3')}
            {campo('sencillo_4', 'Monto 4')}
          </div>
          <Total etiqueta="Suma" valor={t.sumaSencillo} destacado />
        </section>

        <section className="tarjeta" aria-labelledby="t-pagos">
          <h2 id="t-pagos"><span className="paso">3</span> Ingresos</h2>
          <div className="rejilla-pagos">
            {campo('duro', 'Duro')}
            {campo('tarjeta', 'Tarjeta')}
            {campo('yape', 'Yape (total del día)')}
            {campo('yape_anterior', 'Yape anterior', {
              nota: sugerencia('yape_anterior', anterior?.yape),
            })}
          </div>
          <Total etiqueta="Ingreso Yape" valor={t.ingresoYape} />
          <p className="formula">Ingreso total = Sencillo + Duro + Tarjeta + Ingreso Yape</p>
          <Total etiqueta="Ingreso total" valor={t.ingresoTotal} destacado />

          {existe && (
            <button type="button" className="boton-peligro" onClick={eliminar}>
              Eliminar registro de este día
            </button>
          )}
        </section>
      </div>

      <div className="barra-guardar">
        <div className="barra-interior">
          <div className="barra-total">
            <span>Ingreso total</span>
            <strong>{soles(t.ingresoTotal)}</strong>
          </div>
          <p className={`estado estado-${estado.tipo || (sucio ? 'pendiente' : 'nada')}`} role="status">
            {estado.texto || (sucio ? 'Cambios sin guardar' : '')}
          </p>
          <button type="submit" className="boton" disabled={guardando || cargando || (!sucio && existe)}>
            {guardando ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </form>
  );
}
