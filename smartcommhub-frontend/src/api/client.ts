import axios from 'axios';
import { API_BASE_URL } from './config';
import { useAuthStore } from '../store/auth.ts';

export const api = axios.create({ baseURL: API_BASE_URL });

api.interceptors.request.use((cfg) => {
  const token = useAuthStore.getState().accessToken;
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

api.interceptors.response.use(
  (r) => r,
  async (err) => {
    const { response, config } = err || {};
    if (response?.status === 401 && !config?._retry) {
      config._retry = true;
      const { refreshToken, setTokens } = useAuthStore.getState();
      if (!refreshToken) return Promise.reject(err);
      try {
        const rs = await api.post('/auth/refresh', { refresh_token: refreshToken });
        const { access_token, refresh_token } = rs.data || {};
        setTokens(access_token, refresh_token);
        config.headers.Authorization = `Bearer ${access_token}`;
        return api(config);
      } catch (e) {
        useAuthStore.getState().logout();
        return Promise.reject(err);
      }
    }
    return Promise.reject(err);
  }
);
