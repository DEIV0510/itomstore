/**
 * Cliente HTTP unico contra /api.
 * La sesion viaja en una cookie httpOnly, por eso todas las llamadas usan
 * credentials: 'include' y aqui no se guarda ningun token.
 */
export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response
  try {
    res = await fetch(`/api${path}`, {
      credentials: 'include',
      headers: init.body ? { 'Content-Type': 'application/json' } : undefined,
      ...init,
    })
  } catch {
    throw new ApiError('No pudimos conectar con el servidor. Revisa tu conexión.', 0)
  }

  if (res.status === 204) return undefined as T

  const text = await res.text()
  let data: unknown = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    /* respuesta no JSON */
  }

  if (!res.ok) {
    const delServidor =
      data && typeof data === 'object' && 'error' in data && typeof (data as { error: unknown }).error === 'string'
        ? (data as { error: string }).error
        : null

    // Si la respuesta no trae un error nuestro en JSON, la peticion no llego a la
    // API de ITOMSTORE: la contesto otra cosa (un servidor estatico, otro proyecto
    // en ese puerto, un proxy...). Decirlo asi ahorra mucho tiempo de diagnostico.
    const message = delServidor ?? describeUnreachable(res.status)
    throw new ApiError(message, res.status)
  }
  return data as T
}

/** Traduce a lenguaje util los fallos en los que la API ni siquiera respondio. */
function describeUnreachable(status: number): string {
  if (status === 404 || status === 405 || status === 501) {
    return (
      `La petición no llegó al servidor de ITOMSTORE (respuesta ${status}). ` +
      'Comprueba que la API esté corriendo con "npm run dev" y que estés abriendo ' +
      'la dirección correcta (http://localhost:5256), no otro proyecto en otro puerto.'
    )
  }
  if (status === 502 || status === 503 || status === 504) {
    return 'El servidor de ITOMSTORE no está respondiendo. Revisa la ventana donde ejecutaste "npm run dev".'
  }
  if (status >= 500) return 'Error interno del servidor. Revisa la consola donde corre la API.'
  return `Error ${status}`
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) => request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) => request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  del: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  upload: async <T>(path: string, file: File): Promise<T> => {
    const form = new FormData()
    form.append('file', file)
    const res = await fetch(`/api${path}`, { method: 'POST', body: form, credentials: 'include' })
    const data = await res.json().catch(() => null)
    if (!res.ok) throw new ApiError(data?.error ?? `Error ${res.status}`, res.status)
    return data as T
  },
}
