const mockIpcHandle = jest.fn();

jest.mock('../../ipc', () => ({
  typedIpcMain: {
    handle: mockIpcHandle,
  },
}));

// Mock builtins to prevent real providers from loading.
// The module uses `import * as BuiltInProviders from './builtins'` then
// iterates Object.values — so we need an object with zero enumerable values
// that could be mistaken for constructors.
jest.mock('../builtins', () => {
  return Object.defineProperty({}, '__esModule', { value: true });
});

jest.mock('fuzzysort', () => ({
  __esModule: true,
  default: {
    go: jest.fn(),
  },
}));

jest.mock('../../TabManager', () => ({
  TabManager: {
    getInstance: jest.fn(() => ({
      getTabByUuid: jest.fn(() => undefined),
      focusTab: jest.fn(),
    })),
  },
}));

jest.mock('../../Tab', () => ({
  Tab: jest.fn().mockImplementation((url: string) => ({ url })),
}));

import fuzzysort from 'fuzzysort';
import { CommandParser, CommandProvider } from '../CommandParser';

function createMockProvider(
  id: string,
  name: string,
  commands: ReturnType<CommandProvider['getSuggestions']> = [],
): CommandProvider {
  return {
    getProviderMetadata: jest.fn(() => ({ id, name })),
    getSuggestions: jest.fn(() => commands),
    runCommand: jest.fn().mockReturnValue({ success: true }),
  };
}

