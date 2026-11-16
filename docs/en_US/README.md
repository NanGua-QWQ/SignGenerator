# sign-generator · English documentation

English | [大陆简体中文](/docs/zh_CN/README.md)

## What this is

A fully client-side visual toolkit for the Minecraft Fabric / Architectury mod `yunbeiuc`:

1. **Model Code Studio (`/`)** — import a block model JSON plus its textures, preview the block
   in 3D on a canvas, place text lines visually, and generate the Java sources and resource files.
2. **Road Sign Generator (`/signs`)** — render Chinese national-standard road sign templates and
   download them as SVG.

## Studio workflow

1. **Asset library (textures load themselves)** — drop the mod's `src/main/resources` (or its
   `assets` folder) onto the **Model** panel, or use *Choose resource directory*. Everything under
   `assets/<namespace>/models|textures/…` is indexed, and from then on importing a model
   automatically walks the `parent` chain (parents stay out of the model list) and **reads and binds
   every referenced texture**. Vanilla references (`minecraft:…`) are ignored, and anything not found
   is reported with the exact expected file path.
2. **Import model JSON** — full `models/block/*.json` syntax support (`from`/`to` as arrays or
   `{x,y,z}`, element `rotation`, per-face `uv` / `rotation` / `cullface` / `tintindex`, `display`,
   `ambientocclusion`). Missing `uv` values fall back to the vanilla derivation, and geometry always
   comes from the element box while `uv` only selects the texture region stretched onto that face.
3. **Import textures manually (optional)** — PNG / JPG / WebP for replacements or extra art; the file
   name becomes the generated resource name, and any `#variable` can be re-pointed by hand.
4. **Place text visually** — every text line maps 1:1 to `CustomSignBlockEntity.TextLineData`
   with three kinds: plain text, `-texture`, `-rect`.
   Drag a text line on the canvas to change `xOffset` / `yOffset`, or use the arrow keys.
   `{field}` placeholders link to the data fields declared in the **Fields** panel; enum fields
   also generate `getFieldOptions` / `applyFieldOption` so the in-game editor can switch values.
   The **Front** preset is a face-on view: the camera aligns to the text plane normal, so text is
   neither skewed nor foreshortened while you position it. The **facing** button cycles
   north → east → south → west, and the **model rotates with it exactly like the blockstate does**
   (`y` = 0/90/180/270) while the text follows the renderer's own `-facing.asRotation()` table
   (south 0 / west 90 / north 180 / east 270). Both match the game, so whichever facing you pick you
   look at the *printed* side of the sign, and the text always ends up *outside* the board instead of
   being hidden behind it. Back-face culling uses the face normal after element **and** facing
   rotation, and edge-on faces are dropped too, so you never see the inside of the geometry.

   Text is always written as **plain text** — ABC traffic fonts are not something the studio
   encodes. `SignTextLinesHelper` wraps the text into a `-json {"text":…,"font":…}` line by itself
   whenever the global `GlobalFontSettings.isAbcMode()` is on (the helper is also called with an
   empty `abcFont`, i.e. "unspecified, let the global setting decide").

   On the canvas the text is rendered with **unifont** (`unifont-17.0.04.ttf`, i.e. the same glyphs
   the game uses for `minecraft:uniform`, served as `/fonts/unifont`) and drawn as **per-glyph
   vector text**: each glyph is positioned by Minecraft's advance table and mapped to its projected
   position with its own affine, so the browser rasterises it at the final size — sharp at any zoom,
   with no offscreen bitmaps at all.
5. **Generate code** — class name, registry name, package, variants and per-mount-type Z offsets
   produce:
   - `XxxBlock.java`, `XxxEntity.java`, `XxxEntityRenderer.java`
   - `blockstates/`, `models/block/`, `models/item/`, `lang/zh_cn.json` (+ `en_us.json`)
   - registration snippets for `SignBlocks`, `ModBlockEntities` and the client renderer registry
   - `README-Xxx.md` with the file list, registration steps and texture table

   Copy or download files individually, or export everything as a ZIP (built-in writer, no
   third-party dependency). The studio also autosaves to localStorage and supports exporting /
   importing a `.studio.json` project file.

   **Writing straight into the mod** (no more unzipping and dragging files around): press
   *Choose directory* in the Generate panel. The layout is detected automatically, so any of these
   picks works:

   | What you pick | Java goes to | Resources go to |
   | --- | --- | --- |
   | mod root (contains `src`) | `src/main/java/…` | `src/main/resources/…` |
   | `src` | `main/java/…` | `main/resources/…` |
   | `src/main` | `java/…` | `resources/…` |
   | `src/main/java` | `com/beigu/yunbeiuc/…` | needs a second pick |
   | `src/main/resources` | — | `assets/…` |
   | `com/beigu/yunbeiuc` (package dir) | `block/`, `entity/`, `render/` | needs a second pick |

   The detected mapping is shown as **real example paths** before you write, and existing files are
   overwritten by the freshly generated content. When the pick cannot reach the resource tree (the
   API only walks downwards), the panel asks for `src/main/resources` once. With
   *also insert the registration lines* enabled, the `SignBlocks` / `ModBlockEntities` lines are
   inserted before the last `}` of the matching file — skipped when already registered, and reported
   when the file cannot be found. Requires the File System Access API (Chrome / Edge); other
   browsers can still use the ZIP export.

## Conventions and units

- Model space: 1 unit = 1/16 block, i.e. a block spans `0..16`.
- Text line offsets are in 1/16 pixel with +Y up; the renderer's `baseScale = 0.05 * fontSize`
  means `0.8 * fontSize` model units per text pixel.
- `SignTextLinesHelper`: `scale = fontSize / 20`, `logo(...)` size `= fontSize * 0.4`.
- Text plane Z offsets are in blocks: `NORMAL = -0.45`, `POLE_H = -0.81`, `POLE_L = -0.74`.
- With `FACING = NORTH` the text plane sits on the +Z side of the block (z ≈ 15.2) facing −Z,
  matching the `SHAPE_NORMAL_N` voxel box of `AbstractEditableSignBlock`; blockstate `y` values
  follow the vanilla convention (north 0 / east 90 / south 180 / west 270).
- Projection is **orthographic by default**: parallel lines stay parallel and equal distances stay
  equal, so there is no foreshortening — one affine per face maps its texture exactly. The
  **Perspective** toggle adds a real perspective divide ("perspective strength" = camera distance);
  texture mapping is then subdivided 4×4 per face to stay accurate (max error ≈1.6 px at distance
  120, ≈0.4 px at 480, versus ≈23.8 px without subdivision). Switching projection never shifts the
  view centre, because the scale at `depth = 0` is identical in both modes.
- The UI is **light by default** (the ☀ / ☾ button in the header switches to dark, and the choice
  is remembered). The canvas has a **white / gray / dark** backdrop switch: sign text is usually
  white, so pick *gray* while placing text (white on white would be invisible) and *dark* for an
  in-game look. Grid, block outline and axes recolour themselves per backdrop. Neither the theme
  nor the backdrop affects the generated code.

## Development

```bash
pnpm install
pnpm dev      # http://localhost:3000
pnpm lint
```

## Known environment issues

- Offline `pnpm install --offline` can fail because the `next` package may be missing from the
  pnpm store; run `pnpm install` once with network access.
- `pnpm lint` currently fails on this machine because `typescript-eslint@8.x` does not support
  TypeScript 7.0. Use `tsc --noEmit` for type checking.
