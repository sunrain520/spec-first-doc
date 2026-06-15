# 业界学习

本目录是 spec-first 的业界资料库和文章生产工作台。目录按“读资料 -> 做对标 -> 抽机制 -> 转成 spec-first 可吸收方案 -> 产出文章”的链路组织。

## 阅读入口

1. [00-阅读地图](./00-阅读地图/README.md)：查看主题索引、选题池和资料到文章的映射。
2. [01-外部文章](./01-外部文章/README.md)：保存外部原文和图片资产，按主题归档。
3. [02-竞品对标](./02-竞品对标/README.md)：保存与竞品、开源项目、外部体系的差距分析。
4. [03-机制专题](./03-机制专题/README.md)：沉淀 workflow、review、knowledge、governance、runtime 等机制分析。
5. [04-spec-first吸收方案](./04-spec-first吸收方案/README.md)：承接可落地的能力映射、路线图、改造建议。
6. [05-文章产出](./05-文章产出/README.md)：管理选题、大纲、草稿、待发布和已发布文章。
7. [99-历史归档](./99-历史归档/README.md)：保留迁移清单和旧 README。

## 目录结构

```text
业界学习/
  00-阅读地图/
  01-外部文章/
    ai-coding范式/
    spec-driven-development/
    harness-engineering/
    knowledge-base/
    metrics-and-roi/
    codebase-understanding/
  02-竞品对标/
    compound-engineering/
    openspec-superpowers-gstack/
    scale-engine/
    prd-agent-os/
    crg-codegraph-graphify/
    harness-engineering/
    ai-engineering-methodology/
  03-机制专题/
    workflow-lifecycle/
    review-testing/
    knowledge-harness/
    governance-gates/
    runtime-provider/
  04-spec-first吸收方案/
    能力映射/
    skill-agent映射/
    路线图与差距/
    可落地改造建议/
  05-文章产出/
    00-选题池/
    01-大纲/
    02-草稿/
    03-待发布/
    04-已发布/
    assets/
  99-历史归档/
    迁移清单/
    原始README/
```

## 维护约定

- 外部原文保持 `.md` 与同名 `.assets/` 相邻，放在 `01-外部文章/` 的主题目录下。
- 对“别人怎么做”的分析放入 `02-竞品对标/`。
- 对“机制为什么有效”的抽象放入 `03-机制专题/`。
- 对“spec-first 怎么吸收”的路线、映射和改造建议放入 `04-spec-first吸收方案/`。
- 可发表内容统一流转到 `05-文章产出/`，不要混在资料库目录中。
- 迁移清单、旧索引和仅用于追溯的材料放入 `99-历史归档/`。
