import { test } from '@e2e-dev/mobile';
import { expect } from 'e2e';

test('home shows the channel details and the PR channel form', async ({ app, screen }) => {
  await app.open();
  await expect(screen.getByText('Channel', { exact: true })).toBeVisible();
  await expect(screen.getByText('Runtime version')).toBeVisible();
  await expect(screen.getByText('Open a PR channel')).toBeVisible();
  await expect(screen.getByPlaceholder('PR number')).toBeVisible();
});

test('home opens the remote', async ({ app, screen }) => {
  await app.open();
  await screen.getByRole('button', 'Open the remote').tap();
  await expect(screen.getByTestId('now-playing-channel')).toHaveText('CH 2');
  await expect(screen.getByTestId('now-playing-show')).toHaveText('Dawn Patrol');
});
