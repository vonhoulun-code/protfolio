# 网站架构

## 技术形态

无依赖、无构建步骤的静态单页。入口 `dist/index.html`，样式 `dist/styles.css`，浏览器代码 `dist/app.js`。没有 JavaScript 类、导出函数、业务 API、数据库或数据表。以下组件名是文档中的语义分区，并非框架组件类。

## 页面组件

| 组件 / 实现位置 | 职责 | 输入 | 输出与调用关系 |
| --- | --- | --- | --- |
| SiteShell / index.html 的 body、main | 承载页面、无障碍跳转和中文语言信息 | HTML 文案、CSS 全局变量 | 包含 HeroSection、WorkSection、SiteFooter；加载 app.js |
| HeroSection / #top.hero | 圆角深蓝首屏与大留白布局 | 视口高度、CSS 静态渐变、WaterLight 输出 | 包含 Wordmark、HeroIdentity、HeroIntroduction、HeroControls；最小高度 620px，移动端 580px |
| WaterLight / .hero__water | WebGL 画布上的原创流光、折射色边与颗粒 | 分辨率、时间、指针位置、活动强度 | 由 initWaterLight 管理，输出纯装饰像素；不接收指针事件、不输出文字 |
| HeroShade / .hero__shade | 保持画面边缘和文字附近对比度 | CSS 径向与线性渐变 | 覆盖 WaterLight，位于文字下方 |
| Wordmark / .wordmark | 顶部凹口内显示 VON，返回首页 | 用户指定字标、#top 锚点 | HeroSection 顶部链接；伪元素仅绘制凹口圆角 |
| HeroIdentity / .hero__identity | 姓名—细线—职业的一行小字 | HAOLING FENG、INDEPENDENT DESIGNER | HeroSection 正中略偏上；h1 无障碍名称包含中文冯皓龄 |
| HeroIntroduction / #profile.hero__intro | 表达学习态度与认真创作 | 用户要求衍生的两行中文自述、中文姓名及英文短句 | HeroSection 底部居中静态文案；不宣称客户或工作经历 |
| HeroControls / .hero__controls | 提供右下角探索作品入口 | #work 链接 | 通过原生锚点进入 WorkSection；不包含动效控制按钮 |
| WorkSection / #work.work-section | 展示六个概念示例并提示待替换 | 内嵌 HTML ProjectCard、视口宽度 | .work-grid CSS columns：桌面两列、700px 以下一列；桌面间距 6px、移动端 5px |
| ProjectCard / .project-card | 不同高度、圆角作品单元，展示标题/类别 | HTML 示例文案、下列视觉变体、hover、滚动 | 包含 ProjectArt 与 ProjectMeta；initScrollReveal 添加显示状态；当前仅展示，不伪装可点击详情 |
| ProjectArt / .project-art | 展示排版概念或已有图片 | type-art（VON 品牌字）、floral-art（植物图）、blue-art（Aa/Bb）、grid-art（秩序字与网格）、red-art（Stay curious）、space-art（间字） | CSS 排版及简单几何装饰；非独立模块；随 ProjectCard 悬停缩放 |
| ProjectMeta / .project-meta | 标题、序号及暂定设计类别 | 每张卡片的 h3 和 span | 卡片底部的文字与对比渐变，不包含年份或客户 |
| SiteFooter / .site-footer | 简洁收尾、姓名定位、返回顶部 | VON、自述短句、#top | WorkSection 之后的原生页内导航 |
| SkipLink / .skip-link | 键盘跳过首屏 | Tab 聚焦、#work | 聚焦后可见，激活跳到作品区 |

## 浏览器模块 dist/app.js

### initWaterLight()

- 职责：创建和管理默认自动开启的 WebGL 背景、指针交互与可见性生命周期；不依赖按钮或系统减少动画偏好启动。
- 输入：HeroSection、canvas；WebGL 可用性；pointermove/pointerleave/pointerup；IntersectionObserver、ResizeObserver、visibilitychange。
- 输出：画布像素；WebGL 不可用/编译失败/上下文丢失时隐藏画布并保留 CSS 背景。
- 调用：文件尾部直接调用；包含下列私有函数。无全局自定义光标，不阻止触摸滚动。
- 性能：像素比上限 1.5，渲染宽度上限约 1600px；不可见或上下文丢失时取消帧调度；恢复时重置帧时间，避免跳变。

