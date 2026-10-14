import { Router } from 'express';
import { z } from 'zod';
import { pool } from './db/pool.js';
import { requiereSesion } from './auth.js';
import { MAXIMO, esquemaFecha, esquemaMes } from './registros.js';
import { CATEGORIAS_GASTO } from '../shared/gastos.js';

const esquemaGasto = z.object({
  fecha: esquemaFecha,
  categoria: z.enum(CATEGORIAS_GASTO.map((c) => c.id), { error: 'Categoría inválida' }),
  descripcion: z.string().trim().max(120, 'Máximo 120 caracteres').default(''),
  monto: z.coerce.number({ error: 'Monto inválido' }).positive('El monto debe ser mayor a 0').max(MAXIMO),
}).refine((g) => g.categoria !== 'personal' || g.descripcion, {
  error: 'Escribe el nombre del trabajador',
  path: ['descripcion'],
});

const esquemaId = z.coerce.number().int().positive();

export const rutasGastos = Router();
rutasGastos.use(requiereSesion);

// Gastos de un mes, las ventas del mismo mes (para lo que queda líquido)
// y los nombres de trabajadores ya usados (para autocompletar).
rutasGastos.get('/', async (req, res) => {
  const mes = esquemaMes.safeParse(req.query.mes);
  if (!mes.success) return res.status(400).json({ error: mes.error.issues[0].message });

  const inicio = `${mes.data}-01`;
  const [gastos, ventas, trabajadores] = await Promise.all([
    pool.query(
      `SELECT id, fecha, categoria, descripcion, monto FROM gastos
        WHERE usuario_id = $1
          AND fecha >= $2::date AND fecha < ($2::date + INTERVAL '1 month')
        ORDER BY fecha DESC, id DESC`,
      [req.usuarioId, inicio],
    ),
    pool.query(
      `SELECT COALESCE(SUM(suma_ventas), 0) AS total FROM registros_diarios
        WHERE usuario_id = $1
          AND fecha >= $2::date AND fecha < ($2::date + INTERVAL '1 month')`,
      [req.usuarioId, inicio],
    ),
    pool.query(
      `SELECT DISTINCT descripcion FROM gastos
        WHERE usuario_id = $1 AND categoria = 'personal'
        ORDER BY descripcion`,
      [req.usuarioId],
    ),
  ]);
  res.json({
    gastos: gastos.rows,
    ventasMes: ventas.rows[0].total,
    trabajadores: trabajadores.rows.map((r) => r.descripcion),
  });
});

rutasGastos.post('/', async (req, res) => {
  const datos = esquemaGasto.safeParse(req.body ?? {});
  if (!datos.success) {
    const { path, message } = datos.error.issues[0];
    return res.status(400).json({ error: message, campo: path[0] });
  }

  const { fecha, categoria, descripcion, monto } = datos.data;
  const { rows } = await pool.query(
    `INSERT INTO gastos (usuario_id, fecha, categoria, descripcion, monto)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, fecha, categoria, descripcion, monto`,
    [req.usuarioId, fecha, categoria, descripcion, monto],
  );
  res.status(201).json({ gasto: rows[0] });
});

rutasGastos.delete('/:id', async (req, res) => {
  const id = esquemaId.safeParse(req.params.id);
  if (!id.success) return res.status(400).json({ error: 'Gasto inválido' });

  const { rowCount } = await pool.query(
    'DELETE FROM gastos WHERE id = $1 AND usuario_id = $2',
    [id.data, req.usuarioId],
  );
  if (!rowCount) return res.status(404).json({ error: 'Ese gasto no existe' });
  res.status(204).end();
});
