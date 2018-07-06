import { Memento, ExtensionContext, StatusBarItem } from "vscode";
import { SubmissionMonitor } from "./monitor";

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
  CF = 'CF', IOI = 'IOI', ICPC = 'ICPC',
}

export enum ContestPhase {
  BEFORE = 'BEFORE', CODING = 'CODING', PENDING_SYSTEM_TEST = 'PENDING_SYSTEM_TEST', SYSTEM_TEST = 'SYSTEM_TEST', FINISHED = 'FINISHED',
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
  monitor: SubmissionMonitor;
}

export interface LanguageConfig {
  id: number;
  name: string;
  main: string;
  ext: string;
  template: string;
}

export interface LanguageConfigs {
  [lang: string]: LanguageConfig;
}

export enum Verdict {
  FAILED = 'FAILED', OK = 'OK', PARTIAL = 'PARTIAL', COMPILATION_ERROR = 'COMPILATION_ERROR',
  RUNTIME_ERROR = 'RUNTIME_ERROR', WRONG_ANSWER = 'WRONG_ANSWER', PRESENTATION_ERROR = 'PRESENTATION_ERROR',
  TIME_LIMIT_EXCEEDED = 'TIME_LIMIT_EXCEEDED', MEMORY_LIMIT_EXCEEDED = 'MEMORY_LIMIT_EXCEEDED', 
  IDLENESS_LIMIT_EXCEEDED = 'IDLENESS_LIMIT_EXCEEDED', SECURITY_VIOLATED = 'SECURITY_VIOLATED', 
  CRASHED = 'CRASHED', INPUT_PREPARATION_CRASHED = 'INPUT_PREPARATION_CRASHED', CHALLENGED = 'CHALLENGED', 
  SKIPPED = 'SKIPPED', TESTING = 'TESTING', REJECTED = 'REJECTED',
}

export enum TestSet {
  SAMPLES = 'SAMPLES', PRETESTS = 'PRETESTS', TESTS = 'TESTS', CHALLENGES = 'CHALLENGES',
  TESTS1 = 'TESTS1', TESTS2 = 'TESTS2', TESTS3 = 'TESTS3', TESTS4 = 'TESTS4', TESTS5 = 'TESTS5',
  TESTS6 = 'TESTS6', TESTS7 = 'TESTS7', TESTS8 = 'TESTS8', TESTS9 = 'TESTS9', TESTS10 = 'TESTS10',
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
  PROGRAMMING = 'PROGRAMMING', QUESTION = 'QUESTION',
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

export interface ProblemInfo {
  contestId: string;
  problemId: string;
  language?: string;
}
