import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { ReactElement, useContext, useEffect, useState } from 'react';
import {
  AboutPanel,
  ChangelogPanel,
  LinksPanel,
  VersionsPanel,
} from './pages/AboutPanel';
import { HistoryPanel } from './pages/HistoryPanel';
import { DefaultSearchEngines } from './pages/DefaultSearchEngines';
import { CustomSearchEngines } from './pages/CustomSearchEngines';
import { AnalyticsSettings } from './pages/GeneralSettings';
import { InternalTabMetaContext } from '@/windows/main-ui/App';
import { Background } from './pages/Background';
import { UserInterface } from './pages/UserInterface';
import { SettingsCard, SettingsTab } from './SettingComponents';
import { Card } from '@/components/ui/card';
import {
  Blocks,
  FishingHook,
  Info,
  Search,
  Settings,
  Sparkles,
  History,
} from 'lucide-react';

interface SettingsCard {
  name?: string;
  description?: string;
  customContents?: ReactElement;
}

interface SettingsPages {
  name: string;
  disabled?: boolean;
  icon: ReactElement;
  cards: Record<string, SettingsCard>;
}

const settingsUi: Record<string, SettingsPages> = {
  general: {
    name: 'General',
    icon: <Settings />,
    cards: {
      analytics: {
        name: 'Analytics',
        description: 'Control how Palladium collects anonymous usage data.',
        customContents: (
          <div className="flex flex-col gap-4 pt-8">
            <AnalyticsSettings />
          </div>
        ),
      },
    },
  },
  personalization: {
    name: 'Personalization',
    icon: <Sparkles />,
    cards: {
      userInterface: {
        name: 'User Interface',
        customContents: (
          <div className="flex flex-col gap-4 pt-8">
            <UserInterface />
          </div>
        ),
      },
      background: {
        name: 'Background',
        customContents: (
          <div className="flex flex-col gap-4 pt-8">
            <Background />
          </div>
        ),
      },
    },
  },
  searchEngines: {
    name: 'Search Engines',
    icon: <Search />,
    cards: {
      defaultSearchEngines: {
        name: 'Default Search Engines',
        customContents: (
          <div className="flex flex-col gap-4 pt-8">
            <DefaultSearchEngines />
          </div>
        ),
      },
      customSearchEngines: {
        name: 'Custom Search Engines',
        description: 'Add custom sites to the command bar.',
        customContents: (
          <div className="px-4 pt-4">
            <CustomSearchEngines />
          </div>
        ),
      },
    },
  },
  history: {
    name: 'History',
    icon: <History />,
    cards: {
      history: {
        name: 'Browser History',
        description: 'View and manage your browsing history.',
        customContents: (
          <div className="pt-4">
            <HistoryPanel />
          </div>
        ),
      },
    },
  },
  extensions: {
    name: 'Extensions',
    disabled: true,
    icon: <Blocks />,
    cards: {
      extensions: {
        name: 'Extensions',
      },
    },
  },
  mods: {
    name: 'Mods',
    disabled: true,
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
      links: {
        customContents: <LinksPanel />,
      },
      changelog: {
        name: 'Changelog',
        customContents: <ChangelogPanel />,
      },
      version: {
        name: 'About Palladium',
        customContents: <VersionsPanel />,
      },
    },
  },
};

export const SettingsPage = () => {
  const [currentPage, setCurrentPage] = useState(Object.keys(settingsUi)[0]);

  const internalTabMeta = useContext(InternalTabMetaContext);

  useEffect(() => {
    if (internalTabMeta) {
      internalTabMeta.setTabMeta({
        title: `${settingsUi[currentPage].name} - Settings`,
        icon: <Info />,
      });
    }
  }, [currentPage]);

  return (
    <div className="mt-8 h-full max-h-full w-full overflow-scroll">
      <Card
        className={cn(
          'sticky top-0 z-10 mx-32 h-16 rounded-full px-6 py-4 shadow-lg',
        )}
        apperance="Solid"
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
      </Card>
      <div className="mx-32 flex gap-2">
        <div className="w-1/4 items-stretch">
          <div className="sticky top-20 flex flex-col gap-2">
            {Object.entries(settingsUi).map(([key, val]) => (
              <SettingsTab
                key={key}
                name={val.name}
                disabled={val.disabled ?? false}
                icon={val.icon}
                isActive={key === currentPage}
                onClick={() => {
                  setCurrentPage(key);
                }}
              />
            ))}
          </div>
        </div>
        <div className="flex min-h-80 w-1/2 flex-col items-center py-4">
          <div className="flex w-full max-w-[750px] flex-col gap-4">
            {Object.entries(settingsUi[currentPage].cards).map(([cardKey, card]) => (
              <SettingsCard
                key={cardKey}
                title={card.name}
                description={card.description}
                customContents={card.customContents}
              >
                {/* <SettingsOption name={'Enable Timeline'} type={'checkbox'} />
              <SettingsOption name={'Timeline Retention'} type={'checkbox'} />
              <SettingsOption name={'Example Field'} type={'text'} /> */}
              </SettingsCard>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
