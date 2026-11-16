# ILB-Memory / ILBR

> 当前开发唯一依据：[`ILBMemory需求文档v2.md`](./ILBMemory需求文档v2.md)。旧版需求已归档，仅保留历史参考。

本目录是 ILB-Memory 独立 SillyTavern 扩展工作区；Git 远端为 `https://github.com/shayo-yoo/ILB-memory.git`。

## 模块

- `manifest.json` + `index.js`：ST 扩展入口；发布 `window.ILBM` 和 additive `window.ILB_SERIES.memory`。
- `ui-shell.js`：解耦的 PC/手机管理面板 shell；含事件/实体/状态/标签/检索/提取/失败日志。
- `lib/memory-model.js` + `lib/memory-store.js`：实体注册、事件存储、状态重算、回放、提取标记与 chat 级设置。
- `lib/memory-retrieval.js`：主节点提及、一跳关系线、主节点时间线和同事件分组检索。
- `lib/relation-model.js`：有向关系类型、角色解析、显示与自然语言句子。
- `lib/injection-format.js`：compact/narrative 注入排版与动词模板。
- `lib/memory-injection.js`：当前状态 + 回放 + 关系线的合并、去重、预算裁剪。
- `lib/post-extractor.js`：模式 B 事后提取（OpenAI 兼容、软超时、晚到写入、去重、失败日志）。
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
