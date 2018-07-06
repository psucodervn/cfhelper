'use strict';

import * as fs from 'fs';
import * as path from 'path';
import { LanguageConfig, Task, LanguageConfigs } from "./interfaces";
import { setLeftStatus } from './commands';
import templateCodes from './templates';

export function extractProblemInfo(text: string) {
  let matches = text.match(/codeforces.com\/contest\/([^/]+)\/problem\/(\S+)/);
  if (matches && matches.length >= 2) {
    return { contestId: matches[1], problemId: matches[2] };
  }
  // TODO: add more matches
  return {};
}

export async function generateSourceFile(prob: Task, folder: string, tmplFolder: string, langConfig: LanguageConfig) {
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

export async function generateTestFiles(prob: Task, folder: string, langConfig: LanguageConfig) {
  await Promise.all(prob.tests.map(test => {
    fs.writeFileSync(path.join(folder, `${langConfig.main}.${test.id}.in`), test.input);
    fs.writeFileSync(path.join(folder, `${langConfig.main}.${test.id}.ans`), test.output);
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