# 2026-06-14 Matchday Trade Log

Execution time: 2026-06-14 21:31 Asia/Shanghai  
Strategy: world-cup-2026-matchday-moneyline  
Starting collateral: 69.930965 USDC  
Post-trade collateral after tranche 1: 50.956905 USDC  
Post-trade collateral after tranche 2: 31.982845 USDC  
Planned trade notional: 37.26 USDC  
Open orders after execution: 0

## Trades

| Tranche | Match | Market | Side | Price | Shares | Notional | Order ID | Status | Buy thesis | Final result | Realized P/L | Review notes |
| --- | --- | --- | --- | ---: | ---: | ---: | --- | --- | --- | --- | ---: | --- |
| 1 | 🇳🇱 Netherlands vs 🇯🇵 Japan | 🇯🇵 Japan win | BUY YES | 0.27 | 15 | 4.05 | 0x48fc2894540dfe80878b0b9c7386b5e9903930bab91f94a6511c2518cd7cf1d4 | matched | Japan at 26-27% offered upset value in a close tactical matchup. Stake kept small because Netherlands remain the stronger side and Japan has injury risk. | Netherlands 2-2 Japan | -4.05 | Directionally right on Japan being live, but wrong market selection. Error category: market selection; draw risk was undercovered. |
| 1 | 🇨🇮 Cote d'Ivoire vs 🇪🇨 Ecuador | 🇪🇨 Ecuador win | BUY YES | 0.38 | 16 | 6.08 | 0x40fcfe8794277b9f7c68cc00914064e6e558061edbb784eac91b226db5d7d943 | matched | Ecuador's defensive profile and CONMEBOL qualifying strength supported the favorite/low-variance side of this match. | Cote d'Ivoire 1-0 Ecuador | -6.08 | Low-scoring read was reasonable, but Ecuador finishing/side selection was wrong. Error category: bad team strength estimate plus finishing-risk miss. |
| 1 | 🇨🇮 Cote d'Ivoire vs 🇪🇨 Ecuador | Draw | BUY YES | 0.34 | 10 | 3.40 | 0x973bc71f899705bb88ae7101374acb683b325dfe5fd133f62348d6a55c7469a2 | matched | Paired with Ecuador to create a synthetic Ecuador-or-draw position in a likely low-scoring match. | Cote d'Ivoire 1-0 Ecuador | -3.40 | Hedge failed because the underdog win was the missing branch. Error category: market selection; synthetic position excluded the live underdog outcome. |
| 1 | 🇸🇪 Sweden vs 🇹🇳 Tunisia | 🇸🇪 Sweden win | BUY YES | 0.51 | 10 | 5.10 | 0x5359e7544561b5ddbfa53660063e73a3225c147960966c60ee361c619ae96ed2 | matched | Sweden had the higher attacking ceiling through Isak and Gyokeres. Stake stayed modest because Tunisia can compress the match. | Sweden 5-1 Tunisia | +4.90 | Thesis right and margin stronger than expected. Update: Sweden attacking ceiling should be raised; Tunisia defensive prior should be lowered sharply. |
| 2 | 🇳🇱 Netherlands vs 🇯🇵 Japan | 🇯🇵 Japan win | BUY YES | 0.27 | 15 | 4.05 | 0xbb193a03a0ad08b51315dc07713bfcee8ce7174ad9f2bab8d5204d286ec5bc92 | matched | Same Japan upset-value thesis. Added after user explicitly increased same-day risk and confirmed 500 USDC top-up starts tomorrow. | Netherlands 2-2 Japan | -4.05 | Directionally right on Japan being live, but wrong market selection. Error category: market selection; draw risk was undercovered. |
| 2 | 🇨🇮 Cote d'Ivoire vs 🇪🇨 Ecuador | 🇪🇨 Ecuador win | BUY YES | 0.38 | 16 | 6.08 | 0x8e268eb5b125a0ea223fac13db85016fca28d869f2979526c4a1da51d8e8355f | matched | Same Ecuador defensive/favorite thesis. Added while price remained within the approved cap. | Cote d'Ivoire 1-0 Ecuador | -6.08 | Low-scoring read was reasonable, but Ecuador finishing/side selection was wrong. Error category: bad team strength estimate plus finishing-risk miss. |
| 2 | 🇨🇮 Cote d'Ivoire vs 🇪🇨 Ecuador | Draw | BUY YES | 0.34 | 10 | 3.40 | 0xe86ecb8ee6ca8cea9740a0f321d7a9b9d3f1217c223e001f6f30e672886821eb | matched | Same low-scoring draw hedge paired with Ecuador. Added while price remained within the approved cap. | Cote d'Ivoire 1-0 Ecuador | -3.40 | Hedge failed because the underdog win was the missing branch. Error category: market selection; synthetic position excluded the live underdog outcome. |
| 2 | 🇸🇪 Sweden vs 🇹🇳 Tunisia | 🇸🇪 Sweden win | BUY YES | 0.51 | 10 | 5.10 | 0xf1a078a7bf8d844b818228ab6241d3e018b5f14cb68af5ba45d73b950d208a9f | matched | Same Sweden attacking-ceiling thesis. Added after accepting higher first-day drawdown risk. | Sweden 5-1 Tunisia | +4.90 | Thesis right and margin stronger than expected. Update: Sweden attacking ceiling should be raised; Tunisia defensive prior should be lowered sharply. |

## Settled Summary

Settled at: 2026-06-15 15:01 Asia/Shanghai  
Total cost: 37.26 USDC  
Total payout: 20.00 USDC  
Realized P/L: -17.26 USDC

## Review Checklist

- Record the official 90-minute result plus stoppage time. Ignore extra time and penalties for these markets.
- Compare the pre-match thesis with the actual match pattern.
- Classify any miss: team-strength error, stale news, lineup/injury miss, market already priced the signal, group incentive/tiebreaker miss, or variance.
- Before the next real execution run, decide whether to change price filters, stake size, or market selection.
