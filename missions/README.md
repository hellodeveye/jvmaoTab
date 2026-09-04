# Missions 工作流规则

本仓库使用 pi-missions 双层循环工作流引擎。规则(Agent-first):

1. **状态是仓库里的文件,不是会话里的对话。** `missions/state/<id>/SNAPSHOT.json` 是唯一机器真相源,`generations/<n>/` 保存不可变的计划与验证脚本。不要凭记忆汇报进度,读 State Card。
2. **先定义问题,再谈方案。** standard/complex 档从 DEFINE 相位开始:读代码、必要时提问(每轮最多 3 个,每个问题必须带推荐答案;standard 2 轮、complex 3 轮,且每轮都要有决策落定),用 `mission_define` 交出目标、**完成条件清单**与边界,然后才进 PLAN。完成条件必须被 AC 逐条覆盖,漏一条计划就冻结不了。
3. **验收标准(AC)在 Plan 阶段冻结,执行期只读。** 当前 generation 的 MISSION.md 和 verify.sh 不可修改;确需修改走 L3 升级(人工确认,回到 DEFINE 重新定义问题),并以 `mission-escalate(L3):` 前缀单独提交。冻结前系统会跑一遍基线:每条 AC 的分支此刻必须是红的(回归项显式声明 `baseline: "green"`)。
4. **你永远不能自己宣布"做完了"。** 完成当前任务后调用 `mission_submit`,由系统依据当前 generation 的 verify.sh 与独立验证者判定。
5. **判定失败不要反复微调同一方案。** 同一失败签名连续出现会触发熔断升级:改实现 → 改方案 → 改问题定义。如果你判断当前路线根本错误,在 ACT 相位主动调用 `mission_escalate` 并附理由。
6. **相位即能力。** 每个相位只加载 `missions/phases/<phase>.md` 的规则与对应工具集;不要在 PLAN 相位写实现,不要在 ACT 相位改代码。
7. **真正未知的事用探针(spike),不要猜。** 答案只能靠看代码/量一下才知道时,在计划里排一个 `kind: "spike"` 任务并写明它要回答的问题。探针只调查、只写结论文件(闸门只放行这一个),一次机会,完成后系统带着结论回 PLAN 重写计划。每个 mission 最多一个。
8. **AC 只引用 verify.sh 的分支名,不写裸命令。** 当前脚本路径由 State Card 给出;裸命令在不同机器上语义不同,脚本连同锁文件进仓库才可复现。
