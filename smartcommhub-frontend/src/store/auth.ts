import { create } from 'zustand';
import { api } from '../api/client';

interface Profile {
  id: number | null;
  username: string;
  user_type: number; // 统一为数字：0=管理员、1=老人、2=家属、3=服务商
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
  register: (
    username: string,
    password: string,
    userType?: number,
    phone?: string
  ) => Promise<boolean>;
  logout: () => void;
}

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
    try {
      const rs = await api.get('/auth/profile');
      if (rs.data) {
        set({ profile: rs.data as Profile });
      }
    } catch (err) {
      console.error('Fetch profile failed:', err);
      set({ profile: null, isLoggedIn: false });
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    }
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
