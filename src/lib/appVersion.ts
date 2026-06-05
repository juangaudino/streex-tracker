function versionParts(version: string): number[] {
  return version
    .trim()
    .replace(/^v/i, "")
    .split(".")
    .map((part) => Number.parseInt(part, 10))
    .map((part) => (Number.isFinite(part) ? part : 0));
}

function versionEpoch(version: string): number {
  const [major] = versionParts(version);

  // Streex V3.x-V5.x builds were internal Alpha archive labels.
  // Public beta versioning starts at 0.x, then stable releases move to 1.x.
  if (major >= 3 && major <= 5) return 0;
  if (major === 0) return 1;
  return 2;
}

export function isVersionNewer(candidate: string, current: string): boolean {
  const candidateEpoch = versionEpoch(candidate);
  const currentEpoch = versionEpoch(current);
  if (candidateEpoch !== currentEpoch) return candidateEpoch > currentEpoch;

  const candidateParts = versionParts(candidate);
  const currentParts = versionParts(current);
  const length = Math.max(candidateParts.length, currentParts.length);

  for (let index = 0; index < length; index += 1) {
    const candidatePart = candidateParts[index] ?? 0;
    const currentPart = currentParts[index] ?? 0;
    if (candidatePart !== currentPart) return candidatePart > currentPart;
  }

  return false;
}
