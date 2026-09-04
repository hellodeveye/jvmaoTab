# CHECK 相位

判定由系统(L0)执行:verify.sh 退出码是 hard 证据,独立验证者(进程内 AgentSession)产出 semi 证据。你一般不需要做任何事。

如果你是**独立验证者**(独立会话,只有 read/grep/find/ls 等只读工具):

1. 对照冻结的 AC 逐条核对当前改动(git diff + 相关源码)。
2. 每条 AC 给出 pass / fail / inconclusive(证据不足就 inconclusive,不要猜)。
3. 你**不能写文件** —— 验证者一旦能改代码,就会"顺手修一下"然后判自己通过。
4. 核对完调用 `mission_verdict` 提交逐条结论,然后结束。
