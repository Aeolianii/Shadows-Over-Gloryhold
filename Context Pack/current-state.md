# Current State

## 2026-05-28 游戏右侧信息栏修正

- 游戏页右侧信息栏现在固定为三段式布局，角色情报、我的线索、私密消息各自占据明确高度。
- “我的线索”展开后内容区内部滚动，长线索不会继续撑高整列。
- “私密消息”固定保留在浏览器可视范围内，消息列表使用面板内部滚动，不依赖浏览器页面滚动条。
- 开局剧情推进同步补上可见性清洗：`StoryDirector` 会把 AI 返回的 `private/hidden/internal` 统一改为 `secret`，避免 `GMProgression` 校验失败。

## 2026-05-28 调查进度推进修正

- 第一章调查进度 5/5 现在是确定性剧情门槛：`backend/rules/rule_engine.py` 会在调查行动把 `investigation_progress` 推到 5 时写入 `flags.murder_truth_exposed=true`。
- `backend/agents/story_director.py` 不再完全依赖 AI 返回 `advance_chapter`；第一章满进度会强制满足推进条件并切到下一章，避免玩家满进度后仍被车轱辘话困住。
- `frontend/src/pages/GamePage.tsx` 将第一章满进度的状态文案改为“调查完成”，并使用完成态颜色提示。

## 2026-05-28 结局推进修正

- 第三章结局不再硬性要求 3 票；投票门槛为 `min(3, 已选角色玩家数)`，单人/双人局也能正常进入结局。
- 新增伊莱亚斯 / 幽诡秘术盟胜利结局 `ending_arcane`，标题“镜幕新律”。
- `StoryDirector` 会根据 `grail_finalized`、`ending_ready`、`final_verdict_reached` 或足够投票触发结局，并按最高阵营影响力映射到王室、教廷、暗影、秘术、亡魂、反抗军等结局。
- 第三章 `final_choice_ready` 时，推荐行动使用后端确定性建议，引导玩家公开表决圣杯或宣告共同罪责。

## 2026-05-28 章节同步修正

- `backend/agents/gm_controller.py` 的公开章节 payload 现在包含 `id/title/opening`，`state_update` 也包含 `current_chapter_id`。
- `frontend/src/App.tsx` 收到 `chapter_changed` 时不再只追加日志，会同步更新 `room.current_chapter` 和 `room.current_chapter_id`，保证游戏界面顶部章节标题随剧情推进变化。

## 2026-05-28 GM 提示词与边界修正

- `backend/agents/gm_adjudicator.py` 的 GM 提示词已强化为真实桌面 GM 风格：裁定行动、维护规则、保护秘密、推进剧情并给玩家可执行的下一步方向。
- 对“直接进入胜利结局”“跳过剧情”“直接拿到圣杯”“给我所有线索”等不合理要求，GM 裁定器会本地硬拒绝，返回 `action_label=不合理要求`、`outcome=被阻止`。
- `backend/agents/story_director.py` 只在第三章且满足终局条件时接受 AI 返回的 `ending_title/ending_text`，防止模型误把玩家愿望写成结局。

## 2026-05-28 调查进度审核修正

- `backend/rules/rule_engine.py` 不再让普通 `investigate` 直接写入 `investigation_progress`；规则层只标记 `investigation_attempt`。
- `backend/agents/gm_adjudicator.py` 新增调查进度审核：每次调查后调用 `world_state` route 判断 `delta=0/1/2`，再替换最终 `investigation_progress` 变化。
- AI 不可用时 fallback 会保守判断：重复或泛泛调查为 0，触及尸体、死因、圣杯残响、镜幕夹层、法阵、守卫名册、毒针、亡灵灰烬、证词矛盾等关键链条为 1。

## 2026-05-28 更新

