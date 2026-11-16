# sign-generator · 大陆简体中文文档

[English](/docs/en_US/README.md) | 大陆简体中文

## 一、这是什么

一个纯前端的可视化工具站，服务 Minecraft Fabric / Architectury 模组 `yunbeiuc`：

1. **模型代码工坊（`/`）**——把「导入方块模型 JSON（贴图自动读取）→ 画布预览 → 可视化摆文本
   → 生成 Java 与资源文件」整条链路做成可视化操作，不再手写方块 / 方块实体 / 渲染器三件套。
2. **道路标牌生成器（`/signs`）**——按国标模板生成各类交通标志预览，可下载 SVG。

## 二、工坊使用流程

### 1. 导入模型 JSON

- 支持 `assets/<mod>/models/block/*.json` 的完整语法：`from`/`to`（数组或 `{x,y,z}`）、
  元素 `rotation`（origin / axis / angle / rescale）、`faces` 的 `uv` / `rotation` /
  `cullface` / `tintindex`、`display` 显示变换、`ambientocclusion`。
- 未写 `uv` 时按 vanilla 规则推导默认 uv。
- **父模型**：`parent` 指向的模型如果也一起导入（或后导入），会自动继承合并
  （子模型自身定义优先）；父模型不在库中时给出告警，画布用占位几何兜底。
- 画布采用正交投影 + 画家算法 + 仿射贴图，贴图在任意角度都精确贴合，无三角形接缝。

### 2. 贴图：资源库自动读取（推荐）

不用手挑 PNG，也不用逐个绑定：

1. 在「模型」面板把模组的 `src/main/resources`（或 `assets`、整个模组目录）**拖进资源库区域**，
   或点「选择资源目录」；
2. 资源库按 `assets/<命名空间>/models|textures/…` 建立索引（只索引文件名，不解析内容）；
3. 之后无论是**在资源库列表里点某个模型导入**，还是**单独拖入一个 model.json**，都会自动完成：
   - 沿 `parent` 链把父模型一并解析并继承（父模型不会污染模型列表）；
   - 解析每个 `#变量` / `yunbeiuc:block/xxx` 引用，**自动读入对应 PNG 并绑定**；
   - 原版引用（`minecraft:…`）自动忽略；读不到的贴图会在面板里列出**期望文件路径**。

资源库只在本次会话有效（浏览器无法持久化目录句柄），但读进来的模型与贴图会随工坊存档保存，
刷新后画布依然完整。

### 3. 手动导入贴图（可选）

需要替换或额外新增贴图时，仍可在「贴图」面板手动拖入 PNG / JPG / WebP：

- 导入时按文件名生成资源名（小写 + 下划线），可在面板里重命名；
- 生成到 `assets/<modId>/textures/block/<名称>.png`；
- 每个 `#变量` 也可以在下拉里手工指定贴图（覆盖自动结果）；
- ⟳ 按钮按「变量名 → 模型里写死的路径 → 名称后缀」在**已导入贴图**里重新匹配；
- 未绑定的面在画布上显示紫黑棋盘。

### 4. 可视化添加文本数据

文本行与 `CustomSignBlockEntity.TextLineData` 字段一一对应，共 3 种类型：

| 类型 | 实际写入 `text` 的内容 | 说明 |
| --- | --- | --- |
| 普通文本 | `文本内容` | 支持 `{字段名}` 占位符；**纯文本**，不做任何包裹 |
| 贴图 | `-texture yunbeiuc:block/xxx.png` | 对应 `SignTextLinesHelper.logo(...)` |
| 矩形 | `-rect 8 4` | 纯色矩形（宽高单位 1/16 方块） |

**ABC 交通字体由模组按全局设置自动处理**，工坊不生成 `-json` 指令：
`SignTextLinesHelper` 在 `GlobalFontSettings.isAbcMode()` 为真时会把普通文本包成
`-json {"text":"…","font":"yunbeiuc:traf_sign_font_?"}`（并按需自动下移 1 像素、取消加粗），
全局为原版时则保持纯文本。因此生成的代码里，文字行**永远是普通文本**
（helper 的第 6 个参数传 `""`，即「未指定 → 交给全局设置」，ABC 模式下由模组兜底 A 型字体）。

> 注意：模组只在 `SignTextLinesHelper` 工厂里做包裹。带缩放 / 旋转 / 描边等
> helper 表达不了的文本行会退化成原生 `TextLineData`，这类行在 ABC 全局模式下
> 不会自动套 ABC 字体（这是模组侧的行为）。

画布交互：

- 左键拖动空白处 / 模型 → 旋转视角；右键或 `Shift` 拖动 → 平移；滚轮 → 缩放
- 拖动文本行 → 修改该行 `xOffset` / `yOffset`（默认吸附 0.5，按住 `Alt` 为 0.1 精度）
- 选中文本行后可用方向键微调（`Shift` 加大步长）
- 工具栏提供 正视 / 背视 / 左视 / 右视 / 俯视 / 轴测 预设、网格与坐标轴开关、
  文本平面参考面
