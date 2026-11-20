import * as Updates from 'expo-updates';
import { useCallback, useRef, useState } from 'react';

import { BUILD_CHANNEL, type ChannelName, parseChannelName } from '@/channel-surfing/channel';
import { variantColor } from '@/theme';

export type SurfState =
  | { phase: 'idle' }
  | { phase: 'checking'; channel: ChannelName }
  | { phase: 'downloading'; channel: ChannelName }
  | { phase: 'reloading'; channel: ChannelName }
  | { phase: 'up-to-date'; channel: ChannelName }
  | { phase: 'no-update'; channel: ChannelName; message: string }
  | { phase: 'error'; channel: ChannelName; message: string };

export const runningChannel: ChannelName | null = parseChannelName(Updates.channel);

const NOT_AVAILABLE_REASONS: Record<Updates.UpdateCheckResultNotAvailableReason, string> = {
  noUpdateAvailableOnServer: 'the server has no update for this runtime version and platform',
  updateRejectedBySelectionPolicy: 'the update does not match this build',
  updatePreviouslyFailed: 'the update failed to launch on this device before',
  rollbackRejectedBySelectionPolicy: 'the rollback does not match this build',
  rollbackNoEmbeddedConfiguration: 'the rollback has no embedded update to return to',
};

export function isBusy(state: SurfState): boolean {
  return state.phase === 'checking' || state.phase === 'downloading' || state.phase === 'reloading';
}

function overrideChannel(channel: string | null): void {
  Updates.setUpdateRequestHeadersOverride(
    channel === null || channel === BUILD_CHANNEL ? null : { 'expo-channel-name': channel },
  );
}

async function runSurf(target: ChannelName, emit: (state: SurfState) => void): Promise<void> {
  if (!Updates.isEnabled) {
    emit({
      phase: 'error',
      channel: target,
      message: 'Channel surfing needs a release build. expo-updates is disabled here (dev server or Expo Go).',
    });
    return;
  }

  try {
    overrideChannel(target);
    emit({ phase: 'checking', channel: target });
    const check = await Updates.checkForUpdateAsync();

    if (!check.isAvailable && !check.isRollBackToEmbedded) {
      // After reloadAsync, iOS can deliver the same initial deep link again. Landing here
      // instead of reloading is what stops that second pass from looping.
      if (target === Updates.channel) {
        emit({ phase: 'up-to-date', channel: target });
        return;
      }
      overrideChannel(Updates.channel);
      emit({
        phase: 'no-update',
        channel: target,
        message: `No compatible update on ${target} for runtime ${Updates.runtimeVersion ?? 'unknown'}: ${NOT_AVAILABLE_REASONS[check.reason]}. Still on ${Updates.channel ?? 'the build channel'}.`,
      });
      return;
    }

    emit({ phase: 'downloading', channel: target });
    await Updates.fetchUpdateAsync();
    emit({ phase: 'reloading', channel: target });
    await Updates.reloadAsync({
      reloadScreenOptions: {
        backgroundColor: variantColor(target === BUILD_CHANNEL ? 'production' : 'pr'),
        spinner: { enabled: true, color: '#ffffff', size: 'large' },
        fade: true,
      },
    });
  } catch (error) {
    overrideChannel(Updates.channel);
    emit({ phase: 'error', channel: target, message: error instanceof Error ? error.message : String(error) });
  }
}

export function useChannelSurf(): { state: SurfState; surf: (channel: ChannelName) => void } {
  const [state, setState] = useState<SurfState>({ phase: 'idle' });
  const inFlight = useRef(false);

  const surf = useCallback((channel: ChannelName) => {
    if (inFlight.current) return;
    inFlight.current = true;
    runSurf(channel, setState).finally(() => {
      inFlight.current = false;
    });
  }, []);

  return { state, surf };
}

export function describeSurf(state: SurfState): string | null {
  switch (state.phase) {
    case 'idle':
      return null;
    case 'checking':
      return `Checking ${state.channel} for an update…`;
    case 'downloading':
      return `Downloading the latest ${state.channel} update…`;
    case 'reloading':
      return `Reloading into ${state.channel}…`;
    case 'up-to-date':
      return `Already running the latest ${state.channel} update.`;
    case 'no-update':
    case 'error':
      return state.message;
  }
}
