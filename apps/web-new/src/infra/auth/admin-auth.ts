interface AdminUser {
  id: string;
  nome: string;
  email: string;
  permissoes: string[];
  avatarUrl?: string | null;
}

interface LoginResponse {
  token: string;
  admin: AdminUser;
}

interface LoginResponseWith2FA {
  requiresTwoFactor: true;
  tempToken: string;
}

const API_URL = (() => {
  const url = import.meta.env.VITE_API_URL || 'http://localhost:3001';
  return url.endsWith('/api') ? url : `${url}/api`;
})();

class AdminAuthService {
  private tokenKey = 'admin_token';
  private userKey = 'admin_user';

  async login(
    email: string,
    password: string,
    recaptchaToken?: string,
  ): Promise<AdminUser | LoginResponseWith2FA> {
    const response = await fetch(`${API_URL}/admin/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, senha: password, recaptchaToken }),
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ error: 'Falha no login' }));
      throw new Error(error.error || error.message || 'Falha no login');
    }

    const data: LoginResponse | LoginResponseWith2FA = await response.json();

    if ('requiresTwoFactor' in data) {
      return data;
    }

    if (typeof window !== 'undefined') {
      localStorage.setItem(this.tokenKey, data.token);
      localStorage.setItem(this.userKey, JSON.stringify(data.admin));
      window.dispatchEvent(new Event('admin-user-updated'));
    }

    return data.admin;
  }

  async verify2fa(tempToken: string, code: string): Promise<AdminUser> {
    const response = await fetch(`${API_URL}/admin/auth/2fa/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tempToken, code }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Código inválido' }));
      throw new Error(error.error || 'Código inválido');
    }

    const data: LoginResponse = await response.json();

    if (typeof window !== 'undefined') {
      localStorage.setItem(this.tokenKey, data.token);
      localStorage.setItem(this.userKey, JSON.stringify(data.admin));
      window.dispatchEvent(new Event('admin-user-updated'));
    }

    return data.admin;
  }

  async logout(): Promise<void> {
    const token = this.getToken();

    if (token) {
      try {
        await fetch(`${API_URL}/admin/auth/logout`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      } catch (error) {
        // Silently handle logout errors
      }
    }

    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.tokenKey);
      localStorage.removeItem(this.userKey);
    }
  }

  getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(this.tokenKey);
  }

  getUser(): AdminUser | null {
    if (typeof window === 'undefined') return null;
    const userJson = localStorage.getItem(this.userKey);
    return userJson ? JSON.parse(userJson) : null;
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  hasPermission(permission: string): boolean {
    const user = this.getUser();
    return user?.permissoes.includes(permission) || false;
  }
}

export const adminAuth = new AdminAuthService();
export type { AdminUser };
