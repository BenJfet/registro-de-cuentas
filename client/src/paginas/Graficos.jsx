import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { hoy, soles } from '../formato.js';
import GraficoBarras from '../componentes/GraficoBarras.jsx';

const CANTIDAD = 12;

const MEDIDAS = [
  { clave: 'ventas', etiqueta: 'Ventas' },
  { clave: 'ingreso', etiqueta: 'Ingreso total' },
];

const aFecha = (iso) => {
  const [a, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(a, m - 1, d));
};
const formatear = (fecha, opciones) =>
  fecha.toLocaleDateString('es-PE', { timeZone: 'UTC', ...opciones }).replace('.', '');

function semana(p) {
  const inicio = aFecha(p.inicio);
  const fin = new Date(inicio);
  fin.setUTCDate(fin.getUTCDate() + 6);
  return {
    etiqueta: formatear(inicio, { day: 'numeric', month: 'short' }),
    detalle: `Semana del ${formatear(inicio, { day: 'numeric', month: 'short' })} al ${formatear(fin, { day: 'numeric', month: 'short' })}`,
  };
}

function mes(p) {
  const inicio = aFecha(p.inicio);
  return {
    etiqueta: formatear(inicio, { month: 'short' }),
    detalle: formatear(inicio, { month: 'long', year: 'numeric' }),
  };
}

function Tarjeta({ titulo, subtitulo, periodos, medida, describir, actualTexto, anteriorTexto }) {
  const datos = periodos.map((p, i) => ({
    clave: p.inicio,
    ...describir(p),
    valor: p[medida.clave],
    dias: p.dias,
    enCurso: i === periodos.length - 1,
  }));
  const actual = datos.at(-1);
  const anterior = datos.at(-2);
  const sinDatos = datos.every((p) => p.valor === 0);

  return (
    <section className="tarjeta tarjeta-grafico">
      <div>
        <h2>{medida.etiqueta} {titulo}</h2>
        <p className="grafico-sub">{subtitulo}</p>
      </div>

      {actual && (
        <div className="grafico-cifras">
          <div>
            <span>{actualTexto}</span>
            <strong>{soles(actual.valor)}</strong>
          </div>
          {anterior && (
            <div>
              <span>{anteriorTexto}</span>
              <strong>{soles(anterior.valor)}</strong>
            </div>
          )}
        </div>
      )}

      {sinDatos ? (
        <p className="vacio">Aún no hay registros en este periodo.</p>
      ) : (
        <GraficoBarras
          datos={datos}
          formato={soles}
          descripcion={`${medida.etiqueta} ${titulo}: gráfico de barras de ${datos.length} periodos`}
        />
      )}

      <details className="grafico-tabla">
        <summary>Ver como tabla</summary>
        <table className="tabla">
          <thead>
            <tr>
              <th scope="col">Periodo</th>
              <th scope="col" className="num">Días</th>
              <th scope="col" className="num">{medida.etiqueta}</th>
            </tr>
          </thead>
          <tbody>
            {[...datos].reverse().map((p) => (
              <tr key={p.clave}>
                <td>{p.detalle}{p.enCurso ? ' (en curso)' : ''}</td>
                <td className="num">{p.dias}</td>
                <td className="num">{soles(p.valor)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </section>
  );
}

export default function Graficos() {
  const [medida, setMedida] = useState(MEDIDAS[0]);
  const [semanas, setSemanas] = useState([]);
  const [meses, setMeses] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const hasta = hoy();
    Promise.all([
      api(`/registros/resumen?periodo=semana&cantidad=${CANTIDAD}&hasta=${hasta}`),
      api(`/registros/resumen?periodo=mes&cantidad=${CANTIDAD}&hasta=${hasta}`),
    ])
      .then(([s, m]) => {
        setSemanas(s.periodos);
        setMeses(m.periodos);
      })
      .catch((err) => setError(err.message))
      .finally(() => setCargando(false));
  }, []);

  return (
    <div className="graficos">
      <div className="dia-cabecera">
        <div>
          <p className="sobretitulo">Gráficos</p>
          <h1 className="fecha-titulo">¿Cómo van las ventas?</h1>
        </div>
        <div className="segmentado" role="group" aria-label="Qué mostrar">
          {MEDIDAS.map((m) => (
            <button key={m.clave} type="button" aria-pressed={medida.clave === m.clave} onClick={() => setMedida(m)}>
              {m.etiqueta}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="alerta" role="alert">{error}</p>}

      <div className={`rejilla-graficos${cargando ? ' secciones-cargando' : ''}`} aria-busy={cargando}>
        <Tarjeta
          titulo="por semana"
          subtitulo={`Últimas ${CANTIDAD} semanas, de lunes a domingo. La barra clara es la semana en curso.`}
          periodos={semanas}
          medida={medida}
          describir={semana}
          actualTexto="Esta semana"
          anteriorTexto="Semana pasada"
        />
        <Tarjeta
          titulo="por mes"
          subtitulo={`Últimos ${CANTIDAD} meses. La barra clara es el mes en curso.`}
          periodos={meses}
          medida={medida}
          describir={mes}
          actualTexto="Este mes"
          anteriorTexto="Mes pasado"
        />
      </div>
    </div>
  );
}
