'use strict';

import * as vscode from 'vscode';
import { getContestList, getContestProblems } from './api';
import { Contest } from './interfaces';

const config = {
  Reload: '# Reload List...'
};

let contests: Contest[] = [];

async function fetchContestList() {
  const stFetching = vscode.window.setStatusBarMessage('Contest list fetching...');
  contests = await getContestList();
  stFetching.dispose();
  vscode.window.setStatusBarMessage('Contest list fetched', 3000);  
}

async function chooseContest(): Promise<Contest | undefined> {
  let contest: Contest | undefined;
  if (!contests || contests.length === 0) { await fetchContestList(); }
  while (!contest) {
    const contestNames = contests.map(c => c.name);
    contestNames.unshift(config.Reload);
    const name = await vscode.window.showQuickPick(contestNames);
    if (!name) { return; }
    if (name === config.Reload) {
      await fetchContestList();
      continue;
    }
    contest = contests.find(c => c.name === name);
  }
  return contest;
}

async function parseContest(contest: Contest) {
  const st = vscode.window.setStatusBarMessage(`Parsing contest: ${contest.name}`);
  const probs = await getContestProblems(contest);
  console.log(probs[0]);
  st.dispose();
}

export async function parseContestCommand() {
  const contest = await chooseContest();
  if (!contest) { return; }
  await parseContest(contest);
}
