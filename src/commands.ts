'use strict';

import { window, workspace } from 'vscode';
import { getContestList, getContestProblems, login } from './api';
import { Contest, Problem } from './interfaces';

const config = {
  Reload: '# Reload List...'
};

let contests: Contest[] = [];

export async function fetchContestList() {
  const stFetching = window.setStatusBarMessage('Contest list fetching...');
  contests = await getContestList();
  stFetching.dispose();
  window.setStatusBarMessage('Contest list fetched', 3000);  
}

async function chooseContest(): Promise<Contest | undefined> {
  let contest: Contest | undefined;
  if (!contests || contests.length === 0) { await fetchContestList(); }
  while (!contest) {
    const contestNames = contests.map(c => c.name);
    contestNames.unshift(config.Reload);
    const name = await window.showQuickPick(contestNames);
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
  const probs: Problem[] = await getContestProblems(contest);
}

export async function parseContestCommand() {
	console.log(workspace.getConfiguration());
  const contest = await chooseContest();
  if (!contest) { return; }
  await parseContest(contest);
}

export async function loginCommand() {
  const username = await window.showInputBox({
    prompt: 'Username or Email',
    value: 'hungle.cse',
  });
  if (!username) { return; }
  const password = await window.showInputBox({
    value: 'hungct',
    prompt: 'Password',
    password: true,
  });
  if (!password) { return; }
  await login(username, password);
}