# AGENTS.md

## 注意事项
- 每次改动完成后，都必须创建一个对应的 Git commit，以便后续追踪和回滚。
- 每次改动后，都必须编写或更新相关测试，并在交付给用户前，确保所有测试和验证全部通过。

## 项目约束
- 本项目是英语 3000 词学习软件，纯静态网页，最终通过 GitHub Pages 在 iPhone 的 Chrome 中使用。
- 应用文件只有四个：仓库根目录下的 index.html、style.css、app.js、data.js。
- 使用普通 script 标签。不使用 ES module、npm、构建工具、外部 CDN 或外部字体。不发起 fetch 或 XMLHttpRequest 请求。唯一允许的外部网络请求是单词发音音频：通过 window.Audio 加载 https://dict.youdao.com/dictvoice?audio=单词&type=2。该地址只能出现在 app.js 的 AUDIO_URL_PREFIX 常量中；四个应用文件的其他位置不得出现 http:// 或 https://。测试文件可以引用该地址。
- 所有资源引用使用相对路径，不以 / 开头。
- 数据只存放在浏览器 localStorage 中，不接后端，不做登录。
- 除应用文件外，只允许新增 AGENTS.md（仓库根目录），以及 tests/ 目录下的测试文件和辅助文件。不要创建 package.json、package-lock.json、node_modules、README 或 .gitignore。
- 应用文件不为测试添加任何代码（例如不添加 module.exports）。
- 允许在仓库中新建 audio/ 与 tools/ 两个目录：audio/ 存放听力音频，tools/ 存放素材下载脚本与清单。这两个目录不属于应用代码；app.js 只能用相对路径引用 audio/ 中的文件，不得在其中发起网络请求。除这两个目录外，仍只允许四个应用文件、AGENTS.md 与 tests/。

## 测试
- 测试使用 Node.js 内置的 node:test 与 node:assert，不安装任何 npm 包。
- 测试文件名以 .test.js 结尾。辅助文件（如 tests/helpers.js）也放在 tests/ 目录下，但文件名不以 .test.js 结尾。
- 在仓库根目录执行 node --test 运行全部测试。
- 测试加载应用文件前，先提供 window、document（至少包含空实现的 addEventListener）和 localStorage（用 Map 模拟）的最小替身，再用 vm 模块执行 data.js 与 app.js。这些替身与加载逻辑统一放在 tests/helpers.js 中。
- 每次改动都要新增或更新与之相关的测试。纯文档改动没有相关测试，可以不写，但要在回复中说明。
- 至少保留一组约束检查测试：index.html、style.css、data.js 中不出现 http:// 或 https://；app.js 中只有一行包含 https://，且该行是 AUDIO_URL_PREFIX 的声明；app.js 中不出现 http://；四个应用文件中不出现 type="module"；index.html 中的 href 和 src 不以 / 开头。
- 页面布局、iPhone 显示、点击效果等无法自动测试的内容，不算在测试内，需要在回复中列为用户手动验收项。
- 交付时，在回复中写明运行的命令、通过数量和失败数量。失败数量必须为 0，否则不得交付。
- 凡涉及事件绑定（如 click、DOMContentLoaded）的代码，测试必须模拟触发该事件，并断言触发后的界面结果；直接调用函数的测试不能替代事件测试。

## Git 规则
- 顺序为：先让所有测试通过，再创建 commit，最后交付。
- commit 信息用一行写清改动内容，并注明步骤编号，例如 "step 1: 页面骨架与视图切换"。
- 修正问题时新增 commit，不要 amend、rebase 或 force 改写已有 commit。
- 不执行 git push，不修改 git remote，不修改 git 用户配置。
- 提交前执行 git status，确认只包含本次改动相关的文件。
