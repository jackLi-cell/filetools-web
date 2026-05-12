const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"

export interface ApiResponse<T = unknown> {
  code: number
  data?: T
  message?: string
}

export async function apiFetch<T = unknown>(path: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  })

  if (!res.ok && res.status >= 500) {
    return { code: res.status, message: "服务器错误，请稍后再试" }
  }

  return res.json()
}

export const api = {
  get: <T = unknown>(path: string) => apiFetch<T>(path),
  post: <T = unknown>(path: string, body?: unknown) =>
    apiFetch<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  put: <T = unknown>(path: string, body?: unknown) =>
    apiFetch<T>(path, { method: "PUT", body: body ? JSON.stringify(body) : undefined }),
  delete: <T = unknown>(path: string) => apiFetch<T>(path, { method: "DELETE" }),
}
