# 高速编号牌生成器

基于 React、Vite 和 `fontkit` 的纯前端高速公路编号牌 SVG 生成器。

## 功能

- 国家高速/省高速类型切换
- 2 位或 4 位数字编号：`15`、`0421`
- 可选高速名称
- 实时矢量预览、缩放与拖动
- 下载不依赖系统字体的路径化 SVG
- 明暗主题与移动端布局

## 开发

```powershell
npm install
npm run dev
```

生产构建与检查：

```powershell
npm run build
npm run lint
```

## 目录

```text
src/
  components/
    layout/              # 页头与主题切换
    ui/                  # 小型通用表单组件
  features/
    sign-generator/      # 编号牌界面与 SVG 生成逻辑
  App.jsx                # 列表状态与响应式页面布局
public/
  fonts/                 # A/B/C 型字体资源
```

字体由浏览器读取后通过 `fontkit` 转换为 SVG `<path>`。生成结果不包含 `<text>`，在未安装交通标志字体的设备上也能正确显示。
