import { test } from '@e2e-dev/mobile';
import { expect } from 'e2e';

test('channel up and down wrap around the lineup', async ({ app, screen }) => {
  await app.open();
  await screen.getByRole('button', 'Open the remote').tap();
  const channel = screen.getByTestId('now-playing-channel');

  await screen.getByRole('button', 'Channel up').tap();
  await expect(channel).toHaveText('CH 4');
  await expect(screen.getByTestId('now-playing-show')).toHaveText('Reef Report');

  await screen.getByRole('button', 'Channel down').tap();
  await screen.getByRole('button', 'Channel down').tap();
  await expect(channel).toHaveText('CH 11');
});

test('tune goes to a listed channel and rejects an empty one', async ({ app, screen }) => {
  await app.open();
  await screen.getByRole('button', 'Open the remote').tap();

  await screen.getByTestId('tune-input').fill('9');
  await screen.getByRole('button', 'Tune').tap();
  await expect(screen.getByTestId('now-playing-show')).toHaveText('Big Wave Classics');

  await screen.getByTestId('tune-input').fill('5');
  await screen.getByRole('button', 'Tune').tap();
  await expect(screen.getByTestId('tune-message')).toHaveText('Channel 5 is off the air.');
  await expect(screen.getByTestId('now-playing-channel')).toHaveText('CH 9');
});

test('favorites add and remove the current channel', async ({ app, screen }) => {
  await app.open();
  await screen.getByRole('button', 'Open the remote').tap();
  await expect(screen.getByText('No favorites yet.')).toBeVisible();

  await screen.getByRole('button', 'Add to favorites').tap();
  await expect(screen.getByTestId('favorite-2')).toHaveText('CH 2 · Dawn Patrol');

  await screen.getByRole('button', 'Remove from favorites').tap();
  await expect(screen.getByText('No favorites yet.')).toBeVisible();
});

test('last channel returns to the channel before the switch', async ({ app, screen }) => {
  await app.open();
  await screen.getByRole('button', 'Open the remote').tap();
  await screen.getByTestId('tune-input').fill('9');
  await screen.getByRole('button', 'Tune').tap();
  await expect(screen.getByTestId('now-playing-channel')).toHaveText('CH 9');

  await screen.getByRole('button', 'Last').tap();
  await expect(screen.getByTestId('now-playing-channel')).toHaveText('CH 2');
});
