---
name: ui-craft
description: Supplementary checklist for the visual craft of a UI task (plan tokens, avoid templated defaults, type, structure, motion, copy, quality floor, self-critique). The Project's own UI standard always takes precedence. Use when designing or implementing screens. Runbook only.
---
# UIの作り込み（補助）

優先順位: 利用者の言葉 → Projectの基準（`PROJECT.md`、UI基準の文書）→ この手順。Projectの基準が「正確さ・可読性・操作性が先」なら、ここは**その下で視覚を整える補助**で、基準を緩めない。出典: Anthropic公式 frontend-design（anthropics/claude-plugins-official、Apache-2.0）を要約・調整したもの。原文の「美的リスクを取る」「heroで主題を示す」は、運行管理のような業務画面では採らない。

1. **作る前に計画**: 色（4〜6の名前つき値）、書体と役割、レイアウトの考え方、原則を短く書く。その計画が、同種の画面に使い回せる既定になっていないか見直し、直してから作る。
2. **月並みな既定を避ける**: 大文字の字間つきラベルを全見出しに付ける／見出しの上に不要なラベルを置く／等幅の小ラベルや「A · B · C」の中点つなぎを多用する／全ての区画を同じ角丸・同じ影のカードにする／見出しの一語だけを強調する、は選択ではなく癖。禁止ではなく、**情報として必要な理由があるときだけ**使う。等幅は機械値（SHA・ID・パス・コード）を見せるためのもので、見出しや装飾には使わない。
3. **書体**: 1〜2種を意図して選ぶ（2種なら明確に違うもの）。文字の大きさの段階を決めて守る。行長は欧文で80字未満が目安。日本語の行長・字間は未確認なので、Projectで決める。
4. **構造は情報**: 罫線・枠・見出し・番号は、内容の関係を表すときだけ。番号は本当に順序があるときだけ。枠で囲むのは、強調したい一つだけにする。
5. **動き**: ユーザーの操作に応える動き（開く・展開・確認）は使う。勝手に動くものは控えめに。`prefers-reduced-motion` を守り、情報の確認を待たせない。
6. **文言**: 利用者の側から、平易に、能動態で。同じ操作は流れの中で同じ名前にする。エラーは原因と直し方。空の画面は次の行動を案内する。
7. **品質の下限**: スマートフォン幅まで崩れない、キーボードのフォーカスが見える、文字のコントラスト、色だけに頼らない状態表示。
8. **自己批評**: 作りながら画面を見て、最後に飾りを一つ減らす。

## 点検（作ったあとに、AIが先に行う）
出典: Vercel の web-interface-guidelines（MIT、版 `434b7f91364665f2f733b310ec54809bf8f37937`）の規則を、適用できる分だけ要約した。取得先は `main` で版が動くため、ネットから毎回取らず、この写しを基準にする。更新するときは差分を読んでから直す。結果は `file:line - 指摘` の短い形式で、問題が無ければ「✓ pass」。
- **アクセシビリティ**: 操作は `<button>`、移動は `<a>`（`div` に click を付けない）。アイコンだけのボタンに `aria-label`。フォーム部品に `<label>`。画像に `alt`（飾りは空）、飾りのアイコンは `aria-hidden`。見出しは階層どおり。意味のある HTML を先に使い、ARIA はその後。
- **フォーカス**: 操作できるものに見えるフォーカス。`outline: none` は代わりを付けるときだけ。`:focus` より `:focus-visible`。固定ヘッダーが、フォーカス中の要素を隠さない。
- **フォーム**: 型（`type`、`inputmode`、`autocomplete`）を正しく。貼り付けを禁止しない。エラーは欄の近くに、直し方つき。送信中は表示し、二重送信を防ぐ。保存前の離脱は確認する。
- **動き**: `prefers-reduced-motion` を守る。`transition: all` は使わず、対象を列挙する。動かすのは `transform` と `opacity` が基本。操作の途中でも止められる。
- **文字と内容**: 数字の列は `font-variant-numeric: tabular-nums`。見出しは `text-wrap: balance`。長い文字は省略か折り返し（flex の子に `min-width: 0`）。空・短い・非常に長い入力の3通りで崩れない。空の状態を用意する。
- **ナビゲーションと状態**: URL に状態（絞り込み・タブ・開いた区画）を反映し、直接開ける。壊す操作は確認か元に戻す手段を付ける。
- **タッチ・レイアウト・テーマ**: `touch-action: manipulation`。ノッチは `env(safe-area-inset-*)`。レイアウトは JS の計測でなく flex／grid。ダークは `color-scheme: dark`、標準の選択欄に背景色と文字色。
- **日時・数値**: 書式を直書きせず `Intl` を使う。ID・コードなど翻訳されたくないものに `translate="no"`。
- **適用しない**: 英語前提（Title Case、第二人称、`&` の優先、曲がった引用符）、Next.js／SSR 前提（Hydration）、Tailwind や特定ライブラリ前提（`focus-visible:ring-*`、`virtua`、`nuqs`）。Projectの技術構成に合わせて読み替える。
- **必ず指摘するもの**: ズーム禁止（`user-scalable=no`）、貼り付け禁止、`div`／`span` のクリック処理、ラベルの無い入力、寸法の無い画像。
