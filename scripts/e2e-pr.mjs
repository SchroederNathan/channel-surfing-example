// Turns e2e runs in Expo Workflows into GitHub pull request output.
//
//   node scripts/e2e-pr.mjs baseline         Copy the screenshots of a main run into .e2e-evidence for Expo Hosting.
//   node scripts/e2e-pr.mjs fetch-baselines  Download the main screenshots so toHaveScreenshot compares with them.
//   node scripts/e2e-pr.mjs evidence         Collect before, after, and diff images into .e2e-evidence.
//   node scripts/e2e-pr.mjs comment          Post or update the test comment: e2e's report, then the screens.
//   node scripts/e2e-pr.mjs review           Post the e2e explore report as a pull request review.
//
// The comment and the review use renderMarkdownReport from e2e, the renderer of e2e's own
// GitHub reporter. That reporter posts only from GitHub Actions, so this script posts instead.
//
// Env: GITHUB_TOKEN, GITHUB_REPOSITORY (owner/name), PR_NUMBER, HEAD_SHA, WORKFLOW_URL,
// BASELINE_URL (the Expo Hosting alias of the main screenshots), EVIDENCE_URL (this run's deployment).
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { renderMarkdownReport } from 'e2e';

const SNAPSHOT_DIR = 'tests/screens.e2e.ts-snapshots';
const SUITE_DIR = '.e2e';
const SCREENS_DIR = '.e2e-screens';
const REVIEW_DIR = '.e2e-review';
const EVIDENCE_DIR = '.e2e-evidence';
const COMMENT_MARKER = '<!-- e2e-pr-comment -->';

const env = process.env;
const shortSha = (sha) => (sha ?? '').slice(0, 7) || 'unknown';

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
}

function copyInto(from, toName) {
  mkdirSync(EVIDENCE_DIR, { recursive: true });
  copyFileSync(from, join(EVIDENCE_DIR, toName));
  return toName;
}

// Expo Hosting deploys a static site, so each evidence folder gets a plain index page.
function writeIndex(title, files) {
  const items = files.map((file) => `<li><a href="${file}">${file}</a></li>`).join('');
  writeFileSync(join(EVIDENCE_DIR, 'index.html'), `<!doctype html><meta charset="utf-8"><title>${title}</title><h1>${title}</h1><ul>${items}</ul>`);
}

const sourceUrl = (file, line) => `https://github.com/${env.GITHUB_REPOSITORY}/blob/${env.HEAD_SHA}/${file}#L${line}`;

function render(report) {
  return renderMarkdownReport(report, {
    artifactsUrl: env.WORKFLOW_URL,
    sourceUrl: env.GITHUB_REPOSITORY && env.HEAD_SHA ? sourceUrl : undefined,
  });
}

// e2e's page ends with a "<sub>Tested by e2e ...</sub>" footer. Sections go above it.
function splitFooter(markdown) {
  const at = markdown.lastIndexOf('\n<sub>');
  return at === -1 ? [markdown.trimEnd(), ''] : [markdown.slice(0, at).trimEnd(), markdown.slice(at + 1).trim()];
}

// --- Screens ---------------------------------------------------------------

function baseline() {
  const files = existsSync(SNAPSHOT_DIR) ? readdirSync(SNAPSHOT_DIR).filter((file) => file.endsWith('.png')) : [];
  for (const file of files) copyInto(join(SNAPSHOT_DIR, file), file);
  writeFileSync(join(EVIDENCE_DIR, 'manifest.json'), JSON.stringify({ sha: env.HEAD_SHA, files }, null, 2));
  writeIndex(`e2e screens on main at ${shortSha(env.HEAD_SHA)}`, files);
  console.log(`Prepared ${files.length} main screenshots.`);
}

async function fetchBaselines() {
  const response = await fetch(`${env.BASELINE_URL}/manifest.json`).catch(() => null);
  if (!response?.ok) {
    console.log('No main screenshots yet. Each screen counts as new.');
    return;
  }
  const manifest = await response.json();
  mkdirSync(SNAPSHOT_DIR, { recursive: true });
  for (const file of manifest.files) {
    const image = await fetch(`${env.BASELINE_URL}/${file}`);
    if (image.ok) writeFileSync(join(SNAPSHOT_DIR, basename(file)), Buffer.from(await image.arrayBuffer()));
  }
  writeFileSync(join(SCREENS_DIR + '-baseline.json'), JSON.stringify(manifest));
  console.log(`Downloaded ${manifest.files.length} main screenshots from ${shortSha(manifest.sha)}.`);
}

function changeDetail(message) {
  const share = message.match(/\(([\d.]+%) of the image\)/)?.[1];
  if (share) return `${share} of the pixels changed`;
  return message.includes('screenshot where') ? 'the screen size changed' : null;
}

const SCREEN_TITLES = { home: 'Home', remote: 'Remote', 'surf error': 'Surf error' };

