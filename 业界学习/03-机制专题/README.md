# 机制专题

本目录保存从外部资料和竞品分析中抽象出的机制问题，重点回答“为什么这种机制有效、它依赖什么前提、spec-first 应该如何判断是否吸收”。

## 推荐阅读顺序

1. [Workflow Lifecycle](./workflow-lifecycle/)：需求、计划、工作、评审、知识沉淀的流转机制。
2. [Review / Testing](./review-testing/README.md)：评审、测试决策、守卫纪律和质量门禁。
3. [Knowledge Harness](./knowledge-harness/README.md)：知识基座、记忆层和经验复用机制。
4. [Governance Gates](./governance-gates/README.md)：轻合同、硬 gate、规则成熟度和治理边界。
5. [Runtime Provider](./runtime-provider/README.md)：provider readiness、runtime setup 和可观测性。

## 已有入口

- [流程门禁与状态流转分析](./workflow-lifecycle/0.流程门禁与状态流转分析.md)
- [Review 机制详细设计](./review-testing/1.Review机制详细设计.md)
- [各阶段稳定产物与交接机制分析](./workflow-lifecycle/2.各阶段稳定产物与交接机制分析.md)
- [需求交付飞轮与系统自我进化机制](./workflow-lifecycle/3.需求交付飞轮与系统自我进化机制.md)
- [Review / Testing 机制分析](./review-testing/README.md)

## 使用约定

- 机制专题不直接堆竞品材料；竞品材料放在 `02-竞品对标/`。
- 机制专题可以引用多个竞品或外部原文，用来形成可复用判断框架。
- 如果机制已经能转化为 spec-first 路线或改造项，落到 `04-spec-first吸收方案/`。
