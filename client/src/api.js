export class ErrorApi extends Error {
  constructor(mensaje, estado, campo) {
    super(mensaje);
    this.estado = estado;
    this.campo = campo;
  }
}

export async function api(ruta, { method = 'GET', body } = {}) {
  let res;
  try {
    res = await fetch(`/api${ruta}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ErrorApi('No se pudo conectar con el servidor', 0);
  }

  if (res.status === 204) return null;
  const datos = await res.json().catch(() => ({}));

  if (!res.ok) {
    // Sesión vencida en cualquier pantalla: volver al login.
    if (res.status === 401 && !ruta.startsWith('/auth/')) {
      window.dispatchEvent(new Event('sesion-expirada'));
    }
    throw new ErrorApi(datos.error || 'Error inesperado', res.status, datos.campo);
  }
  return datos;
}
