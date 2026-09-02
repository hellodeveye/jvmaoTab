#!/usr/bin/env bash
# pi-missions 环境指纹(I9 · 可复现性)
# 输出本机的运行时版本 + 锁文件 hash。系统对输出取 sha256 作为指纹;
# 指纹不一致时判定为 INCONCLUSIVE(不计入熔断),而不是 FAIL ——
# 因为病根在环境,不在代码。
set -u

node --version 2>/dev/null | sed 's/^/node: /'
java -version 2>&1 | head -1 | sed 's/^/java: /'
mvn -version 2>/dev/null | head -1 | sed 's/^/mvn: /'
python3 --version 2>/dev/null | sed 's/^/python: /'
go version 2>/dev/null | sed 's/^/go: /'
rustc --version 2>/dev/null | sed 's/^/rustc: /'

for f in package-lock.json pom.xml requirements.txt yarn.lock pnpm-lock.yaml Cargo.lock go.sum; do
  if [ -f "$f" ]; then
    echo "lock:$f:$(sha256sum "$f" | cut -d' ' -f1)"
  fi
done
