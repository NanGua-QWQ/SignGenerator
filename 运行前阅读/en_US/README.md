# Road Sign Generator — User Guide

English (US) · Lightweight offline edition · Updated September 6, 2026

[简体中文教程](../zh_CN/README.md)

Create road-name signs, intersection and roundabout signs, destination-distance signs, interchange signs, entrance/exit signs, and custom layouts in your browser. The application includes **6 workspaces and 18 templates**, with its runtime files and fonts supplied locally.

**For everyday use, double-click `一键启动.bat` in the main program folder. You do not need to rebuild the application or install development dependencies.**

The application interface is currently in Chinese. This guide includes the Chinese labels so you can find the corresponding controls; the English guide does not change the interface language.

## Contents

1. [Setting up a new computer](#1-setting-up-a-new-computer)
2. [Starting and stopping the application](#2-starting-and-stopping-the-application)
3. [Create your first sign](#3-create-your-first-sign)
4. [Interface and common controls](#4-interface-and-common-controls)
5. [All workspaces and templates](#5-all-workspaces-and-templates)
6. [Exporting and using your files](#6-exporting-and-using-your-files)
7. [Automatic saving, backups, and migration](#7-automatic-saving-backups-and-migration)
8. [Start versus rebuild](#8-start-versus-rebuild)
9. [Files and folders](#9-files-and-folders)
10. [Troubleshooting](#10-troubleshooting)
11. [Advanced helpers and developer commands](#11-advanced-helpers-and-developer-commands)

## 1. Setting up a new computer

### 1.1 Copy the complete application

Copy the entire `SignGenerator` folder to a local drive. If you received a ZIP archive, extract all files before starting the application. Do not run it from inside the archive preview.

You may use a different drive or folder from the original computer; for example, `D:\SignGenerator` is fine. Keep the launcher beside the application files, and do not move the folder while the server is running.

Normal operation requires at least these items together:

```text
SignGenerator/
├─ 一键启动.bat          ← Everyday launcher
├─ server.mjs
└─ out/                 ← Complete prebuilt application and fonts
```

Keeping the entire supplied folder is recommended so that the source code, maintenance tools, and documentation remain available.

### 1.2 Windows and a browser

- Use a Windows computer supported by your chosen Node.js release. The supplied launchers target Windows 10/11.
- Use a modern browser. The Microsoft Edge already installed on the computer is a suitable starting point; Chrome is another option.
- Maximize the browser for a more comfortable desktop layout. On narrower windows, settings may appear below the preview.

### 1.3 Install Node.js once

Node.js is the runtime that starts the local application. You do not need to learn programming to use it.

1. Visit the [official Node.js download page](https://nodejs.org/en/download).
2. Choose a currently supported **LTS** release, select **Windows**, and download the **Windows Installer (`.msi`)**.
3. Select the correct architecture: **x64** for most Intel/AMD computers, or **ARM64** for Windows ARM devices. Check **Windows Settings → System → About → System type** if unsure.
4. Run the installer and complete its setup. Keep the default Node.js, npm, and PATH-related options. If an optional additional native-module build-tools installation is offered, those extra tools are not required for ordinary use of this application.
5. Close any old launcher window and start the application again so it can detect the newly installed environment.

The launcher requires **Node.js 20.9 or later**. This is the minimum version check, not a recommendation to install an unsupported old release. On a new computer, choose an LTS release still supported on the official website.

Skip this step if a suitable Node.js version is already installed. Optionally run `node --version` in a terminal to check it; an output such as `v24.x.x` identifies the installed version.

### 1.4 What you do not need

Everyday use does not require pnpm, a code editor, Python, a database, separately installed traffic-sign fonts, or a `node_modules` directory. Do not run the rebuild launcher just to prepare for first use.

Downloading the Node.js installer requires internet access. Once the runtime is installed and the complete application is present, normal startup, editing, and SVG export work offline. For an offline target computer, obtain the correct installer from the official website on another computer and transfer it first.

## 2. Starting and stopping the application

### Start

1. Open the main `SignGenerator` folder containing `一键启动.bat`.
2. Double-click **`一键启动.bat`** (“One-click start”).
3. Wait for **`Road Sign Generator is ready`** in the launcher window.
4. Your browser will normally open [http://127.0.0.1:3000](http://127.0.0.1:3000). If it does not, enter this address yourself.

`127.0.0.1` refers to your own computer. This is a local application address, not an external website. Opening `out/index.html` directly is not a substitute for starting the launcher.

### While working

Keep the launcher window open; you can minimize it. The browser handles editing, while the local server supplies the page files and fonts.

Only one server is needed. Before launching again, check whether the previous instance is still running.

### Stop

Close the launcher window, or press **Ctrl+C** in that window and follow any termination prompt. Closing only the browser tab does not stop the local server.

To continue later, start the application again using the same browser, browser profile, and address to access its saved workspace.

## 3. Create your first sign

Example: a national expressway sign for **G15 / 沈海高速**.

1. Select **道路名称标识** (Road-name signs) at the top.
2. Click **＋** beside the left-hand list heading.
3. Choose **高速道路名称标识** (Expressway road-name sign).
4. Under **高速类型** (Expressway type), select **国家高速** (National expressway).
5. Enter `15` in **道路编号** (Road number). Enter digits only; the application handles the appropriate prefix.
6. Enter `沈海高速` in **高速名称** (Expressway name).
7. Check the preview and use the zoom or reset controls if needed.
8. Click **下载 SVG** (Download SVG), then open the resulting `.svg` file from your browser's download folder.

Workspace changes are saved automatically; there is no separate Save button. **Saving your editable workspace and downloading an SVG are separate operations.** Export important finished signs as well.

## 4. Interface and common controls

| Area | Purpose |
| --- | --- |
| Top workspace tabs | Switch between the six sign categories |
| Sun/moon button, 切换主题 | Switch light/dark interface themes; this does not change the sign's background color |
| Left sign list | Add, select, reorder, edit list properties, and delete signs |
| Center preview | Display the selected sign with zoom, reset, and download controls |
| Right settings panel | Edit the selected template's text, numbers, directions, distances, colors, and layout |

Narrower windows rearrange the panels. Settings may move below the preview, and some panels scroll independently.

### Managing signs

- **Add — 新增标志:** click `＋`, then select a template. Each workspace has its own menu.
- **Select:** click a sign in the list to show its preview and settings.
- **Reorder — 拖动排序:** drag the dotted handle on the left of an item before or after another item.
- **Quick edit:** right-click a list item to edit its list-option name and color, or open the larger editing dialog. The list color is separate from the sign's background color.
- **Delete — 删除:** click the trash icon and confirm. **取消** means Cancel. The application keeps the last sign of each template, so a template with only one remaining sign cannot be completely emptied this way.

### Preview controls

| Action | Control |
| --- | --- |
| Zoom out | 缩小 — minus magnifier |
| Zoom in | 放大 — plus magnifier |
| Wheel zoom | Hold Ctrl and scroll with the pointer over the canvas |
| Pan | Hold the left mouse button and drag inside the preview canvas |
| Reset | 复位 — curved-arrow button; returns to 100% and the original position |
| Export | 下载 SVG — download button; exports the selected sign |

Zoom ranges from 40% to 300%. Panning and preview zoom do not change the exported SVG's vector dimensions or quality.

## 5. All workspaces and templates

Settings vary by template. The following describes their main uses; the current settings panel shows the available fields, length limits, and options.

### 5.1 Road-name signs — 道路名称标识

Four templates:

| Chinese menu label | Purpose |
| --- | --- |
| 高速道路名称标识 | Expressway sign: national, provincial, or Beijing–Tianjin–Hebei type; route number, road name, province abbreviation, and applicable number-layout options |
| 城市道路名称标识 | Urban road name, visual style, and an existing route-sign reference where supported by the style |
| 无编号快速路道路标识 | An unnumbered urban expressway name, with automatic layout adjustment for longer names |
| 普通道路名称标识 | National, provincial, county, or township road numbers, using G, S, X, or Y prefixes respectively |

Expressway number inputs accept 1–4 digits. Leave the expressway name empty for a number-only sign. Follow the displayed limits for other fields.

Create road-name signs here first if you want to reference them in intersection, distance, entrance, or exit signs.

### 5.2 Intersections — 交叉路口

Two templates:

**交叉路口指路标志 — Intersection direction sign:** set the crossing road name and upper-left compass direction, then add content for each direction. Each direction supports up to five rows of road-name text or existing route-sign references. Remove individual rows as needed.

**环岛图形式 — Roundabout diagram:** choose square or wide layout, show or hide the compass direction, and set the approach-road class. Enable the required exits and configure their destinations, route references, and road classes. Road classes determine line thickness. Up to five exits can be enabled.

### 5.3 Destination distances — 地点距离标识

One template, **地点距离标识** (Destination-distance sign).

Choose a green, blue, or brown background and add destination rows. Rows can use place-name text or an existing road-sign reference, with an optional English line, distance, and unit. Unneeded rows can be deleted.

Enter English text yourself; the application does not automatically translate Chinese. Use the unit selector instead of combining numbers and units arbitrarily in one field.

### 5.4 Interchange guidance — 立交枢纽指引

Five templates:

| Chinese menu label | Purpose |
| --- | --- |
| 分向指路标志 | Directional guidance for different routes and destinations |
| 道路分岔预告 | Advance fork guidance with left/right routes, exit information, and distance |
| 2车道立交枢纽出口 | Route and destination guidance for a two-lane interchange exit |
| 双出口枢纽式互通立体交叉出口预告 | Advance guidance with upper and lower expressway/destination groups and distance |
| 双向出口预告 | Exit number and two directional route/destination groups |

Applicable selectors can reference existing road signs. Changes to a referenced road may update dependent previews; review related signs when you edit shared road information.

### 5.5 Entrance and exit guidance — 出入口指引

Five templates:

| Chinese menu label | Purpose |
| --- | --- |
| 国标出口标识 | Standard exit sign with exit number, route number, destinations, and exit direction |
| 普通道路出口 | Ordinary-road exit using road-name text or a route sign, with applicable background and direction options |
| 无编号城市快速路出口预告 | Unnumbered urban expressway exit preview with road name, compass direction, target roads, and arrow |
| 无编号城市快速路入口预告 | Unnumbered urban expressway entrance preview with road name, two destinations, and entrance distance |
| 入口预告-2方向 | Two-direction entrance preview with expressway number, compass markers, direction content, entrance direction, and distance-display/unit options |

Checkboxes control the visibility of some content. If a field disappears, check whether the corresponding option is disabled or a different template is selected.

### 5.6 Free mode — 自由模式

One template, **自由标志** (Custom sign), with multiple layout variants.

- Choose a free layout, left/right exit, straight-ahead, or lane-guidance variant.
- Choose green, blue, or brown background and adjust opacity.
- Optionally show an exit-number panel, letter suffix, custom exit name, exit distance, and top information bar.
- Add up to five main content rows. Copy, move, or delete rows and configure applicable dividers.
- Add multiple elements to a row: text, road signs, or arrows. Copy elements, move them left/right, or delete them.
- Text supports a manually entered English line and leading/trailing icons. Road elements can reference existing signs and use compass markers.

Choose the layout and background first, configure exit information, then build the content rows. Disabled buttons generally indicate a count limit, a boundary position, or a requirement to keep at least one item.

## 6. Exporting and using your files

- The interface exports **SVG**, not PNG, JPEG, PDF, or a complete editable workspace project.
- Each download exports the currently selected sign. Select and download signs individually if you need several.
- Files go to the browser's configured download directory, which may be different from the program folder. The browser may append a number to duplicate filenames.
- Text is converted to vector paths during generation. Viewing the finished sign normally does not require installing the traffic fonts separately. In a vector editor, these letters are generally paths rather than editable text fields.
- Open an SVG in a browser to view it, or in software that supports SVG for further editing. Convert to another format separately when needed.
- Preview zoom does not increase or reduce export quality; SVG is a vector format.

## 7. Automatic saving, backups, and migration

### Where edits are saved

Edits are saved in local browser storage for the **current computer, browser, browser profile, and site address**. The application has no cloud account or automatic cloud synchronization.

`http://127.0.0.1:3000` and `http://localhost:3000`, different ports, different browsers, and different browser profiles can use separate storage. Use a consistent browser and address for everyday work.

### What can affect saved data

Clearing site data, resetting/deleting a browser profile, or using a private browsing session may prevent records from being retained or restored. Deleting a sign also has no general undo or recycle-bin feature.

### Backups and moving computers

1. Download important finished signs as SVG and copy them to your backup location.
2. Copy the complete application folder to a new computer and install Node.js as described in section 1.
3. **Copying the program folder does not transfer the old computer's browser workspace.**
4. The current interface has no whole-workspace import/export feature and cannot import an SVG back into editable sign settings. SVG is a finished-artwork backup, not a substitute for an editable workspace backup.
5. If you must preserve editable history on another computer, retain the old browser data and arrange a separate backup of its local application data before clearing or replacing that environment.

## 8. Start versus rebuild

| Task | What to run |
| --- | --- |
| Open the app, create signs, edit text, export SVG | **一键启动.bat** — One-click start |
| Use a complete copy on another computer | Install Node.js, then run **一键启动.bat** |
| Apply changes made to application source code, interface, or functionality | **重新构建.bat** — Rebuild |
| Recover missing `out` files from the complete source | **重新构建.bat**, or copy the complete application again |

Rebuilding temporarily installs development dependencies, checks the code, generates the offline application, and tests the local server. After all steps succeed, it removes development dependencies and build caches to restore the lightweight layout.

Rebuilding usually needs internet access and additional temporary disk space. Dependencies and build files can occupy hundreds of MB, so leave sufficient free space.

Close the running application first, double-click `重新构建.bat`, wait for completion, then use `一键启动.bat`. If rebuilding fails, read the error; do not assume partially generated output is a working release.

A rebuild is not a reset and does not intentionally clear browser sign records. **Editing these tutorial files does not require rebuilding.**

## 9. Files and folders

| Item | Purpose |
| --- | --- |
| `一键启动.bat` | Everyday launcher |
| `server.mjs` | Local server using only built-in Node.js capabilities |
| `out` | Prebuilt offline application and fonts; required for normal use |
| `src` | Complete application source, sign templates, and source fonts for rebuilding |
| `重新构建.bat`, `scripts` | Build, verification, and cleanup tools |
| `tests` | Automated offline-server checks |
| `package.json`, `pnpm-lock.yaml`, other configuration | Development dependencies and build configuration; retain for maintenance |
| `运行前阅读` | Chinese and English guides |
| `LICENSE.md` | Project license |

The absence of `node_modules`, `.next`, and `.next-webpack` is normal in this lightweight edition. You do not need to recreate them for ordinary use.

## 10. Troubleshooting

### “Node.js was not found”

Install Node.js with its PATH-related setup options enabled. Close the old launcher window and start again. If it still is not found, sign out of Windows and back in, then retry.

### “Node.js 20.9 or later is required”

The installed runtime is too old. Install a currently supported LTS release that meets the minimum requirement, then restart the application.

### “The offline build is missing”

`out` is missing or incomplete. Copy the complete application again, or rebuild if all source files are available. Copying only the launcher will not restore missing runtime files.

### “Port 3000 is already in use”

Open `http://127.0.0.1:3000` to check whether the application is already running. If so, use that instance. Otherwise, close your earlier server or identify the program using that port. Avoid changing ports casually: a different port uses a different browser storage location.

### The browser does not open automatically

Check for `is ready` in the launcher window, then enter `http://127.0.0.1:3000` manually. If the browser cannot connect, check that the launcher is still open and has not reported an error.

### Blank page, missing fonts, or an outdated interface

Use the local HTTP address rather than a `file://` path. Check that `out` is complete, restart the server, and press **Ctrl+F5** to refresh without using cached page files. Source-code changes require a rebuild before they appear in the offline version. Do not clear site data as your first troubleshooting step; that can remove saved signs.

### Previous signs are missing

Check the browser, profile, and exact address, as well as private-browsing mode or recently cleared site data. Having the program files does not mean the browser's editable records are also present. Return to the original environment first.

### I cannot find the downloaded file

Check the browser's configured download directory and download status. Look for a `.svg` extension. If the browser reports a blocked or incomplete download, review its message and the relevant file/download settings.

### I cannot add, delete, or enter more content

Check row, element, and character limits, and whether only one required template/content item remains. Controls may be hidden or disabled by the current template or checkbox settings. Follow the panel's hints.

### A route is missing from a reference selector

Create the corresponding sign in **道路名称标识** first, then return to the other workspace and select it. Each template exposes only compatible road types.

### The folder became larger after a failed rebuild

Rebuilding temporarily creates development dependencies and caches. Automatic cleanup happens only after the complete build and checks succeed. Resolve the error and rebuild again; do not delete files while a build is running.

## 11. Advanced helpers and developer commands

### Coordinate and measurement helpers — optional

Ordinary sign creation does not require these helpers. The current application exposes two switches in the browser developer console for this page:

```javascript
window.position
```

This toggles the canvas coordinate overlay. Enter it again to turn it off. Moving the pointer over the canvas displays its position.

```javascript
window.px
```

This toggles measurement mode. Drag between two points to inspect horizontal, vertical, and straight-line distances. Hold **Shift** to constrain measurement horizontally or vertically. While enabled, dragging measures instead of panning; enter `window.px` again to restore normal dragging. Values use the sign's internal SVG coordinates, not physical millimeters.

### Developer commands — optional

Run these from the main program folder. Ordinary users do not need them.

```powershell
# Run the prebuilt application without pnpm or node_modules
node server.mjs

# Verify the offline server; retain out, src, and tests
node --test tests/server.test.mjs

# Development mode: install pnpm first, then the project dependencies
pnpm install --frozen-lockfile
pnpm dev

# Check the code and generate the offline application
pnpm lint
pnpm build
```

Manual development/build commands create dependencies and caches. For a build followed by automatic cleanup, use `重新构建.bat` in the main folder.
