import { tagInitialSurfPath } from '@/channel-surfing/channel';

// iOS reads the initial URL from launch options, which last for the whole process, so every
// Updates.reloadAsync() routes the app to the QR link that cold-started it. Tag that link so
// the surf screen can tell it apart from a new scan.
export function redirectSystemPath({ path, initial }: { path: string; initial: boolean }): string {
  return tagInitialSurfPath(path, initial);
}
