'use strict';

import * as path from 'path';
import { ExtensionContext, StatusBarAlignment, window, workspace } from 'vscode';
import { getContestList, getContestProblems, loggedAs, login, submitContestProblem } from './api';
import { Contest, Global, LanguageConfig, Task } from './interfaces';
import { extractProblemInfo, generateSourceFile, generateTestFiles, generateSampleTemplates, mkDirRecursive } from './utils';

const keys = {
  Reload: '# Reload List...',
  Cookie: 'cookie',
  Contests: 'contests',
  Language: 'language',
  Languages: 'languages',
  Src: 'src',
  Templates: 'templates',
  CFHelper: 'cfhelper',
  Handle: 'handle',
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
  global.state.update(keys.Handle, handle);
  if (cookie) { setCookie(cookie); }
  setRightStatus(`CF: Logged as ${handle}`);
  global.rightBarItem.command = 'extension.logout';
}

export function clearCredentials() {
  global.state.update(keys.Handle, undefined);
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

async function parseProblem(prob: Task) {
  const wsFolder = getWorkspaceFolder();
  const cfg = wsConfig();

  const src = cfg.get<string>(keys.Src) || 'src';
  const srcFolder = path.resolve(wsFolder.uri.fsPath, src);
  const groupFolder = path.join(srcFolder, prob.group);
  const probFolder = path.join(groupFolder, prob.name);
  await mkDirRecursive(srcFolder, groupFolder, probFolder);

  const tmpl = cfg.get<string>(keys.Templates) || 'templates';
  const tmplFolder = path.resolve(wsFolder.uri.fsPath, tmpl);

  const langConfig = getLanguageConfig();
  await generateSourceFile(prob, probFolder, tmplFolder, langConfig);
  await generateTestFiles(prob, probFolder, langConfig);
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

function getCurrentLanguage() {
  let lang = global.state.get<string>(keys.Language);
  if (lang) { return lang; }
  return workspace.getConfiguration(configs.Common).get<string>(keys.Language) || 'cpp14';
}

function getLanguageConfig(lang?: string) {
  if (!lang) { lang = getCurrentLanguage(); }
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

  const langConfigs = getLanguageConfig();

  setLeftStatus('Submitting...');
  await submitContestProblem(code, contestId, problemId, langConfigs.id);
  setLeftStatus('Submit succeed.');
}

export function wsConfig() {
  return workspace.getConfiguration(keys.CFHelper);
}

export async function setLanguageCommand() {
  const languages: any = wsConfig().get(keys.Languages);
  if (!languages) { throw new Error('Cannot get languages from configuration.'); }
  const format = (lang: string) => `${languages[lang].name} - ${lang}`;
  const items = Object.keys(languages).map(format);
  const res = await window.showQuickPick(items);
  const chosen = Object.keys(languages).find(lang => format(lang) === res);
  if (!chosen) { return; }
  global.state.update(keys.Language, chosen);
}

function getWorkspaceFolder() {
  if (!workspace.workspaceFolders) {
    throw new Error('Cannot get workspace folder.');
  }
  return workspace.workspaceFolders[0];
}

function getWorkspacePath() {
  return getWorkspaceFolder().uri.fsPath;
}

export async function generateSampleTemplatesCommand() {
  // const res = await window.showWarningMessage('Your current templates will be override. Do you want to continue?', 'Yes', 'No');
  // if (res !== 'Yes') { return; }
  let tmpl = wsConfig().get<string>(keys.Templates) || 'templates';
  tmpl = path.join(getWorkspacePath(), tmpl);
  const languages: any = wsConfig().get(keys.Languages);
  if (!languages) { throw new Error('Cannot get languages from configuration.'); }
  await generateSampleTemplates(tmpl, languages);
}