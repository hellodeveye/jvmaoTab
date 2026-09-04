module.exports = {
  root: true,
  env: {
    browser: true,
    es2021: true,
  },
  extends: [
    "eslint:recommended",
    "plugin:react/recommended",
    "plugin:react/jsx-runtime",
    "plugin:react-hooks/recommended",
  ],
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
  },
  // 浏览器扩展环境：chrome（MV3）/ browser（Firefox）由宿主注入，非未定义变量
  globals: {
    chrome: "readonly",
    browser: "readonly",
  },
  settings: { react: { version: "18.2" } },
  plugins: ["react", "react-hooks", "react-refresh"],
  rules: {
    "react-refresh/only-export-components": "off",
    "react/prop-types": "off",
    "no-unused-vars": "off",
    "react/display-name": "off",
    "react-hooks/exhaustive-deps": "off",
  },
};
