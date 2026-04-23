import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { CheckoutMode, X01Mode } from "../lib/darts";
import { getOrCreateLocalPlayer, saveLocalPlayerName } from "../lib/localPlayer";
import { createRoom, makeRoomId, normalizeRoomId } from "../lib/rooms";

export default function HomePage() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [joinId, setJoinId] = useState("");
  const [mode, setMode] = useState<X01Mode>(501);
  const [checkout, setCheckout] = useState<CheckoutMode>("double-out");
  const [legsToWin, setLegsToWin] = useState(3);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const localPlayer = getOrCreateLocalPlayer();
    setName(localPlayer.name);
  }, []);

  async function handleCreateRoom() {
    try {
      const trimmedName = name.trim();

      if (!trimmedName) {
        setError("Podaj swój nick.");
        return;
      }

      setBusy(true);
      setError("");

      saveLocalPlayerName(trimmedName);
      const localPlayer = getOrCreateLocalPlayer();
      const roomId = makeRoomId();

      await createRoom({
        roomId,
        hostId: localPlayer.id,
        hostName: trimmedName,
        mode,
        checkout,
        legsToWin,
      });

      navigate(`/room/${roomId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się utworzyć pokoju.");
    } finally {
      setBusy(false);
    }
  }

  function handleJoinRoom() {
    const trimmedName = name.trim();
    const normalized = normalizeRoomId(joinId);

    if (!trimmedName) {
      setError("Podaj swój nick.");
      return;
    }

    if (!normalized) {
      setError("Podaj kod pokoju.");
      return;
    }

    saveLocalPlayerName(trimmedName);
    navigate(`/room/${normalized}`);
  }

  return (
    <div className="page centered">
      <div className="panel narrow-panel">
        <div className="panel-header">
          <h2>Start</h2>
        </div>

        <label className="field">
          <span>Twój nick</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="np. Cyprian"
          />
        </label>

        <label className="field">
          <span>Tryb gry</span>
          <select
            value={mode}
            onChange={(event) => setMode(Number(event.target.value) as X01Mode)}
          >
            <option value={501}>501</option>
            <option value={301}>301</option>
            <option value={101}>101</option>
          </select>
        </label>

        <label className="field">
          <span>Checkout</span>
          <select
            value={checkout}
            onChange={(event) =>
              setCheckout(event.target.value as CheckoutMode)
            }
          >
            <option value="double-out">Double out</option>
            <option value="straight-out">Straight out</option>
          </select>
        </label>

        <label className="field">
          <span>Legi do wygrania</span>
          <select
            value={legsToWin}
            onChange={(event) => setLegsToWin(Number(event.target.value))}
          >
            <option value={1}>1</option>
            <option value={2}>2</option>
            <option value={3}>3</option>
            <option value={4}>4</option>
            <option value={5}>5</option>
          </select>
        </label>

        <div className="button-row">
          <button
            className="btn primary"
            onClick={handleCreateRoom}
            disabled={busy}
          >
            {busy ? "Tworzenie..." : "Utwórz pokój"}
          </button>
        </div>

        <div className="divider" />

        <label className="field">
          <span>Dołącz po kodzie pokoju</span>
          <input
            value={joinId}
            onChange={(event) => setJoinId(event.target.value.toUpperCase())}
            placeholder="np. TEST12"
            maxLength={6}
          />
        </label>

        <button className="btn secondary" onClick={handleJoinRoom}>
          Dołącz do pokoju
        </button>

        {error && <div className="error-box">{error}</div>}
      </div>
    </div>
  );
}