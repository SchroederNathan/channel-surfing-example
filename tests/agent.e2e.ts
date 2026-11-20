import { test } from '@e2e-dev/mobile';
import { expect } from 'e2e';

// An agent step calls the model through Vercel AI Gateway. Without a key, the test is skipped.
test.runIf(process.env.AI_GATEWAY_API_KEY)(
  'agent favorites a show by name',
  async ({ agent, app, screen }) => {
    await app.open();
    await agent.act('open the remote, then add the channel that shows "Tide Tables Live" to favorites');
    await expect(screen.getByTestId('favorite-7')).toHaveText('CH 7 · Tide Tables Live');
  },
);
