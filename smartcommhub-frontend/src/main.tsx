import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import 'virtual:uno.css';
import './styles/index.css';
import Test from './views/Test';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Test />
    </BrowserRouter>
  </StrictMode>
);
