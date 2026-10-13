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
