// src/server/deploy/github.ts
//
// 1-click GitHub push for the super admin. Stages everything, commits
// with a timestamped message (if there is anything to commit), and
// pushes to the configured remote. Every step's output is returned so
// the UI can show exactly what happened.
//
// Requires: this directory is a git repo, a remote (e.g. "origin") is
// configured, and git credentials are available (SSH key or credential
// helper). If any of that is missing, the result explains what to fix.
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const REPO_ROOT = process.cwd();
const TIMEOUT_MS = 120_000;

export interface PushStep {
  step: string;
  ok: boolean;
  output: string;
}

export interface PushResult {
  ok: boolean;
  steps: PushStep[];
}

async function git(args: string[]): Promise<{ ok: boolean; output: string }> {
  try {
    const { stdout, stderr } = await execFileAsync("git", args, {
      cwd: REPO_ROOT,
      timeout: TIMEOUT_MS,
      maxBuffer: 1024 * 1024,
    });
    return { ok: true, output: (stdout + stderr).trim().slice(0, 4000) };
  } catch (err) {
    const e = err as { stdout?: string; stderr?: string; message?: string };
    const output = ((e.stdout ?? "") + "\n" + (e.stderr ?? "")).trim() || e.message || "git failed";
    return { ok: false, output: output.slice(0, 4000) };
  }
}

export async function pushToGitHub(): Promise<PushResult> {
  const steps: PushStep[] = [];
  const record = (step: string, r: { ok: boolean; output: string }) => {
    steps.push({ step, ...r });
    return r.ok;
  };

  // 1. Is this a git repo?
  if (!record("Check git repo", await git(["rev-parse", "--is-inside-work-tree"]))) {
    return { ok: false, steps };
  }

  // 2. Which branch?
  const branch = await git(["branch", "--show-current"]);
  record("Current branch", branch);
  const branchName = branch.output || "main";

  // 3. Is a remote configured?
  const remote = await git(["remote", "get-url", "origin"]);
  if (!record("Check remote 'origin'", remote)) {
    steps.push({
      step: "Hint",
      ok: false,
      output: "No 'origin' remote. Run: git remote add origin <your-github-repo-url>",
    });
    return { ok: false, steps };
  }

  // 4. Stage everything.
  if (!record("Stage changes (git add -A)", await git(["add", "-A"]))) {
    return { ok: false, steps };
  }

  // 5. Commit if there is anything to commit.
  const status = await git(["status", "--porcelain"]);
  record("Check for changes", status);
  if (status.output.length > 0) {
    const msg = `Super admin 1-click push — ${new Date().toISOString()}`;
    if (!record("Commit", await git(["commit", "-m", msg]))) {
      return { ok: false, steps };
    }
  } else {
    steps.push({ step: "Commit", ok: true, output: "Nothing to commit — working tree clean." });
  }

  // 6. Push.
  if (!record(`Push to origin/${branchName}`, await git(["push", "origin", branchName]))) {
    steps.push({
      step: "Hint",
      ok: false,
      output:
        "Push failed — usually missing credentials. Options: add an SSH key for this server to GitHub, or configure a credential helper / personal access token.",
    });
    return { ok: false, steps };
  }

  return { ok: true, steps };
}

/** Read-only status for the deploy page (no side effects). */
export async function getRepoStatus(): Promise<{ isRepo: boolean; branch: string; remote: string; dirty: boolean; ahead: number }> {
  const isRepo = (await git(["rev-parse", "--is-inside-work-tree"])).ok;
  if (!isRepo) return { isRepo: false, branch: "", remote: "", dirty: false, ahead: 0 };
  const branch = (await git(["branch", "--show-current"])).output || "";
  const remote = (await git(["remote", "get-url", "origin"])).output || "";
  const dirty = (await git(["status", "--porcelain"])).output.length > 0;
  const aheadOut = (await git(["rev-list", "--count", "@{u}..HEAD"])).output;
  const ahead = Number.parseInt(aheadOut, 10);
  return { isRepo, branch, remote: remote.replace(/:[^@/]+@/, ":***@"), dirty, ahead: Number.isFinite(ahead) ? ahead : 0 };
}
