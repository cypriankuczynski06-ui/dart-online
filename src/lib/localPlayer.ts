const PLAYER_ID_KEY = "dart:player:id";
const PLAYER_NAME_KEY = "dart:player:name";

type LocalPlayer = {
  id: string;
  name: string;
};

function fallbackId() {
  return `p_${Math.random().toString(36).slice(2, 10)}`;
}

export function getOrCreateLocalPlayer(): LocalPlayer {
  let id = localStorage.getItem(PLAYER_ID_KEY);

  if (!id) {
    id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : fallbackId();

    localStorage.setItem(PLAYER_ID_KEY, id);
  }

  const name = localStorage.getItem(PLAYER_NAME_KEY) ?? "";

  return { id, name };
}

export function saveLocalPlayerName(name: string) {
  localStorage.setItem(PLAYER_NAME_KEY, name.trim());
}