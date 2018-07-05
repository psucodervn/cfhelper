'use strict';

import { window, workspace, ExtensionContext, StatusBarAlignment } from 'vscode';
import { getContestList, getContestProblems, login, loggedAs, submitContestProblem } from './api';
import { Contest, Task, Global, LanguageConfig } from './interfaces';
import * as path from 'path';
import * as fs from 'fs';

const keys = {
  Reload: '# Reload List...',
  Cookie: 'cookie',
  Contests: 'contests',
  Language: 'language',
};
const configs = {
  Common: 'cfhelper.common',
  Languages: 'cfhelper.languages'
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
    const contestNames = global.contests.map(c => `${c.id} - ${c.name}`);
    contestNames.unshift(keys.Reload);
    const name = await window.showQuickPick(contestNames);
    if (!name) { return; }
    if (name === keys.Reload) {
      await fetchContestList();
      continue;
    }
    contest = global.contests.find(c => `${c.id} - ${c.name}` === name);
  }
  return contest;
}

async function tryMkdir(...folders: string[]) {
  for (let i = 0; i < folders.length; ++i) {
    const fd = folders[i];
    if (!(await fs.existsSync(fd))) {
      await fs.mkdirSync(fd);
      continue;
    }
    // TODO: check if not directory
  }
}

async function generateSourceFile(prob: Task, folder: string, tmplFolder: string, lang?: string) {
  if (!lang) { lang = workspace.getConfiguration(configs.Common).get<string>('language') || 'c++14'; }
  const langConfigs = workspace.getConfiguration(configs.Languages).get<LanguageConfig>(lang);
  if (!langConfigs) { throw new Error(`Cannot find config for language ${lang}!`); }

  let bf = '';
  try {
    bf = await fs.readFileSync(path.join(tmplFolder, langConfigs.template)).toString();
  } catch (e) {
    console.error('generateSourceFile:', e);
    setLeftStatus(e.toString());
    throw new Error(`Cannot read template for language ${lang}`);
  }
  bf = bf.replace('__PROB_NAME__', prob.name);
  bf = bf.replace('__PROB_URL__', prob.url);

  await fs.writeFileSync(path.join(folder, `${langConfigs.main}.${langConfigs.ext}`), bf);
}

async function generateTestFiles(prob: Task, folder: string, lang?: string) {
  const langConfigs = getLanguageConfigs(lang);

  await Promise.all(prob.tests.map(async test => {
    await fs.writeFileSync(path.join(folder, `${langConfigs.main}.${test.id}.in`), test.input);
    await fs.writeFileSync(path.join(folder, `${langConfigs.main}.${test.id}.ans`), test.output);
  }));
}

async function parseProblem(prob: Task) {
  if (!workspace.workspaceFolders || workspace.workspaceFolders.length === 0) { return; }
  const wsFolder = workspace.workspaceFolders[0];
  const cfg = workspace.getConfiguration('cfhelper');

  const src = cfg.get<string>('src') || 'src';
  const srcFolder = path.resolve(path.join(wsFolder.uri.fsPath), src);
  const groupFolder = path.join(srcFolder, prob.group);
  const probFolder = path.join(groupFolder, prob.name);
  await tryMkdir(srcFolder, groupFolder, probFolder);

  const tmpl = cfg.get<string>('templates') || 'templates';
  const tmplFolder = path.resolve(path.join(wsFolder.uri.fsPath), tmpl);
  await generateSourceFile(prob, probFolder, tmplFolder);
  await generateTestFiles(prob, probFolder);
}

async function parseContest(contest: Contest) {
  const probs: Task[] = await getContestProblems(contest);
  setLeftStatus(`Fetched ${probs.length} problems.`);
  for (let i = 0; i < probs.length; ++i) {
    await parseProblem(probs[i]);
  }
  // TODO: cannot promise all because mkdir
  // await Promise.all(probs.map(prob => parseProblem(prob)));
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

function getLanguageConfigs(lang?: string) {
  if (!lang) { lang = workspace.getConfiguration(configs.Common).get<string>('language') || 'c++14'; }
  const langConfigs = workspace.getConfiguration(configs.Languages).get<LanguageConfig>(lang);
  if (!langConfigs) { throw new Error(`Cannot find config for language ${lang}!`); }
  return langConfigs;
}

export async function submitCommand() {
  const editor = window.activeTextEditor;
  if (!editor) { return; }
  const doc = editor.document;
  if (doc.isDirty || doc.isUntitled) { await doc.save(); }

  const code = doc.getText();
  const { contestId, problemId } = extractProblemInfo(code);
  if (!contestId || !problemId) {
    window.showErrorMessage(`Cannot detect contest id and/or problem id from current file.
Your code doesn\'t contain a link to problem page.
Did you miss __PROB_URL__ field in your template?`);
    return;
  }

  const langConfigs = getLanguageConfigs();

  setLeftStatus('Submitting...');
  await submitContestProblem(code, contestId, problemId, langConfigs.id);
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