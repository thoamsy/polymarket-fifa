# 2026-06-16 Matchday Trades

Run time: 2026-06-16 ~00:12 UTC (08:12 Asia/Shanghai)
Profile/config: hard caps — maxBet 10, maxRunNotional 30, price band [0.1, 0.82]
Flow: `poly:snapshot` → LLM-authored `runs/latest-plan.json` → `poly:execute-plan` (two-key live gate) → `poly:watch-fills`
Account before run: collateral ~391.91 USDC, open orders 0
Account after run: collateral 366.52 USDC, open orders 0

## Positions opened (all CONFIRMED / filled)

| Match | Side | Limit | Shares | Cost | Order ID | Thesis |
| --- | --- | ---: | ---: | ---: | --- | --- |
| 🇦🇷 Argentina vs 🇩🇿 Algeria | BUY Argentina win | 0.71 | 14 | 9.94 | 0xc6b1835f… | Argentina markedly stronger; 0.705 looks slightly low for the quality gap. Team-strength value, not strong-edge. |
| 🇮🇶 Iraq vs 🇳🇴 Norway | BUY Norway win | 0.82 | 12 | 9.84 | 0x226754ca… | Norway clearly stronger than Iraq; priced rich at 0.82 (thin edge), capped at price-band top. |
| 🇮🇷 IR Iran vs 🇳🇿 New Zealand | BUY Iran win | 0.54 | 10 | 5.40 | 0x2b89df79… | Small punt. Iran won AFC group (one loss), Taremi attack; NZ goals inflated vs Oceania minnows. Consensus favours Iran; 0.535 ~ slightly low (est 58-62%). |

## Test / incidental fills this session

| Match | Side | Limit | Shares | Cost | Note |
| --- | --- | ---: | ---: | ---: | --- |
| 🇫🇷 France vs 🇸🇳 Senegal | BUY draw | 0.22 | 9 | 1.98 | Pipeline test order (verify live snapshot→plan→execute→fill). Real position. |
| 🇸🇦 Saudi Arabia vs 🇺🇾 Uruguay | BUY draw | ~0.32 | 5 | ~1.60 | Accidental fill from leftover POLY_EXECUTE=1 during a "dry-run" test. Game in-play/settled; fixed with two-key gate. |

Total real cost this session ≈ 28.8 USDC (within the 30 USDC budget).

## Pending settlement — fill in after results

- Argentina vs Algeria — 90' result: __ ; P/L: __ ; thesis right/wrong: __ ; error category: __
- Iraq vs Norway — 90' result: __ ; P/L: __ ; thesis right/wrong: __ ; error category: __
- IR Iran vs New Zealand — 90' result: __ ; P/L: __ ; thesis right/wrong: __ ; error category: __
- France vs Senegal (draw) — 90' result: __ ; P/L: __ ; note: test order
- Saudi Arabia vs Uruguay (draw) — 90' result: __ ; P/L: __ ; note: incidental
