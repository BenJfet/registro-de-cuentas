import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { pool } from './db/pool.js';

const COOKIE = 'token';
const DURACION_SESION_MS = 7 * 24 * 60 * 60 * 1000;

const opcionesCookie = () => ({
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  maxAge: DURACION_SESION_MS,
});

const email = z.string().trim().toLowerCase().pipe(z.email('Correo inválido'));

const esquemaRegistro = z.object({
  nombre: z.string().trim().min(1, 'Ingresa tu nombre').max(80),
  email,
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres').max(128),
});

const esquemaLogin = z.object({
  email,
  password: z.string().min(1, 'Ingresa tu contraseña'),
});

function iniciarSesion(res, usuario) {
  const token = jwt.sign({ sub: usuario.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.cookie(COOKIE, token, opcionesCookie());
  res.json({ usuario: { id: usuario.id, nombre: usuario.nombre, email: usuario.email } });
}

export function requiereSesion(req, res, next) {
  try {
    const { sub } = jwt.verify(req.cookies?.[COOKIE] ?? '', process.env.JWT_SECRET);
    req.usuarioId = sub;
    next();
  } catch {
    res.status(401).json({ error: 'Debes iniciar sesión' });
  }
}

// Frena ataques de fuerza bruta contra el login.
const limitador = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false });

export const rutasAuth = Router();

rutasAuth.post('/registro', limitador, async (req, res) => {
  const datos = esquemaRegistro.safeParse(req.body);
  if (!datos.success) return res.status(400).json({ error: datos.error.issues[0].message });

  const { nombre, email, password } = datos.data;
  const hash = await bcrypt.hash(password, 12);
  try {
    const { rows } = await pool.query(
      'INSERT INTO usuarios (nombre, email, password_hash) VALUES ($1, $2, $3) RETURNING id, nombre, email',
      [nombre, email, hash],
    );
    iniciarSesion(res.status(201), rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Ese correo ya está registrado' });
    throw err;
  }
});

rutasAuth.post('/login', limitador, async (req, res) => {
  const datos = esquemaLogin.safeParse(req.body);
  if (!datos.success) return res.status(400).json({ error: datos.error.issues[0].message });

  const { email, password } = datos.data;
  const { rows } = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
  const usuario = rows[0];
  const valido = usuario && (await bcrypt.compare(password, usuario.password_hash));
  if (!valido) return res.status(401).json({ error: 'Correo o contraseña incorrectos' });

  iniciarSesion(res, usuario);
});

rutasAuth.post('/logout', (req, res) => {
  const { maxAge, ...opciones } = opcionesCookie();
  res.clearCookie(COOKIE, opciones);
  res.status(204).end();
});

rutasAuth.get('/yo', requiereSesion, async (req, res) => {
  const { rows } = await pool.query('SELECT id, nombre, email FROM usuarios WHERE id = $1', [req.usuarioId]);
  if (!rows[0]) return res.status(401).json({ error: 'Debes iniciar sesión' });
  res.json({ usuario: rows[0] });
});