- 剧本角色关系和初始线索已增强：`starfall_grail.json` 新增 14 条角色关系线索，总线索数 32；每个玩家角色现在拥有 5 条初始线索、5 条关系、4 条压力点。
- 后端 `private_role` 会把 `relationships` 和 `pressure_points` 返回给本人；前端 `RoleDetailModal` 已新增“关系”和“软肋”区块。
- 新视觉整合 Step 4 已完成：`GamePage` 主游戏界面改为 `./前端` 风格的三栏暗色工作台，中间“剧情事件台”直接读取真实 `room.public_log`，底部指令输入框的“发言 / 行动 / 私密”继续调用现有 WebSocket `send(type, text)`。
- Step 4 验证：`npm run build` 通过；本地启动前后端后，从新指令台发送公开行动，按钮进入“GM裁定中...”状态，随后 WebSocket 推回 GM 叙事、NPC 回应和事件，事件台日志数量从 2 增至 8。截图保存于 `artifacts/gamepage-step4-final.png`。
- 选角页修正：角色头像改为在镜框中全幅裁切填充，背景图层降到头像后方并降低亮度；底部控制台增加可用高度，角色能力只显示当前核心能力摘要，避免 720p 桌面高度下出现半截文字。
- 新视觉整合 Step 3 已完成：选角界面保留现有 `room`、`playerId`、`selectedRoleId`、`onSelectRole`、`onStartGame` 数据和事件流，只替换为 `./前端` 风格的黑金角色长廊与底部控制台。
- `RolePanel` 现在直接读取后端下发的 `room.story.roles` 渲染 7 个真实头像槽，并根据 `room.role_claims` 显示已占用、已选中和当前聚焦状态。
- 标题两侧左右箭头会驱动当前聚焦角色，点击头像槽也会同步聚焦；聚焦角色上的“选择这个角色”继续调用原有 `onSelectRole(role.id)`。
- 底部控制台继续使用真实房间码、玩家列表、准备数、角色公开身份和能力；“开启第一章”继续走原有 `onStartGame`。
- 验证：`npm run build` 通过；浏览器在 `http://localhost:5173` 创建房间后确认 7 个角色头像渲染、箭头可切换、选择角色后开始按钮变可用。截图保存于 `artifacts/lobby-step3-refactor.png`。

## 2026-05-28 更新

- 剧本角色关系和初始线索已增强：`starfall_grail.json` 新增 14 条角色关系线索，总线索数 32；每个玩家角色现在拥有 5 条初始线索、5 条关系、4 条压力点。
- 后端 `private_role` 会把 `relationships` 和 `pressure_points` 返回给本人；前端 `RoleDetailModal` 已新增“关系”和“软肋”区块。
- 新视觉整合 Step 4 已完成：`GamePage` 主游戏界面改为 `./前端` 风格的三栏暗色工作台，中间“剧情事件台”直接读取真实 `room.public_log`，底部指令输入框的“发言 / 行动 / 私密”继续调用现有 WebSocket `send(type, text)`。
- Step 4 验证：`npm run build` 通过；本地启动前后端后，从新指令台发送公开行动，按钮进入“GM裁定中...”状态，随后 WebSocket 推回 GM 叙事、NPC 回应和事件，事件台日志数量从 2 增至 8。截图保存于 `artifacts/gamepage-step4-final.png`。
- 选角页修正：角色头像改为在镜框中全幅裁切填充，背景图层降到头像后方并降低亮度；底部控制台增加可用高度，角色能力只显示当前核心能力摘要，避免 720p 桌面高度下出现半截文字。
- 新视觉整合 Step 3 已完成：选角界面保留现有 `room`、`playerId`、`selectedRoleId`、`onSelectRole`、`onStartGame` 数据和事件流，只替换为 `./前端` 风格的黑金角色长廊与底部控制台。
- `RolePanel` 现在直接读取后端下发的 `room.story.roles` 渲染 7 个真实头像槽，并根据 `room.role_claims` 显示已占用、已选中和当前聚焦状态。
- 标题两侧左右箭头会驱动当前聚焦角色，点击头像槽也会同步聚焦；聚焦角色上的“选择这个角色”继续调用原有 `onSelectRole(role.id)`。
- 底部控制台继续使用真实房间码、玩家列表、准备数、角色公开身份和能力；“开启第一章”继续走原有 `onStartGame`。
- 验证：`npm run build` 通过；浏览器在 `http://localhost:5173` 创建房间后确认 7 个角色头像渲染、箭头可切换、选择角色后开始按钮变可用。截图保存于 `artifacts/lobby-step3-refactor.png`。

## 已完成

