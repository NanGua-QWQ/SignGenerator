# SignGenerator · 路牌版面工坊

面向 Minecraft 模组 **yunbeiuc（云北城建）** 的可视化标牌工坊：在 2D 画布上摆好牌面，
声明数据字段与方块变体，一键生成 Java 实体 / 方块 / 渲染器与全部资源文件，也可直接写进模组目录。

纯前端（Next.js App Router），所有编辑都在浏览器里完成，工程自动存 localStorage。

## 功能一览

**工程**
- 新建工程（牌面宽高，单位 bit）、导入 / 导出 `.studio.json`、复制工程
- 自动存档，刷新后恢复上次的面板与画布

**版面画布**
- bit 坐标系：1 bit = 1/16 方块，原点在牌面中心，Y 向上；1 bit 正好 1 格网
- 点选 / 空白拖拽框选 / `Ctrl` 拖拽追加框选 / `Ctrl` 点击加选减选
- 拖动移动，8 个手柄缩放（中心固定、两侧对称），顶部手柄旋转
- 多选可整组拖动，`Delete` 一次删完；双击进入文字编辑
- `Alt` 把移动 / 缩放步进切成 0.5 bit，`空格` + 拖拽平移，滚轮按档位缩放，`0` 回到中心

**元素与图层**
- 三种元素：文本行、贴图、色块，列表顺序即生成代码里 `lines.add` 的顺序
- 图层支持上移 / 下移、显隐，右侧「图层」面板与 PS 习惯一致

**方块变体**
- 基础版式 + 每个变体的字段覆盖（位置、尺寸、文字、贴图……）
- 画布 / 面板显示的都是「基础值 ← 当前变体覆盖」后的结果
- `Ctrl+C` / `Ctrl+D` / 粘贴取**当前变体看到的状态**，副本不会退回基础版式

**数据字段**
- 字符串 / 枚举字段，枚举选项可拖拽前面的序号调整顺序
- 画布文本与贴图路径支持 `{字段名}` 占位符，默认值实时参与预览
- 非法规格在输入过程中红框发光提示，失焦后撤回原值

**标牌库（从源码导入）**
- 扫描模组源码里的 `block/custom/sign`，读取对应实体并还原成可编辑工程
- 支持 `switch (signVariantId)` 变体、`isBlockType(...) ? A : B` 三元、手写 `if/else` 分支
- 支持把版面封装在辅助方法里的写法：`lines.addAll(buildRow(...))` 会按实参展开
- 支持字符串拼接（`"...sign_{" + logoKey + "}.png"`）与 `case "logo1" -> cond ? logoType1 : ""` 映射

**生成与输出**
- Java：方块实体、方块类、方块实体渲染器
- 资源：blockstates、方块模型（含 `_pole_h` / `_pole_l`）、物品模型、语言增量条目
- 26.x：版本专属的 item 生成，以及 `common` 的复数 data 生成
- 注册片段：SignBlocks / ModBlockEntities / RendererRegistry，可自动插入对应文件
- 输出方式：逐项复制 / 下载、一键 ZIP，或用 File System Access API 直接写入模组目录（会自动识别所选目录层级）

**AI 配置**
- 上传标志牌照片，让 AI 给出版面草稿（生成仍需手动确认）

## 快速开始

```bash
npm install
npm run dev     # http://localhost:3000
npm run build
npm run start
```

类型检查：

```bash
npx tsc --noEmit
```

## 目录结构

```
src/app/
  page.tsx                    # 工坊主页面：顶部操作条 + 画布 + 右侧面板
  studio/
    DesignCanvas.tsx          # 2D 画布：框选 / 多选 / 移动 / 缩放 / 旋转 / 文字编辑
    ElementPanel.tsx          # 当前控件属性 + 图层
    FieldPanel.tsx            # 数据字段与枚举选项
    GeneratePanel.tsx         # 生成、预览、写入模组目录
    LibraryPanel.tsx          # 标牌库（从源码导入）
    AiWindow.tsx              # AI 配置窗口
  state/
    studio-store.ts           # Jotai 原子：工程、选择、历史、变体、字段
  lib/studio/
    layout-model.ts           # 版面 / 元素 / 字段 / 变体的类型与默认值
    variant.ts                # 变体覆盖的合并与查询
    import-java.ts            # 模组源码 → 工程（标牌库）
    java.ts                   # Java 与资源文件生成
    output.ts                 # 输出产物组织与 ZIP
    server-write.ts           # 写入磁盘
    text.ts                   # 文本排版、占位符、字体
  api/studio/signs/           # 扫描 / 读取模组源码
  api/studio/write/           # 写入文件与插入注册行
  api/ai/plan/                # AI 版面草稿
```

## 单位与换算

- 牌面尺寸与元素坐标都以 bit 计，1 bit = 1/16 方块
- 文本行的 `xOffset / yOffset / zOffset` 与游戏内一致，Y 向上为正
- 渲染端 `baseScale = 0.05 × fontSize`，`SignTextLinesHelper` 的 `scale = fontSize / 20`
- 文本平面 Z 偏移按安装类型取 `NORMAL = -0.45`、`POLE_H = -0.81`、`POLE_L = -0.74`

## 快捷键

| 按键 | 作用 |
| --- | --- |
| 空白拖拽 | 框选（元素中心进框即选中） |
| `Ctrl` + 拖拽 | 追加框选，从元素上也能起框 |
| `Ctrl` + 点击 | 加选 / 减选 |
| 方向键 | 微调位置（`Alt` 0.5 bit） |
| `Delete` / `Backspace` | 删除全部选中元素 |
| `Ctrl+Z` / `Ctrl+Shift+Z` | 撤销 / 重做 |
| `Ctrl+C` / `Ctrl+V` / `Ctrl+D` | 复制 / 粘贴 / 原位复制 |
| `空格` + 拖拽 / 中键拖拽 | 平移画布 |
| `0` | 回到中心 |
| `Esc` | 取消选择 / 退出文字编辑 |

完整对照表见界面右上角「快捷键」。

## 环境说明

- 直接写入模组目录依赖 File System Access API，请用 Chrome / Edge；其它浏览器可用 ZIP 导出
- 工程存档在浏览器 localStorage，换机器请用 `.studio.json` 导出 / 导入
- 语言文件生成的是增量条目，合并时要保留工程里已有内容

许可见 [LICENSE.md](LICENSE.md)。
