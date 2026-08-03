# LYL ClauseOS UI Implementation Kit

此目录是 Issue #20 的可执行 UI 素材包，不是概念稿。

## 文件

- `lyl-clauseos-ui.css`：颜色、材质、边缘光、布局 Token、全量基础控件和 LYL 业务控件参考样式。
- `ui-contracts.ts`：前端组件 Props、状态、业务 UI Schema 与 Phosphor Icons 唯一映射表。
- `control-gallery.html`：可交互的控件总览，可直接用浏览器打开。
- `assets/`：可复用 SVG 背景和局部虹彩边缘素材。

生产光学贴图位于 `apps/web/public/assets/optics/`。焦散贴图用于环境白光与玻璃角部的固定尺寸局部采样，
棱镜贴图通过 screen 混合和角点裁切用于玻璃入射/出射边，二者由
`lyl-clauseos-ui.css` 中的语义 Token 统一引用。

## 使用原则

1. Codex 应将 `lyl-clauseos-ui.css` 按 Token、Primitive、Component 层拆入 `apps/web/src/styles/`，不要在生产代码直接长期引用本目录。
2. 组件状态必须覆盖 `default / hover / focus / active / disabled`，表单额外覆盖 `error / success`。
3. Glass 组件必须保留银白物理边、局部白光和极小面积虹彩角光，禁止退化为均匀灰色 blur 卡片。
4. 本目录不包含字体二进制文件；实现时使用合法 Web Font 或系统回退。
5. 视觉验收以 Control Gallery 和交互 UCD 为参考，以实际产品页面截图为最终证据。

## 光学 Token 契约

- `--lyl-glass-border-base` 是普通玻璃体的低能量边界，
  `--lyl-glass-border` 是银色物理边，`--lyl-glass-border-selected` 只用于选中态；
  三者不可互换。
- `--lyl-glass-smoke-*` 决定玻璃后的烟雾遮光量，`--lyl-glass-*` 决定玻璃体反射量；
  提升玻璃感时优先调整二者关系，不得用均匀白色填充代替。
- `--lyl-caustic-*` 只控制环境光与玻璃角部的局部焦散，禁止在每个控件上生成完整、等宽的椭圆光环。
- `--lyl-prism-*` 只用于右侧入射/出射角。生产实现必须使用固定尺寸角窗裁切生成素材，
  角窗宽度必须在 8–36px 内，不得把棱镜贴图按容器宽高拉伸；普通控件的棱镜能量应为零或低于面板。
- `--lyl-material-cool-wash` 仅用于参谋材料区的局部冷色反射，不得作为通用蓝色面板背景。
- `apps/web/src/styles/tokens.test.ts` 负责校验 canonical 与运行时基础 Token 一致性；
  修改任一同步 Token 时必须同时更新两端。

## 本地查看

```bash
python -m http.server 8080
# 打开 http://localhost:8080/design-system/control-gallery.html
# 打开 http://localhost:8080/docs/design/ucd/lyl-interactive-ucd.html
```
