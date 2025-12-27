import { useRoutes } from 'react-router-dom';
import { constantRoutes } from './router/index';

function App() {
  // 根据URL自动匹配对应的页面组件
  const routes = useRoutes(constantRoutes);

  return <div className="App">{routes}</div>;
}

export default App;
