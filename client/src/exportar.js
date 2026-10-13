// Exportación del historial a Excel y PDF.
// Las librerías se cargan solo al exportar, para no hacer más pesada la app.
import { calcularTotales, redondear } from '../../shared/calculos.js';
import { soles } from './formato.js';

const GUINDA = [123, 30, 46];
const CREMA = [245, 236, 220];
const TEXTO = [43, 26, 28];

const ventasMasSencillo = (r) => calcularTotales(r).totalVentasSencillo;
const diferencia = (r) => redondear(r.ingreso_total - ventasMasSencillo(r));

// [título, valor, tipo, ¿sumar en totales?]
// Sencillo anterior y los Yape acumulados no se suman: son saldos, no ingresos.
const COLUMNAS_EXCEL = [
  ['Fecha', (r) => r.fecha, 'fecha', false],
  ['Menús (cant.)', (r) => r.menu_cantidad, 'entero', true],
  ['Menús', (r) => r.menu_total, 'soles', true],
  ['Combos (cant.)', (r) => r.combo_cantidad, 'entero', true],
  ['Combos', (r) => r.combo_total, 'soles', true],
  ['Extra', (r) => r.extra_total, 'soles', true],
  ['Gaseosa', (r) => r.gaseosa_total, 'soles', true],
  ['Suma ventas', (r) => r.suma_ventas, 'soles', true],
  ['Sencillo anterior', (r) => r.sencillo_anterior, 'soles', false],
  ['Sencillo agregado', (r) => r.sencillo_agregado, 'soles', true],
  ['Total ventas + sencillo', ventasMasSencillo, 'soles', false],
  ['Sencillo 1', (r) => r.sencillo_1, 'soles', false],
  ['Sencillo 2', (r) => r.sencillo_2, 'soles', false],
  ['Sencillo 3', (r) => r.sencillo_3, 'soles', false],
  ['Sencillo 4', (r) => r.sencillo_4, 'soles', false],
  ['Suma sencillo', (r) => r.suma_sencillo, 'soles', true],
  ['Duro', (r) => r.duro, 'soles', true],
  ['Tarjeta', (r) => r.tarjeta, 'soles', true],
  ['Yape', (r) => r.yape, 'soles', false],
  ['Yape anterior', (r) => r.yape_anterior, 'soles', false],
  ['Ingreso Yape', (r) => r.ingreso_yape, 'soles', true],
  ['Ingreso total', (r) => r.ingreso_total, 'soles', true],
  ['Diferencia', diferencia, 'soles', true],
];

const COLUMNAS_PDF = [
  ['Fecha', (r) => fechaPdf(r.fecha), false],
  ['Menús', (r) => r.menu_cantidad, true],
  ['Combos', (r) => r.combo_cantidad, true],
  ['Ventas', (r) => r.suma_ventas, true],
  ['Sencillo inicial', (r) => r.sencillo_inicial, false],
  ['Ventas + sencillo', ventasMasSencillo, false],
  ['Sencillo', (r) => r.suma_sencillo, true],
  ['Duro', (r) => r.duro, true],
  ['Tarjeta', (r) => r.tarjeta, true],
  ['Ingreso Yape', (r) => r.ingreso_yape, true],
  ['Ingreso total', (r) => r.ingreso_total, true],
  ['Diferencia', diferencia, true],
];

const DIAS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
function fechaPdf(iso) {
  const [a, m, d] = iso.split('-').map(Number);
  return `${DIAS[new Date(Date.UTC(a, m - 1, d)).getUTCDay()]} ${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}`;
}

// jsPDF solo trae fuentes latinas básicas: normalizamos los espacios especiales de Intl.
const solesPdf = (n) => soles(n).replace(/\s/g, ' ');

