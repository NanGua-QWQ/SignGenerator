# 工坊 2D 版面设计器 —— 重构方案

## 一、我对需求的理解（修正后）

**这不是画图工具，是「标牌版面设计器 + 代码生成器」。**

用户在 2D 画布上摆放的元素，实际就是模组里 `CustomSignBlockEntity.TextLineData` 的那几种形态。
画布上摆什么 = 生成代码里写什么。这是 `java/` 参考源码给出的唯一答案：

| 画布元素 | 生成到 Java 里的东西 | 依据（参考源码） |
| --- | --- | --- |
| 文本 | `SignTextLinesHelper.centered/left/right("文本", x, y, scale, color, "a")` | `SignExpresswayDirection3Entity` 第 48 行 |
| 带 Z 的文本（如 G 编号压在 logo 上） | `centeredWithZ(..., 0.002f, "b")` | 同上 第 49 行；`SignExpresswayExit8Entity` 第 91 行 |
| 贴图 / Logo / 方向图标 / 箭头 | `logo("yunbeiuc:textures/block/sign/xxx_{logo1}.png", x, y, size)` | `SignExpresswayExit8Entity` 第 84-87 行 |
| 色块 / 矩形 | `-rect w h` 指令行 | `TextDisplayScreen` 第 150-154 行 |
| 数据字段（可编辑） | 实体私有字段 + `getPlaceholderValue` + `getFieldOptions` + `applyFieldOption` | `SignExpresswayExit8Entity` 第 160-212 行 |

坐标单位就是 **bit（1 bit = 1/16 方块）**，与 `TextLineData.xOffset / yOffset` 完全一致，
与 `SignTextLinesHelper` 的 `andX / andY` 参数完全一致。所以 1 bit 一个网格是天然的。

参数换算规则（已核对源码）：
- `scale = fontSize / 20` → 即 `fontSize = scale * 20f`
- `logo(path, x, y, size)` → `fontSize = size / 0.4f`
- `centeredWithZ` 的 `zOffsetDelta` → `zOffset = delta * 16f`

字体（`a` 中文 / `b` 英文数字）由 `SignTextLinesHelper` 第 6 个参数指定，
并记录进 `abcFont`，与全局字体模式解耦。

## 二、新建工程流程

1. 点「新建工程」
2. 弹 M3 对话框：**宽 × 高（bit）**，默认 32 × 20，可选常用预设（16×16 / 32×16 / 32×20 / 48×24）
3. 牌面尺寸同时决定：
   - 画布网格范围（1 bit = 1 格）
   - 生成代码里 `centered(...)` 的坐标基准原点（画布中心 = 0,0）
4. 确认后得到空白工程，右侧面板开始摆元素

## 三、画布行为

- 网格：1 bit = 1 格；每 8 格加粗一次（半个方块，便于目测尺寸）
- 原点：牌面中心，十字线标注 X=0 / Y=0
- 坐标读数：悬停显示 bit 坐标（可换算显示为方块单位）
- 拖动：直接改 `xOffset / yOffset`（吸附到整数 bit，按住 Alt 自由微调）
- 缩放：缩放视图不改 bit 网格密度
- 牌面外区域用暗色遮罩表示「超出牌面」

## 四、元素类型（右侧面板可添加）

- **文本**：内容、字体（a 中文 / b 英文）、颜色、对齐、字号(scale)、粗体/斜体/下划线/阴影/描边、发光、Z 偏移
- **贴图**：从内置资源库选（`sign_expressway_{logo1}.png` 之类），或用占位符 `{logo1}` 做成可切换字段
- **矩形**：宽 × 高（bit）、颜色
- **数据字段**：字段名、类型（文本 / 枚举）、默认值；枚举字段自动生成 `getFieldOptions` 选项行
- 元素列表支持上移 / 下移（决定 `lines.add(...)` 顺序）、复制、删除

## 五、生成产物（沿用现有 `java.ts`，已对齐参考源码）

- 方块类：`newBlockEntityCompat` + `BlockBehaviour.Properties` + tooltip
- 实体类：固定字段 + `loadCompat` / `saveAdditionalCompat` + `ensureDefaultTextLines()` + `getPlaceholderValue` + `getFieldOptions` + `applyFieldOption`
- 渲染器：`PoseStack` + `VersionServices.render().rotateY(matrices, -facing.toYRot())` + `getZOffset` switch
- blockstate / 模型 / 物品模型 / lang / 注册片段 / README

## 六、删除清单（已确认「删干净，重写」）

删除：`ModelPanel.tsx`、`TexturePanel.tsx`、`lib/studio/model.ts`、`lib/studio/geometry.ts`、
`lib/studio/render.ts`、`lib/studio/gl/`（3 个文件）、`CanvasView.tsx`（3D 版）、
`state/studio-store.ts` 里的模型/贴图/相机 atom。

保留并改造：`java.ts`（生成器，已对齐）、`text.ts`（字体度量与指令文本）、`project.ts`（默认值/持久化）、
`output.ts`（写盘/合并片段）、`FieldPanel.tsx`、`GeneratePanel.tsx`。

新增：`lib/studio/layout.ts`（2D 版面模型）、`studio/DesignCanvas.tsx`（2D 画布）、
`studio/NewProjectDialog.tsx`、`studio/ElementPanel.tsx`。

## 七、设计语言

沿用本轮已完成的 Material 3 令牌与组件（globals.css / button / input / dialog / controls），
新增画布相关的 M3 视觉：网格用 `outline-variant`，牌面用 `surface`，牌面外遮罩用 32% scrim，
选中元素用 `primary` 描边 + 控制点。
