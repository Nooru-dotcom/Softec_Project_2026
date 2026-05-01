export const API = {
  auth: process.env.NEXT_PUBLIC_AUTH_URL || 'http://localhost:8001',
  earnings: process.env.NEXT_PUBLIC_EARNINGS_URL || 'http://localhost:8002',
  anomaly: process.env.NEXT_PUBLIC_ANOMALY_URL || 'http://localhost:8003',
  analytics: process.env.NEXT_PUBLIC_ANALYTICS_URL || 'http://localhost:8004',
  certificate: process.env.NEXT_PUBLIC_CERTIFICATE_URL || 'http://localhost:8005',
  grievance: process.env.NEXT_PUBLIC_GRIEVANCE_URL || 'http://localhost:8006',
};

export class ApiError extends Error {
  status: number;
  detail?: string;

  constructor(message: string, status: number, detail?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.detail = detail;
  }
}

async function parseErrorResponse(res: Response, fallbackPrefix: string): Promise<ApiError> {
  let detail: string | undefined;

  try {
    const payload = await res.json();
    if (typeof payload?.detail === 'string') {
      detail = payload.detail;
    } else if (Array.isArray(payload?.detail) && payload.detail.length > 0) {
      detail = payload.detail.map((d: { msg?: string }) => d?.msg).filter(Boolean).join(', ');
    }
  } catch {
    // Ignore JSON parse failures and use fallback message.
  }

  return new ApiError(detail || `${fallbackPrefix}: ${res.status}`, res.status, detail);
}

export async function apiGet(url: string, token?: string) {
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    cache: 'no-store',
  });
  if (!res.ok) {
    throw await parseErrorResponse(res, 'GET failed');
  }
  return res.json();
}

export async function apiGetBlob(url: string, token?: string) {
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    cache: 'no-store',
  });
  if (!res.ok) {
    throw await parseErrorResponse(res, 'GET blob failed');
  }
  return {
    blob: await res.blob(),
    contentDisposition: res.headers.get('content-disposition') || '',
  };
}

export async function apiPost(url: string, body: unknown, token?: string) {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw await parseErrorResponse(res, 'POST failed');
  }
  return res.json();
}

export async function apiPatch(url: string, body: unknown, token?: string) {
  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw await parseErrorResponse(res, 'PATCH failed');
  }
  return res.json();
}

export async function apiPostForm(url: string, form: FormData, token?: string) {
  const res = await fetch(url, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: form,
  });
  if (!res.ok) {
    throw await parseErrorResponse(res, 'POST form failed');
  }
  return res.json();
}
