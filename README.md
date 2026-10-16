# 賽博小遊戲 CYBER MINI PACK

> 一個 App，三款街頭經典小遊戲 · v1.2 polish twists · three classic mini games in one app · 包剪揼 + 過三關 + 神經反射 · Three.js · 手機優先

**試玩 Play:** https://fung2222.github.io/cyber-mini-pack/ · **自動示範 Demo:** https://fung2222.github.io/cyber-mini-pack/?demo=1

![CYBER MINI PACK](docs/shots/desktop-rps.png)

## 三個模式 Modes
| 模式 | 玩法 |
|---|---|
| **包剪揼** ROCK · PAPER · SCISSORS（又寫「包剪揞」） | 三局兩勝，挑戰 AI 性格：亂嚟仔 → 模式獵人 → 讀心神算 → 無盡。**假訊號 Fake Tell**（頭上閃招）、**長按出招下賭注**、無盡局有機會 **故障手 Glitch Hand**。連勝可睇廣告保住（網頁版免費）。 |
| **過三關** TIC-TAC-TOE LADDER | 你係 ✕。三關 AI 後無盡超頻核心（打和過關）。第 4 關起循環修飾：**迷霧 / 扭曲 / 危格 / 殘影**；無盡有 **病毒 O**；**長按悔棋 = 超頻悔棋**（悔兩手，下一手 AI 完美）。 |
| **神經反射** REACTION TEST | 5 次計平均，目標逐輪收緊。**假訊號 Go/No-Go**（洋紅唔好撳）、第 3 輪起 **三跑道**、單數輪 **按住綠燈鬆手**。 |

## 無盡模式 Endless
- **包剪揼**：頭 3 個對手之後，係程式生成嘅無盡對手（模式獵人／讀心神算輪流，霓虹／量子／鉻鋼… 變種），越後越要贏多局（最多七局四勝）。每闖 5 位對手係一個里程碑（換主題）。記錄最佳連勝。
- **過三關**：第 4 關起係「超頻核心 Lv.N」—— 近乎完美嘅 AI，失誤率越嚟越低（最低 4%）；打和即過關，贏咗有額外紀錄。記錄最遠關卡。
- **神經反射**：一輪 5 次，平均要快過目標（由 450 ms 收緊到 300 ms 封頂）先可以入下一輪；失敗就由第 1 輪再嚟。記錄最佳平均同最高輪數。

## 語言 Language
繁體中文（香港）／English，喺選單或暫停畫面撳「EN／中」切換，記低喺 `localStorage cyber.lang`（所有 CYBER 遊戲共用）；亦可用 `?lang=en` / `?lang=zh`。

## English
**CYBER MINI PACK** puts three street classics in one cyberpunk 3D app, each an endless challenge with signature twists: **Rock Paper Scissors** with Fake Tell, hold-to-wager and Glitch Hand; **Tic-Tac-Toe** with rotating stage mods (Fog / Warp / Hazard / Echo), Virus O on endless cores and Overclock Undo; **Reaction** with Go/No-Go decoys, tri-lane from round 3 and charge-release on odd rounds. Tap/keyboard, bilingual zh-HK / English.

## 操作 Controls
| 動作 | 手機 | 鍵盤 |
|---|---|---|
| 揀模式 Select mode | 撳卡片 | 1 / 2 / 3 |
| 包剪揼出招 | 撳掣（長按＝賭注） | 1 揼 · 2 包 · 3 剪 |
| 過三關落子 | 撳格仔 | 方向鍵移動 + Enter；滑鼠 hover |
| 悔棋 Undo | 撳＝悔一手；長按＝超頻悔兩手 | Z / U / Backspace（長按超頻） |
| 神經反射 | 撳畫面（單數輪按住再鬆） | Space / Enter |
| 返回選單 / 暫停 / 靜音 | ‹ / — / 🔊 | Esc（結果頁）· P · M |

## 網址參數 URL flags
`?demo=1` 自動輪流示範三個模式 · `?fps=1` · `?quality=low` · `?adsim=1` · `?reset=1` · `?mute=1`

## 技術 Tech
Three.js r169 + [cyber-kit](https://github.com/fung2222/cyber-kit) v0.1.0（`vendor/cyber-kit/`），冇 build step，可離線運行。符號、棋盤、光球全部程式生成嘅原創設計；音效同音樂全部合成。

## 開發 Development
```bash
cd .. && python3 -m http.server 18940     # http://127.0.0.1:18940/cyber-mini-pack/
node cyber-mini-pack/tests/rules.test.mjs
python cyber-mini-pack/tests/smoke.py
```
文件：[docs/HANDOFF.md](docs/HANDOFF.md) · [privacy.html](privacy.html) · 屬於 [CYBER ARCADE](https://github.com/fung2222/cyber-arcade) 系列。
