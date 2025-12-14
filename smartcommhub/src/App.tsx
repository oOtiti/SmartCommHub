// src/App.tsx
import { useRoutes } from 'react-router-dom';
// 引入上面写的路由规则
import { constantRoutes } from './router/index';

function App() {
  // 根据URL自动匹配对应的页面组件
  const routes = useRoutes(constantRoutes);

  return (
    <div className="App">
      {/* 这里会显示Home/About等页面 */}
      {routes}
      {/* 可选：加个简单的导航栏，方便切换页面 */}
      <div style={{ padding: '20px', background: '#f5f5f5' }}>
        <a href="/" style={{ marginRight: '20px' }}>
          首页
        </a>
        <a href="/about">关于页</a>
      </div>
    </div>
  );
}

export default App;
