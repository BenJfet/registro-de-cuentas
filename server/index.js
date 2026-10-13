import express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { fileURLToPath } from 'node:url';
import { rutasAuth } from './auth.js';
import { rutasRegistros } from './registros.js';
import { pool } from './db/pool.js';

if (!process.env.JWT_SECRET) {
  throw new Error('Falta JWT_SECRET. Copia .env.example como .env y complétalo.');
}

const app = express();
const enProduccion = process.env.NODE_ENV === 'production';

if (enProduccion) app.set('trust proxy', 1);
app.use(helmet());
app.use(express.json({ limit: '20kb' }));
app.use(cookieParser());

// Para el monitoreo del hosting: comprueba que la API y la base de datos respondan.
app.get('/api/salud', async (req, res) => {
  await pool.query('SELECT 1');
  res.json({ ok: true });
});

app.use('/api/auth', rutasAuth);
app.use('/api/registros', rutasRegistros);
app.use('/api', (req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));

// En producción Express también sirve la web compilada (npm run build).
if (enProduccion) {
  const dist = fileURLToPath(new URL('../client/dist', import.meta.url));
  app.use(express.static(dist));
  app.get('/{*ruta}', (req, res) => res.sendFile('index.html', { root: dist }));
}

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

const puerto = Number(process.env.PORT) || 3001;
app.listen(puerto, () => console.log(`API escuchando en http://localhost:${puerto}`));
