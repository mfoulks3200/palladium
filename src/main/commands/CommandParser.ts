import fuzzysort from 'fuzzysort';
import { CommandResponseIpc } from 'src/ipc';
import { typedIpcMain } from '../ipc';
import { TabManager } from '../TabManager';
import { Tab } from '../Tab';

import * as BuiltInProviders from './builtins';

type CommandProviderResponse = CommandResponseIpc['suggestions'][string];

/** A single suggestion item returned by a command provider. */
export type CommandSuggestion = CommandProviderResponse['commands'][number];

/** An array of suggestion items returned by a command provider. */
export type CommandSuggestions = CommandProviderResponse['commands'];

export interface CommandResult {
  success: boolean;
  error?: string;
}

export interface CommandMetadata {
  tabUuid?: string;
  tab?: Tab;
}

export interface CommandProvider {
  getProviderMetadata: () => CommandProviderResponse['section'];
  getSuggestions: (
    input: string,
  ) =>
    | CommandProviderResponse['commands']
    | Promise<CommandProviderResponse['commands']>;
  runCommand: (
    commandId: string,
    input: string,
    metadata?: CommandMetadata,
  ) => CommandResult | Promise<CommandResult>;
}

const providerWeightInfluence = 0.1;

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
    typedIpcMain.handle('command-input', async (_event, commandInput) => {
      if (commandInput.mode === 'suggestions') {
        return this.generateSuggestions(commandInput.input);
      }
      if (commandInput.mode === 'execute' && commandInput.command) {
        const metadata = this.resolveMetadata(commandInput.tabUuid);
        for (const provider of Object.keys(this.providers)) {
          if (commandInput.command!.startsWith(provider)) {
            const result = await this.providers[provider].runCommand(
              commandInput.command.substring(provider.length + 1),
              commandInput.input,
              metadata,
            );
            if (!result.success) {
              console.error(
                `Command failed (${commandInput.command}):`,
                result.error,
              );
            }
            return undefined;
          }
        }
        console.error('Could not find provider for ' + commandInput.command);
      }
      return undefined;
    });
    for (const BuiltInProvider of Object.values(BuiltInProviders)) {
      this.addProvider(new BuiltInProvider());
    }
  }

  private resolveMetadata(tabUuid?: string): CommandMetadata {
    const metadata: CommandMetadata = { tabUuid };
    if (tabUuid) {
      metadata.tab = TabManager.getInstance().getTabByUuid(tabUuid);
    }
    return metadata;
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

  private async generateSuggestions(
    input: string,
  ): Promise<CommandResponseIpc> {
    const suggestionSections: Record<string, CommandProviderResponse> = {};

    const results = await Promise.allSettled(
      Object.values(this.providers).map(async (provider) => {
        const metadata = provider.getProviderMetadata();
        const suggestions = await provider.getSuggestions(input);
        return { metadata, suggestions };
      }),
    );

    for (const result of results) {
      if (result.status === 'rejected') {
        console.error(
          'Command provider failed during suggestions:',
          result.reason,
        );
        continue;
      }

      const { metadata, suggestions } = result.value;

      let scored: {
        command: CommandProviderResponse['commands'][number];
        score?: number;
      }[];

      if (!input) {
        scored = suggestions.map((cmd) => ({ command: cmd }));
      } else {
        const fuzzyResults = fuzzysort.go(input, suggestions, {
          keys: ['name', 'keywords'],
          threshold: -1000,
        });
        scored = fuzzyResults.map((r) => {
          const influencedWeight =
            (r.obj.weight ?? 0) * providerWeightInfluence;
          const invWeight = 1 - influencedWeight;
          return {
            command: r.obj,
            score: r.score * invWeight,
          };
        });
      }

      if (scored.length > 0) {
        suggestionSections[metadata.id] = {
          section: metadata,
          commands: scored.map(({ command, score }) => ({
            ...command,
            value: `${metadata.id}.${command.value}`,
            score,
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
