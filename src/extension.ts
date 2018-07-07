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

	const maps: { [cmd: string]: (...args: any[]) => any } = {
		parseContest: parseContestCommand,
		login: loginCommand,
		logout: logoutCommand,
		submit: submitCommand,
		setLanguage: setLanguageCommand,
		generateSampleTemplates: generateSampleTemplatesCommand,
		startMonitor: startMonitorCommand,
		stopMonitor: stopMonitorCommand,
	};

	context.subscriptions.concat(Object.keys(maps).map(cmd => {
		return vscode.commands.registerCommand(`extension.${cmd}`, maps[cmd]);
	}));
}

// this method is called when your extension is deactivated
export function deactivate() {
}