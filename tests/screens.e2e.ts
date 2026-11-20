import { describe, test } from '@e2e-dev/mobile';
import { expect } from 'e2e';

// One screenshot per screen. CI compares each one with the screenshot from the last
// run on main and posts the before, after, and diff images of the screens that changed.
// These tests have the "screens" tag, so the main suite leaves them out.
describe('screens', { tags: ['screens'] }, () => {
  test('home', async ({ app, screen }) => {
    await app.open();
    await expect(screen.getByText('Open a PR channel')).toBeVisible();
    await expect(screen).toHaveScreenshot('home.png', {
      // These values change with each build.
      mask: [screen.getByTestId('detail-update-id'), screen.getByTestId('detail-created-at')],
    });
  });

  test('remote', async ({ app, screen }) => {
    await app.open();
    await screen.getByRole('button', 'Open the remote').tap();
    await expect(screen.getByTestId('now-playing-channel')).toHaveText('CH 2');
    await expect(screen).toHaveScreenshot('remote.png');
  });

  test('surf error', async ({ app, device, screen }) => {
    await app.open();
    const openInApp = screen.getByRole('button', 'Open');
    const error = screen.getByText('is not a channel this app can switch to', { exact: false });
    await device.openLink('channelsurfing://surf?channel=staging');
    await expect.poll(async () => (await openInApp.count()) + (await error.count())).toBeGreaterThan(0);
    if ((await openInApp.count()) > 0) await openInApp.tap();
    await expect(error).toBeVisible();
    await expect(screen).toHaveScreenshot('surf-error.png');
  });
});
