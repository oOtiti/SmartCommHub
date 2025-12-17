import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import stylelintPlugin from 'vite-plugin-stylelint';
import UnoCSS from 'unocss/vite'; // 引入 UnoCSS Vite 插件
// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    UnoCSS(),
    stylelintPlugin({
      fix: true, // 关键：开启自动修复
      include: ['src/**/*.{css,scss}'], // 只处理 CSS/SCSS（含 CSS Modules）
      exclude: ['node_modules/**', 'uno.config.{js,ts}', 'src/assets/iconfont/**'], // 排除 UnoCSS 相关
      // 开发环境实时校验（可选）
      lintOnStart: true,
      emitError: true,
      emitWarning: true,
    }),
  ],
});
