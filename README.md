# Shadows Over Gloryhold

本项目是一个多人联机 AI 剧本杀 / 跑团原型，玩家进入一个被封锁的皇家大剧院，选择身份角色，通过公开发言、公开行动、私密行动、调查线索和阵营博弈推进剧情。AI 扮演 GM、NPC、剧情导演和行动推荐器，负责裁定行动、生成叙事、推动章节和结局。

当前剧本为《星骸圣杯：荣耀城权力迷局》，支持最多 7 名玩家在同一房间中游玩。

## 功能亮点

- 多人房间：创建房间、加入房间、房间码分享、角色占用和玩家列表。
- 角色剧本：7 个玩家角色，每个角色有公开身份、秘密目标、初始线索、关系和压力点。
- AI 裁定：AI GM 处理公开行动和私密行动，NPC / 角色回应会推动剧情变化。
- 剧情推进：3 章结构、多线索调查、世界状态、事件触发和多结局判定。
- 推荐行动：根据玩家身份、当前局势和日志生成下一步行动建议。
- 前端体验：黑金紫仪式风格界面，包含选角长廊、剧情事件台、私密消息和线索面板。

## 关键更新

- 完整接入 FastAPI + WebSocket 的实时房间流程，支持公开日志、私信、章节和结局推送。
- 强化 GM 边界：不允许直接跳关、索要全部秘密或无条件进入胜利结局。
- 优化调查进度和结局门槛，单人或少人数测试也能正常推进到结局。
- 清洗 AI 返回的可见性字段并限制关键世界状态数值，避免单条异常消息断开连接。
- 前端已切换到 Tailwind CSS v4 Vite 插件管线，并完成主要游戏界面视觉整合。

## 技术栈

- 前端：React + TypeScript + Vite + Tailwind CSS v4 + lucide-react
- 后端：FastAPI + WebSocket + Pydantic
- AI：OpenAI 兼容接口，DeepSeek 路由分流
- 剧本：`backend/stories/starfall_grail.json`
- 状态：服务端内存房间状态

## 本地运行

### 1. 准备环境

请先安装：

- Node.js 20+，用于运行前端 Vite 项目
- Python 3.11+，用于运行 FastAPI 后端
- Git，用于克隆仓库

克隆项目：

```bash
git clone https://github.com/Aeolianii/Shadows-Over-Gloryhold.git
cd Shadows-Over-Gloryhold
```

### 2. 配置环境变量

复制环境变量模板：

```bash
cp .env.example .env
```

Windows PowerShell 可用：

```powershell
Copy-Item .env.example .env
```

然后打开 `.env`，至少配置一个可用的 AI API Key。默认推荐使用 DeepSeek：

```env
AI_PROVIDER=deepseek
DEEPSEEK_API_KEY=你的 DeepSeek API Key
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-chat
```

如果你想使用 OpenAI 兼容接口，也可以配置：

```env
OPENAI_API_KEY=你的 OpenAI API Key
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o-mini
```

不配置 API Key 时，部分 AI 逻辑会走后端 fallback，但完整体验需要可用的模型接口。

### 3. 安装后端依赖

```bash
cd backend
python -m venv .venv
```

macOS / Linux：

```bash
source .venv/bin/activate
pip install -r requirements.txt
```

Windows PowerShell：

```powershell
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

启动后端：

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

后端默认地址：`http://localhost:8000`

健康检查：`http://localhost:8000/api/health`

### 4. 安装前端依赖

另开一个终端：

```bash
cd frontend
npm install
```

启动前端：

```bash
npm run dev
```

前端默认地址：`http://localhost:5173`

### 5. 开始游戏

1. 打开 `http://localhost:5173`
2. 输入玩家名称，点击“开启封锁剧院”创建房间
3. 复制房间码给其他玩家，其他玩家用同一个地址加入房间
4. 所有人选择角色后进入第一章
5. 在游戏页使用“发言”“行动”“私密行动”推进剧情

## 常用命令

后端语法检查：

```bash
cd backend
python -m compileall agents rules main.py game_state.py room_manager.py story_loader.py models.py ai_client.py
```

前端生产构建：

```bash
cd frontend
npm run build
```

前端预览构建结果：

```bash
cd frontend
npm run preview
```

## 文档

- `Context Pack/architecture.md`：架构摘要
- `Context Pack/current-state.md`：当前状态
- `Context Pack/next-task.md`：下一步任务
- `Context Pack/decisions.md`：关键决策
- `Context Pack/data-schema.md`：数据和 API 摘要
