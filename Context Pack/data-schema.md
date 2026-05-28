# Data Schema

## 2026-05-28 世界状态推进规则补充

- `world_state.investigation_progress` 仍限制在 0-5。
- 第一章中，`investigation_progress >= 5` 等价于第一章调查门槛完成；后端会设置 `world_state.flags.murder_truth_exposed=true`，供章节推进逻辑读取。

## 2026-05-28 结局字段补充

- `endings[]` 新增 `ending_arcane`，用于伊莱亚斯 / 幽诡秘术盟胜利。
- 结局对象统一返回 `id`, `title`, `text`，前端可以直接用 `room.ended && room.ending` 切换到结局页。
- 第三章投票结局门槛为 `min(3, 已选角色玩家数)`；`flags.grail_finalized`、`flags.ending_ready`、`flags.final_verdict_reached` 也可触发结局判定。

## 2026-05-28 章节状态字段补充

- `state_update` payload 应包含 `current_chapter_id`。
- `current_chapter` 应包含 `id`, `title`, `opening`，供前端顶部章节标题和章节依赖 UI 同步使用。
- `chapter_changed` payload 包含 `chapter` 和 `text`；其中 `chapter` 使用同一套 `id/title/opening` 结构。

## 2026-05-28 GM 裁定约束补充

- 不合理玩家请求不会产生 `world_state_changes`、`advance_chapter` 或 `ending_title/ending_text`。
- 典型拒绝裁定：`action_label=不合理要求`，`outcome=被阻止`，`narration` 给出原因和可执行替代方向。
- AI 结局字段只在第三章且终局条件满足时生效。

## 2026-05-28 调查进度字段补充

- `investigation_progress` 仍为 0-5，但不再由规则层对每次 `investigate` 自动累加。
- 调查行动先产生 `changes.investigation_attempt=true`，再由 GM 裁定后的 world_state 审核追加实际 `investigation_progress` 写入。
- world_state 审核输出概念为 `delta=0/1/2` 和 `reason`，最终仍落地为标准 `WorldStateChange(key="investigation_progress", value=..., visibility="public", reason=...)`。

## 2026-05-28 剧本字段补充

- `player_roles[].initial_clues` 保存线索 id 列表；当前每个角色为 5 条，包含个人动机、他人关系和主谜题推进线索。
- `player_roles[].relationships` 当前每个角色为 5 条，供 AI 角色/NPC 回应和本人角色卡展示使用。
- `player_roles[].pressure_points` 当前每个角色为 4 条，描述可被他人施压、揭露或诱导的风险点。
- `private_role` 会返回 `relationships` 和 `pressure_points` 给本人视图。

## Story JSON

- `story_id`, `title`, `max_players`, `world_setting`
- `factions[]`
- `player_roles[]`：`id`, `name`, `title`, `public_info`, `secret_identity`, `faction`, `goals`, `abilities`, `relationships`, `pressure_points`, `avatar`
- `npcs[]`：NPC 人设和行为目标
- `clues[]`：线索与初始可见性
- `chapters[]`：`id`, `title`, `opening`
- `event_templates[]`
- `endings[]`
- `world_state`

## Room State

- `players`: player_id -> Player
- `role_claims`: role_id -> player_id
- `world_state`: 公开世界状态
- `secret_flags`: 隐藏世界状态，公开视图过滤
- `current_chapter_id`
- `public_log[]`
- `private_messages[player_id][]`
- `recommended_actions[player_id][]`
- `triggered_events[]`
- `world_history[]`
- `ended`, `ending`

## World State Rules

- `visibility` 只允许 `public` 或 `secret`。
- AI 返回 `private`、`hidden`、`internal` 时统一转为 `secret`。
- 以下状态统一限制为 0-5：`investigation_progress`, `alert_level`, `trial_pressure`, `public_unrest`, `ritual_clock`。
- `flags` 写入时合并已有 flags，避免覆盖其他剧情标记。

## WebSocket Message

- Client -> Server：`player_message`, `player_action`, `private_action`
- Server -> Client：`state_update`, `player_message`, `player_action`, `narration`, `npc_message`, `observation`, `private_message`, `chapter_changed`, `event_triggered`, `game_ended`, `system`
- 单条消息异常只影响本次行动，服务器会发送私信提示并继续保持连接。

## Recommended Actions

- `recommended_actions[]` 只出现在玩家自己的 `player_view` 或私发 `state_update` 中。
- 字段：`id`, `title`, `text`, `reason`, `priority`。
- `text` 是点击后提交给后端的完整公开行动句。
- 后端每次结算后按玩家刷新推荐，前端点击后会立即隐藏对应 `id`，避免刚点完仍停留在列表里。
