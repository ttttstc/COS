---
kind: frontend_style
name: 基于 Tailwind CSS 4 + shadcn/ui 的原子化样式体系
category: frontend_style
scope:
    - '**'
source_files:
    - apps/web/src/app/globals.css
    - apps/web/tailwind.config.js
    - apps/web/components.json
    - apps/web/postcss.config.mjs
    - apps/web/src/lib/utils.ts
    - apps/web/src/components/ui/button.tsx
---

该仓库的前端样式体系建立在 Next.js 15 + Tailwind CSS 4 之上，采用 shadcn/ui 组件库作为基础 UI 层，并通过 CSS 变量实现完整的主题系统（含明暗模式）。

**样式架构与工具链**
- 使用 Tailwind CSS 4 的 `@import "tailwindcss"` 语法替代传统 `tailwind.config.js` 中的核心配置，通过 `postcss.config.mjs` 仅引入 `@tailwindcss/postcss`。
- 通过 `components.json` 声明 shadcn/ui 的 "new-york" 风格、RSC=false、tsx=true、CSS 变量模式，并配置路径别名（`@/components`、`@/lib`、`@/hooks` 等）。
- PostCSS 插件包含 `tailwindcss-animate` 和 `tailwind-scrollbar`，提供动画与滚动条美化能力。

**设计令牌与主题系统**
- 所有颜色、圆角、阴影等视觉属性均通过 CSS 自定义属性（`--background`、`--primary`、`--radius` 等）定义在 `globals.css` 中，使用 oklch 色彩空间保证色域一致性。
- 明暗模式通过 `.dark` 类切换同一组 CSS 变量的值，配合 `next-themes` 包实现运行时主题切换。
- 通过 `@theme inline` 将 CSS 变量映射到 Tailwind 内置的 `color-*` 命名空间，使设计令牌可直接在 Tailwind 类中使用。

**组件样式约定**
- 基础 UI 组件位于 `src/components/ui/`，遵循 shadcn/ui 标准结构：每个组件使用 `class-variance-authority` (cva) 定义变体（variant/size），通过 `cn()` 工具函数合并 className。
- `cn()` 封装了 `clsx` + `tailwind-merge`，确保样式合并时避免冲突。
- 按钮等组件通过 cva 声明默认变体（default）、尺寸（default），并支持 destructive、outline、secondary、ghost、link、brand 等语义化变体。

**样式组织规范**
- 全局样式集中在 `src/app/globals.css`，按 `@layer base`、`@layer utilities` 分层组织。
- 组件级样式优先使用 Tailwind 原子类，仅在必要时通过 `@layer` 扩展自定义类（如 `.shadow-inner-right`、`.scrollbar-pretty`）。
- 业务组件位于 `src/components/thread/`、`src/components/icons/`，不直接依赖 CSS 文件，全部通过 Tailwind 类组合样式。

**响应式策略**
- 完全依赖 Tailwind 的断点系统（sm/md/lg/xl 等），未使用媒体查询硬编码。
- 通过 `useMediaQuery` hook 在 React 逻辑层处理响应式行为。

**约束与限制**
- 禁止直接使用原始 CSS 选择器覆盖组件样式，应通过 cva 变体或 className 传递扩展。
- 颜色必须使用设计令牌变量，禁止硬编码十六进制值（除品牌色 `#2F6868` 外）。
- 深色模式下的所有颜色必须在 `.dark` 块中提供对应值。