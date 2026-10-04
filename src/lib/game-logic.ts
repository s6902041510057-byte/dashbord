import type { RoomStudent } from "@/types/quiz";

/**
 * Pure game logic for Cosmic EdTech Quiz.
 * All functions are deterministic / testable — no direct DB calls.
 */

export function shuffleArray<T>(input: T[], randomFn: () => number = Math.random): T[] {
  const arr = [...input];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(randomFn() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Random grouping: shuffle students then chunk into groups of maxGroupSize.
 * Last group merges if it would contain only 1 student and total > maxGroupSize.
 */
export function assignGroups<T extends { id: string }>(
  students: T[],
  maxGroupSize: number,
  randomFn: () => number = Math.random
): T[][] {
  if (maxGroupSize < 2) throw new Error("maxGroupSize must be >= 2");
  if (students.length === 0) return [];
  const shuffled = shuffleArray(students, randomFn);
  const groups: T[][] = [];
  for (let i = 0; i < shuffled.length; i += maxGroupSize) {
    groups.push(shuffled.slice(i, i + maxGroupSize));
  }
  // Avoid lone-wolf group: merge last group of 1 into previous group
  if (groups.length > 1 && groups[groups.length - 1].length === 1) {
    const lone = groups.pop() as T[];
    groups[groups.length - 1].push(...lone);
  }
  return groups;
}

export type VoteMap = Record<string, string>; // voterStudentId -> votedStudentId

export interface VoteResult {
  winnerId: string | null;
  tiedIds: string[];
  counts: Record<string, number>;
  needsRevote: boolean;
}

/** Tally leader votes. Highest count wins; tie -> needsRevote with tiedIds. */
export function tallyLeaderVotes(votes: VoteMap, memberIds: string[]): VoteResult {
  const counts: Record<string, number> = {};
  for (const id of memberIds) counts[id] = 0;
  for (const votedId of Object.values(votes)) {
    if (votedId in counts) counts[votedId] += 1;
  }
  let max = -1;
  let tiedIds: string[] = [];
  for (const id of memberIds) {
    if (counts[id] > max) {
      max = counts[id];
      tiedIds = [id];
    } else if (counts[id] === max) {
      tiedIds.push(id);
    }
  }
  if (max <= 0) {
    return { winnerId: null, tiedIds: [...memberIds], counts, needsRevote: true };
  }
  if (tiedIds.length === 1) {
    return { winnerId: tiedIds[0], tiedIds, counts, needsRevote: false };
  }
  return { winnerId: null, tiedIds, counts, needsRevote: true };
}

export interface RespondentState {
  memberIds: string[];
  alreadyAnsweredIds: string[];
}

/** Strict rotation: cannot re-pick until everyone has answered once. */
export function canSelectRespondent(state: RespondentState, candidateId: string): boolean {
  if (!state.memberIds.includes(candidateId)) return false;
  return !state.alreadyAnsweredIds.includes(candidateId);
}

export function isRotationComplete(state: RespondentState): boolean {
  return state.memberIds.every((id) => state.alreadyAnsweredIds.includes(id));
}

export interface ScoreInput {
  isCorrect: boolean;
  basePoints: number;
  timeTakenSec: number;
  timeLimitSec: number;
  speedBonusMax?: number;
}

/** Correct = base + speed bonus (faster = more). Wrong = 0. */
export function calculatePoints(input: ScoreInput): number {
  if (!input.isCorrect) return 0;
  const { basePoints, timeTakenSec, timeLimitSec, speedBonusMax = 0 } = input;
  if (speedBonusMax <= 0) return basePoints;
  const clamped = Math.max(0, Math.min(timeTakenSec, timeLimitSec));
  const ratio = timeLimitSec > 0 ? 1 - clamped / timeLimitSec : 0;
  return Math.round(basePoints + ratio * speedBonusMax);
}

export function getStudentBySessionToken(
  students: RoomStudent[],
  token: string
): RoomStudent | undefined {
  return students.find((s) => s.session_token === token);
}