// One entry per screen test: changed (before, after, diff), new (after), unchanged, or error.
function collectScreens() {
  const report = readJson(join(SCREENS_DIR, 'report.json'));
  if (report === null) return null;
  const screens = [];
  for (const result of report.run.results) {
    if (!result.tags.includes('screens') || !result.selected) continue;
    const name = result.titlePath.at(-1);
    const slug = name.replaceAll(' ', '-');
    const title = SCREEN_TITLES[name] ?? name;
    const attempt = result.attempts.at(-1);
    if (result.status === 'passed' || attempt === undefined) {
      screens.push({ slug, title, state: 'unchanged' });
      continue;
    }
    const paths = attempt.artifacts.map((artifact) => artifact.path);
    const find = (suffix) => paths.find((path) => path.endsWith(suffix));
    const from = (path) => join(SCREENS_DIR, 'results', path);
    const message = attempt.error?.message ?? '';
    const expected = find(`/${slug}-expected.png`);
    const actual = find(`/${slug}-actual.png`);
    const fresh = paths.find((path) => path.includes('/snapshots/') && basename(path).startsWith(`${slug}-`));

    if (expected && actual) {
      const diff = find(`/${slug}-diff.png`);
      screens.push({
        slug,
        title,
        state: 'changed',
        detail: changeDetail(message),
        before: copyInto(from(expected), `${slug}-before.png`),
        after: copyInto(from(actual), `${slug}-after.png`),
        diff: diff ? copyInto(from(diff), `${slug}-diff.png`) : null,
      });
    } else if (fresh && message.includes('no stored screenshot')) {
      screens.push({ slug, title, state: 'new', after: copyInto(from(fresh), `${slug}-after.png`) });
    } else {
      // The test failed before its screenshot, such as when the screen lost a button.
      const failure = find('-failure.png');
      screens.push({
        slug,
        title,
        state: 'error',
        detail: message.split('\n')[0],
        after: failure ? copyInto(from(failure), `${slug}-after.png`) : null,
      });
    }
  }
  return screens;
}

function evidence() {
  const screens = collectScreens() ?? [];
  const exploreFiles = collectFindingImages();
  writeFileSync(join(SCREENS_DIR + '.json'), JSON.stringify(screens, null, 2));
  const files = existsSync(EVIDENCE_DIR) ? readdirSync(EVIDENCE_DIR).filter((file) => file.endsWith('.png')) : [];
  writeIndex(`e2e evidence for PR #${env.PR_NUMBER} at ${shortSha(env.HEAD_SHA)}`, files);
  console.log(`Collected ${files.length} images (${exploreFiles} from findings).`);
}

const image = (file, alt) => (file ? `<img src="${env.EVIDENCE_URL}/${file}" width="240" alt="${alt}">` : '—');