- 房间：创建、加入、房间码、玩家列表、选角占用。
- WebSocket：公开日志、私信、章节、事件、世界状态、结局推送。
- 剧本：7 个玩家角色、多个 NPC、3 章、多线索、多结局。
- AI：GM、Story、World State、NPC、Observation、Action Parser、7 个角色 route 均已真实 API 探测通过。
- AI 提速：连接池复用、默认忽略系统代理、Action Parser 本地快速路径、RuleEngine/ObservationAgent 接入、world_state 二次审核默认关闭。
- 首页：灰烬粒子全屏动态覆盖，从下往上循环淡出，不阻挡交互。
- 稳定性修复：GM 裁定清洗 AI 输出，`private/hidden/internal` 可见性统一转 `secret`；WebSocket 单条消息异常不会杀死连接。
- 世界状态修复：`investigation_progress`、`alert_level`、`trial_pressure`、`public_unrest`、`ritual_clock` 写入和公开前统一限制在 0-5。
- 推荐行动：游戏界面玩家列表下方显示 2-3 条玩家专属下一步行动；点击后卡片会进入“AI GM裁定中”动态状态，后端在 GM/NPC/角色回应和 world_state 更新后重新生成并替换。
- AI route：新增 `DEEPSEEK_RECOMMENDATION_API_KEY` 专用于推荐行动，不在代码或文档中保存真实密钥。
- 前端美术：选角页和游戏页按 `./前端` 示例保留黑金紫仪式风格；主界面已按用户要求回滚到原版视觉。全局 canvas 灰烬粒子只在进入房间后的选角/游戏流程渲染。
- 前端工具链：已切换到 Tailwind CSS v4 Vite 插件管线，安装 `@tailwindcss/vite@4.3.0`，入口 CSS 使用 `@import "tailwindcss"`；移除 `postcss.config.js`、`tailwind.config.js` 和旧 PostCSS 依赖。
- 新视觉整合 Step 1：已从 `./前端/src/index.css` 合并 Tailwind v4 `@theme` token（Noto Serif SC / JetBrains Mono、gold/purple 色阶），并把 `./前端/src/components/AshParticles.tsx` 的粒子算法合入现有 `AshParticles`。当前只在进入房间后的选角/游戏流程渲染，不影响主界面原版视觉。
- 新视觉整合 Step 2：主界面仅“创建房间 / 开启封锁剧院”卡片按钮改为 `./前端` 新视觉风格，保留真实 `createRoom` 请求和原有主界面其他部分。
- 选角页：角色长廊改为 7 个固定头像镜框，每个角色头像填入对应槽位；当前聚焦/已选择角色会高亮；左右切换按钮移到“角色长廊”标题两侧并可直接切换角色；已移除头像区滑动选择残留逻辑，避免 hover/指针移动造成头像偏移。
- 选角底部：已用 Tailwind CSS v4 utility 重排为紧凑三栏。房间信息卡缩窄，右侧开始面板独立，中间当前角色卷宗展示“公开身份 / 角色能力”两张信息卡；能力列表压缩为两条摘要，避免挤在一起和溢出。底部控制台固定一行三列，无整页右侧滚动条和玩家列表内部滚动条。
- 回滚备份：本次改动前已备份当前前端到 `frontend.backup-20260527-222806`。

## 进行中

- 继续打磨黑金紫仪式风格在移动端的细节和角色卡动效。

## 风险

- 前端还没有完整 AI 处理中状态。
- 房间状态仍为内存态，重启丢失。
- 推荐行动依赖 AI JSON 输出，失败时会使用后端保底建议。
- 视觉层主要靠 CSS 覆盖旧样式，后续若继续大改可逐步清理旧 CSS。

## 验证

```bash
cd backend
python -m compileall agents rules main.py game_state.py room_manager.py story_loader.py models.py ai_client.py
```

```bash
cd frontend
npm run build
```

- 2026-05-27 浏览器验证：`http://localhost:5173` 首页、选角页、游戏页可访问；选角页 7 个头像槽均显示角色头像，头像与镜框基本居中对齐；标题两侧箭头点击可切换当前角色；桌面 1280x720 下无整页右侧滚动条、无玩家列表内部滚动条，当前角色卷宗可见内容落在卡片内。
- 2026-05-27 Tailwind v4 验证：`npm run build` 通过；前端 dev server 已重启，首页与选角页可加载。选角页 1280x720 下 `docScroll=false`，当前角色卷宗宽约 724px，公开身份和角色能力文本可见。
- 2026-05-27 新视觉 Step 1 验证：`npm run build` 通过；浏览器烟测首页仍可见，建房进入选角页后 `.ash-canvas` 存在。
- 2026-05-28 新视觉 Step 2 验证：`npm run build` 通过；浏览器检查创建房间卡片使用新视觉类，加入房间卡片未改；点击“开启封锁剧院”可进入真实选角页。
