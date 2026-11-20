# Channel Surfing with EAS Update

This Expo app shows [channel surfing](https://docs.expo.dev/eas-update/channel-surfing/). One installed release build switches between EAS Update channels at runtime. Every pull request gets its own channel, and a QR code on the PR opens the app on that channel.

## How it works

1. A PR opens or gets a new commit. The `pr-preview` workflow publishes the commit to the channel `pr-<number>`. EAS creates the channel on the first publish.
2. The same workflow posts a PR comment with a QR code for `channelsurfing://surf?channel=pr-<number>`.
3. A tester scans the QR code. The app calls `Updates.setUpdateRequestHeadersOverride({ 'expo-channel-name': 'pr-<number>' })`, downloads the update, and reloads.
4. The home screen banner shows the PR number and commit. **Back to production** clears the override.

Merges to `main` publish to the `production` channel through the `production` workflow. The release build starts on that channel.

| File | Role |
| --- | --- |
| `.eas/workflows/pr-preview.yml` | Publishes each PR commit to `pr-<number>` and comments the QR code. |
| `.eas/workflows/production.yml` | Publishes `main` to `production`. |
| `.eas/workflows/build.yml` | Makes an Android APK and an iOS Simulator app on demand. |
| `.eas/workflows/e2e.yml` | Runs the e2e tests and an AI review on each PR. See [End-to-end tests and AI review](#end-to-end-tests-and-ai-review). |
| `src/channel-surfing/` | Parses channel names and runs the switch flow. |
| `src/app/surf.tsx` | The deep-link screen for `channelsurfing://surf?channel=...`. |

## Try it

1. Make a tester build. Run `eas workflow:run .eas/workflows/build.yml`, then install the APK on Android or the `.app` on an iOS Simulator. Channel surfing needs a release build. It does not work in Expo Go or in a development build.
2. Open a PR against `main`. Wait for the comment from the Expo GitHub app.
3. Scan the QR code, or enter the PR number in **Open a PR channel** in the app.
4. Push another commit to the PR. The workflow publishes it to the same channel and edits the same comment to show the new commit. Scan the code again, or tap **Check for update**.

On a simulator, open the link from a terminal:

```sh
xcrun simctl openurl booted "channelsurfing://surf?channel=pr-1"
adb shell am start -a android.intent.action.VIEW -d "channelsurfing://surf?channel=pr-1"
```

## Rules the app enforces

- The app accepts only `production` and `pr-<number>` from a deep link. Other values show an error.
- A PR update must have the same runtime version as the build. This project uses the `appVersion` policy, so a PR that changes native code needs a new build and a version bump.
- If a channel has no compatible update, the app keeps its current channel and shows a message.

## Set up your own copy

1. `npm install`, then `eas init` to create your EAS project.
2. Link the GitHub repository on the project's GitHub settings page on expo.dev.
3. Change `owner`, `ios.bundleIdentifier`, and `android.package` in `app.json`.
4. Run the build workflow and open a PR.

## End-to-end tests and AI review

The `e2e` workflow runs on each pull request to `main`. It uses [e2e](https://e2e.com/docs) on an iOS Simulator from [Expo Simulators](https://docs.expo.dev/eas/simulators/introduction/).

1. The workflow finds an iOS Simulator build with the same native code, or makes one with the `e2e` build profile. Then it repacks the build with the JavaScript of the PR.
2. The `tests` job runs the suite in `tests/`. Then it takes one screenshot per screen and compares it with the screenshot from `main`. It posts one PR comment and edits it on each push:
   - e2e's test report, in the layout of e2e's own GitHub reporter, with links to the test source.
   - **Screens:** before (`main`), after (this PR), and diff images for each changed screen. New screens show the after image. Unchanged screens are in a folded list.
3. The `review` job runs `e2e explore --changed-since origin/main`. An AI agent reads the diff, uses the app, and reports findings. The job posts e2e's exploration report as a PR review, with a screenshot for each finding.

A failed test fails the workflow. A changed screen and an AI finding do not.

The `e2e-main` workflow runs after each push to `main`. It takes the screenshots that PRs compare with and deploys them to Expo Hosting at `https://channel-surfing--e2e-screens-main.expo.app`. Each PR run deploys its own images to a new Expo Hosting deployment. These sites are public.

| File | Role |
| --- | --- |
| `.eas/workflows/e2e.yml` | Builds or repacks the app, runs the tests, the screens, and the review, and posts to the PR. |
| `.eas/workflows/e2e-main.yml` | Stores the `main` screenshots on Expo Hosting. |
| `e2e.config.ts` | The model and the iOS target. With `E2E_IOS_BUILD_ID`, the target uses an iPhone 17 on Expo Simulators. |
| `tests/*.e2e.ts` | The suite. `agent.e2e.ts` has an agent step and runs only with a model key. |
| `tests/screens.e2e.ts` | One `toHaveScreenshot` per screen, tagged `screens`. Add a test here when you add a screen. |
| `scripts/e2e-pr.mjs` | Collects the images and posts the comment and the review. |
| `src/app/remote.tsx` | A TV remote screen that gives the tests stable UI. |

The `e2e` build profile uses the `e2e` update channel. No workflow publishes to it, so a test build never downloads a production update during a run.

### Set up the secrets

Add these variables to the **preview** environment on the project's [environment variables page](https://expo.dev/accounts/exponathan/projects/channel-surfing/environment-variables):

| Name | Value | Visibility |
| --- | --- | --- |
| `AI_GATEWAY_API_KEY` | A Vercel AI Gateway API key | Secret |
| `GITHUB_TOKEN` | A fine-grained GitHub token for this repository only, with **Pull requests: Read and write** | Secret |

Without `GITHUB_TOKEN`, the jobs print the comment and the review in their logs and post nothing.

Code on a branch of this repository can read these variables in a workflow run. Pull requests from forks do not start workflow runs. Set a spending limit on the AI Gateway key.

### Run the tests on your computer

On a local iOS Simulator, install a release build first. Then run:

```sh
npx e2e run --exclude-tag screens
```

On Expo Simulators, use an iOS Simulator build from the `e2e` profile:

```sh
eas build --platform ios --profile e2e
E2E_IOS_BUILD_ID=<build-id> npx e2e run --exclude-tag screens
```

To run the agent test or an exploration, set `AI_GATEWAY_API_KEY` first:

```sh
E2E_IOS_BUILD_ID=<build-id> npx e2e explore --changed-since origin/main
```

## Local checks

```sh
npx tsc --noEmit
npx expo lint
npm test
```
