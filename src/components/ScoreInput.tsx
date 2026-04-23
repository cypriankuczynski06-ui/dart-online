import { useEffect, useState } from "react";
import type { FormEvent } from "react";

type ScoreInputProps = {
  disabled: boolean;
  playerName?: string;
  remaining?: number;
  onSubmit: (darts: string[]) => Promise<void> | void;
};

export default function ScoreInput({
  disabled,
  playerName,
  remaining,
  onSubmit,
}: ScoreInputProps) {
  const [darts, setDarts] = useState(["", "", ""]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setDarts(["", "", ""]);
    setError("");
  }, [playerName, remaining]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const cleaned = darts.map((item) => item.trim()).filter(Boolean);

    if (cleaned.length === 0) {
      setError("Wpisz co najmniej jeden rzut.");
      return;
    }

    try {
      setBusy(true);
      setError("");
      await onSubmit(darts);
      setDarts(["", "", ""]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się zapisać tury.");
    } finally {
      setBusy(false);
    }
  }

  function updateValue(index: number, value: string) {
    const next = [...darts];
    next[index] = value.toUpperCase();
    setDarts(next);
  }

  return (
    <form className="panel score-form" onSubmit={handleSubmit}>
      <div className="panel-header">
        <h3>Wpisz rzuty</h3>
        <span className="badge subtle">{playerName ?? "Brak gracza"}</span>
      </div>

      <div className="score-form-grid">
        {darts.map((value, index) => (
          <input
            key={index}
            value={value}
            disabled={disabled || busy}
            onChange={(event) => updateValue(index, event.target.value)}
            className="dart-input"
            placeholder={`Rzut ${index + 1} (np. T20)`}
            maxLength={5}
          />
        ))}
      </div>

      <div className="input-help">
        Akceptowane: <code>T20</code>, <code>D16</code>, <code>S5</code>,{" "}
        <code>25</code>, <code>50</code>, <code>MISS</code>
      </div>

      {typeof remaining === "number" && (
        <div className="remaining-box">
          Pozostało do zejścia: <strong>{remaining}</strong>
        </div>
      )}

      {error && <div className="error-box">{error}</div>}

      <div className="button-row">
        <button
          type="button"
          className="btn ghost"
          disabled={disabled || busy}
          onClick={() => {
            setDarts(["", "", ""]);
            setError("");
          }}
        >
          Wyczyść
        </button>

        <button type="submit" className="btn primary" disabled={disabled || busy}>
          {busy ? "Zapisywanie..." : "Zatwierdź turę"}
        </button>
      </div>
    </form>
  );
}