import { getSubmissions } from "./api";
import { window, commands, Uri } from "vscode";
import { Submission, Verdict } from "./interfaces";

export class SubmissionMonitor {
  constructor(private handle?: string, private delayMillis: number = 10000) {
    this.testings = new Map<number, boolean>();
  }

  private timer: NodeJS.Timer | undefined;
  private running: boolean = false;
  private lastSubmissionId: number = Number.MAX_SAFE_INTEGER;
  private readonly testings: Map<number, boolean>;

  changeHandle(newHandle: string) {
    this.handle = newHandle;
  }

  notiSubmission = (sub: Submission) => {
    console.log(sub);
    if (sub.verdict === Verdict.OK) {
      // remove from testings map
      this.testings.delete(sub.id);
      window.showInformationMessage(`${sub.problem.name}: ACCEPTED`);
      return;
    }
    if (sub.verdict === Verdict.TESTING) {
      this.testings.set(sub.id, true);
      const msg = `${sub.problem.name}: running on test #${sub.passedTestCount + 1}`;
      window.showInformationMessage(msg);
      return;
    }
    // remove from testings map
    this.testings.delete(sub.id);
    const msg = `${sub.problem.name}: ${sub.verdict} on test ${sub.passedTestCount + 1}`;
    window.showWarningMessage(msg, 'Open in codeforces').then(res => {
      if (res === 'Open in codeforces') {
        commands.executeCommand('vscode.open', Uri.parse(`http://codeforces.com/contest/${sub.contestId}/submission/${sub.id}`));
      }
    });
  }

  fetchSubmissions = async () => {
    if (!this.handle) {
      throw new Error('Must specific handle to get submissions.');
    }
    const subs = await getSubmissions(this.handle, 1, 10);
    let maxId = 0;
    subs.forEach(sub => {
      maxId = Math.max(maxId, sub.id);
      if (sub.id > this.lastSubmissionId || this.testings.get(sub.id)) {
        this.notiSubmission(sub);
      }
    });
    // update last id
    this.lastSubmissionId = maxId;
  }

  async start() {
    if (this.running || this.timer) {
      throw new Error('Monitor is still running.');
    }
    if (!this.handle) {
      throw new Error('Must specific handle to get submissions.');
    }
    this.lastSubmissionId = Number.MAX_SAFE_INTEGER;
    await this.fetchSubmissions();
    try {
      this.timer = setInterval(this.fetchSubmissions, this.delayMillis);
      this.running = true;
    } catch (e) {
      console.error('start:', e.toString());
      this.timer = undefined;
    }
  }

  stop() {
    if (!this.running || !this.timer) {
      throw new Error('Monitor is not running.');
    }
    try {
      clearInterval(this.timer);
      this.running = false;
      this.timer = undefined;
    } catch (e) {
      console.error('stop:', e.toString());
    }
  }
}
