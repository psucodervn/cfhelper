'use strict';

import { window } from 'vscode';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import { Response, Contest, Problem } from './interfaces';

async function getResponse(url: string, title: string = '') {
  const st = window.setStatusBarMessage(`Fetching ${title}...`);
  const res = await fetch(url);
  st.dispose();
  return res;
}

export async function getContestList(recent: number = 200) {
  const url = 'http://codeforces.com/api/contest.list';
  const res = await fetch(url);
  const data: Response<Contest> = await res.json();
  if (data.status !== 'OK') { return []; }
  // return data.result.slice(0, recent);
  return data.result;
}

export async function getContestProblems(contest: Contest) {
  // get html
  const url = `http://codeforces.com/contest/${contest.id}/problems`;
  console.info(`Parse from url: ${url}`);
  const html = await (await getResponse(url, 'problems')).text();

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
    console.assert(inputs.length === outputs.length, 'wrong tests format');

    // return
    return {
      name,
      group: contest.name,
      url: buildProblemUrl(contest, name),
      input,
      output,
      tests: [],
    };
  });
  return probs;
}

function buildProblemUrl(contest: Contest, name: string) {
  const c = name.replace(/\..*/g, '');
  return `http://codeforces.com/contest/${contest.id}/problem/${c}`;
}