function screensSection() {
  const screens = readJson(SCREENS_DIR + '.json');
  if (screens === null || screens.length === 0) return '### 📸 Screens\n\nThe screens run wrote no report. See the workflow run.';
  const base = readJson(SCREENS_DIR + '-baseline.json');
  const count = (state) => screens.filter((screen) => screen.state === state).length;
  const counts = [
    [count('changed'), 'changed'],
    [count('new'), 'new'],
    [count('error'), 'not captured'],
    [count('unchanged'), 'unchanged'],
  ]
    .filter(([n]) => n > 0)
    .map(([n, label]) => `${n} ${label}`)
    .join(' · ');

  const lines = [
    `### 📸 Screens: ${counts}`,
    '',
    `Before is \`main\` at \`${shortSha(base?.sha)}\`. After is this PR at \`${shortSha(env.HEAD_SHA)}\`. Red pixels in the diff changed.`,
  ];
  for (const screen of screens.filter((entry) => entry.state === 'changed')) {
    lines.push(
      '',
      `#### 🟠 ${screen.title}${screen.detail ? ` · ${screen.detail}` : ''}`,
      '',
      '| Before (`main`) | After (this PR) | Diff |',
      '| :---: | :---: | :---: |',
      `| ${image(screen.before, `${screen.title} before`)} | ${image(screen.after, `${screen.title} after`)} | ${image(screen.diff, `${screen.title} diff`)} |`,
    );
  }
  for (const screen of screens.filter((entry) => entry.state === 'new')) {
    lines.push('', `#### 🆕 ${screen.title} · no screenshot on \`main\` yet`, '', '| After (this PR) |', '| :---: |', `| ${image(screen.after, `${screen.title} after`)} |`);
  }
  for (const screen of screens.filter((entry) => entry.state === 'error')) {
    lines.push('', `#### 🔴 ${screen.title} · not captured`, '', `\`${screen.detail.replaceAll('`', "'")}\``, '', '| Screen at failure |', '| :---: |', `| ${image(screen.after, `${screen.title} at failure`)} |`);
  }
  const unchanged = screens.filter((entry) => entry.state === 'unchanged');
  if (unchanged.length > 0) {
    lines.push('', `<details><summary>${unchanged.length} unchanged screen${unchanged.length === 1 ? '' : 's'}</summary>`, '', ...unchanged.map((screen) => `- ${screen.title}`), '', '</details>');
  }
  return lines.join('\n');
}

// --- Findings --------------------------------------------------------------

function collectFindingImages() {
  const report = readJson(join(REVIEW_DIR, 'report.json'));
  const explore = report?.run.explore;
  if (!explore) return 0;
  const artifacts = new Map(report.run.results.flatMap((result) => result.attempts.flatMap((attempt) => attempt.artifacts)).map((artifact) => [artifact.id, artifact.path]));
  let copied = 0;
  for (const finding of explore.findings) {
    const path = finding.artifactId && artifacts.get(finding.artifactId);
    if (path && existsSync(join(REVIEW_DIR, 'results', path))) {
      copyInto(join(REVIEW_DIR, 'results', path), `finding-${finding.index}.png`);
      copied += 1;
    }
  }
  return copied;
}

function findingsEvidence(explore) {
  const shown = explore.findings.filter((finding) => existsSync(join(EVIDENCE_DIR, `finding-${finding.index}.png`)));
  if (shown.length === 0) return '';
  const rows = shown.map((finding) => `| ${finding.kind === 'issue' ? '🔴' : '⚠️'} ${finding.title.replaceAll('|', '/').replaceAll('@', '@​')} | ${image(`finding-${finding.index}.png`, finding.title.replaceAll('"', "'"))} |`);
  return ['### 📸 Evidence', '', '| Finding | Screen |', '| --- | :---: |', ...rows].join('\n');
}

// --- GitHub ----------------------------------------------------------------

async function github(method, path, body) {
  const response = await fetch(`https://api.github.com${path}`, {
    method,
    headers: {
      accept: 'application/vnd.github+json',
      authorization: `Bearer ${env.GITHUB_TOKEN}`,
      'x-github-api-version': '2022-11-28',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`GitHub ${method} ${path} returned ${response.status}: ${await response.text()}`);
  return response.json();
}

function canPost(body) {
  if (env.GITHUB_TOKEN && env.GITHUB_REPOSITORY && env.PR_NUMBER) return true;
  console.log('No GITHUB_TOKEN, GITHUB_REPOSITORY, or PR_NUMBER. Nothing was posted:\n');
  console.log(body);
  return false;
}

async function comment() {
  const report = readJson(join(SUITE_DIR, 'report.json'));
  const [page, footer] = report ? splitFooter(render(report)) : ['### 🔴 e2e: the suite wrote no report. See the workflow run.', ''];
  const body = [COMMENT_MARKER, page, '', screensSection(), '', `[Workflow run, traces, and videos](${env.WORKFLOW_URL})`, '', footer].join('\n').trim();
  if (!canPost(body)) return;

  // One comment per PR, edited in place, as e2e's own GitHub reporter does.
  const repo = `/repos/${env.GITHUB_REPOSITORY}`;
  const comments = await github('GET', `${repo}/issues/${env.PR_NUMBER}/comments?per_page=100`);
  const existing = comments.find((entry) => entry.body?.startsWith(COMMENT_MARKER));
  const posted = existing
    ? await github('PATCH', `${repo}/issues/comments/${existing.id}`, { body })
    : await github('POST', `${repo}/issues/${env.PR_NUMBER}/comments`, { body });
  console.log(`Comment: ${posted.html_url}`);
}

async function review() {
  const report = readJson(join(REVIEW_DIR, 'report.json'));
  const explore = report?.run.explore;
  let body;
  if (!explore) {
    body = `### 🔴 e2e AI review did not finish\n\nThe exploration wrote no report. See the [workflow run](${env.WORKFLOW_URL}).`;
  } else {
    const [page, footer] = splitFooter(render(report));
    const commit = `Explored commit \`${shortSha(env.HEAD_SHA)}\` on an Expo Simulators iOS session. [Workflow run, trace, and video](${env.WORKFLOW_URL})`;
    body = [page, '', findingsEvidence(explore), '', commit, '', footer].filter((part, index, all) => part !== '' || all[index - 1] !== '').join('\n').trim();
  }
  if (!canPost(body)) return;

  // The token's user is often the PR author, and GitHub lets an author post only COMMENT reviews.
  const posted = await github('POST', `/repos/${env.GITHUB_REPOSITORY}/pulls/${env.PR_NUMBER}/reviews`, {
    commit_id: env.HEAD_SHA,
    body,
    event: 'COMMENT',
  });
  console.log(`Review: ${posted.html_url}`);
}

const commands = { baseline, 'fetch-baselines': fetchBaselines, evidence, comment, review };
const command = commands[process.argv[2]];
if (!command) {
  console.error(`Usage: node scripts/e2e-pr.mjs <${Object.keys(commands).join('|')}>`);
  process.exit(2);
}
mkdirSync(dirname(join(EVIDENCE_DIR, 'x')), { recursive: true });
await command();