- 「正视」= **贴面正视**：相机自动对准当前牌面文本平面的法线，文字正对屏幕、不斜不缩
- 「朝向」按钮在 北 → 东 → 南 → 西 之间循环。**模型跟着按 blockstate 的 `y` 旋转**
  （north 0 / east 90 / south 180 / west 270），文本按渲染器的 `-facing.asRotation()`
  （南 0 / 西 90 / 北 180 / 东 270）独立摆放，两者与游戏内一一对应 ——
  所以不管切到哪个朝向，看到的都是牌子的**正面**，文字也始终落在牌面**外侧**（不会被牌面挡住）。
- 背面剔除按「面法线是否朝向相机」判断（含元素 rotation 与朝向旋转），
  正侧对相机的退化面一并剔除；背面不会被画出来。
- 底部状态栏显示模型名、安装类型、投影方式、yaw/pitch 与当前 z 偏移

#### 画布文字：unifont + 逐字形矢量绘制

- 画布文字使用 `src/app/fonts/files/unifont-17.0.04.ttf`（即游戏内 `minecraft:uniform`
  用的那套字形），通过 `/fonts/unifont` 提供；加载完成后自动重绘一次，
  失败则回落到系统中文字体。
- 文字**逐字形矢量绘制**：每个字形按 Minecraft 的推进宽度定位，用自己的仿射映射画到
  投影后的位置，浏览器在最终尺寸上栅格化 —— 放大到几百像素高依然锐利，
  而且完全不分配离屏位图（旧实现是低分辨率位图被放大约 5 倍，所以发糊）。
- 字形宽度仍按 Minecraft 的推进宽度表排布（ASCII 用原版字宽、非 ASCII 按 9），
  因此画布上的字距与整行宽度和游戏内一致。

#### 投影方式：默认正交，可切透视

| 模式 | 特性 | 适用 |
| --- | --- | --- |
| **正交（默认）** | 平行线保持平行、等距保持等距，**没有近大远小**；贴图一次仿射即数学精确 | 量尺寸、对位、摆文本 |
| 透视 | 近大远小，越靠近相机越大；相机距离可调（越小透视越强） | 想看接近游戏内的观感 |

- 工具栏「正交 / 透视」按钮切换；切到透视后右侧出现「透视强度」滑杆（相机距离 24–600）。
- 切换时视图中心不跳变（`depth = 0` 处两种投影缩放完全一致）。
- 透视下贴图按 4×4 网格细分后逐格仿射映射，避免 PS1 式的纹理游移：实测最大贴图误差
  distance=120 约 1.6 px、=240 约 0.8 px、=480 约 0.4 px（不细分时约 23.8 px）。
- 如果觉得「有透视感」：默认视角是 3/4 轴测（yaw −28°、pitch 18°），三面可见 + 地面网格
  退远本身就是深度线索；点「正视」即可得到完全平面、文字不变形的视图。

#### 界面与画布配色

- **默认白色（浅色）主题**，右上角 ☀ / ☾ 按钮可切深色，选择记在浏览器里。
- 画布底色可切 **白 / 灰 / 深** 三档：模组标牌文字多为白色，纯白底上白字会看不见，
  所以摆文本时建议切「灰」，想看游戏内观感时切「深」。
- 网格、方块边框、坐标轴的线色会随底色自动切换深浅，白底与深底都清晰。
- 画布底色与主题**只影响预览**，不会写进生成的代码或资源文件。

「字段」面板声明实体固定 NBT 字段（字符串 / 枚举），枚举字段会额外生成
`getFieldOptions` 与 `applyFieldOption`，游戏内文本编辑界面点击按钮即可写回并同步客户端。

### 5. 生成代码

填写类名（如 `SignCustom01`）、注册名（如 `sign_custom_01`）、包名、变体数量与
各安装类型的 z 偏移后，生成：

| 产物 | 路径 |
| --- | --- |
| 方块类 | `src/main/java/<pkg>/block/custom/sign/<Cls>.java` |
| 方块实体 | `src/main/java/<pkg>/entity/<Cls>Entity.java` |
| 渲染器 | `src/main/java/<pkg>/render/<Cls>EntityRenderer.java` |
| 方块状态 | `src/main/resources/assets/<mod>/blockstates/<registry>.json` |
| 方块模型 | `.../models/block/<registry>.json`（含 `_pole_h` / `_pole_l`） |
| 物品模型 | `.../models/item/<registry>.json` |
| 语言文件 | `.../lang/zh_cn.json`（可选 `en_us.json`） |
| 注册片段 | `snippets/SignBlocks_*.java.txt`、`snippets/ModBlockEntities_*.java.txt`、`snippets/RendererRegistry_*.java.txt` |
| 说明文档 | `README-<Cls>.md`（文件清单 / 注册步骤 / 贴图对应表） |

可以逐个复制 / 下载，也可以一键导出 ZIP（内置实现，不依赖 jszip 等库）。
工坊存档还会自动写入浏览器 localStorage，并支持导出 / 导入 `.studio.json` 项目文件。

#### 直接写入模组目录（不用再搬文件）

