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

## Local checks

```sh
npx tsc --noEmit
npx expo lint
npm test
```
