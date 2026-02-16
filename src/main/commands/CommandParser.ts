import { CommandResponseIpc } from 'src/ipc';
import { typedIpcMain, typedWebContents } from '../ipc';

import * as BuiltInProviders from './builtins';

type CommandProviderResponse = CommandResponseIpc['suggestions'][string];

export interface CommandMetadata {
  tabUuid?: string;
}

export interface CommandProvider {
  getProviderMetadata: () => CommandProviderResponse['section'];
  getSuggestions: (input: string) => CommandProviderResponse['commands'];
  runCommand: (
    commandId: string,
    input: string,
    metadata?: CommandMetadata,
  ) => void;
}

export class CommandParser {
  private static instance: CommandParser;
  private providers: Record<string, CommandProvider> = {};

  public static getInstance() {
    if (!CommandParser.instance) {
      CommandParser.instance = new CommandParser();
    }

    return CommandParser.instance;
  }

  private constructor() {
    typedIpcMain.on('command-input', (_event, commandInput) => {
      if (commandInput.mode === 'suggestions') {
        typedWebContents(_event.sender).send(
          'command-response',
          this.generateSuggestions(commandInput.input),
        );
      } else if (commandInput.mode === 'execute' && commandInput.command) {
        console.log('Executing command: ', commandInput);
        for (const provider of Object.keys(this.providers)) {
          if (commandInput.command!.startsWith(provider)) {
            this.providers[provider].runCommand(
              commandInput.command.substring(provider.length + 1),
              commandInput.input,
              {
                tabUuid: commandInput.tabUuid,
              },
            );
            return;
          }
        }
        console.log(
          'Error: Could not find provider for ' + commandInput.command,
        );
      }
    });
    for (const BuiltInProvider of Object.values(BuiltInProviders)) {
      this.addProvider(new BuiltInProvider());
    }
  }

  public addProvider(provider: CommandProvider) {
    const meta = provider.getProviderMetadata();
    console.log(`Adding command provider ${meta.name} (${meta.id})`);
    this.providers[meta.id] = provider;
  }

  public removeProvider(provider: CommandProvider) {
    const meta = provider.getProviderMetadata();
    console.log(`Removing command provider ${meta.name} (${meta.id})`);
    delete this.providers[meta.id];
  }

  private generateSuggestions(input: string): CommandResponseIpc {
    const suggestionSections: Record<string, CommandProviderResponse> = {};

    for (const provider of Object.values(this.providers)) {
      const metadata = provider.getProviderMetadata();
      const suggestions = provider.getSuggestions(input);
      if (suggestions.length > 0) {
        suggestionSections[metadata.id] = {
          section: metadata,
          commands: suggestions.map((suggestion) => ({
            ...suggestion,
            value: `${metadata.id}.${suggestion.value}`,
          })),
        };
      }
    }

    return {
      provider: {
        prompt: 'Type a command or search...',
      },
      suggestions: suggestionSections,
    };
  }
}
