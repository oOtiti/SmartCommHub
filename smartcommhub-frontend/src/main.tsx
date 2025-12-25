import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import 'virtual:uno.css';
import './styles/index.css';
import Home from './views/Home';
import './assets/iconfont/iconfont.css';
import Profile from './views/Profile';
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Home />
      <Profile />
    </BrowserRouter>
  </StrictMode>
);
