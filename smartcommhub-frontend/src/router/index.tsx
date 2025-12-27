// src/router/index.tsx
// 引入路由相关的类型和组件
import type { RouteObject } from 'react-router-dom';
// 引入你的页面组件（先创建2个测试页，后面会写）
import Home from '../views/Home.tsx';
import About from '../views/Profile.tsx';

// 路由规则：URL路径 ↔ 页面组件
export const constantRoutes: RouteObject[] = [
  {
    path: '/', // 访问 http://localhost:5173/
    element: <Home />, // 显示首页组件
  },
  {
    path: '/about', // 访问 http://localhost:5173/about
    element: <About />, // 显示关于页组件
  },
  // 后续加新页面，就在这里加新对象，比如：
  // { path: '/user', element: <User /> }
];
