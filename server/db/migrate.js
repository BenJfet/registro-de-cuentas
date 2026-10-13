import { readFile } from 'node:fs/promises';
import { pool } from './pool.js';

const sql = await readFile(new URL('./schema.sql', import.meta.url), 'utf8');

try {
  await pool.query(sql);
  console.log('Esquema aplicado correctamente.');
} catch (err) {
  console.error('Error al aplicar el esquema:', err.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
