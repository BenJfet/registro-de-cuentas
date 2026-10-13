import { useEffect, useRef, useState } from 'react';

const ALTO = 230;
const M = { arriba: 26, derecha: 4, abajo: 28, izquierda: 48 };
const unDecimal = new Intl.NumberFormat('es-PE', { maximumFractionDigits: 1 });
// 6000 → "6 mil", 5400 → "5.4 mil" (el formato compacto de Intl varía entre "K" y "k").
const compacto = { format: (v) => (v >= 1000 ? `${unDecimal.format(v / 1000)} mil` : unDecimal.format(v)) };

// Eje Y con números redondos (0, 500, 1000…).
function escala(max) {
  if (max <= 0) return { tope: 100, paso: 25 };
  const bruto = max / 4;
  const magnitud = 10 ** Math.floor(Math.log10(bruto));
  const n = bruto / magnitud;
  const paso = (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * magnitud;
  return { tope: Math.ceil(max / paso) * paso, paso };
}

// Barra con la punta redondeada (4px) y la base recta.
function rutaBarra(x, arriba, ancho, base) {
  const alto = base - arriba;
  if (alto <= 0) return '';
  const r = Math.min(4, alto, ancho / 2);
  return `M${x},${base}V${arriba + r}Q${x},${arriba} ${x + r},${arriba}H${x + ancho - r}Q${x + ancho},${arriba} ${x + ancho},${arriba + r}V${base}Z`;
}

/**
 * datos: [{ clave, etiqueta, detalle, valor, dias, enCurso }]
 * Una sola serie: el título de la tarjeta dice qué se grafica, así que no lleva leyenda.
 */
export default function GraficoBarras({ datos, formato, descripcion }) {
  const contenedor = useRef(null);
  const [ancho, setAncho] = useState(0);
  const [activo, setActivo] = useState(null);

  useEffect(() => {
    const observador = new ResizeObserver(([e]) => setAncho(e.contentRect.width));
    observador.observe(contenedor.current);
    return () => observador.disconnect();
  }, []);

  const max = Math.max(0, ...datos.map((d) => d.valor));
  const { tope, paso } = escala(max);
  const util = Math.max(0, ancho - M.izquierda - M.derecha);
  const banda = datos.length ? util / datos.length : 0;
  const grosor = Math.min(24, banda * 0.6);
  const base = ALTO - M.abajo;
  const y = (v) => M.arriba + (1 - v / tope) * (base - M.arriba);
  const centro = (i) => M.izquierda + banda * i + banda / 2;

  const marcas = [];
  for (let v = 0; v <= tope + paso / 2; v += paso) marcas.push(v);

  // Con poco espacio se muestra una etiqueta sí y otra no, contando desde la más reciente.
  const salto = banda < 36 ? 2 : 1;
  const iMax = max > 0 ? datos.findIndex((d) => d.valor === max) : -1;
  const d = activo === null ? null : datos[activo];

  return (
    <div className="grafico" ref={contenedor}>
      {ancho > 0 && (
        <svg width={ancho} height={ALTO} role="img" aria-label={descripcion}>
          {marcas.map((v) => (
            <g key={v}>
              <line x1={M.izquierda} x2={ancho - M.derecha} y1={y(v)} y2={y(v)} className="grafico-rejilla" />
              <text x={M.izquierda - 8} y={y(v)} className="grafico-eje" textAnchor="end" dominantBaseline="middle">
                {compacto.format(v)}
              </text>
            </g>
          ))}

          {activo !== null && (
            <rect x={M.izquierda + banda * activo} y={M.arriba - 8} width={banda} height={base - M.arriba + 8}
              className="grafico-foco" rx="6" />
          )}

          {datos.map((p, i) => (
            <path key={p.clave} d={rutaBarra(centro(i) - grosor / 2, y(p.valor), grosor, base)}
              className={`grafico-barra${p.enCurso ? ' grafico-barra-curso' : ''}`} />
          ))}

          <line x1={M.izquierda} x2={ancho - M.derecha} y1={base} y2={base} className="grafico-base" />

          {datos.map((p, i) => (datos.length - 1 - i) % salto === 0 && (
            <text key={p.clave} x={centro(i)} y={ALTO - 8} className="grafico-eje" textAnchor="middle">
              {p.etiqueta}
            </text>
          ))}

          {iMax >= 0 && activo === null && (
            <text x={centro(iMax)} y={y(max) - 8} className="grafico-valor" textAnchor="middle">
              {compacto.format(max)}
            </text>
          )}

          {/* Zonas táctiles: toda la columna, más grandes que la barra */}
          {datos.map((p, i) => (
            <rect key={p.clave} x={M.izquierda + banda * i} y={M.arriba - 8} width={banda} height={base - M.arriba + 8}
              fill="transparent" tabIndex={0} className="grafico-zona"
              aria-label={`${p.detalle}: ${formato(p.valor)}, ${p.dias} días registrados`}
              onPointerEnter={() => setActivo(i)} onPointerLeave={() => setActivo(null)}
              onFocus={() => setActivo(i)} onBlur={() => setActivo(null)}
              onClick={() => setActivo(i)} />
          ))}
        </svg>
      )}

      {d && (
        <div className="grafico-tooltip" role="presentation"
          style={{
            left: Math.min(Math.max(centro(activo), 80), ancho - 80),
            top: Math.max(y(d.valor) - 10, 0),
          }}>
          <span className="grafico-tooltip-titulo">{d.detalle}{d.enCurso ? ' (en curso)' : ''}</span>
          <strong>{formato(d.valor)}</strong>
          <span>{d.dias} {d.dias === 1 ? 'día registrado' : 'días registrados'}</span>
        </div>
      )}
    </div>
  );
}
