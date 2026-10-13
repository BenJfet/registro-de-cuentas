import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcularTotales } from './calculos.js';

test('suma de ventas incluye menú, combos, extra y gaseosa', () => {
  const t = calcularTotales({ menu_total: 150, combo_total: 80.5, extra_total: 12, gaseosa_total: 30 });
  assert.equal(t.sumaVentas, 272.5);
});

test('sencillo inicial = sencillo del día anterior + sencillo agregado', () => {
  const t = calcularTotales({ sencillo_anterior: 50, sencillo_agregado: 20 });
  assert.equal(t.sencilloInicial, 70);
});

test('suma de sencillo junta los cuatro apartados', () => {
  const t = calcularTotales({ sencillo_1: 10, sencillo_2: 20.5, sencillo_3: 5, sencillo_4: 4.5 });
  assert.equal(t.sumaSencillo, 40);
});

test('ingreso Yape = Yape del día − Yape anterior', () => {
  const t = calcularTotales({ yape: 900, yape_anterior: 650 });
  assert.equal(t.ingresoYape, 250);
});

test('ingreso total = sencillo + duro + tarjeta + ingreso Yape', () => {
  const t = calcularTotales({
    sencillo_1: 40, duro: 300, tarjeta: 120, yape: 900, yape_anterior: 650,
  });
  assert.equal(t.ingresoTotal, 40 + 300 + 120 + 250);
});

test('campos vacíos o inválidos cuentan como 0', () => {
  const t = calcularTotales({ menu_total: '', combo_total: null, extra_total: 'abc' });
  assert.equal(t.sumaVentas, 0);
  assert.equal(t.ingresoTotal, 0);
});

test('redondea a céntimos sin errores de coma flotante', () => {
  const t = calcularTotales({ menu_total: 0.1, combo_total: 0.2 });
  assert.equal(t.sumaVentas, 0.3);
});
