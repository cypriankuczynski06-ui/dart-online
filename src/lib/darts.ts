export type X01Mode = 101 | 301 | 501;
export type CheckoutMode = "double-out" | "straight-out";
export type GameStatus = "lobby" | "playing" | "finished";

export interface DartThrow {
  raw: string;
  score: number;
  isDouble: boolean;
}

export interface TurnResult {
  darts: DartThrow[];
  bust: boolean;
  scored: number;
  before: number;
  after: number;
  timestamp: number;
}

export interface PlayerState {
  id: string;
  name: string;
  scoreLeft: number;
  totalScored: number;
  dartsThrown: number;
  average: number;
  turns: TurnResult[];
  legsWon: number;
  highestVisit: number;
  hits180: number;
  hits140Plus: number;
  hits100Plus: number;
}

export interface HistorySnapshot {
  players: PlayerState[];
  currentPlayerIndex: number;
  status: GameStatus;
  winnerId: string | null;
  lastLegWinnerId: string | null;
  legNumber: number;
  startingPlayerIndex: number;
}

export interface GameState {
  roomId: string;
  createdAt: number;
  createdBy: string;
  mode: X01Mode;
  checkout: CheckoutMode;
  status: GameStatus;
  players: PlayerState[];
  currentPlayerIndex: number;
  winnerId: string | null;
  lastLegWinnerId: string | null;
  legNumber: number;
  legsToWin: number;
  startingPlayerIndex: number;
  selectedStarterId: string | null;
  history: HistorySnapshot[];
}


type Segment = {
  label: string;
  score: number;
  isDouble: boolean;
};

const numbersDescending = Array.from({ length: 20 }, (_, i) => 20 - i);

const singleSegments: Segment[] = numbersDescending.map((n) => ({
  label: `S${n}`,
  score: n,
  isDouble: false,
}));

const doubleSegments: Segment[] = numbersDescending.map((n) => ({
  label: `D${n}`,
  score: n * 2,
  isDouble: true,
}));

const tripleSegments: Segment[] = numbersDescending.map((n) => ({
  label: `T${n}`,
  score: n * 3,
  isDouble: false,
}));

const setupSegments: Segment[] = [
  ...tripleSegments,
  ...doubleSegments,
  ...singleSegments,
  { label: "SB", score: 25, isDouble: false },
  { label: "DB", score: 50, isDouble: true },
];

const doubleOutFinishSegments: Segment[] = [
  ...doubleSegments,
  { label: "DB", score: 50, isDouble: true },
];

function deepCopy<T>(value: T): T {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value)) as T;
}

function calcAverage(totalScored: number, dartsThrown: number): number {
  if (dartsThrown === 0) return 0;
  return Number(((totalScored / dartsThrown) * 3).toFixed(2));
}

function captureSnapshot(game: GameState): HistorySnapshot {
  return {
    players: deepCopy(game.players),
    currentPlayerIndex: game.currentPlayerIndex,
    status: game.status,
    winnerId: game.winnerId,
    lastLegWinnerId: game.lastLegWinnerId,
    legNumber: game.legNumber,
    startingPlayerIndex: game.startingPlayerIndex,
  };
}

function pushHistory(game: GameState): HistorySnapshot[] {
  return [...game.history, captureSnapshot(game)].slice(-30);
}

export function createPlayer(
  id: string,
  name: string,
  startScore: X01Mode
): PlayerState {
  return {
    id,
    name,
    scoreLeft: startScore,
    totalScored: 0,
    dartsThrown: 0,
    average: 0,
    turns: [],
    legsWon: 0,
    highestVisit: 0,
    hits180: 0,
    hits140Plus: 0,
    hits100Plus: 0,
  };
}

export function createLobbyGame(params: {
  roomId: string;
  createdBy: string;
  hostName: string;
  mode: X01Mode;
  checkout: CheckoutMode;
  legsToWin: number;
}): GameState {
  const { roomId, createdBy, hostName, mode, checkout, legsToWin } = params;

  return {
    roomId,
    createdAt: Date.now(),
    createdBy,
    mode,
    checkout,
    status: "lobby",
    players: [createPlayer(createdBy, hostName, mode)],
    currentPlayerIndex: 0,
    winnerId: null,
    lastLegWinnerId: null,
    legNumber: 1,
    legsToWin,
    startingPlayerIndex: 0,
    selectedStarterId: createdBy,
    history: [],
  };
}

