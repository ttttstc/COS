# AGENTS.md — apps/web

Next.js 15 + React 19 前端，来源于官方 `agent-chat-ui` 基线（见根 `NOTICE.md`）。

## 命令（本目录内直接执行，或在仓库根用同名 `pnpm <script>` 代理）

| 命令 | 作用 |
|---|---|
| `pnpm dev` | 开发服务器 http://localhost:3000 |
| `pnpm lint` / `pnpm lint:fix` | ESLint 检查 / 自动修复 |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm test` / `pnpm test:ci` | Vitest watch / 单次运行 |
| `pnpm build` | 生产构建 |
| `pnpm smoke` | Thread 冒烟（需 Agent 服务在 :2024 运行） |
| `pnpm format` / `pnpm format:check` | Prettier 写入 / 校验 |

## 约定

- 测试与源码同目录放置（`*.test.tsx` / `*.test.ts`），环境为 jsdom，
  setup 在 `src/test/setup.ts`。
- 环境变量走 `.env.local`（由 `.env.example` 复制）；浏览器可见变量必须
  `NEXT_PUBLIC_*` 前缀，且绝不放模型密钥。
- 上游同步注意：本目录是 fork 基线，避免无关的大范围格式化改动。
