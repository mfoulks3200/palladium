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
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import './CommandBar.css';
import { CommandResponseIpc } from 'src/ipc';
import { LucideIcons } from '@/lib/icons';

interface CommandBarProps {
  className?: string;
}

interface GroupedSection {
  sectionId: string;
  sectionName: string;
  commands: CommandResponseIpc['suggestions'][number]['commands'];
}

export const CommandBar = ({ className }: CommandBarProps) => {
  const [currentText, setCurrentText] = useState('');
  const [tabUuid, setTabUuid] = useState<string | undefined>(undefined);
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

  const groupedSections = useMemo((): GroupedSection[] => {
    if (!commandResponse) return [];

    const allCommands = Object.values(commandResponse.suggestions).flatMap(
      (section) =>
        section.commands.map((cmd) => ({ section: section.section, command: cmd })),
    );

    allCommands.sort((a, b) => (b.command.score ?? 0) - (a.command.score ?? 0));

    const sections: GroupedSection[] = [];
    let currentSection: GroupedSection | null = null;

    for (const { section, command } of allCommands) {
      if (!currentSection || currentSection.sectionId !== section.id) {
        currentSection = {
          sectionId: section.id,
          sectionName: section.name,
          commands: [],
        };
        sections.push(currentSection);
      }
      currentSection.commands.push(command);
    }

    return sections;
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
        {groupedSections.map((section, idx) => (
          <div key={section.sectionId}>
            {idx > 0 && <CommandSeparator />}
            <CommandGroup heading={section.sectionName}>
              {section.commands.map((command) => (
                <CommandSuggestionItem key={command.value} command={command} />
              ))}
            </CommandGroup>
          </div>
        ))}
      </CommandList>
    </Command>
  );
};

type CommandSuggestion =
  CommandResponseIpc['suggestions'][number]['commands'][number];

const CommandIcon = ({ icon }: { icon: string }) => {
  if (Object.hasOwn(LucideIcons, icon)) {
    const Icon = LucideIcons[icon];
    return <Icon />;
  }
  return <img src={icon} className="h-[18px] w-[18px]" />;
};

const CommandSuggestionItem = ({ command }: { command: CommandSuggestion }) => {
  return (
    <CommandItem
      value={command.value}
      keywords={[command.value, command.name]}
    >
      {command.icon && <CommandIcon icon={command.icon} />}
      <div className="flex flex-col">
        <span>{command.name}</span>
        {command.subname && (
          <span className="max-w-96 truncate opacity-50">
            {command.subname}
          </span>
        )}
      </div>
      <CommandShortcut>
        <div className="flex gap-0.5">
          <span>
            ({((command.weight ?? 0) * 100).toFixed(1)}%){' '}
          </span>
          <span>{((command.score ?? 0) * 100).toFixed(1)}%</span>
        </div>
      </CommandShortcut>
    </CommandItem>
  );
};
