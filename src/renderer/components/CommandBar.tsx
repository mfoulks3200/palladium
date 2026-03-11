import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { ChevronRight } from 'lucide-react';
import {
  ReactElement,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import './CommandBar.css';
import { CommandResponseIpc } from 'src/ipc';
import { LucideIcons } from 'src/ipc/Icons';
import { flushSync } from 'react-dom';

interface CommandBarProps {
  className?: string;
}

interface Lozenge {
  name: string;
  classes: string;
}

export const CommandBar = ({ className }: CommandBarProps) => {
  const [currentText, setCurrentText] = useState('');
  const [tabUuid, setTabUuid] = useState<string | undefined>(undefined);
  const [shortcut, setShortcut] = useState<string | undefined>(undefined);
  const [commandResponse, setCommandResponse] =
    useState<CommandResponseIpc | null>();
  const [selectedCommand, setSelectedCommand] = useState<string | undefined>(
    undefined,
  );
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const removeListener = window.electron.ipcRenderer.on(
      'command-setup',
      (response) => {
        setTabUuid(
          response.tabUuid.length === 0 ? undefined : response.tabUuid,
        );
        if (response.prefill.trim().length > 0) {
          setCurrentText(response.prefill);
          setTimeout(() => {
            if (inputRef.current) {
              inputRef.current.select();
            }
          }, 1);
        }
      },
    );

    return () => {
      removeListener();
    };
  }, []);

  const handleSuggestionResponse = useCallback(
    (response: CommandResponseIpc) => {
      setCommandResponse(response);
      setSelectedCommand((prev) => {
        if (!prev && Object.keys(response.suggestions).length > 0) {
          return Object.values(response.suggestions)[0].commands[0].value;
        }
        if (prev && Object.keys(response.suggestions).length === 0) {
          return undefined;
        }
        return prev;
      });
    },
    [],
  );

  useEffect(() => {
    window.electron.ipcRenderer
      .invoke('command-input', {
        mode: 'suggestions' as const,
        input: currentText,
      })
      .then((response) => {
        if (response) handleSuggestionResponse(response);
        return undefined;
      })
      .catch(console.error);
  }, []);

  const onInput = useCallback(
    (newInput: string) => {
      setCurrentText(newInput);
      window.electron.ipcRenderer
        .invoke('command-input', {
          mode: 'suggestions' as const,
          input: newInput,
        })
        .then((response) => {
          if (response) handleSuggestionResponse(response);
          return undefined;
        })
        .catch(console.error);
    },
    [handleSuggestionResponse],
  );

  const closeCommandBar = useCallback(() => {
    window.electron.ipcRenderer.sendMessage('command-bar', {
      action: 'close',
    });
  }, []);

  const onKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeCommandBar();
      } else if (event.key === 'Tab') {
        event.preventDefault();
      } else if (event.key === 'Enter') {
        event.preventDefault();
        if (selectedCommand) {
          window.electron.ipcRenderer.invoke('command-input', {
            mode: 'execute' as const,
            input: currentText,
            command: selectedCommand,
            tabUuid: tabUuid,
          });
          closeCommandBar();
        }
      }
    },
    [currentText, selectedCommand],
  );

  const commandItems = useMemo(() => {
    if (!commandResponse) return [];
    const orderedCommands: {
      section: CommandResponseIpc['suggestions'][number]['section'];
      command: CommandResponseIpc['suggestions'][number]['commands'][number];
    }[] = [];
    for (const section of Object.values(commandResponse.suggestions)) {
      for (const command of section.commands) {
        orderedCommands.push({
          section: section.section,
          command,
        });
      }
    }

    const commandSections: ReactElement[] = [];
    let lastSection:
      | CommandResponseIpc['suggestions'][number]['section']
      | null = null;
    let lastSectionCommands: ReactElement[] = [];

    const addSection = (sectionName: string) => {
      if (lastSectionCommands.length > 0) {
        commandSections.push(
          <>
            {commandSections.length > 0 && <CommandSeparator />}
            <CommandGroup heading={sectionName}>
              {lastSectionCommands}
            </CommandGroup>
          </>,
        );
        lastSectionCommands = [];
      }
    };

    for (const command of orderedCommands.sort(
      (a, b) => b.command.score! - a.command.score!,
    )) {
      if (
        !lastSection ||
        (command.section.id !== lastSection.id &&
          lastSectionCommands.length > 0)
      ) {
        addSection(lastSection?.name ?? 'Undefined');
      }

      let icon = <></>;
      if (command.command.icon) {
        if (Object.hasOwn(LucideIcons, command.command.icon)) {
          // @ts-expect-error
          const CommandIcon = LucideIcons[command.command.icon];
          icon = <CommandIcon />;
        } else {
          icon = (
            <img src={command.command.icon} className="h-[18px] w-[18px]" />
          );
        }
      }

      lastSectionCommands.push(
        <CommandItem
          value={command.command.value}
          keywords={[command.command.value, command.command.name]}
        >
          {!!command.command.icon && icon}
          <div className="flex flex-col">
            <span>{command.command.name}</span>
            {command.command.subname && (
              <span className="max-w-96 truncate opacity-50">
                {command.command.subname}
              </span>
            )}
          </div>

          <CommandShortcut>
            <div className="flex gap-0.5">
              <span>
                ({((command.command.weight ?? 0) * 100).toFixed(1)}%){' '}
              </span>
              <span>{((command.command.score ?? 0) * 100).toFixed(1)}%</span>
            </div>
          </CommandShortcut>

          {/* {command.command.shortcut &&
            (currentText.length === 0 ||
              command.command.shortcut.shortcutStr.startsWith(currentText)) && (
              <CommandShortcut>
                <div className="flex gap-0.5">
                  {command.command.shortcut.shortcutStr} <ChevronRight /> Tab
                </div>
              </CommandShortcut>
            )} */}
        </CommandItem>,
      );

      lastSection = command.section;
    }

    addSection(lastSection!.name);

    return commandSections;
  }, [commandResponse]);

  if (!commandResponse) {
    return <></>;
  }

  return (
    <Command
      onValueChange={setSelectedCommand}
      value={selectedCommand}
      className={cn('h-full w-full transition-none', className)}
      shouldFilter={false}
    >
      <CommandInput
        className="p-1 px-4 text-xl"
        placeholder={commandResponse.provider.prompt}
        showBeforeElement={!!commandResponse.provider.lozenge}
        beforeElement={<>{commandResponse.provider.lozenge?.name ?? ''}</>}
        beforeElementClass={commandResponse.provider.lozenge?.color ?? ''}
        autoFocus={true}
        onInput={(event) => {
          //@ts-expect-error
          onInput(event.target.value);
        }}
        value={currentText}
        onKeyDown={onKeyDown as any}
        ref={inputRef}
      />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        {commandItems.length > 0 && commandItems}
      </CommandList>
    </Command>
  );
};
