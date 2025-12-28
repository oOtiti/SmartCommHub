import axios from 'axios';
import { API_BASE_URL } from './config';

export const api = axios.create({ baseURL: API_BASE_URL });

api.interceptors.request.use((cfg) => {
  const token = localStorage.getItem('accessToken');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

api.interceptors.response.use(
  (r) => r,
  async (err) => {
    const { response, config } = err || {};
    if (response?.status === 401 && !config?._retry) {
      config._retry = true;
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) return Promise.reject(err);
      try {
        const rs = await api.post('/auth/refresh', { refresh_token: refreshToken });
        const { access_token, refresh_token } = rs.data || {};
        
        localStorage.setItem('accessToken', access_token || '');
        localStorage.setItem('refreshToken', refresh_token || '');
        
        config.headers.Authorization = `Bearer ${access_token}`;
        return api(config);
      } catch (e) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        return Promise.reject(err);
      }
    }
    return Promise.reject(err);
  }
);