export function updateLobbySettings(
  game: GameState,
  patch: Partial<
    Pick<GameState, "mode" | "checkout" | "legsToWin" | "selectedStarterId">
  >
): GameState {
  if (game.status !== "lobby") {
    throw new Error("Ustawienia można zmieniać tylko w lobby.");
  }

  const nextMode = patch.mode ?? game.mode;
  const nextCheckout = patch.checkout ?? game.checkout;
  const nextLegsToWin = patch.legsToWin ?? game.legsToWin;
  const nextSelectedStarterId =
    patch.selectedStarterId ??
    game.selectedStarterId ??
    game.players[0]?.id ??
    null;

  const starterIndex = Math.max(
    0,
    game.players.findIndex((player) => player.id === nextSelectedStarterId)
  );

  return {
    ...game,
    mode: nextMode,
    checkout: nextCheckout,
    legsToWin: nextLegsToWin,
    selectedStarterId: game.players[starterIndex]?.id ?? game.players[0]?.id ?? null,
    startingPlayerIndex: starterIndex,
    players: game.players.map((player) => ({
      ...player,
      scoreLeft: nextMode,
    })),
  };
}

export function startMatchState(game: GameState): GameState {
  if (game.players.length < 2) {
    throw new Error("Do rozpoczęcia meczu potrzebujesz co najmniej 2 graczy.");
  }

  const starterIndex = Math.max(
    0,
    game.players.findIndex(
      (player) => player.id === (game.selectedStarterId ?? game.players[0]?.id)
    )
  );

  return {
    ...game,
    status: "playing",
    players: game.players.map((player) =>
      createPlayer(player.id, player.name, game.mode)
    ),
    currentPlayerIndex: starterIndex,
    winnerId: null,
    lastLegWinnerId: null,
    legNumber: 1,
    startingPlayerIndex: starterIndex,
    history: [],
  };
} 

export function restartMatchState(game: GameState): GameState {
  const starterIndex = Math.max(
    0,
    game.players.findIndex(
      (player) => player.id === (game.selectedStarterId ?? game.players[0]?.id)
    )
  );

  return {
    ...game,
    status: "lobby",
    players: game.players.map((player) =>
      createPlayer(player.id, player.name, game.mode)
    ),
    currentPlayerIndex: starterIndex,
    winnerId: null,
    lastLegWinnerId: null,
    legNumber: 1,
    startingPlayerIndex: starterIndex,
    history: [],
  };
}


export function parseDart(rawInput: string): DartThrow {
  const value = rawInput.trim().toUpperCase();

  if (!value) {
    throw new Error("Puste pole rzutu.");
  }

  if (value === "MISS" || value === "M" || value === "0") {
    return { raw: "MISS", score: 0, isDouble: false };
  }

  if (value === "SB" || value === "25") {
    return { raw: "SB", score: 25, isDouble: false };
  }

  if (value === "DB" || value === "BULL" || value === "50") {
    return { raw: "DB", score: 50, isDouble: true };
  }

  const plainSingle = value.match(/^([1-9]|1[0-9]|20)$/);
  if (plainSingle) {
    const score = Number(plainSingle[1]);
    return { raw: `S${score}`, score, isDouble: false };
  }

  const match = value.match(/^([SDT])([1-9]|1[0-9]|20)$/);
  if (!match) {
    throw new Error(
      `Nieprawidłowy rzut: "${rawInput}". Użyj np. T20, D16, S5, 25, 50, MISS`
    );
  }

  const multiplier = match[1];
  const number = Number(match[2]);

  let score = number;
  let isDouble = false;

  if (multiplier === "D") {
    score = number * 2;
    isDouble = true;
  } else if (multiplier === "T") {
    score = number * 3;
  }

  return {
    raw: `${multiplier}${number}`,
    score,
    isDouble,
  };
}

function uniquePaths(paths: string[][]): string[][] {
  const seen = new Set<string>();
  const result: string[][] = [];

  for (const path of paths) {
    const key = path.join("-");
    if (!seen.has(key)) {
      seen.add(key);
      result.push(path);
    }
  }

  return result;
}

export function getCheckoutSuggestions(
  remaining: number,
  checkout: CheckoutMode,
  limit = 3
): string[][] {
  const finishingSegments =
    checkout === "double-out" ? doubleOutFinishSegments : setupSegments;

  const max = checkout === "double-out" ? 170 : 180;

  if (remaining < 2 || remaining > max) {
    return [];
  }

  const results: string[][] = [];

  for (const last of finishingSegments) {
    if (last.score === remaining) {
      results.push([last.label]);
    }
  }

  for (const first of setupSegments) {
    for (const last of finishingSegments) {
      if (first.score + last.score === remaining) {
        results.push([first.label, last.label]);
      }
    }
  }

  for (const first of setupSegments) {
    for (const second of setupSegments) {
      for (const last of finishingSegments) {
        if (first.score + second.score + last.score === remaining) {
          results.push([first.label, second.label, last.label]);
        }
      }
    }
  }

  return uniquePaths(results)
    .sort((a, b) => a.length - b.length)
    .slice(0, limit);
}

