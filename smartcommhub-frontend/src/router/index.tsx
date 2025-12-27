// src/router/index.tsx
import type { RouteObject } from 'react-router-dom';
import Home from '../views/Home.tsx';
import Profile from '../views/Profile.tsx';
import MerchantServer from '../views/MerchantServer.tsx';
import RequireAuth from '../components/RequireAuth';
// 路由规则：URL路径 ↔ 页面组件
export const constantRoutes: RouteObject[] = [
  {
    path: '/', // 访问 http://localhost:5173/
    element: <Home />, // 显示首页组件
  },
  {
    path: '/Profile',
    element: (
      <RequireAuth>
        <Profile />
      </RequireAuth>
    ),
  },
  {
    path: '/MerchantServer',
    element: (
      <RequireAuth>
        <MerchantServer />
      </RequireAuth>
    ),
  },
  {
    path: '*',
    element: <div>页面不存在</div>,
  },
];
