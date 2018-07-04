import { Memento, ExtensionContext, StatusBarItem } from "vscode";

export interface Contest {
  id: number;
  name: string;
  type: ContestType;
  phase: ContestPhase;
  frozen: boolean;
  durationSeconds: number;
  startTimeSeconds: number;
  relativeTimeSeconds: number;
  preparedBy: string;
  websiteUrl: string;
  description: string;
  difficulty: number;
  kind: string;
  icpcRegion: string;
  country: string;
  city: string;
  season: string;
}

export enum ContestType {
  CF, IOI, ICPC,
}

export enum ContestPhase {
  BEFORE, CODING, PENDING_SYSTEM_TEST, SYSTEM_TEST, FINISHED,
}

export interface Response<T> {
  status: 'OK' | string;
  result: T[];
}

export interface Problem {
  name: string;
  group: string;
  url: string;
  memoryLimit?: number;
  timeLimit?: number;
  testType?: 'single' | 'multiTest' | 'multiEOF' | string;
  input?: ProblemInput;
  output?: ProblemOutput;
  languages?: Languages;
  tests: Test[];
}

export interface Test {
  id?: string;
  input: string;
  output: string;
}

export interface Languages {
  [language: string]: any;
}

export interface ProblemInput {
  type: 'stdin' | 'file' | string;
}

export interface ProblemOutput {
  type: 'stdout' | 'file' | string;
}

export type State = Memento;

export interface Global {
  context: ExtensionContext;
  leftBarItem: StatusBarItem;
  rightBarItem: StatusBarItem;
  contests: Contest[];
  state: Memento;
}