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

export interface Task {
  name: string;
  group: string;
  url: string;
  memoryLimit?: number;
  timeLimit?: number;
  testType?: 'single' | 'multiTest' | 'multiEOF' | string;
  input?: TaskInput;
  output?: TaskOutput;
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

export interface TaskInput {
  type: 'stdin' | 'file' | string;
}

export interface TaskOutput {
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

export interface LanguageConfig {
  id: number;
  name: string;
  main: string;
  ext: string;
  template: string;
}

export enum Verdict {
  FAILED, OK, PARTIAL, COMPILATION_ERROR,
  RUNTIME_ERROR, WRONG_ANSWER, PRESENTATION_ERROR,
  TIME_LIMIT_EXCEEDED, MEMORY_LIMIT_EXCEEDED, 
  IDLENESS_LIMIT_EXCEEDED, SECURITY_VIOLATED, 
  CRASHED, INPUT_PREPARATION_CRASHED, CHALLENGED, 
  SKIPPED, TESTING, REJECTED,
}

export enum TestSet {
  SAMPLES, PRETESTS, TESTS, CHALLENGES,
  TESTS1, TESTS2, TESTS3, TESTS4, TESTS5,
  TESTS6, TESTS7, TESTS8, TESTS9, TESTS10,
}

export interface Submission {
  id: number;
  contestId: number;
  creationTimeSeconds: number;
  relativeTimeSeconds: number;
  problem: Problem;
  author: Party;
  programmingLanguage: string;
  verdict: Verdict;
  testset: TestSet;
  passedTestCount: number;
  timeConsumedMillis: number;
  memoryConsumeBytes: number;
}

export enum ProblemType {
  PROGRAMMING, QUESTION,
}

export interface Problem {
  contestId: number;
  index: string;
  name: string;
  type: ProblemType;
  points: number;
  tags: string[];
}

export interface Member {
  handle: string;
}

export enum ParticipantType {
  PRACTICE,
}

export interface Party {
  contestId: number;
  members: Member[];
  participantType: ParticipantType;
  ghost: boolean;
  room?: number;
  startTimeSeconds: number;
}