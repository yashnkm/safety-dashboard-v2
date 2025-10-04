export interface User {
  id: string;
  email: string;
  fullName: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'VIEWER';
  accessLevel: 'ALL_SITES' | 'SPECIFIC_SITES';
  company: {
    id: string;
    companyName: string;
    companyCode: string;
  };
  sites?: Array<{
    id: string;
    siteName: string;
    siteCode: string;
  }>;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  status: string;
  data: {
    token: string;
    user: User;
  };
}
