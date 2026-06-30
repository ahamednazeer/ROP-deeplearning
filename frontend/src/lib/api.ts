const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const TOKEN_KEY = 'rop_auth_token';

export interface User {
  id: number;
  username: string;
  full_name: string;
  role: 'ADMIN' | 'DOCTOR';
  email: string;
  created_at?: string;
}

export interface Patient {
  id: number;
  name: string;
  age: number;
  birth_weight: number;
  gestational_age_weeks: number;
  sex: number;
  eye_side: 'LEFT' | 'RIGHT' | 'BOTH';
  notes?: string;
  created_at: string;
}

export interface Prediction {
  id: number;
  patient_id: number;
  patient_name: string;
  rop_stage: string;
  confidence: number;
  severity: string;
  stage?: number;
  stage_prob?: number;
  zone?: number;
  zone_prob?: number;
  plus_disease?: number;
  plus_prob?: number;
  created_at: string;
  image_filename: string;
  notes?: string;
  all_probabilities?: Record<string, number>;
}

export interface Stats {
  total_users: number;
  total_patients: number;
  total_predictions: number;
  by_stage: Record<string, number>;
  by_role: Record<string, number>;
}

export interface LoginResponse {
  access_token: string;
  user: User;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(TOKEN_KEY);
  }

  setToken(token: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(TOKEN_KEY, token);
  }

  clearToken(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem('rop_user');
  }

  private async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers,
    });

    if (!res.ok) {
      if (res.status === 401) {
        this.clearToken();
        if (typeof window !== 'undefined') {
          window.location.href = '/';
        }
      }
      let errorMsg = `HTTP ${res.status}`;
      try {
        const err = await res.json();
        errorMsg = err.detail || err.message || errorMsg;
      } catch {
        // ignore parse errors
      }
      throw new Error(errorMsg);
    }

    // Handle 204 No Content
    if (res.status === 204) {
      return undefined as T;
    }

    return res.json() as Promise<T>;
  }

  // ─── Auth ───────────────────────────────────────────────────────────────────

  async login(username: string, password: string): Promise<LoginResponse> {
    const res = await fetch(`${this.baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    if (!res.ok) {
      let msg = 'Login failed';
      try {
        const err = await res.json();
        msg = err.detail || err.message || msg;
      } catch {
        // ignore
      }
      throw new Error(msg);
    }

    const data = await res.json() as LoginResponse;
    this.setToken(data.access_token);
    if (typeof window !== 'undefined') {
      localStorage.setItem('rop_user', JSON.stringify(data.user));
    }
    return data;
  }

  async getMe(): Promise<User> {
    return this.request<User>('/auth/me');
  }

  // ─── Patients ───────────────────────────────────────────────────────────────

  async getPatients(): Promise<Patient[]> {
    return this.request<Patient[]>('/patients');
  }

  async createPatient(data: {
    name: string;
    age: number;
    birth_weight: number;
    gestational_age_weeks: number;
    sex: number;
    eye_side: string;
    notes?: string;
  }): Promise<Patient> {
    return this.request<Patient>('/patients', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deletePatient(id: number): Promise<void> {
    return this.request<void>(`/patients/${id}`, { method: 'DELETE' });
  }

  // ─── Predictions ────────────────────────────────────────────────────────────

  async getPredictions(): Promise<Prediction[]> {
    return this.request<Prediction[]>('/predictions');
  }

  async getPrediction(id: number): Promise<Prediction> {
    return this.request<Prediction>(`/predictions/${id}`);
  }

  async deletePrediction(id: number): Promise<void> {
    return this.request<void>(`/predictions/${id}`, { method: 'DELETE' });
  }

  async uploadPrediction(formData: FormData): Promise<Prediction> {
    const token = this.getToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    // Do NOT set Content-Type — browser sets it with boundary automatically

    const res = await fetch(`${this.baseUrl}/predictions/upload`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!res.ok) {
      let msg = 'Upload failed';
      try {
        const err = await res.json();
        msg = err.detail || err.message || msg;
      } catch {
        // ignore
      }
      throw new Error(msg);
    }

    return res.json() as Promise<Prediction>;
  }

  // ─── Users (Admin only) ─────────────────────────────────────────────────────

  async getUsers(): Promise<User[]> {
    return this.request<User[]>('/users');
  }

  async createUser(data: {
    username: string;
    password: string;
    full_name: string;
    email: string;
    role: string;
  }): Promise<User> {
    return this.request<User>('/users', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteUser(id: number): Promise<void> {
    return this.request<void>(`/users/${id}`, { method: 'DELETE' });
  }

  // ─── Stats ──────────────────────────────────────────────────────────────────

  async getStats(): Promise<Stats> {
    return this.request<Stats>('/users/stats');
  }
}

export const api = new ApiClient(API_BASE);
export default api;
