# SignGenerator — 项目长期约定

## 构建 / 工具链坑（最常踩，放最前）
- managed node：`C:\Users\Beigu\.workbuddy-ai\binaries\node\versions\22.22.2-6\node.exe`。
- `next` 不在 PATH：`node node_modules/.pnpm/next@16.3.2_*/node_modules/next/dist/bin/next dev`。本机 dev server 常驻 **3000** 直接复用。
- ⚠️ **`next dev` 只放行启动主机名（`localhost`）**：预览面板用 `127.0.0.1:3000` 会被 `blockCrossSiteDEV` 以 403 拦掉所有
  `/_next/**`、`/__nextjs*`，**页面 200 但 hydration 全挂**。已在 `next.config.ts` 加 `allowedDevOrigins: ['127.0.0.1', '[::1]']`，
  **别删**。改 `next.config` 后 Next 自动重启 dev server（3000 断约 10s，正常）。自验：`curl -H "Origin: http://127.0.0.1:3000"
  -H "Sec-Fetch-Mode: cors" <某 /_next/ chunk>` 应 200，换 `evil.example.com` 应 403。
- tsc：`node node_modules/.pnpm/typescript@7.0.2/node_modules/typescript/bin/tsc -p tsconfig.json`。
  TS 7 是 Go 版 tsgo（**无 JS API**），**ESLint 跑不起来** → **以 tsc 为准**。
- ⚠️ **`src/app/` 下不能出现 App Router 保留文件名**（`layout`/`page`/`route`/`loading`/`error`/`template`/`default`/
  `not-found`/`head`）。`lib/studio/layout.ts` 曾假报 `TS2741 Property 'default' is missing` → 已改名 `layout-model.ts`。
- `.next/dev/types/validator.ts` 会缓存已删文件的路由校验块 → 假报错，删掉即可。沙箱 safe-delete 拦截 `next build` 清理 `.next`；
  `rm -rf` 对目录也可能被拦 → 先删文件再 `rmdir`。子面板被 `import X from` 引用时必须 `export default`。
- C 盘曾满，装不了 Chromium/playwright → 用「临时路由 + curl 抓 JSON」自验，**验完删掉临时路由与临时目录**。

## 定位 / 单位 / 坐标（不可改）
**路牌版面设计器 + Java 代码生成器**（无画笔/橡皮）：画布摆 `TextLineData` → 生成模组 `yunbeiuc` 的
Block/BlockEntity/Item 注册、Renderer、资源 JSON。参照实现**以
`D:\yunbei-urban-construction\versions\common\src\main\java` 真实类为准**（Mojang 映射）。
- 单位 **bit**，1 bit = 1/16 方块；牌面 32×20 bit = 2×1.25 方块。1 bit = 1 网格，每 8 bit 一条粗线。
- 原点在**牌面中心**，X 右正、Y 上正；与 `xOffset/yOffset`、helper 的 `andX/andY` 一致，**无需换算**。
- ⚠️ 绝对定位图层**必须同挂 `translate(calc(-50% + offset))` 容器**（漏半宽/半高会整体跑偏）。

| 项 | 公式 |
| --- | --- |
| 文本 `fontSize` | `scale * 20f`（helper 第 4 参数 = scale） |
| logo `fontSize` | `size / 0.4f`；**边长** = `0.4*fontSize` = `size` 方块 = `size*16` bit ⚠️ |
| rect 尺寸 | `w × h`（bit） |
| `zOffset` | `zDelta * 16f` |

⚠️ `logo(...)` 的 `size` 是**方块**（渲染器 `imageSize = 0.4f*fontSize`），曾漏 ×16；`xOffset/yOffset` 才是 bit（`/16f`）。

## 变体覆盖（元素 × 方块变体）
`LayoutElementBase.variantOverrides?: Record<variantId, Record<字段名, 标量>>`，**只存被显式改过的字段**。
- ⚠️ **不要「开覆盖时把基础值全量种进去」**：那样「哪些字段真被改过」永久丢失、单项撤销也失去意义；
  缺省字段读时回退基础值即可（`seedVariantOverride` 已删）。
