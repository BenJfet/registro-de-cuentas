import pg from 'pg';

// DATE llega como texto 'YYYY-MM-DD' (sin convertir a Date, evita desfases de zona horaria).
pg.types.setTypeParser(pg.types.builtins.DATE, (v) => v);
// NUMERIC llega como número de JS en lugar de string.
pg.types.setTypeParser(pg.types.builtins.NUMERIC, (v) => (v === null ? null : Number(v)));

if (!process.env.DATABASE_URL) {
  throw new Error('Falta DATABASE_URL. Copia .env.example como .env y complétalo.');
}

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
});
