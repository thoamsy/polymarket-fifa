# World Cup 2026 Group-Stage Strategy

This file is the strategy source of truth for group-stage trading. Automation should read this file at the start of each run. Keep scheduling details out of this file.

## Objective

Maximize expected return without creating a realistic path to ruin. Do not size positions as if every bet is independent, and do not size them only for the extreme case that every pick loses. Use portfolio-level risk: probability of loss, correlation between bets, remaining group-stage opportunities, and current bankroll all matter.

## Bankroll State

Use realized collateral as bankroll. Do not count unresolved positions as profit. Track:

- Current collateral.
- Open exposure.
- High-water mark.
- Drawdown from high-water mark.
- Remaining group-stage matchdays.
- Settled P/L by day and by market type.

When the account is topped up to 500 USDC, switch the working profile to `production_500` unless the user says otherwise.

## Bayesian Risk Model

Treat each run as a slate, not a list of isolated bets. Before sizing, assign each candidate:

- Market price `p_market`.
- Estimated true probability `p_model`.
- Edge `p_model - p_market`.
- Confidence level: low, medium, high.
- Correlation group: same match, same group, same tactical thesis, same tournament regime.

Update confidence after results. Do not overreact to one result. Use this rule:

- One miss: reduce confidence in the exact signal, not the whole strategy.
- Two similar misses: reduce that signal family's stake by 25-50%.
- Three similar misses: suspend that signal family until reviewed.
- Repeated wins with the same reasoning: increase stake gradually, not all at once.

Track tournament regimes explicitly. Useful regimes include favorites dominating, underdogs overperforming, low-scoring defensive games, host-region advantage, CONMEBOL strength, AFC strength, and draw-heavy groups. A regime only matters after several matches support it.

## Sizing

Use fractional Kelly thinking, but cap it hard. Estimate edge qualitatively if exact probabilities are unavailable. Never use full Kelly.

Default production sizing at 500 USDC:

- Normal slate risk: 8-12% of bankroll.
- High-conviction slate risk: up to 15% of bankroll.
- Low-conviction or late-stage slate risk: 3-6% of bankroll.
- Single position: usually 2-5% of bankroll.
- Same-match combined exposure: usually 6-8% of bankroll, up to 10% only for high conviction.
- Total open exposure: usually no more than 25-30% of bankroll.

These caps scale with realized bankroll. If bankroll grows to 700 or 800 USDC, increase dollar sizing proportionally, but keep percentage caps. If bankroll falls, reduce dollar sizing immediately.

Do not use a rigid "all bets lose" assumption as the only sizing rule. A day with four partly independent positions can risk more than one single binary thesis. Still assume that correlated positions can fail together. For example, Ecuador win plus draw is one match thesis, not two independent bets.

## Drawdown Control

Protect the bankroll with state-dependent throttles:

- Drawdown below 10% from high-water mark: normal sizing allowed.
- Drawdown 10-20%: cut slate risk by about 25%.
- Drawdown 20-30%: cut slate risk by about 50% and require stronger edge.
- Drawdown above 30%: stop real execution until the user reviews the strategy.

After a large win, do not immediately spend all new profit. Increase the next slate's risk by at most 25% unless the edge and market liquidity are clearly better than usual.

## Market Selection

Prefer markets where the price is tradable and the thesis is clear:

- Moneyline and draw markets for same-day group matches.
- Group winner or advance markets only when the remaining schedule leaves enough room for thesis correction.
- Synthetic double-chance positions when they express one clear view, such as favorite-or-draw in a low-scoring match.

Avoid:

- Extreme favorites unless there is a spread, total, or derivative market with better value.
- Long-shot picks bought only because payout looks large.
- Late price chasing after lineup/news has already moved the market.
- Multiple positions that secretly express the same fragile thesis.

## Timing

Earlier buying can help when the analysis finds stale prices before the market incorporates news. Earlier buying hurts when lineups, injuries, weather, or motivation are still uncertain. For same-day group matches:

- Build the candidate list early.
- Recheck prices and news near execution.
- Use maker orders when there is time.
- Use taker-style capped limit orders only when the order must fill before kickoff.

## Records And Review

Every trade record must preserve the reason available at the time of purchase. Use country names plus emoji flags in match labels. After settlement, update:

- Official 90-minute result plus stoppage time.
- Realized P/L.
- Whether the thesis was right, wrong, or directionally right but not paid.
- Error category.
- Whether the result should update a signal, a team prior, or a tournament regime.

Do not increase risk after a win or loss until the records are current.
