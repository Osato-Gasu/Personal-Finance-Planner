# GENERATED FILE: DO NOT EDIT.
# source version: 0.12.25
# source commit: f07571d3e8745b9a49a28b1ac77e211c210146a3
# 直接編集禁止

# Browser evidence contract

TASKでrequiredの場合、Codexがcandidate固定後にrunner、fixture、host browser、DOM assertion、visual確認、console/runtime/network、screenshot、ZIP identityまで担当します。

runner failureはCodexが修正して再実行します。ユーザー操作は実測済みhost blocker時だけのfallbackです。evidenceにはcandidate、product SHA、browser/version、file URL、viewport/zoom、操作、期待結果、DOM、visual、screenshot、console/network、ZIP SHA-256/bytesを記録します。