describe('CommandParser', () => {
  beforeEach(() => {
    // Reset singleton so each test gets a fresh instance
    CommandParser['instance'] = undefined as any;
    jest.clearAllMocks();
  });

  describe('getInstance', () => {
    it('returns the same instance on repeated calls', () => {
      const first = CommandParser.getInstance();
      const second = CommandParser.getInstance();
      expect(first).toBe(second);
    });

    it('registers the command-input IPC handler on construction', () => {
      CommandParser.getInstance();
      expect(mockIpcHandle).toHaveBeenCalledWith(
        'command-input',
        expect.any(Function),
      );
    });
  });

  describe('addProvider', () => {
    it('registers a provider by its metadata id', async () => {
      const parser = CommandParser.getInstance();
      const provider = createMockProvider('test.provider', 'Test');
      parser.addProvider(provider);

      // Verify the provider is used during suggestion generation
      // by triggering the IPC handler with a suggestion request
      const ipcHandler = mockIpcHandle.mock.calls.find(
        (call: any[]) => call[0] === 'command-input',
      )![1];

      const fakeEvent = { sender: {} };
      await ipcHandler(fakeEvent, { mode: 'suggestions', input: '' });

      expect(provider.getSuggestions).toHaveBeenCalledWith('');
    });

    it('registers multiple providers independently', async () => {
      const parser = CommandParser.getInstance();
      const providerA = createMockProvider('provider.a', 'Provider A');
      const providerB = createMockProvider('provider.b', 'Provider B');

      parser.addProvider(providerA);
      parser.addProvider(providerB);

      const ipcHandler = mockIpcHandle.mock.calls.find(
        (call: any[]) => call[0] === 'command-input',
      )![1];

      const fakeEvent = { sender: {} };
      await ipcHandler(fakeEvent, { mode: 'suggestions', input: '' });

      expect(providerA.getSuggestions).toHaveBeenCalled();
      expect(providerB.getSuggestions).toHaveBeenCalled();
    });
  });

  describe('removeProvider', () => {
    it('removes a previously registered provider', async () => {
      const parser = CommandParser.getInstance();
      const provider = createMockProvider('test.provider', 'Test');

      parser.addProvider(provider);
      parser.removeProvider(provider);

      const ipcHandler = mockIpcHandle.mock.calls.find(
        (call: any[]) => call[0] === 'command-input',
      )![1];

      // Reset mock call count after addProvider's verification call
      (provider.getSuggestions as jest.Mock).mockClear();

      const fakeEvent = { sender: {} };
      await ipcHandler(fakeEvent, { mode: 'suggestions', input: '' });

      expect(provider.getSuggestions).not.toHaveBeenCalled();
    });
  });

  describe('generateSuggestions', () => {
    it('returns all commands without fuzzy search when input is empty', async () => {
      const parser = CommandParser.getInstance();
      const commands = [
        { name: 'New Tab', value: 'new-tab', keywords: ['tab'] },
        { name: 'Close Tab', value: 'close-tab', keywords: ['tab'] },
      ];
      const provider = createMockProvider('tabs', 'Tabs', commands);
      parser.addProvider(provider);

      const ipcHandler = mockIpcHandle.mock.calls.find(
        (call: any[]) => call[0] === 'command-input',
      )![1];

      const fakeEvent = { sender: {} };
      const result = await ipcHandler(fakeEvent, {
        mode: 'suggestions',
        input: '',
      });

      expect(fuzzysort.go).not.toHaveBeenCalled();
      expect(result).toEqual(
        expect.objectContaining({
          provider: { prompt: 'Type a command or search...' },
          suggestions: {
            tabs: {
              section: { id: 'tabs', name: 'Tabs' },
              commands: [
                expect.objectContaining({
                  name: 'New Tab',
                  value: 'tabs.new-tab',
                }),
                expect.objectContaining({
                  name: 'Close Tab',
                  value: 'tabs.close-tab',
                }),
              ],
            },
          },
        }),
      );
    });

    it('uses fuzzysort when input is provided', async () => {
      const parser = CommandParser.getInstance();
      const commands = [
        {
          name: 'New Tab',
          value: 'new-tab',
          keywords: ['tab'],
          weight: 0,
        },
      ];
      const provider = createMockProvider('tabs', 'Tabs', commands);
      parser.addProvider(provider);

      (fuzzysort.go as jest.Mock).mockReturnValue([
        {
          obj: {
            name: 'New Tab',
            value: 'new-tab',
            keywords: ['tab'],
            weight: 0,
          },
          score: -50,
        },
      ]);

      const ipcHandler = mockIpcHandle.mock.calls.find(
        (call: any[]) => call[0] === 'command-input',
      )![1];

      const fakeEvent = { sender: {} };
      const result = await ipcHandler(fakeEvent, {
        mode: 'suggestions',
        input: 'new',
      });

      expect(fuzzysort.go).toHaveBeenCalledWith('new', commands, {
        keys: ['name', 'keywords'],
        threshold: -1000,
      });

      expect(result).toEqual(
        expect.objectContaining({
          suggestions: {
            tabs: expect.objectContaining({
              commands: [
                expect.objectContaining({
                  name: 'New Tab',
                  value: 'tabs.new-tab',
                  score: -50, // weight=0, so invWeight=1, score*1=-50
                }),
              ],
            }),
          },
        }),
      );
    });

    it('applies weight influence to fuzzy scores', async () => {
      const parser = CommandParser.getInstance();
      const commands = [
        {
          name: 'Weighted Cmd',
          value: 'weighted',
          keywords: [],
          weight: 5,
        },
      ];
      const provider = createMockProvider('test', 'Test', commands);
      parser.addProvider(provider);

      // weight=5, providerWeightInfluence=0.1
      // influencedWeight = 5 * 0.1 = 0.5
      // invWeight = 1 - 0.5 = 0.5
      // score = -100 * 0.5 = -50
      (fuzzysort.go as jest.Mock).mockReturnValue([
        {
          obj: commands[0],
          score: -100,
        },
      ]);

      const ipcHandler = mockIpcHandle.mock.calls.find(
        (call: any[]) => call[0] === 'command-input',
      )![1];

      const fakeEvent = { sender: {} };
      const result = await ipcHandler(fakeEvent, {
        mode: 'suggestions',
        input: 'weight',
      });

      expect(result).toEqual(
        expect.objectContaining({
          suggestions: {
            test: expect.objectContaining({
              commands: [
                expect.objectContaining({
                  score: -50,
                }),
              ],
            }),
          },
        }),
      );
    });

    it('omits providers that return zero matching commands', async () => {
      const parser = CommandParser.getInstance();

      const emptyProvider = createMockProvider('empty', 'Empty', []);
      const fullProvider = createMockProvider('full', 'Full', [
        { name: 'Cmd', value: 'cmd', keywords: [] },
      ]);

      parser.addProvider(emptyProvider);
      parser.addProvider(fullProvider);

      const ipcHandler = mockIpcHandle.mock.calls.find(
        (call: any[]) => call[0] === 'command-input',
      )![1];

      const fakeEvent = { sender: {} };
      const result = await ipcHandler(fakeEvent, {
        mode: 'suggestions',
        input: '',
      });

      expect(result.suggestions).not.toHaveProperty('empty');
      expect(result.suggestions).toHaveProperty('full');
    });

    it('prefixes command values with the provider id', async () => {
      const parser = CommandParser.getInstance();
      const provider = createMockProvider('my.provider', 'My Provider', [
        { name: 'Do Thing', value: 'do-thing', keywords: [] },
      ]);
      parser.addProvider(provider);

      const ipcHandler = mockIpcHandle.mock.calls.find(
        (call: any[]) => call[0] === 'command-input',
      )![1];

      const fakeEvent = { sender: {} };
      const result = await ipcHandler(fakeEvent, {
        mode: 'suggestions',
        input: '',
      });

      const commands = result.suggestions['my.provider'].commands;
      expect(commands[0].value).toBe('my.provider.do-thing');
    });
  });

  describe('command execution', () => {
    it('routes execute to the correct provider based on command prefix', async () => {
      const parser = CommandParser.getInstance();
      const providerA = createMockProvider('alpha', 'Alpha');
      const providerB = createMockProvider('beta', 'Beta');

      parser.addProvider(providerA);
      parser.addProvider(providerB);

      const ipcHandler = mockIpcHandle.mock.calls.find(
        (call: any[]) => call[0] === 'command-input',
      )![1];

      const fakeEvent = { sender: {} };
      await ipcHandler(fakeEvent, {
        mode: 'execute',
        input: 'some input',
        command: 'beta.do-something',
        tabUuid: 'tab-123',
      });

      expect(providerB.runCommand).toHaveBeenCalledWith(
        'do-something',
        'some input',
        expect.objectContaining({ tabUuid: 'tab-123' }),
      );
      expect(providerA.runCommand).not.toHaveBeenCalled();
    });

    it('strips provider prefix and dot from the command id', async () => {
      const parser = CommandParser.getInstance();
      const provider = createMockProvider('nav', 'Navigation');
      parser.addProvider(provider);

      const ipcHandler = mockIpcHandle.mock.calls.find(
        (call: any[]) => call[0] === 'command-input',
      )![1];

      const fakeEvent = { sender: {} };
      await ipcHandler(fakeEvent, {
        mode: 'execute',
        input: '',
        command: 'nav.go-back',
      });

      // "nav.go-back" -> strips "nav" (length 3) + 1 for the dot = substring(4) = "go-back"
      expect(provider.runCommand).toHaveBeenCalledWith('go-back', '', {
        tabUuid: undefined,
      });
    });

    it('logs an error when no provider matches the command', async () => {
      const consoleSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      CommandParser.getInstance();

      const ipcHandler = mockIpcHandle.mock.calls.find(
        (call: any[]) => call[0] === 'command-input',
      )![1];

      const fakeEvent = { sender: {} };
      await ipcHandler(fakeEvent, {
        mode: 'execute',
        input: '',
        command: 'nonexistent.command',
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          'Could not find provider for nonexistent.command',
        ),
      );

      consoleSpy.mockRestore();
    });

    it('does not execute when mode is execute but command is missing', async () => {
      const parser = CommandParser.getInstance();
      const provider = createMockProvider('test', 'Test');
      parser.addProvider(provider);

      const ipcHandler = mockIpcHandle.mock.calls.find(
        (call: any[]) => call[0] === 'command-input',
      )![1];

      const fakeEvent = { sender: {} };
      await ipcHandler(fakeEvent, {
        mode: 'execute',
        input: '',
        // no command field
      });

      expect(provider.runCommand).not.toHaveBeenCalled();
    });
  });
});
