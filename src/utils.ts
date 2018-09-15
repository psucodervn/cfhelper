'use strict';

import * as fs from 'fs';
import * as path from 'path';
import { LanguageConfig, Task, LanguageConfigs, ProblemInfo } from "./interfaces";
import { setLeftStatus } from './commands';
import templateCodes from './templates';

function regexMatchOne(text: string, regex: RegExp): string | undefined {
  const matches = text.match(regex);
  if (matches && matches.length >= 2) { return matches[1]; }
  return undefined;
}

export function extractProblemInfo(text: string): ProblemInfo | undefined {
  const language = regexMatchOne(text, /Lang:\s*(\S+)/);
  let contestId, problemId;

  let matches = text.match(/codeforces.com\/contest\/([^/]+)\/problem\/(\S+)/);

  if (matches && matches.length >= 2) {
    contestId = matches[1];
    problemId = matches[2];
    return { contestId, problemId, language };
  }
  // TODO: add more matches
  return undefined;
}

export async function generateSourceFile(prob: Task, folder: string, tmplFolder: string, langConfig: LanguageConfig, lang: string) {
  let bf = '';
  try {
    bf = fs.readFileSync(path.join(tmplFolder, langConfig.template)).toString();
  } catch (e) {
    console.error('generateSourceFile:', e);
    setLeftStatus(e.toString());
    throw new Error(`Cannot read template for language ${langConfig.name}`);
  }
  bf = bf.replace('__PROB_NAME__', prob.name);
  bf = bf.replace('__PROB_URL__', prob.url);
  bf = bf.replace('__LANG__', lang);

  fs.writeFileSync(path.join(folder, `${langConfig.main}.${langConfig.ext}`), bf);
}

export async function mkDirRecursive(...folders: string[]) {
  for (let i = 0; i < folders.length; ++i) {
    const fd = folders[i];
    if (!(await fs.existsSync(fd))) {
      fs.mkdirSync(fd);
    }
    // TODO: check if not directory
  }
}

export async function generateTestCases(prob: Task, folder: string, langConfig: LanguageConfig) {
  await Promise.all(prob.tests.map((test, idx) => {
    if (!test) { return; }
    if (!test.id) { test.id = (idx + 1) + ""; }
    const testId = (test.id.length < 2 ? '0' : '') + test.id;
    fs.writeFileSync(path.join(folder, `${langConfig.main}.${testId}.in`), test.input);
    fs.writeFileSync(path.join(folder, `${langConfig.main}.${testId}.ans`), test.output);
  }));
}

export async function generateSampleTemplates(templateDir: string, configs: LanguageConfigs) {
  if (!fs.existsSync(templateDir)) {
    fs.mkdirSync(templateDir);
  }
  const st = fs.statSync(path.resolve(templateDir));
  if (!st.isDirectory()) {
    throw new Error(`${templateDir} is not directory.`);
  }
  const langs = Object.keys(templateCodes);
  await Promise.all(langs.map(lang => {
    const config = configs[lang];
    const main = (config ? config.template : `main.${lang}.tmpl`);
    fs.writeFileSync(path.join(templateDir, main), templateCodes[lang]);
  }));
}