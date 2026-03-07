import { UserBall } from "./types";

const KEY = "lane_coach_demo_arsenal_v2";

export function getArsenal(): UserBall[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as UserBall[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveArsenal(next: UserBall[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(next));
}

export function addToArsenal(catalogKey: string) {
  const current = getArsenal();
  const userBallId = `ub_${Math.random().toString(16).slice(2)}_${Date.now()}`;
  const next = [...current, { userBallId, catalogKey }];
  saveArsenal(next);
  return next;
}

export function removeFromArsenal(userBallId: string) {
  const current = getArsenal();
  const next = current.filter(b => b.userBallId !== userBallId);
  saveArsenal(next);
  return next;
}

export function clearArsenal() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
}
