# Architecture

## 2026-05-28 游戏页右侧栏布局

- `frontend/src/pages/GamePage.tsx` 的右侧栏不再包一层可滚动容器，而是直接使用 `.right-info-panel` 三行网格承载 `CharacterIntelPanel`、`CluePanel` 和 `PrivateMessagePanel`。
- `CluePanel` 与 `PrivateMessagePanel` 都是 `flex min-h-0` 面板，展开内容区使用 `overflow-y-auto`，因此长线索和私密消息只在各自面板内部滚动。
- `.right-info-panel` 根据展开状态调整三行高度，避免给浏览器主体增加滚动条，同时保证私密消息面板始终留在可视范围内。

## 2026-05-28 前端结构补充

- `frontend/src/pages/GamePage.tsx` 的游戏态现在由三栏工作台组成：左侧保留真实决策/玩家/推荐行动组件，中间 `EventLogBoard` 读取 `room.public_log` 渲染“剧情事件台”，底部 `CommandDeck` 调用原有 `send(type, text)` 发送 `player_message`、`player_action`、`private_action`。
- `CommandDeck` 保留目标角色前缀逻辑：若 `CharacterIntelPanel` 指定了目标角色，提交内容会自动加上 `对{角色名}：`，然后仍通过现有 WebSocket 发送。
- `frontend/src/pages/LobbyPage.tsx` 负责选角页三段式布局：标题/箭头、角色长廊、底部控制台。它仍接收真实 `RoomView` 和原有回调，不直接发起新的网络请求。
- `frontend/src/components/RolePanel.tsx` 负责视觉化角色长廊：从 `room.story.roles` 渲染头像槽，从 `room.role_claims` 渲染锁定状态，并把当前聚焦角色通过 `onActiveRoleChange` 回传给 `LobbyPage`。
- 选角页事件绑定保持原链路：选择按钮调用 `onSelectRole(role.id)`，开始按钮调用 `onStartGame()`；后端占位/锁定和开始章节逻辑仍由现有页面上层处理。
- 本阶段没有改动 WebSocket hooks、HTTP API 客户端、房间状态模型或后端接口。

## 2026-05-28 前端结构补充

- `frontend/src/pages/GamePage.tsx` 的游戏态现在由三栏工作台组成：左侧保留真实决策/玩家/推荐行动组件，中间 `EventLogBoard` 读取 `room.public_log` 渲染“剧情事件台”，底部 `CommandDeck` 调用原有 `send(type, text)` 发送 `player_message`、`player_action`、`private_action`。
- `CommandDeck` 保留目标角色前缀逻辑：若 `CharacterIntelPanel` 指定了目标角色，提交内容会自动加上 `对{角色名}：`，然后仍通过现有 WebSocket 发送。
- `frontend/src/pages/LobbyPage.tsx` 负责选角页三段式布局：标题/箭头、角色长廊、底部控制台。它仍接收真实 `RoomView` 和原有回调，不直接发起新的网络请求。
- `frontend/src/components/RolePanel.tsx` 负责视觉化角色长廊：从 `room.story.roles` 渲染头像槽，从 `room.role_claims` 渲染锁定状态，并把当前聚焦角色通过 `onActiveRoleChange` 回传给 `LobbyPage`。
- 选角页事件绑定保持原链路：选择按钮调用 `onSelectRole(role.id)`，开始按钮调用 `onStartGame()`；后端占位/锁定和开始章节逻辑仍由现有页面上层处理。
- 本阶段没有改动 WebSocket hooks、HTTP API 客户端、房间状态模型或后端接口。

## 前端

- Tailwind：前端使用 Tailwind CSS v4 的 Vite 插件 `@tailwindcss/vite`，CSS 入口为 `@import "tailwindcss"`；不再使用 PostCSS/Tailwind v3 风格配置文件。`styles.css` 已合并 `./前端/src/index.css` 的字体和 gold/purple 主题 token。
- `frontend/src/pages/HomePage.tsx`：首页、灰烬粒子、建房/加入入口。
- `frontend/src/pages/LobbyPage.tsx`：房间与选角页，正在向三段式角色大厅重构。
- `frontend/src/components/RolePanel.tsx`：角色长廊、选角、当前聚焦角色回传。
- `frontend/src/pages/GamePage.tsx`：游戏主界面、公开/私密行动、日志和状态展示。
- `frontend/src/components/AshParticles.tsx`：全局 canvas 灰烬粒子层，参考 `./前端` 示例实现。
- `frontend/src/components/RecommendedActions.tsx`：玩家列表下方的推荐行动面板，点击后直接提交公开行动并临时移除该建议。
- `frontend/src/services/api.ts`：HTTP 与 WebSocket 客户端。

## 后端

- `backend/main.py`：FastAPI HTTP + WebSocket 入口；单条 WS 消息异常会回传私信并保留连接。
- `backend/game_state.py`：房间状态、玩家视图、世界状态写入；负责可见性清洗和进度封顶。
- `backend/room_manager.py`：内存房间和 WebSocket 连接管理。
- `backend/agents/gm_controller.py`：行动总控，串联解析、规则、GM 裁定、NPC/角色回应、广播。
- `backend/agents/action_recommender.py`：根据公开日志、GM/NPC/角色回应、世界状态和当前玩家私有视角生成 2-3 条下一步行动。
- `backend/agents/gm_adjudicator.py`：AI GM 裁定；进入模型前清洗 world_state_changes。
- `backend/rules/rule_engine.py`：确定性规则、能力、调查进度、警戒值。
- `backend/ai_client.py`：OpenAI 兼容 API 客户端、连接池、route 分流、超时。

## 流程

1. 玩家通过 WebSocket 发送公开或私密行动。
2. Action Parser 解析意图，常见动作走本地快速路径。
3. RuleEngine 产生确定性结果和世界状态变化。
4. AI GM 裁定叙事、反应、事件和额外状态变化。
5. 状态变化经过清洗和封顶后写入 GameRoom。
6. ActionRecommender 为每位已选角玩家刷新 `recommended_actions`。
7. 系统广播日志、私信、世界状态和章节变化，并向每位玩家私发自己的推荐行动。

## Frontend Art Direction

- 当前前端参考 `./前端` 示例的黑金紫仪式风格：黑底、金色线框、紫色奥术弱光、展示衬线字体、JetBrains Mono 仪式标签、灰烬粒子。
- 为降低回滚成本，主要通过 `frontend/src/styles.css` 末尾的 “Gloryhold ritual theme” 覆盖层重塑 Home/Lobby/Game 外观，核心数据流和组件接口保持不变。
- `RolePanel` 现在使用固定 7 槽头像镜框布局，头像槽本身就是角色选择入口；左右切换由 `LobbyPage` 标题两侧按钮驱动，当前聚焦角色状态上提到 `LobbyPage`。
