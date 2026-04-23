import type { PlayerState } from "../lib/darts";
``

type PlayersTableProps = {
  players: PlayerState[];
  currentPlayerId?: string;
};

export default function PlayersTable({
  players,
  currentPlayerId,
}: PlayersTableProps) {
  return (
    <div className="panel">
      <div className="panel-header">
        <h3>Statystyki graczy</h3>
      </div>

      <div className="table-wrap">
        <table className="score-table">
          <thead>
            <tr>
              <th>Gracz</th>
              <th>Left</th>
              <th>Avg</th>
              <th>Legs</th>
              <th>Max</th>
              <th>180s</th>
              <th>140+</th>
            </tr>
          </thead>
          <tbody>
            {players.map((player) => (
              <tr
                key={player.id}
                className={player.id === currentPlayerId ? "table-row-active" : ""}
              >
                <td>{player.name}</td>
                <td>{player.scoreLeft}</td>
                <td>{player.average.toFixed(2)}</td>
                <td>{player.legsWon}</td>
                <td>{player.highestVisit}</td>
                <td>{player.hits180}</td>
                <td>{player.hits140Plus}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}