const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

// ─── Token helpers ────────────────────────────────────────────────────────────

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('access_token');
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('refresh_token');
}

export function setTokens(access: string, refresh: string) {
  localStorage.setItem('access_token', access);
  localStorage.setItem('refresh_token', refresh);
}

export function clearTokens() {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('user');
}

export function getUser() {
  if (typeof window === 'undefined') return null;
  const u = localStorage.getItem('user');
  return u ? JSON.parse(u) : null;
}

export function setUser(user: object) {
  localStorage.setItem('user', JSON.stringify(user));
}

// ─── Core fetch wrapper ───────────────────────────────────────────────────────

async function apiFetch(
  path: string,
  options: RequestInit = {},
  authenticated = true
): Promise<Response> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (authenticated) {
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (res.status === 401 && authenticated) {
    // Try refresh
    const refreshed = await tryRefresh();
    if (refreshed) {
      headers['Authorization'] = `Bearer ${getToken()}`;
      return fetch(`${BASE_URL}${path}`, { ...options, headers });
    } else {
      clearTokens();
      window.location.href = '/login';
    }
  }

  return res;
}

async function tryRefresh(): Promise<boolean> {
  const refresh = getRefreshToken();
  if (!refresh) return false;
  try {
    const res = await fetch(`${BASE_URL}/auth/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh }),
    });
    if (res.ok) {
      const data = await res.json();
      setTokens(data.access, data.refresh || refresh);
      return true;
    }
  } catch {}
  return false;
}

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw err;
  }
  return res.json();
}

// ─── Auth API ────────────────────────────────────────────────────────────────

export const authApi = {
  async login(username: string, password: string) {
    const res = await apiFetch('/auth/login/', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }, false);
    const data = await json<{ access: string; refresh: string; user: Record<string, unknown> }>(res);
    setTokens(data.access, data.refresh);
    setUser(data.user);
    return data;
  },

  async logout() {
    const refresh = getRefreshToken();
    await apiFetch('/auth/logout/', { method: 'POST', body: JSON.stringify({ refresh }) });
    clearTokens();
  },

  async me() {
    const res = await apiFetch('/auth/me/');
    return json(res);
  },
};

// ─── Analytics API ───────────────────────────────────────────────────────────

export const analyticsApi = {
  async dashboard() {
    const res = await apiFetch('/analytics/dashboard/');
    return json(res);
  },

  async reports(params: Record<string, string> = {}) {
    const qs = new URLSearchParams(params).toString();
    const res = await apiFetch(`/analytics/reports/${qs ? '?' + qs : ''}`);
    return json(res);
  },

  async publicStats() {
    const res = await apiFetch('/public/stats/', {}, false);
    return json(res);
  },
};

// ─── Vendors API ─────────────────────────────────────────────────────────────

export const vendorsApi = {
  async list(params: Record<string, string> = {}) {
    const qs = new URLSearchParams(params).toString();
    const res = await apiFetch(`/vendors/${qs ? '?' + qs : ''}`);
    return json(res);
  },

  async get(id: number | string) {
    const res = await apiFetch(`/vendors/${id}/`);
    return json(res);
  },

  async update(id: number | string, data: Record<string, unknown>) {
    const res = await apiFetch(`/vendors/${id}/`, { method: 'PATCH', body: JSON.stringify(data) });
    return json(res);
  },

  async complianceHistory(id: number | string) {
    const res = await apiFetch(`/vendors/${id}/compliance-history/`);
    return json(res);
  },
};

// ─── Stalls API ──────────────────────────────────────────────────────────────

export const stallsApi = {
  async list(params: Record<string, string> = {}) {
    const qs = new URLSearchParams(params).toString();
    const res = await apiFetch(`/stalls/${qs ? '?' + qs : ''}`, {}, !!getToken());
    return json(res);
  },

  async get(id: number | string) {
    const res = await apiFetch(`/stalls/${id}/`);
    return json(res);
  },
};

// ─── Sections API ────────────────────────────────────────────────────────────

export const sectionsApi = {
  async list() {
    const res = await apiFetch('/sections/');
    return json(res);
  },
};

// ─── Complaints API ──────────────────────────────────────────────────────────

export const complaintsApi = {
  async list(params: Record<string, string> = {}) {
    const qs = new URLSearchParams(params).toString();
    const res = await apiFetch(`/complaints/${qs ? '?' + qs : ''}`);
    return json(res);
  },

  async get(id: number | string) {
    const res = await apiFetch(`/complaints/${id}/`);
    return json(res);
  },

  async create(data: Record<string, unknown>) {
    const res = await apiFetch('/complaints/', { method: 'POST', body: JSON.stringify(data) });
    return json(res);
  },

  async createWithFile(formData: FormData) {
    const token = getToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${BASE_URL}/complaints/`, {
      method: 'POST',
      headers,
      body: formData,
    });
    if (res.status === 401 && token) {
      clearTokens();
      window.location.href = '/login';
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw err;
    }
    return res.json();
  },

  async updateStatus(id: number | string, status: string, resolution_notes?: string) {
    const res = await apiFetch(`/complaints/${id}/update-status/`, {
      method: 'PATCH',
      body: JSON.stringify({ status, resolution_notes }),
    });
    return json(res);
  },

  async summary() {
    const res = await apiFetch('/complaints/summary/');
    return json(res);
  },

  async escalate(id: number | string) {
    const res = await apiFetch(`/complaints/${id}/escalate/`, {
      method: 'POST',
    });
    return json(res);
  },
};

