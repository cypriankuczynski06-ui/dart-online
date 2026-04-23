type DartboardPanelProps = {
  currentPlayerName?: string;
  mode: number;
  legNumber: number;
  legsToWin: number;
  lastLegWinnerName?: string | null;
};

export default function DartboardPanel({
  currentPlayerName,
  mode,
  legNumber,
  legsToWin,
  lastLegWinnerName,
}: DartboardPanelProps) {
  return (
    <div className="panel board-panel board-panel--minimal">
      <div className="panel-header">
        <div>
          <p className="eyebrow board-eyebrow">Mecz</p>
          <h3>Darts Score Tracker</h3>
        </div>
        <span className="badge success">{mode}</span>
      </div>

      <div className="board-hero">
        <div className="board-hero-icon" aria-hidden="true">
          🎯
        </div>

        <div className="board-hero-text">
          <span className="board-kicker">Aktualna tura</span>
          <strong>{currentPlayerName ?? "—"}</strong>
          <span className="board-subtle">
            Leg {legNumber} • do {legsToWin}
          </span>
        </div>
      </div>

      <div className="board-meta board-meta--stacked">
        <div className="meta-box">
          <span className="meta-label">Tryb gry</span>
          <strong>{mode}</strong>
        </div>
        <div className="meta-box">
          <span className="meta-label">Stan meczu</span>
          <strong>
            {lastLegWinnerName
              ? `Ostatni leg: ${lastLegWinnerName}`
              : "Brak zakończonego lega"}
          </strong>
        </div>
      </div>
    </div>
  );
}