import type { E2EConfig } from 'e2e';
import { expoSimulators } from '@e2e-dev/eas';
import { mobile } from '@e2e-dev/mobile';
import { gateway } from 'ai';

// CI sets E2E_IOS_BUILD_ID to an iOS Simulator build from Expo Build. Expo Simulators
// installs that build on a hosted simulator. Without it, the tests use a local simulator
// that already has a release build installed.
const iosBuildId = process.env.E2E_IOS_BUILD_ID;

export default {
  agents: {
    default: {
      // Vercel AI Gateway. Reads AI_GATEWAY_API_KEY. E2E_MODEL changes the model without a code change.
      model: gateway(process.env.E2E_MODEL ?? 'openai/gpt-6-luna-fast'),
      system: [
        'You are a thorough QA agent for Channel Surfing, an Expo app.',
        'The home screen shows the current EAS Update channel and an "Open the remote" button.',
        'The Remote screen is a TV remote: channel up and down wrap around, "Tune" goes to a typed channel number, and favorites list below.',
        'In test builds, the update channel is "e2e" and no update downloads. Do not report that as a bug.',
        'Verify every outcome.',
      ].join(' '),
    },
  },
  targets: [
    {
      name: 'ios',
      engine: mobile({
        platform: 'ios',
        ...(iosBuildId ? { device: expoSimulators({ buildId: iosBuildId, maxDurationMinutes: 30 }), videoTouches: false } : {}),
      }),
      app: { bundleId: 'com.nathanschroeder.channelsurfing' },
    },
  ],
  workers: 1,
} satisfies E2EConfig;
