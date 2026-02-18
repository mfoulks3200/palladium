import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  Blocks,
  ChartNoAxesGantt,
  FishingHook,
  Info,
  Search,
} from 'lucide-react';
import { PropsWithChildren, ReactElement, useState } from 'react';
import { AboutPanel } from './AboutPanel';
import { Checkbox } from '@/components/ui/checkbox';

interface SettingsCard {
  name?: string;
  description?: string;
  customContents?: ReactElement;
}

interface SettingsPages {
  name: string;
  icon: ReactElement;
  cards: Record<string, SettingsCard>;
}

const settingsUi: Record<string, SettingsPages> = {
  searchEngines: {
    name: 'Search Engines',
    icon: <Search />,
    cards: {
      defaultSearchEngines: {
        name: 'Default Search Engines',
      },
      customSearchEngines: {
        name: 'Custom Search Engines',
        description: 'Add custom sites to the command bar.',
      },
    },
  },
  timeline: {
    name: 'Timeline',
    icon: <ChartNoAxesGantt />,
    cards: {
      timeline: {
        name: 'Timeline',
        description:
          'Save your tabs automatically as you browse, so you can find them later.',
      },
      history: {
        name: 'History',
      },
    },
  },
  extensions: {
    name: 'Extensions',
    icon: <Blocks />,
    cards: {
      extensions: {
        name: 'Extensions',
      },
    },
  },
  mods: {
    name: 'Mods',
    icon: <FishingHook />,
    cards: {
      mods: {
        name: 'Mods',
      },
    },
  },
  about: {
    name: 'About Palladium',
    icon: <Info />,
    cards: {
      about: {
        customContents: <AboutPanel />,
      },
      aboutText: {
        name: 'Palladium',
        description: 'The browser that gets out of your way.',
        customContents: (
          <div className="pt-4 text-justify text-sm">
            Palladium is a modern, minimalist web browser built on top of{' '}
            <a href="https://www.electronjs.org/">Electron</a>. Designed for
            power users who value speed, efficiency, and deep customization,
            Palladium focuses on keeping the interface clean while providing
            powerful tools at your fingertips.
          </div>
        ),
      },
    },
  },
};

export const SettingsPage = () => {
  const [currentPage, setCurrentPage] = useState(Object.keys(settingsUi)[0]);

  return (
    <div className="mt-8 h-full max-h-full w-full overflow-scroll">
      <div
        className={cn(
          'bg-linear-to-bl from-gray-950/35 to-gray-950',
          'border border-x-gray-600/35 border-t-gray-600/50 border-b-gray-600/20',
          'sticky top-0 z-10 mx-32 h-16 rounded-full px-6 py-4 shadow-lg backdrop-blur-xl backdrop-saturate-200',
        )}
      >
        <div className="absolute text-2xl font-light select-none">
          Palladium
        </div>
        <div className="flex w-full justify-center">
          <Input
            className="max-w-lg rounded-full border-none"
            type="text"
            placeholder="Search settings..."
          />
        </div>
      </div>
      <div className="mx-32 flex gap-2">
        <div className="w-1/4 items-stretch">
          <div className="sticky top-20 flex flex-col gap-2">
            {Object.entries(settingsUi).map(([key, val]) => (
              <SettingsTab
                name={val.name}
                icon={val.icon}
                isActive={key === currentPage}
                onClick={() => {
                  console.log('onClick: ' + key);
                  setCurrentPage(key);
                }}
              />
            ))}
          </div>
        </div>
        <div className="flex w-1/2 flex-col gap-4 py-4">
          {Object.values(settingsUi[currentPage].cards).map((card) => (
            <SettingsCard
              title={card.name}
              description={card.description}
              customContents={card.customContents}
            >
              <SettingsOption name={'Enable Timeline'} type={'checkbox'} />
              <SettingsOption name={'Timeline Retention'} type={'checkbox'} />
              <SettingsOption name={'Example Field'} type={'text'} />
            </SettingsCard>
          ))}
        </div>
      </div>
    </div>
  );
};

const SettingsCard = ({
  title,
  description,
  customContents,
  children,
}: PropsWithChildren<{
  title?: string;
  description?: string;
  customContents?: ReactElement;
}>) => {
  return (
    <Card
      className={cn(
        'bg-linear-to-bl from-gray-900/35 to-gray-950',
        'min-h-48 p-0 drop-shadow-lg backdrop-blur-sm backdrop-saturate-200',
        'border-x-gray-600/35 border-t-gray-600/50 border-b-gray-600/20',
      )}
    >
      <div className="rounded-lg p-4">
        {title && <h1 className="text-2xl font-semibold">{title}</h1>}
        {description && (
          <div className="text-xs text-white/30">{description}</div>
        )}
        {customContents}
        {children && (
          <div className="flex flex-col gap-8 py-4 pt-8">{children}</div>
        )}
      </div>
    </Card>
  );
};

const SettingsOption = ({
  name,
  description,
  disabled,
  type,
}: {
  name: string;
  description?: string;
  disabled?: boolean;
  type: 'checkbox' | 'text';
}) => {
  return (
    <div className="flex min-h-9 gap-4 px-4">
      <div className="flex w-1/2 flex-col justify-center">
        <div className="text-sm font-medium">{name}</div>
        {description && (
          <div className="text-xs text-white/30">{description}</div>
        )}
      </div>
      <div
        className={cn('flex w-1/2 items-center', {
          ['justify-end']: type === 'checkbox',
          ['justify-center']: type === 'text',
        })}
      >
        {type === 'checkbox' && <Checkbox disabled={disabled} defaultChecked />}
        {type === 'text' && <Input disabled={disabled} type="text" />}
      </div>
    </div>
  );
};

const SettingsTab = ({
  icon,
  name,
  isActive,
  onClick,
}: {
  icon: ReactElement;
  name: string;
  isActive: boolean;
  onClick: () => void;
}) => {
  return (
    <div
      className={cn(
        'flex w-full items-center gap-2 rounded-l-full',
        `[&_svg:not([class*='size-'])]:size-4`,
        'cursor-pointer px-4 py-2 text-sm transition-colors select-none',
        'bg-linear-to-r from-transparent to-transparent hover:from-white/10',
        {
          ['from-white/25']: isActive,
        },
      )}
      onClick={onClick}
    >
      {icon}
      {name}
    </div>
  );
};
