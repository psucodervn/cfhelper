'use strict';

import { window, ExtensionContext, StatusBarAlignment } from 'vscode';
import { getContestList, getContestProblems, login, loggedAs, submitContestProblem } from './api';
import { Contest, Problem, Global } from './interfaces';

const keys = {
  Reload: '# Reload List...',
  Cookie: 'cookie',
  Contests: 'contests',
};

let global: Global;

export async function initExtension(context: ExtensionContext) {
  const rightBarItem = window.createStatusBarItem(StatusBarAlignment.Right);
  rightBarItem.show();
  const leftBarItem = window.createStatusBarItem(StatusBarAlignment.Left);
  leftBarItem.show();
  global = {
    context,
    leftBarItem,
    rightBarItem,
    contests: [],
    state: context.workspaceState,
  };

  try {
    global.contests = JSON.parse(global.state.get(keys.Contests) as string);
  } catch (e) {
    console.log('get contests from state:', e);
  }

  loggedAs().then(handle => {
    if (handle) { setLoggedUser(handle); }
    else { clearCredentials(); }
  });
}

export function setLoggedUser(handle: string, cookie?: string) {
  global.state.update('handle', handle);
  if (cookie) { setCookie(cookie); }
  setRightStatus(`CF: Logged as ${handle}`);
  global.rightBarItem.command = 'extension.logout';
}

export function clearCredentials() {
  global.state.update('handle', undefined);
  setCookie(undefined);
  setRightStatus(`CF: Not logged`);
  global.rightBarItem.command = 'extension.login';
}

export function setLeftStatus(text: string) {
  global.leftBarItem.text = text;
}

export function setRightStatus(text: string) {
  global.rightBarItem.text = text;
}

export function getCookie(must: boolean = false) {
  const res = global.state.get(keys.Cookie);
  if (must && !res) {
    throw new Error('You must login to do this action.');
  }
  return res as string;
}

export function setCookie(cookie: string | undefined) {
  global.state.update(keys.Cookie, cookie);
}

export async function fetchContestList() {
  global.leftBarItem.text = 'Contest list fetching...';
  const contests = await getContestList();
  global.leftBarItem.text = 'Contest list fetched';
  global.state.update(keys.Contests, JSON.stringify(contests));
  return contests;
}

async function chooseContest(): Promise<Contest | undefined> {
  let contest: Contest | undefined;
  if (!global.contests || global.contests.length === 0) {
    global.contests = await fetchContestList();
  }
  while (!contest) {
    const contestNames = global.contests.map(c => c.name);
    contestNames.unshift(keys.Reload);
    const name = await window.showQuickPick(contestNames);
    if (!name) { return; }
    if (name === keys.Reload) {
      await fetchContestList();
      continue;
    }
    contest = global.contests.find(c => c.name === name);
  }
  return contest;
}

async function parseContest(contest: Contest) {
  const probs: Problem[] = await getContestProblems(contest);
  console.log(probs.length);
}

export async function parseContestCommand() {
  const contest = await chooseContest();
  if (!contest) { return; }
  await parseContest(contest);
}

export async function logoutCommand() {
  clearCredentials();
  window.showInformationMessage('Logout succeed.');
}

export async function loginCommand() {
  const handle = await window.showInputBox({
    prompt: 'Username or Email',
  });
  if (!handle) { return; }
  const password = await window.showInputBox({
    prompt: 'Password',
    password: true,
  });
  if (!password) { return; }

  let cookie;
  try {
    cookie = await login(handle, password);
    if (!cookie) {
      window.showErrorMessage('Login failed. Check your credentials and/or internet connection.');
      clearCredentials();
      return;
    }
  } catch (e) {
    console.error('loginCommand:', e);
    window.showErrorMessage(`Login failed: ${e}. Check your credentials and/or internet connection.`);
    clearCredentials();
    return;
  }

  setLoggedUser(handle, cookie);
  window.showInformationMessage('Login succeed.');
}

export async function submitCommand() {
  const editor = window.activeTextEditor;
  if (!editor) { return; }
  const doc = editor.document;
  if (doc.isDirty || doc.isUntitled) { await doc.save(); }

  const code = doc.getText();
  const { contestId, problemId } = extractProblemInfo(code);
  if (!contestId || !problemId) {
    window.showErrorMessage('Cannot detect contest and/or problem id from current file.');
    return;
  }

  setLeftStatus('Submitting...');
  await submitContestProblem(code, contestId, problemId);
  setLeftStatus('Submit succeed.');
}

function extractProblemInfo(text: string) {
  let matches = text.match(/codeforces.com\/contest\/([^/]+)\/problem\/(\S+)/);
  if (matches && matches.length >= 2) {
    return { contestId: matches[1], problemId: matches[2] };
  }
  // TODO: add more matches
  return {};
}