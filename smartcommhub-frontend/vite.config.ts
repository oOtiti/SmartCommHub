import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import UnoCSS from 'unocss/vite'; // 引入 UnoCSS Vite 插件
// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), UnoCSS()],
});
