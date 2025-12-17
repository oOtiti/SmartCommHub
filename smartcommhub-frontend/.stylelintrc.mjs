/** @type {import('stylelint').Config} */
export default {
  extends: [
    "stylelint-config-standard",
    "stylelint-config-css-modules",
    "stylelint-config-recess-order"
  ],
  plugins: ["stylelint-order"],
  rules: {
    // 重点：补充所有涉及的属性，按「布局→盒模型→表格属性」分类排序
    "order/properties-order": [
      [
        // 1. 布局基础
        "display",
        "box-sizing",
        // 2. 盒模型 - 尺寸
        "width",
        "min-width",
        "max-width",
        "height",
        "min-height",
        "max-height",
        // 3. 表格属性（border-spacing 属于表格，要放在盒模型之后）
        "border-spacing",
        "border-collapse",
        // 4. 原有属性（保持你之前的配置）
        "margin",
        "padding",
        "flex",
        "appearance",
        "-moz-appearance",
        "-webkit-appearance"
      ],
      { severity: "warning" }
    ],

    // 其他原有规则保留（比如 selector-class-pattern 等）
    "selector-class-pattern": [
      "^[a-zA-Z0-9_-]+$",
      { message: "类名仅允许字母、数字、下划线、中划线" }
    ],
    "no-descending-specificity": null,
    "property-no-unknown": [
      true,
      { ignoreProperties: [/^--uno-/], ignoreSelectors: [/^\.uno-/] }
    ],
    "value-keyword-case": [
      "lower",
      { ignoreKeywords: ["^[a-z0-9-]+$"] }
    ],
    "block-no-empty": null,
    "no-empty-source": null
  },
  overrides: [
    { files: ["**/*.{css,scss,less}"], customSyntax: "postcss-scss" }
  ],
  ignoreFiles: ["node_modules/**/*", "dist/**/*", "uno.config.{js,ts}", "**/*.tsx", "**/*.d.ts","src/assets/iconfont/**/*"]
};