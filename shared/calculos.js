// Campos que el usuario llena en el registro diario.
// Lo usan el servidor (validación y SQL) y el cliente (formulario).
export const CAMPOS_ENTEROS = ['menu_cantidad', 'combo_cantidad'];

export const CAMPOS_DINERO = [
  'menu_total',
  'combo_total',
  'extra_total',
  'gaseosa_total',
  'sencillo_anterior',
  'sencillo_agregado',
  'sencillo_1',
  'sencillo_2',
  'sencillo_3',
  'sencillo_4',
  'duro',
  'tarjeta',
  'yape',
  'yape_anterior',
];

export const CAMPOS = [...CAMPOS_ENTEROS, ...CAMPOS_DINERO];

const num = (v) => {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
};

// Redondeo a céntimos para evitar errores de coma flotante (0.1 + 0.2).
export const redondear = (x) => Math.round((x + Number.EPSILON) * 100) / 100;

const sumar = (...valores) => redondear(valores.reduce((acc, v) => acc + num(v), 0));

// Mismas fórmulas que las columnas generadas en server/db/schema.sql.
export function calcularTotales(r) {
  const sumaVentas = sumar(r.menu_total, r.combo_total, r.extra_total, r.gaseosa_total);
  const sencilloInicial = sumar(r.sencillo_anterior, r.sencillo_agregado);
  const sumaSencillo = sumar(r.sencillo_1, r.sencillo_2, r.sencillo_3, r.sencillo_4);
  const ingresoYape = redondear(num(r.yape) - num(r.yape_anterior));
  const ingresoTotal = sumar(sumaSencillo, r.duro, r.tarjeta, ingresoYape);

  return { sumaVentas, sencilloInicial, sumaSencillo, ingresoYape, ingresoTotal };
}
