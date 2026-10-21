export class ApiError extends Error {
  constructor(message, status, fields, data = {}) {
    super(message);
    this.status = status;
    this.fields = fields || {};
    this.data = data;
  }
}

export async function api(url, { method = 'GET', body } = {}) {
  const res = await fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error || `Lỗi ${res.status}`, res.status, data.fields, data);
  return data;
}