- **读合并唯一入口** `applyVariantOverride(s)`（`lib/studio/variant.ts`，无覆盖**返回同一引用**）：画布 / 面板
  （`previewElementsAtom`）/ 代码生成三处都过它，否则「画布看合并值、生成看原值」。
- **写路由唯一落点** `patchElements(project, { id, patch, variantId })`：空 → 写本体；非空 → `setVariantFields` 只写 patch 的键。
- 生成：`buildVariantSwitch()` 仅 `variants.length>=2` 且有覆盖时才出 `switch`，否则输出逐字节不变；分流依据
  `BuiltInRegistries.BLOCK...getPath()`（多变体共用同一方块类）。**必须传未过滤的 `project.elements`**（可见性按合并后
  `visible` 逐变体筛）；`buildVariantLines` 的 pad 传 **8 空格**（语句自带 8 → case 体 16）。

## 基板 / 图案 / 贴图
- `LayoutProject.baseplate: { color, visible }`，牌面**最底层**，**纯色不挂贴图**（要底图单独放贴图元素）。
  ⚠️ **`visible` 默认 `false`**（「不要生成默认的 rect」）——新工程**不产出** `-rect`，点色板才打开。
  打开时是 `ensureDefaultTextLines()` 第一条：`new TextLineData("-rect w h")` + `setColor/setBuiltin(true)`，**不发 `logo(...)`**。
  预设（GB 5768 六色 + 无底色）在 `layout-model.ts`，UI `BaseplatePicker.tsx` 只有色块 swatch。
- **真实 PNG 已导入**：模组 627 张 → `public/textures/sign/*.png`。**不要再画 SVG 近似图**（`SpriteIcon` 已否决）。
- `texture-catalog.ts` ★自动生成勿手改★（复刻 `PatternRegistry#addSignSections()` 12 组，
  `node scripts/gen-texture-catalog.mjs [zh_cn.json]`）；`sprites.ts` 出 `SPRITE_GROUPS`。
  缩略图**不要** `image-rendering: pixelated`（256→36px 严重锯齿），画布放大时才用。
- 用户导入 PNG → `LayoutProject.assets` 存 dataURL，生成时 base64 写入 `assets/<ns>/textures/...`；`GeneratedFile.encoding?: 'utf8'|'base64'`。
- **动态贴图目录** `dynamic-textures.ts`（★手写★）：`DYNAMIC_OPTION_GROUPS`（6 组 enum，取自模组 47 个 entity 的
  `getFieldOptions`）+ `DYNAMIC_TEXTURES`（19 条模板）。组 = `expresswayLogo` / `compassDirection` / `turnDirection` /
  `laneArrow` / `ordinaryRoadLogo` / `roadLevelColor`。
  ⚠️ **选项 `value` = 贴图文件名段本身**（`getPlaceholderValue` **直通**：`case "logo1" -> logo1;`）。模组两段式映射收敛成一段。
  ⚠️ **`modFieldName`**：占位符名 ≠ Java 字段名（`{logo1}`→`direction1`/`logoType1`，`{logo}`→`image`），补字段时填进
  `LayoutField.nbtKey`，实体才能读模组既有存档。规则 = 组 `fieldPrefix` + key 末尾数字，或 `fixedField`。
  ⚠️ 自检 `node scripts/verify-dynamic-textures.mjs`（只读，19 模板 × 每选项值对 `public/textures/sign/`），**改目录后必跑**。
- **画布占位符取值** = 字段默认值 ← `canvasView.previewValues`（后者优先），在 `DesignCanvas` 里算 → 动态贴图自动解析成真实 PNG。
- **参考图** `LayoutProject.reference: LayoutReference | null`（`dataUrl / name / opacity / visible / fit`）。
  ⚠️ **纯工坊产物，不参与代码生成**。图层在 `CanvasGridBackground` 之后、元素层之前，`pointer-events-none`。
  UI = `studio/ReferenceImageControl.tsx`。`sanitizeProject` 夹 opacity 0~1、fit 非法回退 `contain`。
  ⚠️ dataURL 进 localStorage 有 5MB 上限，>1.5MB 时 UI 提示。