function descargar(blob, nombre) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const letraColumna = (n) => {
  let s = '';
  for (; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
};

export async function exportarExcel(registros, { titulo, archivo }) {
  const { default: ExcelJS } = await import('exceljs');
  const libro = new ExcelJS.Workbook();
  libro.creator = 'Caja del Día';
  const hoja = libro.addWorksheet('Registros', { views: [{ state: 'frozen', xSplit: 1, ySplit: 3 }] });

  hoja.getCell('A1').value = titulo;
  hoja.getCell('A1').font = { bold: true, size: 14, color: { argb: 'FF7B1E2E' } };

  const encabezado = hoja.getRow(3);
  COLUMNAS_EXCEL.forEach(([t], i) => { encabezado.getCell(i + 1).value = t; });
  encabezado.height = 32;
  encabezado.eachCell((c) => {
    c.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF7B1E2E' } };
    c.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  });

  registros.forEach((r, fila) => {
    const row = hoja.getRow(4 + fila);
    COLUMNAS_EXCEL.forEach(([, valor, tipo], i) => {
      const celda = row.getCell(i + 1);
      if (tipo === 'fecha') {
        const [a, m, d] = r.fecha.split('-').map(Number);
        celda.value = new Date(Date.UTC(a, m - 1, d));
        celda.numFmt = 'dd/mm/yyyy';
      } else {
        celda.value = Number(valor(r));
        celda.numFmt = tipo === 'soles' ? '"S/" #,##0.00' : '0';
      }
    });
  });

  const primera = 4;
  const ultima = 3 + registros.length;
  const totales = hoja.getRow(ultima + 1);
  totales.getCell(1).value = 'Total';
  COLUMNAS_EXCEL.forEach(([, valor, tipo, sumar], i) => {
    if (!sumar || !registros.length) return;
    const letra = letraColumna(i + 1);
    const celda = totales.getCell(i + 1);
    celda.value = {
      formula: `SUM(${letra}${primera}:${letra}${ultima})`,
      result: redondear(registros.reduce((acc, r) => acc + Number(valor(r)), 0)),
    };
    celda.numFmt = tipo === 'soles' ? '"S/" #,##0.00' : '0';
  });
  totales.eachCell({ includeEmpty: true }, (c) => {
    c.font = { bold: true };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5ECDC' } };
  });

  hoja.columns.forEach((col, i) => { col.width = i === 0 ? 12 : 13; });

  const buffer = await libro.xlsx.writeBuffer();
  descargar(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), archivo);
}

export async function exportarPdf(registros, { titulo, subtitulo, archivo }) {
  const [{ jsPDF }, { autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...GUINDA);
  doc.text(titulo, 14, 16);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...TEXTO);
  doc.text(subtitulo, 14, 23);

  const suma = (valor) => redondear(registros.reduce((acc, r) => acc + Number(valor(r)), 0));
  const formatear = (v, i) => (i === 0 ? v : i <= 2 ? String(v) : solesPdf(v));

  autoTable(doc, {
    startY: 29,
    head: [COLUMNAS_PDF.map(([t]) => t)],
    body: registros.map((r) => COLUMNAS_PDF.map(([, valor], i) => formatear(valor(r), i))),
    foot: [COLUMNAS_PDF.map(([, valor, sumar], i) => (i === 0 ? 'Total' : sumar ? formatear(suma(valor), i) : ''))],
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 1.8, halign: 'right', textColor: TEXTO, lineColor: [232, 220, 198], lineWidth: 0.1 },
    headStyles: { fillColor: GUINDA, textColor: 255, halign: 'center', valign: 'middle' },
    footStyles: { fillColor: CREMA, textColor: TEXTO, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [250, 245, 236] },
    columnStyles: { 0: { halign: 'left' } },
    didDrawPage: () => {
      const { width, height } = doc.internal.pageSize;
      doc.setFontSize(8);
      doc.setTextColor(111, 92, 87);
      doc.text(`Página ${doc.getCurrentPageInfo().pageNumber}`, width - 14, height - 8, { align: 'right' });
    },
  });

  doc.save(archivo);
}
