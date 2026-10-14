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
  // Cerrar conexiones ociosas antes de que Neon suspenda la base (~5 min) y las corte.
  idleTimeoutMillis: 60_000,
});

// Si la base corta una conexión ociosa, pg emite 'error' en el pool; sin este
// manejador Node lo trata como excepción no capturada y tumba el servidor.
pool.on('error', (err) => console.error('Conexión a la base de datos perdida:', err.message));