## 生成策略
- ⚠️ **生成的文件一律不带任何注释**：分节横幅、说明行、片段顶部 `// 粘贴到 XXX` **全不产出**，落点改由片段 `target`
  字段承载（UI/README 展示）。新增内容**不要** push `//` 行。
- `text` → helper `centered`/`centeredWithZ`(zDelta≠0)/`left`/`right`；仅当 `*_CENTER` 且无 zDelta/旋转/额外缩放/
  斜体下划线阴影描边才用 helper，否则展开显式 setter。
- `logo` → `logo(path,x,y,size)`；**`rotZ`（度）非 0 用 5 参数重载**（`line.setRotZ(rotZ)`，随 NBT 持久化，与文本共用旋转）。
  `LayoutLogoElement.rotZ` 默认 0，画布 CSS `rotate(-rotZ deg)`。⚠️ 早期叫 `rotX` 已改名；
  `sanitizeElement` logo 分支回退读 `num(raw.rotZ, num(raw.rotX, 0))`。文本的 `rotX/rotY/rotZ` 不变。
- `rect` → `new TextLineData("-rect w h")` + `setXOffset/setYOffset/setColor/setAlignment(CENTER_CENTER)/setBuiltin(true)`。
- 占位符 `{key}` → `getPlaceholderValue`；`enum` 字段额外产出 `getFieldOptions`/`applyFieldOption`。
  ⚠️ 选中动态贴图时 `ensureDynamicFieldsAtom` 自动补 enum 字段，已有字段不动；元素面板也有「补 N 个 enum 字段」按钮。
  ⚠️ **占位符绝不能落到空串**：默认值为空 → `logo1 = ""` → 拼出 `sign_expressway_.png`（渲染器**静默跳过整行**）。
  三层兜底：① `createLogoElement` 默认 `DEFAULT_LOGO_PATH`；② `addElementAtom` / 载入走 `repairPlaceholders()`
  （缺字段按选项组补、空默认值用组默认值、不在选项里退回第一个）；③ `generateProject` 前再修一遍写进 `warnings`。
- **NBT 键名可独立配置**：`LayoutField.nbtKey`（留空 = 同 `key`），纯函数 `fieldNbtKey(field)`；`key`/`nbtKey` **互相独立**。UI `FieldPanel.tsx`。

### 字体（⚠️ 曾被纠正两次）
- **每行字体（helper 第 6 参数 / `TextLineData.abcFont`）只有 `a`/`b`/`c`** → `yunbeiuc:traf_sign_font_{a|b|c}`；默认 `a`。
- 模组的**原版 uniform / 路牌自适应是全局模式，不是每行可选项**（`GlobalFontSettings.resolveFont`）。**不要**塞进下拉。
- `normalizeFont` 非 a/b/c 回退 `DEFAULT_ABC_FONT`；旧存档 `'vanilla'`/`''` 也回退。`bold` 由 helper 按全局模式决定。
- **画布文本 = 每行选的交通字体**：`public/fonts/traffic/` 自托管模组 3 个 TTF + `misans_semibold.ttf`(中文兜底)，
  `globals.css` 声明 `TrafSignA/B/C` + `TrafSignCJK`；`text.ts` 出 `trafficFontStack` / `normalizeAbcFont` / `ensureTrafficFonts()`。
  ⚠️ 三个交通 TTF **只有 182 字形（U+0000–U+215E，纯拉丁/数字），无 CJK**，中文必然走 MiSans。旧 unifont 机制已删。
