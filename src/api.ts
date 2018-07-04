'use strict';

import { window } from 'vscode';
import fetch, { Headers } from 'node-fetch';
import * as cheerio from 'cheerio';
import * as fs from 'fs';
import * as vscode from 'vscode';
import { Response, Contest, Problem, Test } from './interfaces';

const HOST = 'http://codeforces.com';
let context: vscode.ExtensionContext;

export function setContext(_context: vscode.ExtensionContext) {
  context = _context;
}

async function getResponse(url: string, title: string = '') {
  const st = window.setStatusBarMessage(`Fetching ${title}...`);
  const res = await fetch(url.startsWith('http') ? url : `${HOST}${url}`);
  st.dispose();
  return res;
}

async function getHTML(url: string, title: string = '') {
  const resp = await getResponse(url, title);
  return await resp.text();
}

async function getJSON(url: string, title: string = '') {
  const resp = await getResponse(url, title);
  return await resp.json();
}

export async function getContestList(recent: number = 200) {
  const url = '/api/contest.list';
  const data: Response<Contest> = await getJSON(url, 'contest list');
  if (data.status !== 'OK') { return []; }
  // return data.result.slice(0, recent);
  return data.result;
}

export async function getContestProblems(contest: Contest) {
  // get html
  const url = `/contest/${contest.id}/problems`;
  console.info(`Parse from url: ${url}`);
  const html = await getHTML(url, 'problems');

  // parse html
  const $ = cheerio.load(html);
  const nodes = $('.problem-statement').toArray();
  console.info(`Found ${nodes.length} problems`);

  const probs: Problem[] = nodes.map((node) => {
    const stmt = $(node);

    // name
    const name = stmt.find('.header .title').text();
    // input
    let input = { type: stmt.find('.input-file').text() };
    if (input.type.includes('standard input')) { input.type = 'stdin'; }
    // output
    let output = { type: stmt.find('.output-file').text() };
    if (output.type.includes('standard output')) { output.type = 'stdout'; }

    // tests
    const inputs = stmt.find('.sample-test .input pre').toArray();
    const outputs = stmt.find('.sample-test .output pre').toArray();
    console.assert(inputs.length === outputs.length, 'unrecognized sample tests format');
    const size = Math.min(inputs.length, outputs.length);
    const tests: Test[] = [];
    for (let i = 0; i < size; ++i) {
      const inData = inputs[i].children
        .map(c => c.data)
        .join('\n')
        .replace(/\n\n/g, '\n');
      const outData = outputs[i].children
        .map(c => c.data)
        .join('\n')
        .replace(/\n\n/g, '\n');
      const test: Test = {
        id: (i + 1).toString(),
        input: inData,
        output: outData,
      };
      tests.push(test);
    }

    // return
    return {
      name,
      group: contest.name,
      url: buildProblemUrl(contest, name),
      input,
      output,
      tests,
    };
  });
  return probs;
}

function buildProblemUrl(contest: Contest, name: string) {
  const c = name.replace(/\..*/g, '');
  return `/contest/${contest.id}/problem/${c}`;
}

export async function login(handleOrEmail: string, password: string) {
  let resp = await getResponse('/enter', 'login page');
  const htmlLogin = await resp.text();
  let $ = cheerio.load(htmlLogin);
  const csrfToken = $('input[name=csrf_token]').val();
  console.log(csrfToken);
  console.log(extractCookie(resp.headers));

  const body = {
    csrf_token: csrfToken,
    handleOrEmail,
    password,
    remember: 'on',
    action: 'enter',
  };
  console.log(encode(body));

  resp = await fetch(`${HOST}/enter`, {
    headers: {
      cookie: extractCookie(resp.headers),
      'content-type': 'application/x-www-form-urlencoded',
    },
    redirect: 'manual',
    body: encode(body),
    method: 'POST',
    compress: true,
  });
  const cookie = extractCookie(resp.headers);
  console.log(cookie);
  context.globalState.update('cookie', cookie);
  console.log(resp.headers.raw());
  await fs.writeFileSync('/tmp/a.html', await resp.text());
  // console.log(resp);
}

function encode(obj: any) {
  return Object.keys(obj).map(k => `${encodeURIComponent(k)}=${encodeURIComponent(obj[k])}`).join('&');
}

function extractCookie(headers: Headers) {
  try {
    const sr = headers.raw()['set-cookie'] as any as string[];
    const ar = sr.map(s => {
      const temp = s.match(/([^; /]+=[^; /]+)/i);
      if (!temp) { return undefined; }
      return temp[1];
    });
    return ar.join('; ');
  } catch (e) {
    console.error('extractCookie: ' + e);
    return '';
  }
}