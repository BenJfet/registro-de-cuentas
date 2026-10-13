// Input numérico: dinero (con prefijo S/) o cantidad entera.
export default function Campo({ etiqueta, nombre, valor, onChange, entero = false, nota, error, oculto = false }) {
  const id = `campo-${nombre}`;
  return (
    <label className={`campo${error ? ' campo-error' : ''}`} htmlFor={id}>
      <span className={oculto ? 'solo-lectores' : 'campo-etiqueta'}>{etiqueta}</span>
      <span className="campo-caja">
        {!entero && <span className="campo-prefijo" aria-hidden="true">S/</span>}
        <input
          id={id}
          name={nombre}
          type="number"
          inputMode={entero ? 'numeric' : 'decimal'}
          min="0"
          step={entero ? '1' : '0.01'}
          placeholder={entero ? '0' : '0.00'}
          value={valor}
          onChange={(e) => onChange(nombre, e.target.value)}
          onWheel={(e) => e.currentTarget.blur()}
          aria-invalid={error ? 'true' : undefined}
        />
      </span>
      {nota && <span className="campo-nota">{nota}</span>}
    </label>
  );
}
