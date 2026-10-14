// Categorías de gastos. Las usan el servidor (validación) y el cliente (formulario).
// Si agregas una, agrégala también al CHECK de la tabla gastos en schema.sql.
export const CATEGORIAS_GASTO = [
  { id: 'personal', nombre: 'Pago de personal' },
  { id: 'ruc', nombre: 'RUC / SUNAT' },
  { id: 'agua', nombre: 'Agua' },
  { id: 'luz', nombre: 'Luz' },
  { id: 'gas', nombre: 'Gas' },
  { id: 'varios', nombre: 'Gastos varios' },
];

export const SERVICIOS = ['ruc', 'agua', 'luz', 'gas'];
