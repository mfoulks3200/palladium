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
import { ReactElement, useCallback, useEffect, useRef, useState } from 'react';

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
  const [commandResponse, setCommandResponse] =
    useState<CommandResponseIpc | null>();
  const [selectedCommand, setSelectedCommand] = useState<string | undefined>(
    undefined,
  );
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    window.electron.ipcRenderer.on('command-setup', (response) => {
      setTabUuid(response.tabUuid.length === 0 ? undefined : response.tabUuid);
      if (response.prefill.trim().length > 0) {
        setCurrentText(response.prefill);
        setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.select();
          }
        }, 1);
      }
    });
  }, [inputRef.current, currentText]);

  useEffect(() => {
    window.electron.ipcRenderer.on('command-response', (response) => {
      setCommandResponse(response);
      if (!selectedCommand && Object.keys(response.suggestions).length > 0) {
        setSelectedCommand(
          Object.values(response.suggestions)[0].commands[0].value,
        );
      }
      if (selectedCommand && Object.keys(response.suggestions).length === 0) {
        setSelectedCommand(undefined);
      }
    });
    window.electron.ipcRenderer.sendMessage('command-input', {
      mode: 'suggestions',
      input: currentText,
    });
  }, []);

  const onInput = useCallback((newInput: string) => {
    setCurrentText(newInput);
    window.electron.ipcRenderer.sendMessage('command-input', {
      mode: 'suggestions',
      input: newInput,
    });
  }, []);

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
          window.electron.ipcRenderer.sendMessage('command-input', {
            mode: 'execute',
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

  if (!commandResponse) {
    return <></>;
  }

  const commandSections: ReactElement[] = [];
  for (const section of Object.values(commandResponse.suggestions)) {
    commandSections.push(
      <>
        {commandSections.length > 0 && <CommandSeparator />}
        <CommandGroup heading={section.section.name}>
          {section.commands.map((command) => {
            let icon = <></>;
            if (command.icon) {
              if (Object.hasOwn(LucideIcons, command.icon)) {
                // @ts-expect-error
                const CommandIcon = LucideIcons[command.icon];
                icon = <CommandIcon />;
              } else {
                icon = <img src={command.icon} className="h-[18px] w-[18px]" />;
              }
            }
            return (
              <CommandItem value={command.value}>
                {!!command.icon && icon}
                <span>{command.name}</span>

                {command.shortcut &&
                  (currentText.length === 0 ||
                    command.shortcut.shortcutStr.startsWith(currentText)) && (
                    <CommandShortcut>
                      <div className="flex gap-0.5">
                        {command.shortcut.shortcutStr} <ChevronRight /> Tab
                      </div>
                    </CommandShortcut>
                  )}
              </CommandItem>
            );
          })}
        </CommandGroup>
      </>,
    );
  }

  return (
    <Command
      onValueChange={setSelectedCommand}
      value={selectedCommand}
      className={cn('transition-none', className)}
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
        onBlur={() => {
          closeCommandBar();
        }}
        ref={inputRef}
      />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        {commandSections}
      </CommandList>
    </Command>
  );
};
