-- Esquema idempotente: se puede ejecutar varias veces sin perder datos.

CREATE TABLE IF NOT EXISTS usuarios (
  id            SERIAL PRIMARY KEY,
  nombre        TEXT        NOT NULL,
  email         TEXT        NOT NULL UNIQUE,
  password_hash TEXT        NOT NULL,
  creado_en     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS registros_diarios (
  id                SERIAL PRIMARY KEY,
  usuario_id        INTEGER       NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  fecha             DATE          NOT NULL,

  -- Ventas
  menu_cantidad     INTEGER       NOT NULL DEFAULT 0 CHECK (menu_cantidad >= 0),
  menu_total        NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (menu_total >= 0),
  combo_cantidad    INTEGER       NOT NULL DEFAULT 0 CHECK (combo_cantidad >= 0),
  combo_total       NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (combo_total >= 0),
  extra_total       NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (extra_total >= 0),
  gaseosa_total     NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (gaseosa_total >= 0),
  sencillo_anterior NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (sencillo_anterior >= 0),
  sencillo_agregado NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (sencillo_agregado >= 0),

  -- Sencillo
  sencillo_1        NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (sencillo_1 >= 0),
  sencillo_2        NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (sencillo_2 >= 0),
  sencillo_3        NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (sencillo_3 >= 0),
  sencillo_4        NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (sencillo_4 >= 0),

  -- Pagos
  duro              NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (duro >= 0),
  tarjeta           NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (tarjeta >= 0),
  yape              NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (yape >= 0),
  yape_anterior     NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (yape_anterior >= 0),

  -- Totales calculados por PostgreSQL (mismas fórmulas que shared/calculos.js)
  suma_ventas       NUMERIC(12,2) GENERATED ALWAYS AS
                      (menu_total + combo_total + extra_total + gaseosa_total) STORED,
  sencillo_inicial  NUMERIC(12,2) GENERATED ALWAYS AS
                      (sencillo_anterior + sencillo_agregado) STORED,
  suma_sencillo     NUMERIC(12,2) GENERATED ALWAYS AS
                      (sencillo_1 + sencillo_2 + sencillo_3 + sencillo_4) STORED,
  ingreso_yape      NUMERIC(12,2) GENERATED ALWAYS AS
                      (yape - yape_anterior) STORED,
  ingreso_total     NUMERIC(12,2) GENERATED ALWAYS AS
                      (sencillo_1 + sencillo_2 + sencillo_3 + sencillo_4
                       + duro + tarjeta + (yape - yape_anterior)) STORED,

  creado_en         TIMESTAMPTZ   NOT NULL DEFAULT now(),
  actualizado_en    TIMESTAMPTZ   NOT NULL DEFAULT now(),

  UNIQUE (usuario_id, fecha)
);

-- Pagos y gastos del restaurante (personal, servicios, varios).
CREATE TABLE IF NOT EXISTS gastos (
  id          SERIAL PRIMARY KEY,
  usuario_id  INTEGER       NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  fecha       DATE          NOT NULL,
  categoria   TEXT          NOT NULL
                CHECK (categoria IN ('personal', 'ruc', 'agua', 'luz', 'gas', 'varios')),
  descripcion TEXT          NOT NULL DEFAULT '' CHECK (length(descripcion) <= 120),
  monto       NUMERIC(12,2) NOT NULL CHECK (monto > 0),
  creado_en   TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS gastos_usuario_fecha ON gastos (usuario_id, fecha);
