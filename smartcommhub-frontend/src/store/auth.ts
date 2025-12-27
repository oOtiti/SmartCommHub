import { create } from 'zustand';
import { api } from '../api/client';

interface Profile {
  id: number | null;
  username: string;
  user_type: number | string;
  is_active: boolean;
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  profile: Profile | null;
  isLoggedIn: boolean;
  setTokens: (access: string, refresh: string) => void;
  fetchProfile: () => Promise<void>;
  login: (username: string, password: string) => Promise<boolean>;
  register: (username: string, password: string, userType?: number, phone?: string) => Promise<boolean>;
  logout: () => void;
}

const mapUserType = (u: number | string): string => {
  const v = typeof u === 'string' ? u : Number(u);
  if (v === 0 || v === 4) return 'admin';
  if (v === 1) return 'elderly';
  if (v === 2) return 'family';
  if (v === 3) return 'provider';
  return String(u);
};

export const useAuthStore = create<AuthState>()((set, get) => ({
  accessToken: localStorage.getItem('accessToken'),
  refreshToken: localStorage.getItem('refreshToken'),
  profile: null,
  isLoggedIn: !!localStorage.getItem('accessToken'),

  setTokens: (access, refresh) => {
    localStorage.setItem('accessToken', access || '');
    localStorage.setItem('refreshToken', refresh || '');
    set({ accessToken: access, refreshToken: refresh, isLoggedIn: !!access });
  },

  fetchProfile: async () => {
    const rs = await api.get('/auth/profile');
    const prof = rs.data as Profile;
    // 映射 user_type 为字符串便于界面显示
    const mapped = { ...prof, user_type: mapUserType(prof.user_type) };
    set({ profile: mapped });
  },

  login: async (username, password) => {
    try {
      const rs = await api.post('/auth/login', { username, password });
      const { access_token, refresh_token } = rs.data || {};
      get().setTokens(access_token, refresh_token);
      await get().fetchProfile();
      return true;
    } catch {
      return false;
    }
  },

  register: async (username, password, userType = 2, phone) => {
    try {
      await api.post('/auth/register', { username, password, user_type: userType, phone });
      return true;
    } catch {
      return false;
    }
  },

  logout: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    set({ accessToken: null, refreshToken: null, profile: null, isLoggedIn: false });
  },
}));
