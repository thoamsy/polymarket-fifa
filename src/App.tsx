import { CalendarDays, RefreshCw, Search, SlidersHorizontal, Trophy } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { fetchWorldCupBoard, staticWorldCupBoardData, WORLD_CUP_QUERY_KEY } from "./api/worldCup";
import { teamMeta, type Match } from "./data/fixtures";
import { useOnlineStatus } from "./hooks/useOnlineStatus";

type SortMode = "schedule" | "volume" | "favorite";

function formatVolume(volume: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(volume);
}

function probabilityLabel(value: number) {
  return `${value < 10 ? value.toFixed(1) : Math.round(value)}%`;
}

function formatFetchedAt(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getTeamChance(match: Match, team: string) {
  if (match.home === team) return match.homeWin;
  if (match.away === team) return match.awayWin;
  return 0;
}

function getFavorite(match: Match) {
  const options = [
    { team: match.home, label: "Home", value: match.homeWin },
    { team: "Draw", label: "Draw", value: match.draw },
    { team: match.away, label: "Away", value: match.awayWin },
  ];

  return options.reduce((best, option) => (option.value > best.value ? option : best));
}

function TeamFlag({ name }: { name: string }) {
  return (
    <span className="team-flag" aria-hidden="true">
      {teamMeta[name]?.emoji ?? "🏳️"}
    </span>
  );
}

function TeamName({ name }: { name: string }) {
  return (
    <span className="team-name">
      <TeamFlag name={name} />
      <span>{name}</span>
    </span>
  );
}

function TeamFocus({ selectedTeam, matches }: { selectedTeam: string; matches: Match[] }) {
  const teamMatches = matches.filter((match) => match.home === selectedTeam || match.away === selectedTeam);

  if (selectedTeam === "All teams" || teamMatches.length === 0) {
    const topVolume = [...matches].sort((a, b) => b.volume - a.volume)[0];
    return (
      <aside className="focus-card">
        <div className="focus-card__icon">
          <Trophy size={18} aria-hidden="true" />
        </div>
        <div>
          <span className="kicker">Board view</span>
          <strong>{matches.length} matches</strong>
          <small>{topVolume ? `Highest volume: ${topVolume.home} vs ${topVolume.away}` : "Waiting for market data"}</small>
        </div>
      </aside>
    );
  }

  const chances = teamMatches.map((match) => getTeamChance(match, selectedTeam));
  const averageChance = chances.reduce((sum, chance) => sum + chance, 0) / chances.length;
  const nextMatch = teamMatches[0];
  const toughest = teamMatches.reduce((hardest, match) =>
    getTeamChance(match, selectedTeam) < getTeamChance(hardest, selectedTeam) ? match : hardest,
  );

  return (
    <aside className="focus-card">
      <div className="focus-card__flag">
        <TeamFlag name={selectedTeam} />
      </div>
      <div>
        <span className="kicker">Team focus</span>
        <strong>{selectedTeam}</strong>
        <small>
          Avg win price {probabilityLabel(averageChance)} · next {nextMatch.date} · hardest {probabilityLabel(getTeamChance(toughest, selectedTeam))}
        </small>
      </div>
    </aside>
  );
}

function PriceChip({ label, value, active = false }: { label: string; value: number; active?: boolean }) {
  return (
    <div className={`price-chip ${active ? "price-chip--active" : ""}`}>
      <span>{label}</span>
      <strong>{probabilityLabel(value)}</strong>
    </div>
  );
}

function MatchCard({ match, selectedTeam }: { match: Match; selectedTeam: string }) {
  const favorite = getFavorite(match);
  const selectedSide =
    selectedTeam === match.home ? "home" : selectedTeam === match.away ? "away" : selectedTeam === "All teams" ? favorite.label.toLowerCase() : "";

  return (
    <article className="match-card">
      <header className="match-card__header">
        <span>{match.time}</span>
        <small>{formatVolume(match.volume)}</small>
      </header>

      <div className="scoreline" aria-label={`${match.home} versus ${match.away}`}>
        <div className={selectedTeam === match.home ? "team-row team-row--selected" : "team-row"}>
          <TeamName name={match.home} />
          <strong>{probabilityLabel(match.homeWin)}</strong>
        </div>
        <div className={selectedTeam === match.away ? "team-row team-row--selected" : "team-row"}>
          <TeamName name={match.away} />
          <strong>{probabilityLabel(match.awayWin)}</strong>
        </div>
      </div>

      <div className="market-line" aria-label="Moneyline probabilities">
        <PriceChip label="Home" value={match.homeWin} active={selectedSide === "home"} />
        <PriceChip label="Draw" value={match.draw} active={selectedSide === "draw"} />
        <PriceChip label="Away" value={match.awayWin} active={selectedSide === "away"} />
      </div>
    </article>
  );
}

function DateGroup({ date, groupMatches, selectedTeam }: { date: string; groupMatches: Match[]; selectedTeam: string }) {
  return (
    <section className="date-group">
      <div className="date-group__header">
        <h2>{date}</h2>
        <span>{groupMatches.length} matches</span>
      </div>
      <div className="match-grid">
        {groupMatches.map((match) => (
          <MatchCard key={match.id} match={match} selectedTeam={selectedTeam} />
        ))}
      </div>
    </section>
  );
}

export function App() {
  const [selectedTeam, setSelectedTeam] = useState("All teams");
  const [selectedDate, setSelectedDate] = useState("All dates");
  const [query, setQuery] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("schedule");
  const isOnline = useOnlineStatus();

  const boardQuery = useQuery({
    queryKey: WORLD_CUP_QUERY_KEY,
    queryFn: fetchWorldCupBoard,
    initialData: staticWorldCupBoardData,
    initialDataUpdatedAt: 0,
    networkMode: "offlineFirst",
    refetchInterval: isOnline ? 60 * 1000 : false,
    refetchIntervalInBackground: false,
    staleTime: 60 * 1000,
  });

  const boardData = boardQuery.data ?? staticWorldCupBoardData;
  const boardMatches = boardData.matches.length > 0 ? boardData.matches : staticWorldCupBoardData.matches;

  const dates = useMemo(() => Array.from(new Set(boardMatches.map((match) => match.date))), [boardMatches]);
  const teams = useMemo(
    () => Array.from(new Set(boardMatches.flatMap((match) => [match.home, match.away]))).sort((a, b) => a.localeCompare(b)),
    [boardMatches],
  );

  const filteredMatches = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return boardMatches
      .filter((match) => selectedTeam === "All teams" || match.home === selectedTeam || match.away === selectedTeam)
      .filter((match) => selectedDate === "All dates" || match.date === selectedDate)
      .filter((match) => {
        if (!normalizedQuery) return true;
        return `${match.home} ${match.away} ${match.date}`.toLowerCase().includes(normalizedQuery);
      })
      .sort((a, b) => {
        if (sortMode === "volume") return b.volume - a.volume;
        if (sortMode === "favorite") return getFavorite(b).value - getFavorite(a).value;
        return boardMatches.indexOf(a) - boardMatches.indexOf(b);
      });
  }, [boardMatches, query, selectedDate, selectedTeam, sortMode]);

  const groupedMatches = useMemo(() => {
    return filteredMatches.reduce<Record<string, Match[]>>((groups, match) => {
      groups[match.date] = groups[match.date] ?? [];
      groups[match.date].push(match);
      return groups;
    }, {});
  }, [filteredMatches]);

  const dataMode = boardData.source === "polymarket-page" ? "Live API" : "Static fallback";
  const refreshLabel = boardQuery.isFetching ? "Refreshing" : "Refresh";

  return (
    <main className="app-shell">
      <header className="top-bar">
        <div>
          <span className="kicker">Polymarket · World Cup 2026</span>
          <h1>Group Stage Board</h1>
        </div>
        <div className="top-stats" aria-label="Dashboard stats">
          <span>{filteredMatches.length} shown</span>
          <span>{teams.length} teams</span>
          <span>{dataMode}</span>
          <button className="refresh-button" disabled={boardQuery.isFetching} onClick={() => void boardQuery.refetch()}>
            <RefreshCw className={boardQuery.isFetching ? "spin" : ""} size={15} aria-hidden="true" />
            {refreshLabel}
          </button>
        </div>
      </header>

      <section className="data-status" aria-label="Data status">
        <span className={isOnline ? "status-pill status-pill--online" : "status-pill status-pill--offline"}>
          {isOnline ? "Online" : "Offline"}
        </span>
        <span>Last updated {formatFetchedAt(boardData.fetchedAt)}</span>
        {boardQuery.isError ? <span className="status-warning">Refresh failed. Showing cached or fallback data.</span> : null}
        {boardQuery.isFetching && !boardQuery.isRefetching ? <span>Loading latest markets...</span> : null}
      </section>

      <section className="board-tools">
        <div className="search-box">
          <Search size={17} aria-hidden="true" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search match or team" />
        </div>

        <label className="select-field">
          <CalendarDays size={17} aria-hidden="true" />
          <select value={selectedTeam} onChange={(event) => setSelectedTeam(event.target.value)}>
            <option>All teams</option>
            {teams.map((team) => (
              <option key={team} value={team}>
                {teamMeta[team]?.emoji ?? "🏳️"} {team}
              </option>
            ))}
          </select>
        </label>

        <label className="select-field">
          <SlidersHorizontal size={17} aria-hidden="true" />
          <select value={sortMode} onChange={(event) => setSortMode(event.target.value as SortMode)}>
            <option value="schedule">Schedule order</option>
            <option value="volume">Volume high to low</option>
            <option value="favorite">Favorite strength</option>
          </select>
        </label>
      </section>

      <nav className="date-rail" aria-label="Date filter">
        <button className={selectedDate === "All dates" ? "active" : ""} onClick={() => setSelectedDate("All dates")}>
          All dates
        </button>
        {dates.map((date) => (
          <button key={date} className={selectedDate === date ? "active" : ""} onClick={() => setSelectedDate(date)}>
            {date}
          </button>
        ))}
      </nav>

      <TeamFocus selectedTeam={selectedTeam} matches={boardMatches} />

      <nav className="flag-rail" aria-label="Quick team filter">
        <button className={selectedTeam === "All teams" ? "active" : ""} onClick={() => setSelectedTeam("All teams")}>
          All
        </button>
        {teams.map((team) => (
          <button key={team} className={selectedTeam === team ? "active" : ""} onClick={() => setSelectedTeam(team)} title={team}>
            {teamMeta[team]?.emoji ?? "🏳️"}
            <span>{team}</span>
          </button>
        ))}
      </nav>

      <section className="board">
        {Object.entries(groupedMatches).map(([date, groupMatches]) => (
          <DateGroup key={date} date={date} groupMatches={groupMatches} selectedTeam={selectedTeam} />
        ))}
      </section>
    </main>
  );
}
