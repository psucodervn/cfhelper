'use strict';

import fetch, { Headers } from 'node-fetch';
import * as cheerio from 'cheerio';
import * as fs from 'fs';
import { Response, Contest, Task, Test, Submission } from './interfaces';
import { setLeftStatus, getCookie } from './commands';

const HOST = 'http://codeforces.com';

async function getResponse(url: string, title?: string, useCookie: boolean = true, cookie: string = '') {
  if (useCookie && !cookie) { cookie = getCookie(true); }
  if (title) { setLeftStatus(`Fetching ${title}...`); }
  const res = await fetch(url.startsWith('http') ? url : `${HOST}${url}`, {
    headers: { cookie },
    follow: 1,
  });
  if (title) { setLeftStatus(`Fetching ${title}: done.`); }
  return res;
}

async function getHTML(url: string, title?: string, useCookie: boolean = true) {
  const resp = await getResponse(url, title, useCookie);
  return await resp.text();
}

async function getJSON(url: string, title?: string, useCookie: boolean = true) {
  const resp = await getResponse(url, title, useCookie);
  return await resp.json();
}

export async function getContestList(recent: number = 200) {
  const url = '/api/contest.list';
  const data: Response<Contest> = await getJSON(url, 'contest list', false);
  if (data.status !== 'OK') { return []; }
  return data.result;
}

async function getCsrfToken(url: string, useCookie: boolean = true) {
  const resp = await getResponse(url, url, useCookie);
  const html = await resp.text();
  let $ = cheerio.load(html);
  const csrfToken = $('input[name=csrf_token]').val();
  return {
    csrfToken,
    headers: resp.headers,
  };
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

  const probs: Task[] = nodes.map((node) => {
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
  return `http://codeforces.com/contest/${contest.id}/problem/${c}`;
}

/**
 * Login and return cookie of user
 * @param handleOrEmail handle or email
 * @param password password
 */
export async function login(handleOrEmail: string, password: string) {
  const { csrfToken, headers } = await getCsrfToken('/enter', false);
  if (!csrfToken) {
    throw new Error('Cannot get csrf_token from login page.');
  }

  let cookie = extractCookie(headers);

  const body = {
    csrf_token: csrfToken,
    handleOrEmail,
    password,
    remember: 'on',
    action: 'enter',
  };

  const resp = await fetch(`${HOST}/enter`, {
    headers: {
      cookie,
      'content-type': 'application/x-www-form-urlencoded',
    },
    redirect: 'manual',
    body: encode(body),
    method: 'POST',
    compress: true,
  });

  const html = (await resp.text());
  if (html.includes('error for__password')) {
    throw new Error('Invalid handle/email or password');
  }

  cookie = [cookie, extractCookie(resp.headers)].join('; ');
  return cookie;
}

function encode(obj: any) {
  return Object.keys(obj).map(k => `${encodeURIComponent(k)}=${encodeURIComponent(obj[k])}`).join('&');
}

/**
 * Extract cookie from response headers
 * @param headers 
 */
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
    throw new Error('Cannot extract cookie from response headers.');
  }
}

export async function loggedAs() {
  try {
    if (!getCookie()) { return undefined; }
    const resp = await getResponse('/profile', 'profile');
    const html = await resp.text();
    const $ = cheerio.load(html);
    const header = $('#header').html();
    if (!header) { return; }
    const hs = header.match(/href="\/profile\/([^"]+)"/);
    if (!hs || hs.length < 2) { return; }
    return hs[1];
  } catch (e) {
    console.error('loggedAs:', e);
    return undefined;
  }
}

export async function submitContestProblem(code: string, contestId: string, problemId: string, languageId: number) {
  let url = `http://codeforces.com/contest/${contestId}/submit`;
  const { csrfToken } = await getCsrfToken(url, true);
  if (!csrfToken) {
    throw new Error(`Cannot get csrf_token in submit page (${url}).`);
  }

  url += `?csrf_token=${csrfToken}`;
  const headers = {
    cookie: getCookie(true),
    'content-type': 'application/x-www-form-urlencoded',
  };
  const form = {
    csrf_token: csrfToken,
    action: 'submitSolutionFormSubmitted',
    submittedProblemIndex: problemId,
    programTypeId: languageId,
    source: code,
  };

  // console.log(encode(form));
  const resp = await fetch(url, {
    method: 'POST', headers, body: encode(form),
  });
  console.log(resp.status, resp.statusText);
  const html = await resp.text();
  await fs.writeFileSync('/tmp/submit.html', html);
  if (html.includes('You have submitted exactly the same code before')) {
    throw new Error('You have submitted exactly the same code before.');
  }
}

export async function getSubmissions(handle: string, from: number = 1, count: number = 10): Promise<Submission[]> {
  const url = `/api/user.status?handle=${handle}&from=${from}&count=${count}`;
  const data: Response<Submission> = await getJSON(url, 'submissions');
  return data.result;
}