# Shadows Over Gloryhold

多人联机 AI 剧本杀 / 跑团原型。当前剧本为《星骸圣杯：荣耀城权力迷局》，玩家在皇家大剧院封锁事件中选角、调查、发言和秘密行动，由 AI GM / AI 角色 / AI NPC 推进剧情。

## 技术栈

- 前端：React + TypeScript + Vite + TailwindCSS + lucide-react
- 后端：FastAPI + WebSocket + Pydantic
- AI：OpenAI 兼容接口，DeepSeek 路由分流
- 剧本：`backend/stories/starfall_grail.json`
- 状态：服务端内存房间状态

## 启动

```bash
cd backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

```bash
cd frontend
npm run dev
```

前端默认：`http://localhost:5173`

## 当前重点

- AI route 已验证可用：GM、Story、World State、NPC、Observation、Action Parser、7 个角色专属 route。
- 已修复中途卡死：AI 返回 `visibility=private` 时会规范化为 `secret`，单条 WebSocket 消息异常不会断开连接。
- 已修复进度越界：`investigation_progress`、`alert_level` 等 0-5 状态在写入和公开前统一封顶。
- 选角页正在重构为沉浸式角色大厅，但 CSS 收口仍是下一优先级。

## 文档

- `architecture.md`：架构摘要
- `current-state.md`：当前状态
- `next-task.md`：下一步任务
- `decisions.md`：关键决策
- `data-schema.md`：数据和 API 摘要
