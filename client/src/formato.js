const moneda = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' });

export const soles = (n) => moneda.format(Number(n) || 0);

// Fecha local de hoy en formato AAAA-MM-DD (toISOString usaría UTC y podría dar mañana).
export function hoy() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

const aFecha = (iso) => new Date(`${iso}T12:00:00`);

export const fechaLarga = (iso) =>
  aFecha(iso).toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

export const fechaCorta = (iso) =>
  aFecha(iso).toLocaleDateString('es-PE', { weekday: 'short', day: 'numeric', month: 'short' });

export const diaMes = (iso) =>
  aFecha(iso).toLocaleDateString('es-PE', { day: 'numeric', month: 'short' });

export const nombreMes =(mes) =>
  aFecha(`${mes}-01`).toLocaleDateString('es-PE', { month: 'long', year: 'numeric' });
