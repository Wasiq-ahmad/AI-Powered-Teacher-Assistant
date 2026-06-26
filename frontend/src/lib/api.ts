export type ApiError = {
  status: number
  message: string
  details?: unknown
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000'

async function parseJsonSafely(res: Response) {
  const text = await res.text()
  if (!text) return undefined
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

export async function apiFetch<T>(
  path: string,
  opts: RequestInit & { token?: string | null } = {},
): Promise<T> {
  const url = path.startsWith('http') ? path : `${API_BASE_URL}${path}`
  const headers = new Headers(opts.headers)
  if (!(opts.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }
  if (opts.token) headers.set('Authorization', `Bearer ${opts.token}`)

  const res = await fetch(url, { ...opts, headers })
  if (!res.ok) {
    const body = await parseJsonSafely(res)
    const msg =
      typeof body === 'object' && body && 'detail' in body ? String((body as any).detail) : res.statusText
    throw { status: res.status, message: msg, details: body } satisfies ApiError
  }

  return (await parseJsonSafely(res)) as T
}

export async function downloadFile(
  path: string,
  filename: string,
  token?: string | null
): Promise<void> {
  const url = path.startsWith('http') ? path : `${API_BASE_URL}${path}`
  const headers = new Headers()
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const res = await fetch(url, { headers })
  if (!res.ok) throw new Error('Download failed')

  const blob = await res.blob()
  const localUrl = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = localUrl
  a.download = filename
  document.body.appendChild(a)
  a.click()
  window.URL.revokeObjectURL(localUrl)
  a.remove()
}

