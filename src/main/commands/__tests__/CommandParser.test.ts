const mockIpcOn = jest.fn();
const mockWebContentsSend = jest.fn();

jest.mock('../../ipc', () => ({
  typedIpcMain: {
    on: mockIpcOn,
  },
  typedWebContents: jest.fn(() => ({
    send: mockWebContentsSend,
  })),
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

import fuzzysort from 'fuzzysort';
import { CommandParser, CommandProvider } from '../CommandParser';
import { typedWebContents } from '../../ipc';

function createMockProvider(
  id: string,
  name: string,
  commands: ReturnType<CommandProvider['getSuggestions']> = [],
): CommandProvider {
  return {
    getProviderMetadata: jest.fn(() => ({ id, name })),
    getSuggestions: jest.fn(() => commands),
    runCommand: jest.fn(),
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
      expect(mockIpcOn).toHaveBeenCalledWith(
        'command-input',
        expect.any(Function),
      );
    });
  });

  describe('addProvider', () => {
    it('registers a provider by its metadata id', () => {
      const parser = CommandParser.getInstance();
      const provider = createMockProvider('test.provider', 'Test');
      parser.addProvider(provider);

      // Verify the provider is used during suggestion generation
      // by triggering the IPC handler with a suggestion request
      const ipcHandler = mockIpcOn.mock.calls.find(
        (call: any[]) => call[0] === 'command-input',
      )![1];

      const fakeEvent = { sender: {} };
      ipcHandler(fakeEvent, { mode: 'suggestions', input: '' });

      expect(provider.getSuggestions).toHaveBeenCalledWith('');
    });

    it('registers multiple providers independently', () => {
      const parser = CommandParser.getInstance();
      const providerA = createMockProvider('provider.a', 'Provider A');
      const providerB = createMockProvider('provider.b', 'Provider B');

      parser.addProvider(providerA);
      parser.addProvider(providerB);

      const ipcHandler = mockIpcOn.mock.calls.find(
        (call: any[]) => call[0] === 'command-input',
      )![1];

      const fakeEvent = { sender: {} };
      ipcHandler(fakeEvent, { mode: 'suggestions', input: '' });

      expect(providerA.getSuggestions).toHaveBeenCalled();
      expect(providerB.getSuggestions).toHaveBeenCalled();
    });
  });

  describe('removeProvider', () => {
    it('removes a previously registered provider', () => {
      const parser = CommandParser.getInstance();
      const provider = createMockProvider('test.provider', 'Test');

      parser.addProvider(provider);
      parser.removeProvider(provider);

      const ipcHandler = mockIpcOn.mock.calls.find(
        (call: any[]) => call[0] === 'command-input',
      )![1];

      // Reset mock call count after addProvider's verification call
      (provider.getSuggestions as jest.Mock).mockClear();

      const fakeEvent = { sender: {} };
      ipcHandler(fakeEvent, { mode: 'suggestions', input: '' });

      expect(provider.getSuggestions).not.toHaveBeenCalled();
    });
  });

  describe('generateSuggestions', () => {
    it('returns all commands without fuzzy search when input is empty', () => {
      const parser = CommandParser.getInstance();
      const commands = [
        { name: 'New Tab', value: 'new-tab', keywords: ['tab'] },
        { name: 'Close Tab', value: 'close-tab', keywords: ['tab'] },
      ];
      const provider = createMockProvider('tabs', 'Tabs', commands);
      parser.addProvider(provider);

      const ipcHandler = mockIpcOn.mock.calls.find(
        (call: any[]) => call[0] === 'command-input',
      )![1];

      const fakeEvent = { sender: {} };
      ipcHandler(fakeEvent, { mode: 'suggestions', input: '' });

      expect(fuzzysort.go).not.toHaveBeenCalled();
      expect(mockWebContentsSend).toHaveBeenCalledWith(
        'command-response',
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

    it('uses fuzzysort when input is provided', () => {
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

      const ipcHandler = mockIpcOn.mock.calls.find(
        (call: any[]) => call[0] === 'command-input',
      )![1];

      const fakeEvent = { sender: {} };
      ipcHandler(fakeEvent, { mode: 'suggestions', input: 'new' });

      expect(fuzzysort.go).toHaveBeenCalledWith('new', commands, {
        keys: ['name', 'keywords'],
        threshold: -1000,
      });

      expect(mockWebContentsSend).toHaveBeenCalledWith(
        'command-response',
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

    it('applies weight influence to fuzzy scores', () => {
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

      const ipcHandler = mockIpcOn.mock.calls.find(
        (call: any[]) => call[0] === 'command-input',
      )![1];

      const fakeEvent = { sender: {} };
      ipcHandler(fakeEvent, { mode: 'suggestions', input: 'weight' });

      expect(mockWebContentsSend).toHaveBeenCalledWith(
        'command-response',
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

    it('omits providers that return zero matching commands', () => {
      const parser = CommandParser.getInstance();

      const emptyProvider = createMockProvider('empty', 'Empty', []);
      const fullProvider = createMockProvider('full', 'Full', [
        { name: 'Cmd', value: 'cmd', keywords: [] },
      ]);

      parser.addProvider(emptyProvider);
      parser.addProvider(fullProvider);

      const ipcHandler = mockIpcOn.mock.calls.find(
        (call: any[]) => call[0] === 'command-input',
      )![1];

      const fakeEvent = { sender: {} };
      ipcHandler(fakeEvent, { mode: 'suggestions', input: '' });

      const responseCall = mockWebContentsSend.mock.calls[0];
      const suggestions = responseCall[1].suggestions;

      expect(suggestions).not.toHaveProperty('empty');
      expect(suggestions).toHaveProperty('full');
    });

    it('prefixes command values with the provider id', () => {
      const parser = CommandParser.getInstance();
      const provider = createMockProvider('my.provider', 'My Provider', [
        { name: 'Do Thing', value: 'do-thing', keywords: [] },
      ]);
      parser.addProvider(provider);

      const ipcHandler = mockIpcOn.mock.calls.find(
        (call: any[]) => call[0] === 'command-input',
      )![1];

      const fakeEvent = { sender: {} };
      ipcHandler(fakeEvent, { mode: 'suggestions', input: '' });

      const responseCall = mockWebContentsSend.mock.calls[0];
      const commands = responseCall[1].suggestions['my.provider'].commands;
      expect(commands[0].value).toBe('my.provider.do-thing');
    });
  });

  describe('command execution', () => {
    it('routes execute to the correct provider based on command prefix', () => {
      const parser = CommandParser.getInstance();
      const providerA = createMockProvider('alpha', 'Alpha');
      const providerB = createMockProvider('beta', 'Beta');

      parser.addProvider(providerA);
      parser.addProvider(providerB);

      const ipcHandler = mockIpcOn.mock.calls.find(
        (call: any[]) => call[0] === 'command-input',
      )![1];

      const fakeEvent = { sender: {} };
      ipcHandler(fakeEvent, {
        mode: 'execute',
        input: 'some input',
        command: 'beta.do-something',
        tabUuid: 'tab-123',
      });

      expect(providerB.runCommand).toHaveBeenCalledWith(
        'do-something',
        'some input',
        { tabUuid: 'tab-123' },
      );
      expect(providerA.runCommand).not.toHaveBeenCalled();
    });

    it('strips provider prefix and dot from the command id', () => {
      const parser = CommandParser.getInstance();
      const provider = createMockProvider('nav', 'Navigation');
      parser.addProvider(provider);

      const ipcHandler = mockIpcOn.mock.calls.find(
        (call: any[]) => call[0] === 'command-input',
      )![1];

      const fakeEvent = { sender: {} };
      ipcHandler(fakeEvent, {
        mode: 'execute',
        input: '',
        command: 'nav.go-back',
      });

      // "nav.go-back" -> strips "nav" (length 3) + 1 for the dot = substring(4) = "go-back"
      expect(provider.runCommand).toHaveBeenCalledWith('go-back', '', {
        tabUuid: undefined,
      });
    });

    it('logs an error when no provider matches the command', () => {
      const consoleSpy = jest
        .spyOn(console, 'log')
        .mockImplementation(() => {});

      const parser = CommandParser.getInstance();

      const ipcHandler = mockIpcOn.mock.calls.find(
        (call: any[]) => call[0] === 'command-input',
      )![1];

      const fakeEvent = { sender: {} };
      ipcHandler(fakeEvent, {
        mode: 'execute',
        input: '',
        command: 'nonexistent.command',
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          'Error: Could not find provider for nonexistent.command',
        ),
      );

      consoleSpy.mockRestore();
    });

    it('does not execute when mode is execute but command is missing', () => {
      const parser = CommandParser.getInstance();
      const provider = createMockProvider('test', 'Test');
      parser.addProvider(provider);

      const ipcHandler = mockIpcOn.mock.calls.find(
        (call: any[]) => call[0] === 'command-input',
      )![1];

      const fakeEvent = { sender: {} };
      ipcHandler(fakeEvent, {
        mode: 'execute',
        input: '',
        // no command field
      });

      expect(provider.runCommand).not.toHaveBeenCalled();
    });
  });
});
