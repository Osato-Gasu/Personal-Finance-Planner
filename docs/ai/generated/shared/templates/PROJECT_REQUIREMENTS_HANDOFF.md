# GENERATED FILE: DO NOT EDIT.
# source version: 0.12.24
# source commit: 34d9727fbc3ed8fe7dfa39c91ca6683b11dc04fb
# 直接編集禁止

# PROJECT REQUIREMENTS HANDOFF

- actor: ChatGPT
- role: ORCHESTRATOR_AND_REVIEWER
- source: CURRENT_STATE, BACKLOG, user request
- purpose: active TASKがない状態から次TASKの目的、scope、AC、変更禁止、test、build、review推奨度、model/effortを確定する
- write capability: state transition前にrepository write accessを実測する
- write available: TASK、handoff、CURRENT_STATE、NEXT_ACTION、Progressを同じstateへ更新する
- write unavailable: 正本を更新済みと記録せずUSER_RELAY_REQUIREDの最小payloadだけを返す
- return_to: user or Codex through user relay