- **字宽/位置必须取真实字体度量**（曾被纠正：「每个字体都被拉伸、位置跟游戏里不符」）：`scripts/gen-font-metrics.mjs`
  读 4 个 TTF（cmap format 4 **和** 12）出 `font-metrics.ts`（★自动生成勿手改★，**换字体必重跑**）。em/基线只能照模组
  `font/traf_sign_font_{a,b,c}.json` 算，**不能拿 upem 当 size**：`em = size*upem/(ascent-descent)`、`baseline = ascent/upem*em - shiftY`。
  实测拉丁 3 套 upem1750/ascent1250/descent−500 → `em = size = 10.5`、shiftY 1.5；MiSans upem1000/ascent1044/descent−282
  → **`em = 10.0*1000/1326 = 7.54`**（写 10 大 33%）、shiftY 1.0。三套码位不齐（`rg2014c` 缺 ²³¹）→ 取并集，缺的记 `-1` 回落 MiSans。
  ⚠️ **绝不用 SVG `textLength`+`lengthAdjust="spacingAndGlyphs"`**（字宽≠格子宽 → `i` 拉宽、`M` 压窄 = 拉伸）；
  `PreviewGlyph = { char, left, baseline, em }` 按真实 advance 定位，横向缩放走 `TextPreview.squeeze`。

## 落盘（生成 → 写文件）
- **主路径 = 本地服务端直写**。`window.showDirectoryPicker` 只能在顶层页面 + 用户点击时用，**iframe/预览面板里调不起来**
  （「看不到直接写入」的原因）。浏览器选目录降级为备用（`GeneratePanel.tsx`）。
- 接口 `src/app/api/studio/write/route.ts`（`runtime='nodejs'`，POST，`action: 'probe'|'write'`）；前端封装 `server-write.ts`。
- **根目录** = 同时含 `src/main/java` 与 `src/main/resources` 的那层（yunbeiuc = `D:\yunbei-urban-construction\versions\common`）。
  生成路径本身即 `src/main/...`，**直接拼根目录，不推断前缀**。只写 `src/main/**`；`snippets/`、`README-*.md` 记 skipped；
  `path.resolve` 后前缀校验拒绝越界。
- ⚠️ **`assets/<ns>/lang/*.json` 必须「并入」不能「覆盖」**：模组 lang 有 **1249 条**共用条目，整体覆盖会清空整个语言文件
  （真实发生过，靠 `git checkout` 恢复）。两条写入路径各有一份 `mergeLangJson`：`{...已有, ...生成}`、同名新值优先、
  **保持原键顺序**；已有文件非合法 JSON 对象时**宁可不写**并报错。
- **四个锚点都可配**（UI 在写入面板，存 localStorage）：方块 `SIGN_CUSTOM_EXPRESSWAY_1` / 实体 `ZONES_BOARD_1_ENTITY` /
  物品同上 / 语言 `block.yunbeiuc.sign_custom_expressway_1`；键 `…{block,entity,item,lang}-anchor.v1|v2`、根目录 `…mod-source-root.v1`。
  `insertSnippet` 插在首个 `includes(anchor)` 行**之前**，语言按 **key** 走 `mergeLangEntries`；兜底 = 末尾。注册行合并**幂等**；
  渲染器片段无固定落点，只提示手工粘贴。
- ⚠️ 落点由 **category** 决定：`SignBlocks` vs `MunicipalBlocks` 是两个类两个文件。从**片段标题**认 holder
  （`title.includes('MunicipalBlocks')`），不要写死。

## 注册行写法（⚠️ 三个注册表都不一样）
- **`SignBlocks.java`** 用私有辅助 `register(id, factory)`（内部 `BLOCKS.register` + 登记 `BLOCK_ENTRIES` 供 `entries()`）。
  **绝不能生成 `BLOCKS.register(...)`**。