在「生成」面板点「选择目录」，工坊会**自动识别你选的是哪一层**，
再按标准布局把 Java 与资源文件直接写进去（同名文件覆盖）：

| 所选目录 | 识别结果 | Java 落点 | 资源落点 |
| --- | --- | --- | --- |
| 模组根目录（含 `src`） | 模组根 | `src/main/java/…` | `src/main/resources/…` |
| `src` | `src` | `main/java/…` | `main/resources/…` |
| `src/main` | `src/main` | `java/…` | `resources/…` |
| `src/main/java` | Java 源根 | `com/beigu/yunbeiuc/…` | 需再选一次资源目录 |
| `src/main/resources` | 资源目录 | 不写 Java | `assets/…` |
| `com/beigu/yunbeiuc`（包目录） | 包目录 | 直接写 `block/` `entity/` `render/` | 需再选一次资源目录 |

- 识别结果会显示成**实际落点示例**（例如
  `<所选目录>/src/main/java/com/beigu/yunbeiuc/block/custom/sign/Xxx.java`），写入前可先核对；
- 选了包目录 / Java 源根时，资源在另一棵树里（该 API 只能向下访问），
  界面会提示再选一次 `src/main/resources`；
- 勾选「同时把注册行插入 SignBlocks / ModBlockEntities」后，注册行会自动插到对应文件
  最后一个 `}` 之前（已注册过则跳过，不重复插入；文件找不到会明确提示）；
- 写入后会列出每个落盘路径、跳过的文件与错误；
- 该能力依赖 File System Access API（Chrome / Edge），其它浏览器仍可用 ZIP 导出。

## 三、单位与换算规则（与游戏内逐像素对齐）

- 模型空间：1 单位 = 1/16 方块，方块为 `0..16`。
- 文本行偏移 `xOffset / yOffset / zOffset` 单位为 1/16 像素，y 向上为正。
- 渲染端 `baseScale = 0.05 × fontSize`（方块 / 文本像素），即模型空间每文本像素 `0.8 × fontSize`。
- `SignTextLinesHelper` 的 `scale = fontSize / 20`、`logo(...)` 的尺寸 `= fontSize × 0.4`。
- 文本平面 Z 偏移（`getZOffset`）以**方块**为单位，按安装类型取
  `NORMAL = -0.45`、`POLE_H = -0.81`、`POLE_L = -0.74`（与模组参考渲染器一致）。
- 朝向映射：`FACING = NORTH` 时文本平面位于方块 +Z 一侧（z ≈ 15.2）并朝向 −Z，
  与 `AbstractEditableSignBlock` 的 `SHAPE_NORMAL_N` 体素盒一致；
  由此生成的 blockstate `y` 取 vanilla 惯例（north 0 / east 90 / south 180 / west 270）。

## 四、注意事项

1. **包名**必须等于模组自身基础包（默认 `com.beigu.yunbeiuc`），生成代码直接引用
   `CustomSignBlockEntity`、`SignTextLinesHelper`、`AbstractEditableSignBlockWithTooltip`、
   `AbstractTextDisplayEntityRenderer` 等基类。
2. 语言文件生成的是**增量条目**，需与工程已有 `zh_cn.json` / `en_us.json` 合并，不要覆盖。
3. `_pole_h` / `_pole_l` 模型当前与主模型结构一致，需要单独的 `display` 变换时直接改这两个文件。
4. 渲染器注册位置不在参考源码里（`BlockEntityRendererFactories.register(...)`），
   按片段注释粘贴到客户端初始化处。
5. 若模型自身已经烘焙了朝向旋转，请去掉 blockstate 的 `y`（或调整模型），避免重复旋转。

## 五、开发

```bash
pnpm install
pnpm dev      # http://localhost:3000
pnpm lint
```

目录结构要点：

```
src/app/
  page.tsx                 # 首页：模型代码工坊
  studio/                  # 工坊面板与画布组件
  (signs)/                 # 牌面生成器路由组（/signs、/signs/created、/signs/new）
  lib/studio/
    types.ts               # 全流程共享类型契约
    model.ts               # 模型 JSON 解析 / 父模型继承 / 贴图绑定
    geometry.ts            # 向量、正交投影相机、仿射求解
    text.ts                # 文本行布局换算、指令文本、离屏文本画布
    render.ts              # 画布渲染（面 + 文本 + 参考面 + 命中测试）
    project.ts             # 默认项目、校验、序列化、localStorage
    io.ts                  # 文件导入 / 下载 / 复制 / 资源库索引与自动读贴图
    java.ts                # Java 与资源文件生成
    zip.ts                 # 内置 ZIP（store + CRC32，无依赖）
```

## 六、已知环境问题

- 本机若离线，`pnpm install --offline` 可能因 `next` 包不在 pnpm store 中而失败，
  需要联网执行一次 `pnpm install`。
- `eslint` 依赖的 `typescript-eslint@8.x` 尚不支持 TypeScript 7.0，
  在本机 `pnpm lint` 会直接报版本错误；类型检查请用 `tsc --noEmit`。
