import { test } from '@e2e-dev/mobile';
import { expect } from 'e2e';

// A rejected channel never reaches expo-updates, so this test needs no network.
test('a deep link to an unknown channel shows an error', async ({ app, device, screen }) => {
  await app.open();
  const openInApp = screen.getByRole('button', 'Open');
  const error = screen.getByText('is not a channel this app can switch to', { exact: false });

  await device.openLink('channelsurfing://surf?channel=staging');
  // iOS asks "Open in Channel Surfing?" until the link is approved once on the simulator.
  await expect.poll(async () => (await openInApp.count()) + (await error.count())).toBeGreaterThan(0);
  if ((await openInApp.count()) > 0) await openInApp.tap();

  await expect(error).toBeVisible();
  await screen.getByRole('button', 'Back home').tap();
  await expect(screen.getByText('Open a PR channel')).toBeVisible();
});
