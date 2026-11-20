// Posts the result of `e2e explore --changed-since` as a GitHub pull request review.
// Usage: node scripts/post-pr-review.mjs <e2e output dir>
// Env: GITHUB_TOKEN, GITHUB_REPOSITORY (owner/name), PR_NUMBER, HEAD_SHA, WORKFLOW_URL.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const outputDir = process.argv[2] ?? '.e2e-review';
const { GITHUB_TOKEN, GITHUB_REPOSITORY, PR_NUMBER, HEAD_SHA, WORKFLOW_URL } = process.env;

const SEVERITY = { 1: 'trivial', 2: 'minor', 3: 'medium', 4: 'high', 5: 'critical' };
const ENDED = {
  finished: 'The agent covered the goal.',
  skipped: 'The change has nothing a user can see, so the agent skipped it.',
  'step-limit': 'The agent used all of its steps.',
  time: 'The agent ran out of time.',
  stuck: 'The agent stopped after three blocked steps in a row.',
  aborted: 'The run was stopped.',
};

function readExplore() {
  try {
    return JSON.parse(readFileSync(join(outputDir, 'report.json'), 'utf8')).run?.explore ?? null;
  } catch {
    return null;
  }
}

// App text can contain @mentions or #refs. Code spans stop GitHub from linking them.
function inline(text) {
  return '`' + String(text).replaceAll('`', "'").replaceAll('\n', ' ') + '`';
}

function buildBody(explore) {
  const sha = (HEAD_SHA ?? '').slice(0, 7) || 'unknown';
  const footer = `<sub>Explored commit \`${sha}\` on an Expo Simulators iOS session by [e2e](https://e2e.com). [Run, screenshots, and video](${WORKFLOW_URL}).</sub>`;

  if (explore === null) {
    return `## 🔴 e2e AI review did not finish\n\nThe exploration wrote no report. See the workflow logs.\n\n${footer}`;
  }

  const issues = explore.findings.filter((finding) => finding.kind === 'issue');
  const warnings = explore.findings.filter((finding) => finding.kind === 'warning');
  const headline =
    issues.length > 0
      ? `## 🔴 e2e AI review: ${issues.length} issue${issues.length === 1 ? '' : 's'} in this change`
      : explore.ended === 'skipped'
        ? '## ⚪ e2e AI review: nothing to explore'
        : '## 🟢 e2e AI review: no issues found';

  const lines = [headline, '', ENDED[explore.ended] ?? `Ended: ${explore.ended}.`];
  if (explore.change) lines.push(`The agent planned from ${explore.change.files} changed file(s) since \`${explore.change.base.slice(0, 7)}\`.`);

  const ordered = [...issues, ...warnings].sort((a, b) => (a.kind === b.kind ? b.severity - a.severity : a.kind === 'issue' ? -1 : 1));
  for (const finding of ordered) {
    lines.push(
      '',
      `### ${finding.kind === 'issue' ? '🔴' : '⚠️'} ${SEVERITY[finding.severity]} ${finding.kind}: ${finding.title.replaceAll('@', '@​')}`,
      `- **Expected:** ${inline(finding.expected)}`,
      `- **Actual:** ${inline(finding.actual)}`,
    );
    if (finding.reproduction.length > 0) {
      lines.push('- **Steps:**', ...finding.reproduction.map((step, index) => `  ${index + 1}. ${inline(step)}`));
    }
  }

  if (explore.summary) lines.push('', '### Assessment', '', explore.summary);
  if (explore.steps.length > 0) {
    lines.push('', '<details><summary>Steps the agent took</summary>', '');
    for (const step of explore.steps) lines.push(`${step.index}. ${step.title} (${step.status})`);
    lines.push('', '</details>');
  }
  lines.push('', footer);
  // GitHub rejects a review body over 65,536 characters.
  return lines.join('\n').slice(0, 60_000);
}

const body = buildBody(readExplore());

if (!GITHUB_TOKEN || !GITHUB_REPOSITORY || !PR_NUMBER) {
  console.log('No GITHUB_TOKEN, GITHUB_REPOSITORY, or PR_NUMBER. The review was not posted:\n');
  console.log(body);
  process.exit(0);
}

// The token's user is often the PR author, and GitHub lets an author post only COMMENT reviews.
const response = await fetch(`https://api.github.com/repos/${GITHUB_REPOSITORY}/pulls/${PR_NUMBER}/reviews`, {
  method: 'POST',
  headers: {
    accept: 'application/vnd.github+json',
    authorization: `Bearer ${GITHUB_TOKEN}`,
    'x-github-api-version': '2022-11-28',
  },
  body: JSON.stringify({ commit_id: HEAD_SHA, body, event: 'COMMENT' }),
});

if (!response.ok) {
  console.error(`GitHub returned ${response.status}: ${await response.text()}`);
  console.error('Check that GITHUB_TOKEN can write pull requests on this repository.');
  process.exit(1);
}
console.log(`Posted the review: ${(await response.json()).html_url}`);
