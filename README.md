# SmartCommHub

## 前端技术栈：
- 编程语言 ：[TypeScript](https://www.typescriptlang.org/)  
- 构建工具 ：[Vite](https://vitejs.cn/vite3-cn/guide/)  
- 前端框架 ：[React](https://zh-hans.react.dev/)  
- 路由工具 ：[React Router](https://reactrouter.com/start/data/custom)  
- CSS ：[UnoCSS](https://unocss.nodejs.cn/)  
- 代码规范 ：[EditorConfig](https://editorconfig.org/) + [Prettier](https://prettier.io/) + [ESLint](https://eslint.org/) + [Stylelint](https://stylelint.io/)  

## 后端技术栈：
- 编程语言 ：[python](https://www.python.org/)
- 后端框架 ：[FastAPI](https://fastapi.tiangolo.com/)
- ORM: [SQLAlchemy](https://docs.sqlalchemy.org/en/20/)
- DB: [openGauss](https://opengauss.org/zh/)
- 消息：[Emqx](https://www.emqx.com/zh) + WebSocket
- 权限：[JWT](https://jwt.io/) 登录、基于用户类型的简单权限控制
- 结构上三层：
    models：数据库实体
    dao：数据访问（CRUD）
    services：业务逻辑与事务，写审计日志
    api：HTTP / WS 接口层(RESTful风格)
- 接口文档核心说明：(SmartCommHub/smartcommhub-backend/docs/2025-12-27_more_Info4v1API.md)