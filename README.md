# Shadows Over Gloryhold

## 2026-05-28 游戏右侧信息栏修正

- `GamePage` 右侧信息栏改为固定三段式高度：角色情报、我的线索、私密消息不再共用整列滚动。
- `CluePanel` 展开后内容区拥有独立滚动条，长线索不会把下方私密消息挤出浏览器可视范围。
- `PrivateMessagePanel` 保留在右侧底部可见区域内，私密消息列表也使用面板内部滚动，不给浏览器页面增加额外滚动条。
- 顺手修复开局推进：`StoryDirector` 现在会把 AI 返回的 `private/hidden/internal` 可见性统一清洗为 `secret`，避免选角后进入游戏时报 500。

## 2026-05-28 调查进度推进修正

- 第一章 `investigation_progress` 达到 5/5 时，不再只作为界面数字展示；后端会确定性写入 `flags.murder_truth_exposed=true`，并允许剧情导演推进到第二章。
- `StoryDirector` 现在会在第一章检查真实世界状态，即使 AI GM 没有主动返回 `advance_chapter`，满进度也会触发章节推进，避免角色继续重复对话。
- 游戏页顶部状态条在第一章满进度时显示“调查完成”，用于提示玩家当前调查阶段已经满足推进条件。

## 2026-05-28 结局推进修正

- 第三章结局投票门槛改为 `min(3, 已选角色玩家数)`，单人测试 1 票即可触发结局，避免达成最终条件却永远凑不够 3 票。
- `StoryDirector` 会根据终局 flag 和最高阵营影响力确定性选择结局，并补充 `ending_arcane` 伊莱亚斯 / 幽诡秘术盟胜利结局“镜幕新律”。
- 最终处置阶段 `final_choice_ready` 时，推荐行动直接给出公开表决和共同罪责两条终局行动，不再等待 AI 推荐接口。

## 2026-05-28 章节同步修正

- 后端 `state_update` 和 `chapter_changed` 现在都会携带当前章节 `id/title/opening` 以及 `current_chapter_id`。
- 前端收到 `chapter_changed` 后会立即更新 `room.current_chapter` 和 `room.current_chapter_id`，游戏界面顶部章节标题会随剧情推进从第一章切换到第二章/第三章。

## 2026-05-28 GM 提示词与边界修正

- `GMAdjudicator` 的系统提示已改为真实桌面 GM 风格：公平裁定、维护规则、保护秘密、给出具体后果并引导玩家下一步行动。
- 玩家提出“直接进入胜利结局”“跳过剧情”“给我所有线索”等不合理要求时，后端会确定性拒绝，不会交给 AI 顺从执行。
- `StoryDirector` 不再接受 AI 在未到第三章或未满足终局条件时直接填写的结局，避免玩家一句话跳关。

## 2026-05-28 调查进度审核修正

- `RuleEngine` 不再对每个调查行动自动大幅增加 `investigation_progress`，避免玩家连续点击推荐行动过快刷满 5/5。
- `GMAdjudicator` 会调用 `world_state` route 审核调查进度，只在行动具体触及当前章节关键证据时增加 0-2 点，多数普通调查为 0 或 1 点。
- AI 不可用时使用保守 fallback：泛泛调查不涨进度，明确检查尸体、圣杯残响、镜幕夹层、毒针、守卫名册等关键证据才小幅推进。

## 2026-05-28 前端视觉整合进度

- Step 1 已完成：合并 `./前端/src/index.css` 的 Tailwind CSS v4 主题 token，并接入新版 `AshParticles` 粒子算法。
- Step 2 已完成：主界面只重构“开启封锁剧院”创建卡片/按钮视觉，真实创建/加入房间逻辑保持不变。
- Step 3 已完成：`LobbyPage` / `RolePanel` 已按 `./前端` 选角长廊风格重构，7 个头像槽来自后端真实 `room.story.roles`，角色占用、锁定、当前高亮、选择按钮和“开启第一章”仍绑定原有状态与回调。
- Step 3 修正：角色头像改为镜框内全幅裁切填充，背景图层降到头像后方，底部卷宗信息压缩为完整可见摘要，避免 720p 高度下文字被截断。
- Step 4 已完成：`GamePage` 已接入 `./前端` 风格的“剧情事件台”和底部指令输入框，事件台读取真实 `room.public_log`，发言/行动/私密按钮继续调用原有 WebSocket `send(type, text)`。
- 剧本角色增强：7 个角色的初始线索扩展为每人 5 条，关系扩展为每人 5 条，并新增每人 4 条压力点；本人角色卡现在会显示关系和软肋。
- 已验证：`npm run build` 通过；浏览器创建房间进入选角页后，左右箭头可切换真实角色，点击“选择这个角色”后开始按钮从禁用变可用。
- Step 4 验证：本地启动 `frontend:5173` 与 `backend:8000` 后，从新指令台发送公开行动，按钮显示“GM裁定中...”，随后 WebSocket 推回 GM 叙事、NPC 回应和事件，剧情事件台从 2 Logs 增至 8 Logs。

多人联机 AI 剧本杀 / 跑团原型。当前剧本为《星骸圣杯：荣耀城权力迷局》，玩家在皇家大剧院封锁事件中选角、调查、发言和秘密行动，由 AI GM / AI 角色 / AI NPC 推进剧情。

## 技术栈

- 前端：React + TypeScript + Vite + Tailwind CSS v4 + lucide-react
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
- 新增推荐行动 route：`DEEPSEEK_RECOMMENDATION_API_KEY` 用于玩家卡关时生成 2-3 条下一步行动。
- 已修复中途卡死：AI 返回 `visibility=private` 时会规范化为 `secret`，单条 WebSocket 消息异常不会断开连接。
- 已修复进度越界：`investigation_progress`、`alert_level` 等 0-5 状态在写入和公开前统一封顶。
- 游戏界面玩家列表下方已加入推荐行动面板，点击建议会提交行动并在后续剧情结算后实时刷新。
- 选角页和游戏页已参考 `./前端` 示例迁移为黑金紫仪式风格；主界面保留原版视觉。
- 选角页角色长廊为 7 个固定头像槽，当前聚焦角色高亮，左右切换按钮位于“角色长廊”标题两侧。
- 选角页底部控制台为固定一行三列，无整页右侧滚动条和玩家列表内部滚动条。
- 前端已切换到 Tailwind CSS v4 Vite 插件管线：`@tailwindcss/vite` + `@import "tailwindcss"`。
- 选角页底部信息区已用 Tailwind v4 utilities 重排为房间状态、当前角色卷宗、开始行动三栏。
- 新视觉整合已完成 Step 1：合并 `./前端` 的 Tailwind v4 主题 token，并接入新版 AshParticles 粒子算法。
- 新视觉整合已完成 Step 2：主界面仅“开启封锁剧院”创建卡片改为新视觉按钮样式，真实创建房间逻辑不变。
- 本次前端大改前已备份：`frontend.backup-20260527-222806`。

## 文档

- `architecture.md`：架构摘要
- `current-state.md`：当前状态
- `next-task.md`：下一步任务
- `decisions.md`：关键决策
- `data-schema.md`：数据和 API 摘要