// ─── Documents API ───────────────────────────────────────────────────────────

export const documentsApi = {
  async list(params: Record<string, string> = {}) {
    const qs = new URLSearchParams(params).toString();
    const res = await apiFetch(`/documents/${qs ? '?' + qs : ''}`);
    return json(res);
  },

  async approve(id: number | string, review_notes?: string) {
    const res = await apiFetch(`/documents/${id}/approve/`, {
      method: 'POST',
      body: JSON.stringify({ review_notes }),
    });
    return json(res);
  },

  async reject(id: number | string, review_notes?: string) {
    const res = await apiFetch(`/documents/${id}/reject/`, {
      method: 'POST',
      body: JSON.stringify({ review_notes }),
    });
    return json(res);
  },

  async requestResubmission(id: number | string, review_notes?: string) {
    const res = await apiFetch(`/documents/${id}/request_resubmission/`, {
      method: 'POST',
      body: JSON.stringify({ review_notes }),
    });
    return json(res);
  },

  async upload(formData: FormData) {
    // Note: When sending FormData, DO NOT set 'Content-Type' header.
    // Fetch will automatically set it to 'multipart/form-data' with the correct boundary.
    const res = await fetch(`${BASE_URL}/documents/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getToken()}`
      },
      body: formData,
    });
    
    if (res.status === 401) {
      // Very basic refresh handling for upload endpoint
      clearTokens();
      window.location.href = '/login';
    }
    
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw err;
    }
    return res.json();
  },

  async summary() {
    const res = await apiFetch('/documents/summary/');
    return json(res);
  },

  async addPage(id: number | string, pageFile: File) {
    const formData = new FormData();
    formData.append('page', pageFile);
    const res = await fetch(`${BASE_URL}/documents/${id}/add-page/`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${getToken()}` },
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw err;
    }
    return res.json();
  },

  async submitContract(id: number | string) {
    const res = await apiFetch(`/documents/${id}/submit-contract/`, { method: 'POST' });
    return json(res);
  },

  async getPages(id: number | string) {
    const res = await apiFetch(`/documents/${id}/`);
    return json(res);
  },
};

// ─── Sanitation API ──────────────────────────────────────────────────────────

export const sanitationApi = {
  async checkItems() {
    const res = await apiFetch('/sanitation/sessions/check-items/');
    return json(res);
  },

  async sessions(params: Record<string, string> = {}) {
    const qs = new URLSearchParams(params).toString();
    const res = await apiFetch(`/sanitation/sessions/${qs ? '?' + qs : ''}`);
    return json(res);
  },

  async getSession(id: number | string) {
    const res = await apiFetch(`/sanitation/sessions/${id}/`);
    return json(res);
  },

  async createSession(data: Record<string, unknown>) {
    const res = await apiFetch('/sanitation/sessions/', { method: 'POST', body: JSON.stringify(data) });
    return json(res);
  },

  async bulkSave(sessionId: number | string, records: unknown[]) {
    const res = await apiFetch(`/sanitation/sessions/${sessionId}/bulk-save/`, {
      method: 'POST',
      body: JSON.stringify({ records }),
    });
    return json(res);
  },
};

// ─── Notifications API ────────────────────────────────────────────────────────

export const notificationsApi = {
  async list() {
    const res = await apiFetch('/notifications/');
    return json(res);
  },

  async unreadCount() {
    const res = await apiFetch('/notifications/unread-count/');
    return json(res);
  },

  async markAllRead() {
    const res = await apiFetch('/notifications/mark-all-read/', { method: 'POST' });
    return json(res);
  },
};

// ─── Markets API ─────────────────────────────────────────────────────────────

export const marketsApi = {
  async list(params: Record<string, string> = {}) {
    const qs = new URLSearchParams(params).toString();
    const res = await apiFetch(`/markets/${qs ? '?' + qs : ''}`, {}, false);
    return json(res);
  },
  
  async get(id: number | string) {
    const res = await apiFetch(`/markets/${id}/`, {}, false);
    return json(res);
  },
};

// ─── Prices API ──────────────────────────────────────────────────────────────

export const pricesApi = {
  async snapshots(params: Record<string, string> = {}) {
    const qs = new URLSearchParams(params).toString();
    const res = await apiFetch(`/prices/snapshots/${qs ? '?' + qs : ''}`, {}, false);
    return json(res);
  },

  async commodities(params: Record<string, string> = {}) {
    const qs = new URLSearchParams(params).toString();
    const res = await apiFetch(`/prices/commodities/${qs ? '?' + qs : ''}`, {}, false);
    return json(res);
  },
};

// ─── Unknown Entities API ───────────────────────────────────────────────────

export const unknownEntitiesApi = {
  async list(params: Record<string, string> = {}) {
    const qs = new URLSearchParams(params).toString();
    const res = await apiFetch(`/unknown-entities/${qs ? '?' + qs : ''}`);
    return json(res);
  },

  async resolve(id: number | string, data: Record<string, any>) {
    const res = await apiFetch(`/unknown-entities/${id}/resolve/`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
    return json(res);
  }
};

// ─── Violations API ──────────────────────────────────────────────────────────

export const violationsApi = {
  async list(params: Record<string, string> = {}) {
    const qs = new URLSearchParams(params).toString();
    const res = await apiFetch(`/violations/${qs ? '?' + qs : ''}`);
    return json(res);
  },
  async get(id: number | string) {
    const res = await apiFetch(`/violations/${id}/`);
    return json(res);
  },
  async create(data: Record<string, unknown>) {
    const res = await apiFetch('/violations/', { method: 'POST', body: JSON.stringify(data) });
    return json(res);
  },
  async update(id: number | string, data: Record<string, unknown>) {
    const res = await apiFetch(`/violations/${id}/`, { method: 'PATCH', body: JSON.stringify(data) });
    return json(res);
  }
};

// ─── Blotters API ──────────────────────────────────────────────────────────

export const blottersApi = {
  async list(params: Record<string, string> = {}) {
    const qs = new URLSearchParams(params).toString();
    const res = await apiFetch(`/blotters/${qs ? '?' + qs : ''}`);
    return json(res);
  },
  async create(data: Record<string, unknown>) {
    const res = await apiFetch('/blotters/', { method: 'POST', body: JSON.stringify(data) });
    return json(res);
  },
  async update(id: number | string, data: Record<string, unknown>) {
    const res = await apiFetch(`/blotters/${id}/`, { method: 'PATCH', body: JSON.stringify(data) });
    return json(res);
  }
};

// ─── AI Risk API ──────────────────────────────────────────────────────────

export const aiRiskApi = {
  async list(params: Record<string, string> = {}) {
    const qs = new URLSearchParams(params).toString();
    const res = await apiFetch(`/ai-risk/${qs ? '?' + qs : ''}`);
    return json(res);
  },

  async recompute() {
    const res = await apiFetch('/ai-risk/recompute/', { method: 'POST' });
    return json(res);
  }
};

// ─── Accomplishment Reports API ──────────────────────────────────────────────

export const accomplishmentApi = {
  async list(params: Record<string, string> = {}) {
    const qs = new URLSearchParams(params).toString();
    const res = await apiFetch(`/accomplishment-reports/${qs ? '?' + qs : ''}`);
    return json(res);
  },
  async generate(data: { period_start: string; period_end: string }) {
    const res = await apiFetch('/accomplishment-reports/generate/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return json(res);
  }
};
