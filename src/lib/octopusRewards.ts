export const OCTOPUS_POINTS_PER_RIDE = 1.5;
export const OCTOPUS_REWARD_POINTS = 250;
export const OCTOPUS_REWARD_VALUE = 25;

export function normalizeOctopusPoints(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.round(value * 2) / 2);
}

export function adjustOctopusPoints(currentPoints: number, eligibleRideDelta: number): number {
  const rides = Number.isFinite(eligibleRideDelta) ? Math.trunc(eligibleRideDelta) : 0;
  return normalizeOctopusPoints(normalizeOctopusPoints(currentPoints) + rides * OCTOPUS_POINTS_PER_RIDE);
}

export function octopusRewardProgress(pointsValue: number) {
  const points = normalizeOctopusPoints(pointsValue);
  return {
    points,
    rewardsReady: Math.floor(points / OCTOPUS_REWARD_POINTS),
    ridesRemaining: points >= OCTOPUS_REWARD_POINTS
      ? 0
      : Math.ceil((OCTOPUS_REWARD_POINTS - points) / OCTOPUS_POINTS_PER_RIDE),
    progressPercent: Math.min(100, (points / OCTOPUS_REWARD_POINTS) * 100),
  };
}