export function applyTurn(
  game: GameState,
  playerId: string,
  rawDarts: string[]
): GameState {
  if (game.status !== "playing") {
    throw new Error("Mecz nie jest aktualnie w trakcie gry.");
  }

  const playerIndex = game.players.findIndex((player) => player.id === playerId);

  if (playerIndex === -1) {
    throw new Error("Nie znaleziono gracza.");
  }

  if (playerIndex !== game.currentPlayerIndex) {
    throw new Error("To nie jest teraz tura tego gracza.");
  }

  const player = game.players[playerIndex];
  const darts = rawDarts
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 3)
    .map(parseDart);

  if (darts.length === 0) {
    throw new Error("Podaj co najmniej jeden rzut.");
  }

  const history = pushHistory(game);

  let tempLeft = player.scoreLeft;
  let thrown = 0;
  let bust = false;

  for (const dart of darts) {
    thrown += 1;
    const nextLeft = tempLeft - dart.score;

    if (nextLeft < 0) {
      bust = true;
      break;
    }

    if (game.checkout === "double-out") {
      if (nextLeft === 1) {
        bust = true;
        break;
      }

      if (nextLeft === 0 && !dart.isDouble) {
        bust = true;
        break;
      }
    }

    tempLeft = nextLeft;

    if (tempLeft === 0) {
      break;
    }
  }

  const scored = bust ? 0 : player.scoreLeft - tempLeft;
  const newDartsThrown = player.dartsThrown + thrown;
  const newTotalScored = player.totalScored + scored;

  const updatedPlayer: PlayerState = {
    ...player,
    scoreLeft: bust ? player.scoreLeft : tempLeft,
    totalScored: newTotalScored,
    dartsThrown: newDartsThrown,
    average: calcAverage(newTotalScored, newDartsThrown),
    highestVisit: Math.max(player.highestVisit, scored),
    hits180: player.hits180 + (scored === 180 ? 1 : 0),
    hits140Plus: player.hits140Plus + (scored >= 140 ? 1 : 0),
    hits100Plus: player.hits100Plus + (scored >= 100 ? 1 : 0),
    turns: [
      ...player.turns,
      {
        darts: darts.slice(0, thrown),
        bust,
        scored,
        before: player.scoreLeft,
        after: bust ? player.scoreLeft : tempLeft,
        timestamp: Date.now(),
      },
    ],
  };

  const players = [...game.players];
  players[playerIndex] = updatedPlayer;

  const legWon = !bust && tempLeft === 0;

  if (!legWon) {
    return {
      ...game,
      history,
      players,
      currentPlayerIndex: (playerIndex + 1) % players.length,
      winnerId: null,
    };
  }

  const playerWithLeg = {
    ...updatedPlayer,
    legsWon: updatedPlayer.legsWon + 1,
  };
  players[playerIndex] = playerWithLeg;

  const isMatchWinner = playerWithLeg.legsWon >= game.legsToWin;

  if (isMatchWinner) {
    return {
      ...game,
      history,
      players,
      currentPlayerIndex: playerIndex,
      status: "finished",
      winnerId: playerId,
      lastLegWinnerId: playerId,
    };
  }

  const nextStartingIndex = (game.startingPlayerIndex + 1) % players.length;
  const nextLegPlayers = players.map((p) => ({
    ...p,
    scoreLeft: game.mode,
  }));

  return {
    ...game,
    history,
    players: nextLegPlayers,
    currentPlayerIndex: nextStartingIndex,
    winnerId: null,
    lastLegWinnerId: playerId,
    legNumber: game.legNumber + 1,
    startingPlayerIndex: nextStartingIndex,
  };
}

export function undoLastActionState(game: GameState): GameState {
  const lastSnapshot = game.history[game.history.length - 1];

  if (!lastSnapshot) {
    throw new Error("Brak ruchów do cofnięcia.");
  }

  return {
    ...game,
    players: deepCopy(lastSnapshot.players),
    currentPlayerIndex: lastSnapshot.currentPlayerIndex,
    status: lastSnapshot.status,
    winnerId: lastSnapshot.winnerId,
    lastLegWinnerId: lastSnapshot.lastLegWinnerId,
    legNumber: lastSnapshot.legNumber,
    startingPlayerIndex: lastSnapshot.startingPlayerIndex,
    history: game.history.slice(0, -1),
  };
}