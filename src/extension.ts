'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

import { parseContestCommand, loginCommand, fetchContestList } from './commands';
import { login, setContext } from './api';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "cf-parser" is now active!');
	setContext(context);

	// await fetchContestList();
	console.log('state cookie:', context.globalState.get('cookie')); return;
	await login('hungle.cse', 'hungct');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with  registerCommand
	// The commandId parameter must match the command field in package.json
	let cmdParseContest = vscode.commands.registerCommand('extension.parseContest', parseContestCommand);
	context.subscriptions.push(cmdParseContest);
	let cmdLogin = vscode.commands.registerCommand('extension.login', loginCommand);
	context.subscriptions.push(cmdLogin);
}

// this method is called when your extension is deactivated
export function deactivate() {
}