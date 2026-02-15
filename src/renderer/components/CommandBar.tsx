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
  Calculator,
  Calendar,
  CreditCard,
  Settings,
  Smile,
  User,
} from 'lucide-react';
import { useContext, useEffect, useRef, useState } from 'react';
import { PortalWrapperControllerContext } from './PortalOverlay';

import './CommandBar.css';

interface CommandBarProps {
  className?: string;
  tabUuid: string;
  prefill?: string;
}

interface SearchEngine {
  name: string;
  shortcut: string;
  lozengeClasses?: string;
}

const engines: SearchEngine[] = [
  {
    shortcut: 'go',
    name: 'Google',
  },
  {
    shortcut: 'npm',
    name: 'NPM',
  },
  {
    shortcut: 'yt',
    name: 'YouTube',
    lozengeClasses: 'bg-red-500/25',
  },
];

export const CommandBar = ({
  className,
  tabUuid,
  prefill,
}: CommandBarProps) => {
  const { closePortal } = useContext(PortalWrapperControllerContext);
  const [currentText, setCurrentText] = useState(prefill ?? '');
  const [currentPrompt, setCurrentPrompt] = useState(
    'Type a command or search...',
  );
  const [currentLozenge, setCurrentLozenge] = useState<SearchEngine | null>();
  const [showLozenge, setShowLozenge] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const searchEngine = () => {
    const engine = engines.find((engine) => engine.shortcut === currentText);
    if (engine) {
      setCurrentLozenge(engine);
      setShowLozenge(true);
      setCurrentText('');
    }
  };

  const parseCommand = () => {
    const channel = tabUuid === 'new' ? 'open-new-tab' : 'update-tab-url';
    try {
      console.log(`Attempting to parse ${currentText} as a URL`);
      const url = new URL(currentText);
      window.electron.ipcRenderer.sendMessage(channel as any, {
        newUrl: url.toString(),
      });
    } catch (e) {
      console.log(`Failed, searching for ${currentText} instead`);
      window.electron.ipcRenderer.sendMessage(channel as any, {
        newUrl: `https://google.com/search?q=${encodeURIComponent(currentText)}`,
      });
    }
  };

  useEffect(() => {
    if (inputRef.current && currentText.trim() === prefill?.trim()) {
      inputRef.current.select();
    }
  }, [inputRef.current, currentText]);

  return (
    <Command
      className={cn(
        'rounded-2xl border bg-black/75 drop-shadow-2xl backdrop-blur-md backdrop-saturate-200 transition-none',
        className,
      )}
    >
      <CommandInput
        className="p-1 px-4 text-xl"
        placeholder={currentPrompt}
        showBeforeElement={showLozenge}
        beforeElement={<>{currentLozenge?.name}</>}
        beforeElementClass={currentLozenge?.lozengeClasses}
        autoFocus={true}
        onInput={(event) => {
          //@ts-expect-error
          setCurrentText(event.target.value);
        }}
        value={currentText}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            closePortal();
          } else if (event.key === 'Tab') {
            event.preventDefault();
            searchEngine();
          } else if (event.key === 'Enter') {
            event.preventDefault();
            parseCommand();
          }
        }}
        onBlur={() => {
          closePortal();
        }}
        ref={inputRef}
      />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Search Engines">
          {engines.map((engine) => (
            <CommandItem value={engine.shortcut}>
              <Calendar />
              <span>{engine.name}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Settings">
          <CommandItem>
            <User />
            <span>Profile</span>
            <CommandShortcut>⌘P</CommandShortcut>
          </CommandItem>
          <CommandItem>
            <CreditCard />
            <span>Billing</span>
            <CommandShortcut>⌘B</CommandShortcut>
          </CommandItem>
          <CommandItem>
            <Settings />
            <span>Settings</span>
            <CommandShortcut>⌘S</CommandShortcut>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </Command>
  );
};