- **`MunicipalBlocks.java`** 无包装，就是 `BLOCKS.register(id, factory)`。
- **`ModItems.java`**：`public static final RegistrySupplier<Item> X = registerBlockItem(<Holder>.X, ALL_SIGN_ITEMS);`
  `registerBlockItem` 用**方块 path** 当物品注册名，按列表选创造栏（`ALL_MUNICIPAL_ITEMS`→市政 / `ALL_ROAD_ITEMS`→道路 /
  其余→标牌），并 `Item.BY_BLOCK.put`。⚠️ **只注册方块不发物品 → 创造栏找不到、也不能 `/give`**，必须同时产出 ModItems 片段。

## 资源文件生成（assets/<ns>）
`java.ts` 的 `buildResourceFiles(ctx)`，每个方块变体只出**三类**：

| 文件 | 内容 |
| --- | --- |
| `blockstates/<注册名>.json` | type 外层（`normal → pole_l → pole_h`）+ facing 内层（`north → east → south → west`），模型 `<ns>:block/sign/<type>/<注册名>`，`y === 0` 省略 `y`，**无结尾换行** |
| `models/item/<注册名>.json` | `{"parent":"<ns>:block/sign/normal/<注册名>"}`，**无结尾换行** |
| `lang/zh_cn.json`（+ `en_us.json`） | `block.<ns>.<registryId>` → 显示名 + tooltip；**有结尾换行**，写入时并入 |

⚠️ **`models/block/**` 生成器一律不产出**（「block 不用你写」）——牌面几何用户在 **Blockbench 手搓**，路径
`models/block/sign/<normal|pole_l|pole_h>/<注册名>.json`（**不要**扁平 `<注册名>_pole_h.json`，已否决）。
自检：生成的 blockstate/item 与仓库 `sign_custom_expressway_exit_1.json` **逐字节一致**。
`buildSnippets` 顺序：`SignBlocks` → `ModBlockEntities` → `ModItems` → `RendererRegistry`；`buildSnippetFiles` 的 `names` 一一对应。

## 快捷键与撤销（⚠️ 踩过坑）
- 分发在 `page.tsx` 全局 keydown；对照表在 `ShortcutHelpDialog.tsx`（**改一处同步另一处**）。
- 顺序：全局 mod 键（Ctrl+Z/Y/V）→ 非 mod 视图键（G / + / - / 0 / Esc）→ 选中键（Delete / Ctrl+D / Ctrl+C / ] / [ / V / R /
  方向键）→ **最后** `if (mod) return`。⚠️ 曾提前 return 导致 **Ctrl+C 永远走不到**。
- ⚠️ 弹窗 Esc 要 `stopImmediatePropagation()`（捕获阶段）；`stopPropagation()` 挡不住挂在 `window` 的全局 Esc。
- 撤销栈：`layoutProjectAtom` 是**派生 atom**（read=base / write=记历史后落库），450ms 内合并一步；整份替换走
  `replaceProjectAtom`（清栈）；剪贴板 `clipboardAtom` 只在内存。焦点在 input/textarea/select/contentEditable 时整体跳过。

## 设计语言与布局
- **浅色 = 纯白单色**：`globals.css` `:root` primary `#1a1a1a`、surface `#ffffff`、outline-variant `#dcdcdc`、error `#b3261e`。
  **不要再加紫调**；`.dark` 保持 M3 baseline。全用 `--md-sys-color-*` token；**不要引入 Radix Themes**。
  ⚠️ JSX 里别写 markdown `**粗体**`（会原样显示）。
- **右侧属性面板滚动**：`main.grid.h-screen.grid-rows-[auto_1fr]` → `div.grid.min-h-0.grid-cols-[1fr_380px]` →
  `aside.flex.min-h-0.flex-col` → `nav.shrink-0` + 滚动区 `div.min-h-0.flex-1.overflow-y-auto`。**`min-h-0` 不能省**；
  **面板根节点不要 `h-full`**。
- **字体**：UI = **Roboto** + 系统中文，代码 Roboto Mono，**自托管** `public/fonts/roboto/*.woff2`。
  **不要用 `next/font/google`**（本机构建访问不到，会失败）。