| 私有函数 | 职责 | 输入 | 输出 / 调用关系 |
| --- | --- | --- | --- |
| compileShader(type, source) | 编译顶点或片元着色器，检查编译结果 | WebGL 类型和源码字符串 | 返回 shader 或 null；由 initWaterLight 调用，失败记录警告并释放 shader |
| resize() | 按首屏尺寸和像素比设置画布与 viewport | hero.clientWidth/clientHeight、devicePixelRatio | 更新 canvas 宽高并调用 draw；由初始化和尺寸观察回调调用 |
| draw() | 写入 uniforms 并绘制全屏两个三角形 | resolution、x/y、elapsed、energy | WebGL 像素；由 resize、animate 调用 |
| animate(now) | 平滑追踪鼠标、活动衰减和时间推进 | requestAnimationFrame 时间戳、目标位置和强度 | 更新状态、调用 draw，在允许时续帧；最大 dt 50ms |
| syncPlayback() | 按页面与首屏可见性统一帧生命周期 | contextLost、visible、document.hidden | 取消旧帧，在 WebGL 上下文有效且可见时自动重启 animate；初始化和可见性回调调用 |
| GLSL field(p,t) | 原创正弦域变形生成流光折叠场 | 二维坐标、时间 | 标量波场；片元 main 三次采样估计法向 |
| GLSL 顶点 main() | 将 position 属性映射到裁剪空间 | 六个顶点 | gl_Position；WebGL 顶点阶段调用 |
| GLSL 片元 main() | 合成深蓝底色、折痕高光、鼠标扭曲、弱虹彩及噪声 | field、resolution、pointer、time、energy | gl_FragColor；WebGL 片元阶段调用 |

匿名事件回调：pointermove 将坐标归一化并将目标活动强度设为 1；pointerleave/触摸 pointerup 将目标强度设为 0；可见性回调调用 syncPlayback；上下文丢失时停止并回退到静态背景。无事件向外发送数据。

### initScrollReveal()

- 职责：逐个淡入作品卡片，仅在观察器可用且未要求减少动态效果时启用。
- 输入：[data-reveal] 元素、IntersectionObserver entries、系统动态偏好。
- 输出：html.reveal-ready 与卡片 .is-visible 类。
- 调用：文件尾部调用；匿名观察回调在元素进入视口后显示并取消观察。无 JS 或初始化条件不满足时内容默认可见。

## 样式模块 dist/styles.css

- 输入：页面组件选择器、尺寸、hover/focus、prefers-reduced-motion。
- 输出：布局、色彩、凹口、圆角、窄间距、响应式和渐入动画。
- 调用关系：index.html 引用；app.js 仅写入展示状态类。类名均归属上表组件；--type/--floral/--blue/--grid/--red/--space 是 ProjectCard 视觉变体，不是业务类。
- 响应式：700px 以下单列，1800px 以上限制卡片最高尺寸。原生光标和清晰键盘焦点保持可用。

## 本地服务 preview-server.mjs

- 职责：仅供本机预览 dist 静态文件，不是业务服务或生产部署入口。
- 输入：GET/HEAD HTTP 请求；进程工作目录下 dist；固定端口 4173。
- 输出：http://127.0.0.1:4173；按扩展名返回 MIME、no-store 响应；非法路径 403，不支持的方法 405，不存在文件/解码失败 404。
- 调用关系：node preview-server.mjs → http.createServer 匿名异步请求处理器 → URL 解码 → resolve 路径边界检查 → stat/readFile → response；listen 回调仅打印预览地址。只绑定 127.0.0.1，不提供目录列表、上传或项目源码。
- mime 常量：内存中的扩展名到 Content-Type 映射，不是数据库表。

## 静态资产和参考

- dist/assets/haoling-floral-hero.png：已有植物影像，本次由首屏改用于 In Bloom 概念卡片。此前项目文档记载来自图像生成工具；本次未重新验证历史生成记录，因此不新增授权保证。输入 PNG，输出 img 裁切显示，仅由 floral-art 使用。
- reference-greymac.html：用户指定站点的只读参考快照，位于项目根目录且不对外提供；不参与运行。源站 HTML 于 2026-09-15 成功获取，页面布局参考用户截图与可读取标记。未使用其项目图或源代码。
- .openai/hosting.json：保留原有 static.directory=dist；未注册站点、未发布。

## 测试 tests/portfolio.test.mjs

- 职责：Node 原生测试运行器验证 HTML 结构、锚点、素材、内容与 JavaScript 退化路径。
- 输入：本项目 HTML/CSS/JS，通过 fs 读取；内存 DOM/WebGL 缺失测试替身。
- 输出：测试通过/失败状态，无持久化用户数据。
- 调用关系：node --test → 各匿名 test 回调 → assert；JS 退化测试通过 node:vm 执行 app.js。独立浏览器检查验证实际页面与 WebGL。

## 数据、隐私与内容

无数据表、持久化、SQLite、联系人数据、密钥或环境变量。个人事实只使用用户提供姓名、个人设计师定位和入行状态。作品全部为概念预览。content/yangming-profile.md 保留内容审核职责，不被运行时加载。

## GitHub 源代码交付

- 目标仓库：`vonhoulun-code/protfolio`，默认分支 `main`。
- 输入：`dist/` 网站与已有图片、README、架构和内容文档、AGENTS、预览服务、测试以及 `.gitignore`。
- 输出：仓库中的完整静态网站源码；图片保持二进制 PNG，文档与代码在同一交付任务内同步上传。
- 调用关系：浏览器仅加载 `dist/`；GitHub 仓库存储源码，上传本身不自动创建公开网站地址。
- `.gitignore` 职责：排除本地 `.openai/`、`.sites-runtime/`、参考网页快照、依赖、日志、密钥、环境文件、数据库和联系人目录。输入 Git 文件路径，输出版本控制忽略规则。
- `reference-greymac.html` 和 `.openai/hosting.json` 仅保留在本地，不作为此次上传内容。

