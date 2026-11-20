export type PreviewInfo =
  | { kind: 'production' }
  | { kind: 'pr'; prNumber: number; commitSha: string | null };

function parsePreviewInfo(prNumber: string | undefined, commitSha: string | undefined): PreviewInfo {
  const pr = Number(prNumber);
  if (!prNumber || !Number.isSafeInteger(pr) || pr < 1) return { kind: 'production' };
  return { kind: 'pr', prNumber: pr, commitSha: commitSha && /^[0-9a-f]{7,40}$/i.test(commitSha) ? commitSha : null };
}

// Direct member access so Metro inlines the values at bundle time.
export const previewInfo: PreviewInfo = parsePreviewInfo(
  process.env.EXPO_PUBLIC_PR_NUMBER,
  process.env.EXPO_PUBLIC_COMMIT_SHA,
);
