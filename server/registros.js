import { Router } from 'express';
import { z } from 'zod';
import { pool } from './db/pool.js';
import { requiereSesion } from './auth.js';
import { CAMPOS, CAMPOS_DINERO, CAMPOS_ENTEROS } from '../shared/calculos.js';

const MAXIMO = 10_000_000;

const dinero = z.coerce.number({ error: 'Monto inválido' }).min(0, 'No se permiten montos negativos').max(MAXIMO).default(0);
const entero = z.coerce.number({ error: 'Cantidad inválida' }).int('La cantidad debe ser un número entero').min(0).max(MAXIMO).default(0);

const esquemaRegistro = z.object(Object.fromEntries([
  ...CAMPOS_ENTEROS.map((c) => [c, entero]),
  ...CAMPOS_DINERO.map((c) => [c, dinero]),
]));

const esquemaFecha = z.iso.date('Fecha inválida, usa AAAA-MM-DD');
const esquemaMes = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Mes inválido, usa AAAA-MM');

const COLUMNAS = CAMPOS.join(', ');
const VALORES = CAMPOS.map((_, i) => `$${i + 3}`).join(', ');
const ACTUALIZAR = CAMPOS.map((c) => `${c} = EXCLUDED.${c}`).join(', ');

export const rutasRegistros = Router();
rutasRegistros.use(requiereSesion);

// Lista de un mes con totales del periodo.
rutasRegistros.get('/', async (req, res) => {
  const mes = esquemaMes.safeParse(req.query.mes);
  if (!mes.success) return res.status(400).json({ error: mes.error.issues[0].message });

  const inicio = `${mes.data}-01`;
  const { rows } = await pool.query(
    `SELECT fecha, menu_cantidad, combo_cantidad, suma_ventas, suma_sencillo,
            duro, tarjeta, ingreso_yape, ingreso_total
       FROM registros_diarios
      WHERE usuario_id = $1
        AND fecha >= $2::date AND fecha < ($2::date + INTERVAL '1 month')
      ORDER BY fecha DESC`,
    [req.usuarioId, inicio],
  );
  res.json({ registros: rows });
});

// Totales por semana o por mes para los gráficos. Incluye periodos sin registros (en 0).
// "hasta" lo manda el cliente: es su fecha local (el servidor está en UTC).
const esquemaResumen = z.object({
  periodo: z.enum(['semana', 'mes']),
  cantidad: z.coerce.number().int().min(1).max(60).default(12),
  hasta: esquemaFecha,
});

rutasRegistros.get('/resumen', async (req, res) => {
  const datos = esquemaResumen.safeParse(req.query);
  if (!datos.success) return res.status(400).json({ error: datos.error.issues[0].message });

  const { periodo, cantidad, hasta } = datos.data;
  const unidad = periodo === 'semana' ? 'week' : 'month';
  const { rows } = await pool.query(
    `WITH periodos AS (
       SELECT generate_series(
                date_trunc($2, $3::date::timestamp) - ($4 - 1) * $5::interval,
                date_trunc($2, $3::date::timestamp),
                $5::interval
              )::date AS inicio
     )
     SELECT p.inicio,
            COALESCE(SUM(r.suma_ventas), 0)   AS ventas,
            COALESCE(SUM(r.ingreso_total), 0) AS ingreso,
            COUNT(r.id)::int                  AS dias
       FROM periodos p
       LEFT JOIN registros_diarios r
              ON r.usuario_id = $1
             AND r.fecha >= p.inicio
             AND r.fecha <  p.inicio + $5::interval
      GROUP BY p.inicio
      ORDER BY p.inicio`,
    [req.usuarioId, unidad, hasta, cantidad, `1 ${unidad}`],
  );
  res.json({ periodos: rows });
});

// Todos los campos, para exportar a Excel/PDF. Sin "mes" exporta todo el historial.
rutasRegistros.get('/exportar', async (req, res) => {
  const filtrarMes = req.query.mes !== undefined;
  const mes = esquemaMes.safeParse(req.query.mes);
  if (filtrarMes && !mes.success) return res.status(400).json({ error: mes.error.issues[0].message });

  const { rows } = await pool.query(
    `SELECT * FROM registros_diarios
      WHERE usuario_id = $1
        AND ($2::date IS NULL OR (fecha >= $2::date AND fecha < ($2::date + INTERVAL '1 month')))
      ORDER BY fecha`,
    [req.usuarioId, filtrarMes ? `${mes.data}-01` : null],
  );
  res.json({ registros: rows });
});

// Registro de un día + datos del día anterior para autocompletar.
rutasRegistros.get('/:fecha', async (req, res) => {
  const fecha = esquemaFecha.safeParse(req.params.fecha);
  if (!fecha.success) return res.status(400).json({ error: fecha.error.issues[0].message });

  const [actual, anterior] = await Promise.all([
    pool.query('SELECT * FROM registros_diarios WHERE usuario_id = $1 AND fecha = $2', [req.usuarioId, fecha.data]),
    pool.query(
      `SELECT fecha, suma_sencillo, yape FROM registros_diarios
        WHERE usuario_id = $1 AND fecha < $2
        ORDER BY fecha DESC LIMIT 1`,
      [req.usuarioId, fecha.data],
    ),
  ]);
  res.json({ registro: actual.rows[0] ?? null, anterior: anterior.rows[0] ?? null });
});

// Crea o actualiza el registro del día.
rutasRegistros.put('/:fecha', async (req, res) => {
  const fecha = esquemaFecha.safeParse(req.params.fecha);
  if (!fecha.success) return res.status(400).json({ error: fecha.error.issues[0].message });

  const datos = esquemaRegistro.safeParse(req.body ?? {});
  if (!datos.success) {
    const { path, message } = datos.error.issues[0];
    return res.status(400).json({ error: message, campo: path[0] });
  }

  const { rows } = await pool.query(
    `INSERT INTO registros_diarios (usuario_id, fecha, ${COLUMNAS})
     VALUES ($1, $2, ${VALORES})
     ON CONFLICT (usuario_id, fecha)
     DO UPDATE SET ${ACTUALIZAR}, actualizado_en = now()
     RETURNING *`,
    [req.usuarioId, fecha.data, ...CAMPOS.map((c) => datos.data[c])],
  );
  res.json({ registro: rows[0] });
});

rutasRegistros.delete('/:fecha', async (req, res) => {
  const fecha = esquemaFecha.safeParse(req.params.fecha);
  if (!fecha.success) return res.status(400).json({ error: fecha.error.issues[0].message });

  const { rowCount } = await pool.query(
    'DELETE FROM registros_diarios WHERE usuario_id = $1 AND fecha = $2',
    [req.usuarioId, fecha.data],
  );
  if (!rowCount) return res.status(404).json({ error: 'No hay registro para esa fecha' });
  res.status(204).end();
});
