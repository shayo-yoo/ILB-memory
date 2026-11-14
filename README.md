# ILB-Memory / ILBR 第一周期

本目录是 ILB-Memory 独立 SillyTavern 扩展工作区，不是 Git 仓库（基线见 `docs/LEGACY-BASELINE.md`）。

## 模块

- `manifest.json` + `index.js`：ST 扩展入口；发布 `window.ILBM` 和 additive `window.ILB_SERIES.memory`。
- `ui.js`：非技术用户可用的基础调试面板；打开页面右下角 `ILBM` 按钮，输入文本并点击「测试标记处理」，也可手动添加实体/事件、查看当前状态和回放。
- `lib/memory-model.js` + `lib/memory-store.js`：第二阶段手动记忆存储、实体注册、事件排序、状态重算和回放窗口。
- `lib/ilbr-engine.js`：纯同步、按调用的正则处理引擎；调用方传规则，返回原文/输出/命中/捕获/错误。
- `lib/ilbm-bridge.js`：ILBM marker result、ST display formatter 和 prompt event adapters。
- `tests/*.test.mjs`：Node 原生单元/契约测试。
- `tests/ilbm-process-probe.mjs`：本机 ST + headless Chrome 的 synthetic probe，不发真实模型请求、不写 chat。

## 运行测试

```sh
node --test tests/*.test.mjs
```

## ST 本机探针

要求已运行 ST `http://127.0.0.1:8000` 与 CDP Chrome `9222`；启动方式见 `tests/st-cdp.mjs` 的默认值。运行：

```sh
node tests/ilbm-process-probe.mjs
```

探针只调用 format / prompt events 的合成数据，不调用模型、不修改 chat 或记忆存档。

真实模型请求、实际 UI 查看、编辑/swipe 场景尚需人工验收。备份必须放在 ST third-party 扫描目录之外。
