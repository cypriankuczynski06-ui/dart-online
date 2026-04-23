import type { PlayerState } from "../lib/darts";

type PlayerCardProps = {
  player: PlayerState;
  isCurrent: boolean;
  isMe: boolean;
  isMatchWinner: boolean;
};

function renderLastTurn(player: PlayerState) {
  const turn = player.turns[player.turns.length - 1];
  if (!turn) return "Brak kolejek";

  const darts = turn.darts.map((dart) => dart.raw).join(", ");
  if (turn.bust) {
    return `${darts} → BUST`;
  }

  return `${darts} → ${turn.scored}`;
}

export default function PlayerCard({
  player,
  isCurrent,
  isMe,
  isMatchWinner,
}: PlayerCardProps) {
  return (
    <div
      className={[
        "player-card",
        isCurrent ? "player-card--current" : "",
        isMatchWinner ? "player-card--winner" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="player-card-top">
        <div>
          <h3>{player.name}</h3>
          <div className="player-badges">
            {isMe && <span className="badge">Ty</span>}
            {isCurrent && <span className="badge active">Teraz rzuca</span>}
            {isMatchWinner && <span className="badge success">Wygrał mecz</span>}
          </div>
        </div>

        <div className="score-pill">{player.scoreLeft}</div>
      </div>

      <div className="stats-grid">
        <div className="stat-box">
          <span>Left</span>
          <strong>{player.scoreLeft}</strong>
        </div>
        <div className="stat-box">
          <span>Avg</span>
          <strong>{player.average.toFixed(2)}</strong>
        </div>
        <div className="stat-box">
          <span>Legs</span>
          <strong>{player.legsWon}</strong>
        </div>
        <div className="stat-box">
          <span>Max</span>
          <strong>{player.highestVisit}</strong>
        </div>
      </div>

      <div className="mini-stats">
        <span>180s: {player.hits180}</span>
        <span>140+: {player.hits140Plus}</span>
        <span>100+: {player.hits100Plus}</span>
      </div>

      <div className="last-turn">
        <span className="muted">Ostatnia kolejka:</span>
        <strong>{renderLastTurn(player)}</strong>
      </div>
    </div>
  );
}