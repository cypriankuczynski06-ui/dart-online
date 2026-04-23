import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import CheckoutHints from "../components/CheckoutHints";
import DartboardPanel from "../components/DartboardPanel";
import PlayerCard from "../components/PlayerCard";
import PlayersTable from "../components/PlayersTable";
import ScoreInput from "../components/ScoreInput";
import type { CheckoutMode, GameState, TurnResult, X01Mode } from "../lib/darts";
import { getOrCreateLocalPlayer, saveLocalPlayerName } from "../lib/localPlayer";
import {
  joinRoom,
  normalizeRoomId,
  restartMatch,
  startMatch,
  subscribeToRoom,
  submitTurn,
  undoLastAction,
  updateRoomSettings,
} from "../lib/rooms";

type RecentTurn = TurnResult & {
  playerId: string;
  playerName: string;
};

export default function RoomPage() {
  const { roomId: roomIdParam = "" } = useParams();
  const navigate = useNavigate();
  const roomId = normalizeRoomId(roomIdParam);

  const localPlayer = useMemo(() => getOrCreateLocalPlayer(), []);
  const [displayName, setDisplayName] = useState(localPlayer.name);
  const [game, setGame] = useState<GameState | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const [modeDraft, setModeDraft] = useState<X01Mode>(501);
  const [checkoutDraft, setCheckoutDraft] =
    useState<CheckoutMode>("double-out");
  const [legsToWinDraft, setLegsToWinDraft] = useState(3);
  const [selectedStarterIdDraft, setSelectedStarterIdDraft] = useState<string>(
  localPlayer.id
);

  useEffect(() => {
    if (!roomId) {
      navigate("/");
      return;
    }

    const unsubscribe = subscribeToRoom(roomId, (nextGame) => {
      setGame(nextGame);
      setLoading(false);
    });

    return unsubscribe;
  }, [roomId, navigate]);

useEffect(() => {
  if (!game) return;
  setModeDraft(game.mode);
  setCheckoutDraft(game.checkout);
  setLegsToWinDraft(game.legsToWin);
  setSelectedStarterIdDraft(
    game.selectedStarterId ??
      game.players[game.startingPlayerIndex]?.id ??
      game.players[0]?.id ??
      ""
  );
}, [game]);

  const me = game?.players.find((player) => player.id === localPlayer.id);
  const isJoined = Boolean(me);
  const isHost = game?.createdBy === localPlayer.id;
  const currentPlayer = game?.players[game.currentPlayerIndex];
  const isMyTurn =
    game?.status === "playing" && currentPlayer?.id === localPlayer.id;

  const winner = game?.players.find((player) => player.id === game?.winnerId);
  const lastLegWinner = game?.players.find(
    (player) => player.id === game?.lastLegWinnerId
  );

  const recentTurns: RecentTurn[] = useMemo(() => {
    if (!game) return [];

    return game.players
      .flatMap((player) =>
        player.turns.map((turn) => ({
          ...turn,
          playerId: player.id,
          playerName: player.name,
        }))
      )
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 10);
  }, [game]);

  async function handleJoinRoom() {
    try {
      const trimmedName = displayName.trim();

      if (!trimmedName) {
        setError("Podaj nick przed dołączeniem.");
        return;
      }

      setBusy(true);
      setError("");

      saveLocalPlayerName(trimmedName);
      await joinRoom(roomId, localPlayer.id, trimmedName);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się dołączyć.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveSettings() {
    if (!game) return;

    try {
      setBusy(true);
      setError("");

await updateRoomSettings(roomId, localPlayer.id, {
  mode: modeDraft,
  checkout: checkoutDraft,
  legsToWin: legsToWinDraft,
  selectedStarterId: selectedStarterIdDraft,
});

    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Nie udało się zapisać ustawień pokoju."
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleStartMatch() {
    try {
      setBusy(true);
      setError("");
      await startMatch(roomId, localPlayer.id);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Nie udało się rozpocząć meczu."
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleRestartMatch() {
    try {
      setBusy(true);
      setError("");
      await restartMatch(roomId, localPlayer.id);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Nie udało się zrestartować meczu."
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleUndo() {
    try {
      setBusy(true);
      setError("");
      await undoLastAction(roomId, localPlayer.id);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Nie udało się cofnąć ruchu."
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleSubmitTurn(darts: string[]) {
    await submitTurn(roomId, localPlayer.id, darts);
  }

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setError("Nie udało się skopiować linku.");
    }
  }

  if (loading) {
    return (
      <div className="page centered">
        <div className="panel narrow-panel">
          <h2>Ładowanie pokoju...</h2>
        </div>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="page centered">
        <div className="panel narrow-panel">
          <h2>Pokój nie istnieje</h2>
          <p className="muted">Sprawdź kod pokoju albo utwórz nowy pokój.</p>
          <Link to="/" className="btn primary inline-btn">
            Wróć na start
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page room-page">
      <div className="room-header panel">
        <div>
          <span className="eyebrow">Pokój online</span>
          <h1>Kod pokoju: {game.roomId}</h1>
          <div className="header-meta">
            <span className="badge">{game.mode}</span>
            <span className="badge subtle">
              {game.checkout === "double-out" ? "Double out" : "Straight out"}
            </span>
            <span className="badge subtle">Do {game.legsToWin} wygranych</span>
            <span className="badge active">
              {game.status === "lobby"
                ? "Lobby"
                : game.status === "playing"
                ? "Mecz trwa"
                : "Mecz zakończony"}
            </span>
          </div>
        </div>

        <div className="header-actions">
          <button className="btn secondary" onClick={handleCopyLink}>
            {copied ? "Link skopiowany" : "Skopiuj link"}
          </button>
          <Link to="/" className="btn ghost inline-btn">
            Wyjdź
          </Link>
        </div>
      </div>

      {error && <div className="error-box global-error">{error}</div>}

      {game.status === "lobby" ? (
        <div className="room-grid room-grid-lobby">
          <div className="panel">
            <div className="panel-header">
              <h2>Lobby</h2>
              <span className="badge">{game.players.length} graczy</span>
            </div>

            <div className="players-list">
              {game.players.map((player) => (
                <div className="player-list-item" key={player.id}>
                  <strong>{player.name}</strong>
                  <div className="button-row">
                    {player.id === game.createdBy && (
                      <span className="badge subtle">Host</span>
                    )}
                    {player.id === localPlayer.id && (
                      <span className="badge">Ty</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {!isJoined && (
              <div className="join-box">
                <h3>Dołącz do pokoju</h3>

                <label className="field">
                  <span>Nick</span>
                  <input
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    placeholder="Twój nick"
                  />
                </label>

                <button
                  className="btn primary"
                  onClick={handleJoinRoom}
                  disabled={busy}
                >
                  {busy ? "Dołączanie..." : "Dołącz"}
                </button>
              </div>
            )}

            {isHost && (
              <div className="settings-box">
                <h3>Ustawienia meczu</h3>

                <div className="field-grid">
                  <label className="field">
                    <span>Tryb</span>
                    <select
                      value={modeDraft}
                      onChange={(event) =>
                        setModeDraft(Number(event.target.value) as X01Mode)
                      }
                    >
                      <option value={501}>501</option>
                      <option value={301}>301</option>
                      <option value={101}>101</option>
                    </select>
                  </label>

                  <label className="field">
                    <span>Checkout</span>
                    <select
                      value={checkoutDraft}
                      onChange={(event) =>
                        setCheckoutDraft(event.target.value as CheckoutMode)
                      }
                    >
                      <option value="double-out">Double out</option>
                      <option value="straight-out">Straight out</option>
                    </select>
                  </label>
                </div>

                <label className="field">
                  <span>Legi do wygrania</span>
                  <select
                    value={legsToWinDraft}
                    
                    onChange={(event) => setLegsToWinDraft(Number(event.target.value))} 
                  >
                    <option value={1}>1</option>
                    <option value={2}>2</option>
                    <option value={3}>3</option>
                    <option value={4}>4</option>
                    <option value={5}>5</option>
                  </select>
                </label>
                <label className="field">
                  <span>Gracz rozpoczynający</span>
                  <select
                    value={selectedStarterIdDraft}
                    onChange={(event) => setSelectedStarterIdDraft(event.target.value)}
                  >
                    {game.players.map((player) => (
                      <option key={player.id} value={player.id}>
                        {player.name}
                      </option>
                    ))}
                  </select>
                </label>                     

                <div className="button-row">
                  <button className="btn secondary" onClick={handleSaveSettings}>
                    Zapisz ustawienia
                  </button>
                  <button
                    className="btn primary"
                    onClick={handleStartMatch}
                    disabled={busy || game.players.length < 2}
                  >
                    {busy ? "Start..." : "Rozpocznij mecz"}
                  </button>
                </div>

                {game.players.length < 2 && (
                  <p className="muted">
                    Do startu potrzebujesz minimum 2 graczy.
                  </p>
                )}
              </div>
            )}

            {!isHost && isJoined && (
              <div className="info-strip">
                Czekaj na hosta — host uruchomi mecz, gdy wszyscy będą gotowi.
              </div>
            )}
          </div>

          <DartboardPanel
            currentPlayerName={undefined}
            mode={game.mode}
            legNumber={game.legNumber}
            legsToWin={game.legsToWin}
            lastLegWinnerName={lastLegWinner?.name ?? null}
          />
        </div>
      ) : (
        <div className="room-grid">
          <div className="left-column">
            <DartboardPanel
              currentPlayerName={currentPlayer?.name}
              mode={game.mode}
              legNumber={game.legNumber}
              legsToWin={game.legsToWin}
              lastLegWinnerName={lastLegWinner?.name ?? null}
            />

            <PlayersTable
              players={game.players}
              currentPlayerId={currentPlayer?.id}
            />

            <div className="panel">
              <div className="panel-header">
                <h3>Ostatnie kolejki</h3>
              </div>

              {recentTurns.length === 0 ? (
                <p className="muted">Brak zarejestrowanych kolejek.</p>
              ) : (
                <ul className="turns-list">
                  {recentTurns.map((turn, index) => (
                    <li key={`${turn.timestamp}-${turn.playerId}-${index}`}>
                      <strong>{turn.playerName}</strong>
                      <span>
                        {turn.darts.map((dart) => dart.raw).join(", ")}
                        {turn.bust ? " → BUST" : ` → ${turn.scored}`}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="right-column">
            {winner && (
              <div className="panel winner-banner">
                <h2>Wygrywa: {winner.name}</h2>
                <p className="muted">
                  Mecz zakończony. Host może teraz zrestartować mecz i wrócić do
                  lobby.
                </p>
              </div>
            )}

            <div className="players-grid">
              {game.players.map((player) => (
                <PlayerCard
                  key={player.id}
                  player={player}
                  isCurrent={player.id === currentPlayer?.id}
                  isMe={player.id === localPlayer.id}
                  isMatchWinner={player.id === game.winnerId}
                />
              ))}
            </div>

            {isJoined && me ? (
              <div className="action-grid">
                <CheckoutHints
                  remaining={currentPlayer?.scoreLeft ?? me.scoreLeft}
                  checkout={game.checkout}
                />

                <ScoreInput
                  disabled={!isMyTurn || game.status !== "playing"}
                  playerName={currentPlayer?.name}
                  remaining={currentPlayer?.scoreLeft}
                  onSubmit={handleSubmitTurn}
                />
              </div>
            ) : (
              <div className="panel">
                <h3>Tryb widza</h3>
                <p className="muted">
                  Mecz już się rozpoczął, więc nowy gracz nie może dołączyć w
                  trakcie. Możesz obserwować wynik na żywo.
                </p>
              </div>
            )}

            <div className="panel">
              <div className="panel-header">
                <h3>Kontrola meczu</h3>
                <span className="badge subtle">
                  {isHost ? "Host" : "Tylko host"}
                </span>
              </div>

              <div className="button-row">
                <button
                  className="btn secondary"
                  onClick={handleUndo}
                  disabled={!isHost || busy || game.history.length === 0}
                >
                  Cofnij ostatni ruch
                </button>
                <button
                  className="btn ghost"
                  onClick={handleRestartMatch}
                  disabled={!isHost || busy}
                >
                  Restart do lobby
                </button>
              </div>

              {game.status === "playing" && !isMyTurn && isJoined && (
                <p className="muted">
                  Czekasz na ruch gracza: <strong>{currentPlayer?.name}</strong>
                </p>
              )}

              {!isJoined && (
                <p className="muted">
                  Jesteś widzem — dołączenie jest możliwe tylko w lobby.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}