'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

import { parseContestCommand, loginCommand, initExtension, submitCommand, logoutCommand, setLanguageCommand, generateSampleTemplatesCommand, updateExtension, startMonitorCommand, stopMonitorCommand } from './commands';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {

	vscode.workspace.onDidChangeConfiguration(event => {
		// TODO: check if re-init is needed
		updateExtension(event.affectsConfiguration);
	});

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	// console.log('Congratulations, your extension "cfhelper" is now active!');
	await initExtension(context);

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with  registerCommand
	// The commandId parameter must match the command field in package.json
	let cmdParseContest = vscode.commands.registerCommand('extension.parseContest', parseContestCommand);
	context.subscriptions.push(cmdParseContest);
	let cmdLogin = vscode.commands.registerCommand('extension.login', loginCommand);
	context.subscriptions.push(cmdLogin);
	let cmdLogout = vscode.commands.registerCommand('extension.logout', logoutCommand);
	context.subscriptions.push(cmdLogout);
	let cmdSubmit = vscode.commands.registerCommand('extension.submit', submitCommand);
	context.subscriptions.push(cmdSubmit);
	let cmdSetLanguage = vscode.commands.registerCommand('extension.setLanguage', setLanguageCommand);
	context.subscriptions.push(cmdSetLanguage);
	let cmdGenerateSampleTemplates = vscode.commands.registerCommand('extension.generateSampleTemplates', generateSampleTemplatesCommand);
	context.subscriptions.push(cmdGenerateSampleTemplates);
	let cmdStartMonitor = vscode.commands.registerCommand('extension.startMonitor', startMonitorCommand);
	context.subscriptions.push(cmdStartMonitor);
	let cmdStopMonitor = vscode.commands.registerCommand('extension.stopMonitor', stopMonitorCommand);
	context.subscriptions.push(cmdStopMonitor);
}

// this method is called when your extension is deactivated
export function deactivate() {
}