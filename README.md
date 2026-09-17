# 道路标牌生成器

一个在浏览器中制作中国道路标牌、并导出 SVG 矢量图的工具。包含道路名称、交叉路口、地点距离、立交枢纽、出入口和自由排版六个工作区。

## 在线使用

请复制以下链接：
https://fredqin2006-x.github.io/SignGenerator/
在线版无需安装软件；编辑内容仅保存在访问者当前浏览器中，不会上传或同步到服务器。

## 本地运行
安装包下载链接：https://ug.link/fredqin2006/filemgr/share-download/?id=c9e6557918fb457f82d8d39e909072a9
需要 Node.js 20.9 或更高版本。

```powershell
corepack pnpm install --frozen-lockfile
corepack pnpm build
node server.mjs --open
```

开发调试可运行：

```powershell
corepack pnpm dev
```

Windows 用户也可以使用仓库中的“重新构建.bat”生成离线文件，再双击“一键启动.bat”。完整使用说明见 [简体中文教程](./运行前阅读/zh_CN/README.md)。
## 离线发行包

如果要让非开发者下载后直接使用，建议在 GitHub 的 **Releases** 中上传完整离线压缩包（至少包含 `out/`、`server.mjs` 和“一键启动.bat”）。`out/` 是构建产物，源码仓库默认不提交它。

## 许可

请参阅 [LICENSE.md](./LICENSE.md)。

## 致谢
本项目参照NanGua-QWQ/SignGenerator进行搭建，基础ui及部分页面功能来自此处。
