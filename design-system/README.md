# LYL ClauseOS UI Implementation Kit

此目录是 Issue #20 的可执行 UI 素材包，不是概念稿。

## 文件

- `lyl-clauseos-ui.css`：颜色、材质、边缘光、布局 Token、全量基础控件和 LYL 业务控件参考样式。
- `ui-contracts.ts`：前端组件 Props、状态、业务 UI Schema 与 Phosphor Icons 唯一映射表。
- `control-gallery.html`：可交互的控件总览，可直接用浏览器打开。
- `assets/`：可复用 SVG 背景和局部虹彩边缘素材。

生产光学贴图位于 `apps/web/public/assets/optics/`。焦散贴图只用于环境白光，
棱镜贴图通过 screen 混合和角点裁切用于玻璃入射/出射边，二者由
`lyl-clauseos-ui.css` 中的语义 Token 统一引用。

## 使用原则

1. Codex 应将 `lyl-clauseos-ui.css` 按 Token、Primitive、Component 层拆入 `apps/web/src/styles/`，不要在生产代码直接长期引用本目录。
2. 组件状态必须覆盖 `default / hover / focus / active / disabled`，表单额外覆盖 `error / success`。
3. Glass 组件必须保留银白物理边、局部白光和极小面积虹彩角光，禁止退化为均匀灰色 blur 卡片。
4. 本目录不包含字体二进制文件；实现时使用合法 Web Font 或系统回退。
5. 视觉验收以 Control Gallery 和交互 UCD 为参考，以实际产品页面截图为最终证据。

## 本地查看

```bash
python -m http.server 8080
# 打开 http://localhost:8080/design-system/control-gallery.html
# 打开 http://localhost:8080/docs/design/ucd/lyl-interactive-ucd.html
```
