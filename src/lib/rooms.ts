import { doc, onSnapshot, runTransaction, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import type { CheckoutMode, GameState, X01Mode } from "./darts";
import {
  applyTurn,
  createLobbyGame,
  createPlayer,
  restartMatchState,
  startMatchState,
  undoLastActionState,
  updateLobbySettings,
} from "./darts";

const ROOM_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function normalizeRoomId(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
}

export function makeRoomId(length = 6) {
  let result = "";
  for (let i = 0; i < length; i += 1) {
    result += ROOM_CHARS[Math.floor(Math.random() * ROOM_CHARS.length)];
  }
  return result;
}

export async function createRoom(params: {
  roomId: string;
  hostId: string;
  hostName: string;
  mode: X01Mode;
  checkout: CheckoutMode;
  legsToWin: number;
}) {
  const roomId = normalizeRoomId(params.roomId);

  const game = createLobbyGame({
    roomId,
    createdBy: params.hostId,
    hostName: params.hostName.trim(),
    mode: params.mode,
    checkout: params.checkout,
    legsToWin: params.legsToWin,
  });

  await setDoc(doc(db, "rooms", roomId), game);
  return game;
}

export async function joinRoom(
  roomId: string,
  playerId: string,
  playerName: string
) {
  const ref = doc(db, "rooms", normalizeRoomId(roomId));

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);

    if (!snap.exists()) {
      throw new Error("Pokój nie istnieje.");
    }

    const game = snap.data() as GameState;

    if (game.status !== "lobby") {
      throw new Error("Mecz już wystartował. Nie można dołączyć w trakcie.");
    }

    const alreadyInRoom = game.players.some((player) => player.id === playerId);
    if (alreadyInRoom) return;

    const nextPlayers = [
      ...game.players,
      createPlayer(playerId, playerName.trim(), game.mode),
    ];

    tx.set(ref, {
      ...game,
      players: nextPlayers,
    });
  });
}

export async function updateRoomSettings(
  roomId: string,
  actorId: string,
  patch: {
    mode?: X01Mode;
    checkout?: CheckoutMode;
    legsToWin?: number;
    selectedStarterId?: string | null;
  }
) {
  const ref = doc(db, "rooms", normalizeRoomId(roomId));

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);

    if (!snap.exists()) {
      throw new Error("Pokój nie istnieje.");
    }

    const game = snap.data() as GameState;

    if (game.createdBy !== actorId) {
      throw new Error("Tylko host może zmieniać ustawienia.");
    }

    const nextState = updateLobbySettings(game, patch);
    tx.set(ref, nextState);
  });
}

export async function startMatch(roomId: string, actorId: string) {
  const ref = doc(db, "rooms", normalizeRoomId(roomId));

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);

    if (!snap.exists()) {
      throw new Error("Pokój nie istnieje.");
    }

    const game = snap.data() as GameState;

    if (game.createdBy !== actorId) {
      throw new Error("Tylko host może rozpocząć mecz.");
    }

    const nextState = startMatchState(game);
    tx.set(ref, nextState);
  });
}

export async function submitTurn(
  roomId: string,
  playerId: string,
  darts: string[]
) {
  const ref = doc(db, "rooms", normalizeRoomId(roomId));

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);

    if (!snap.exists()) {
      throw new Error("Pokój nie istnieje.");
    }

    const game = snap.data() as GameState;
    const nextState = applyTurn(game, playerId, darts);
    tx.set(ref, nextState);
  });
}

export async function undoLastAction(roomId: string, actorId: string) {
  const ref = doc(db, "rooms", normalizeRoomId(roomId));

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);

    if (!snap.exists()) {
      throw new Error("Pokój nie istnieje.");
    }

    const game = snap.data() as GameState;

    if (game.createdBy !== actorId) {
      throw new Error("Tylko host może cofnąć ruch.");
    }

    const nextState = undoLastActionState(game);
    tx.set(ref, nextState);
  });
}

export async function restartMatch(roomId: string, actorId: string) {
  const ref = doc(db, "rooms", normalizeRoomId(roomId));

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);

    if (!snap.exists()) {
      throw new Error("Pokój nie istnieje.");
    }

    const game = snap.data() as GameState;

    if (game.createdBy !== actorId) {
      throw new Error("Tylko host może zrestartować mecz.");
    }

    const nextState = restartMatchState(game);
    tx.set(ref, nextState);
  });
}

export function subscribeToRoom(
  roomId: string,
  callback: (game: GameState | null) => void
) {
  const ref = doc(db, "rooms", normalizeRoomId(roomId));

  return onSnapshot(ref, (snap) => {
    if (!snap.exists()) {
      callback(null);
      return;
    }

    callback(snap.data() as GameState);
  });
}