import PackageJson from '../../../../../../package.json';
import Changelog from '../../../../../../CHANGELOG.md';

import iconImage from 'assets/icon.png';
import {
  lazy,
  PropsWithChildren,
  Suspense,
  useCallback,
  useEffect,
  useState,
} from 'react';
import { cn } from '@/lib/utils';

const Markdown = lazy(() => import('react-markdown'));

import styles from './AboutPanel.module.css';
import { Download, Github, Heart, Loader2, RefreshCw } from 'lucide-react';
import { useSystemMeta } from '@/lib/system-meta';
import { UpdateStatusIpc } from '../../../../../ipc';
import { Button } from '@/components/ui/button';

export const AboutPanel = () => {
  const [iconLoaded, setIconLoaded] = useState(false);

  const onLoad = () => {
    if (!iconLoaded) {
      setIconLoaded(true);
    }
  };

  return (
    <div className="flex h-96 w-full flex-col items-center justify-center gap-2 overflow-hidden rounded-xl">
      <div
        className={cn(
          'relative w-40 bg-cover pb-8 opacity-0 transition-all duration-500 ease-in-out select-none',
          'hover:scale-110 hover:rotate-3',
          {
            ['top-0 scale-100 opacity-100']: iconLoaded,
            ['top-2 scale-95']: !iconLoaded,
          },
          styles.heroImage,
        )}
      >
        <img src={iconImage} onLoad={onLoad} draggable="false" />
      </div>
      <div className="flex select-none">
        <div className="text-6xl font-light">Palladium</div>
        <div className="text-sm font-light">Alpha</div>
      </div>
      <div className="flex gap-1 font-medium opacity-25">
        <span className="select-none">Version</span>
        <span>{PackageJson.version}</span>
      </div>
    </div>
  );
};

export const UpdatePanel = () => {
  const [updateStatus, setUpdateStatus] = useState<UpdateStatusIpc | null>(
    null,
  );

  useEffect(() => {
    return window.electron.ipcRenderer.on('update-status', (status) => {
      setUpdateStatus(status);
    });
  }, []);

  const checkForUpdate = useCallback(() => {
    setUpdateStatus({ status: 'checking' });
    window.electron.ipcRenderer.sendMessage('check-for-update');
  }, []);

  const installUpdate = useCallback(() => {
    window.electron.ipcRenderer.sendMessage('install-update');
  }, []);

  const status = updateStatus?.status;
  const isChecking = status === 'checking';
  const isDownloading = status === 'downloading';
  const isAvailable = status === 'available';
  const isDownloaded = status === 'downloaded';
  const isError = status === 'error';
  const isUpToDate = status === 'not-available';

  return (
    <div className="flex flex-col items-center gap-3 py-2">
      {!status && (
        <Button variant="outline" size="sm" onClick={checkForUpdate}>
          <RefreshCw className="size-4" />
          Check for Updates
        </Button>
      )}

      {isChecking && (
        <div className="flex items-center gap-2 text-sm opacity-60">
          <Loader2 className="size-4 animate-spin" />
          Checking for updates...
        </div>
      )}

      {isUpToDate && (
        <div className="flex flex-col items-center gap-2">
          <span className="text-sm opacity-60">Palladium is up to date.</span>
          <Button variant="ghost" size="xs" onClick={checkForUpdate}>
            Check Again
          </Button>
        </div>
      )}

      {isAvailable && (
        <div className="flex flex-col items-center gap-2">
          <span className="text-sm font-medium">
            Version {updateStatus?.version} is available!
          </span>
          <Button size="sm" onClick={installUpdate}>
            <Download className="size-4" />
            Download & Install
          </Button>
        </div>
      )}

      {isDownloading && (
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-2 text-sm">
            <Loader2 className="size-4 animate-spin" />
            Downloading update...
          </div>
          {updateStatus?.progress != null && (
            <div className="bg-secondary h-1.5 w-48 overflow-hidden rounded-full">
              <div
                className="bg-primary h-full rounded-full transition-all"
                style={{ width: `${updateStatus.progress}%` }}
              />
            </div>
          )}
        </div>
      )}

      {isDownloaded && (
        <div className="flex flex-col items-center gap-2">
          <span className="text-sm font-medium">
            Update ready! Restart to apply.
          </span>
          <Button size="sm" onClick={installUpdate}>
            Restart & Update
          </Button>
        </div>
      )}

      {isError && (
        <div className="flex flex-col items-center gap-2">
          <span className="text-destructive text-sm">Update check failed.</span>
          <Button variant="ghost" size="xs" onClick={checkForUpdate}>
            Try Again
          </Button>
        </div>
      )}
    </div>
  );
};

export const LinksPanel = () => {
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex gap-1">
        <span>Made with</span>
        <Heart className="text-red-700" />
        <span>in North Carolina</span>
      </div>
      <a href="https://github.com/mfoulks3200/palladium" className="flex gap-1">
        <Github />
        <span className="text-primary underline">GitHub Repository</span>
      </a>
    </div>
  );
};

export const ChangelogPanel = () => {
  return (
    <div className="mt-2 max-h-96 w-full overflow-scroll">
      <Suspense fallback={null}>
        <Markdown
          disallowedElements={['hr']}
          components={{
            h2: (props: PropsWithChildren) => (
              <div className="mt-6 text-lg font-bold">{props.children}</div>
            ),
            h3: (props: PropsWithChildren) => (
              <div className="text-base font-bold">{props.children}</div>
            ),
            ul: (props: PropsWithChildren) => (
              <ul className="list-outside list-disc pl-4">{props.children}</ul>
            ),
            //@ts-expect-error
            a: (props: PropsWithChildren<{ href: string }>) => (
              <a href={props.href} className="text-primary underline">
                {props.children}
              </a>
            ),
            code: (props: PropsWithChildren) => (
              <code className="rounded-md border border-amber-700 bg-amber-900/20 px-1.5 py-0.5 text-amber-800">
                {props.children}
              </code>
            ),
          }}
        >
          {Changelog}
        </Markdown>
      </Suspense>
    </div>
  );
};

export const VersionsPanel = () => {
  const meta = useSystemMeta();
  console.log('Meta', meta);
  const rows = [
    {
      label: 'Palladium Version',
      value: meta?.appVersion + ' ' + meta?.arch.toUpperCase(),
    },
    {
      label: 'Palladium Build',
      value:
        meta?.gitInfo.branch.toUpperCase() +
        ' ' +
        meta?.gitInfo.commitHash.substring(0, 7).toUpperCase(),
    },
    {
      label: 'Chromium Version',
      value: meta?.chromeVersion,
    },
    {
      label: 'Electron Version',
      value: meta?.electronVersion,
    },
    {
      label: 'Node Version',
      value: meta?.nodeVersion,
    },
  ];

  return (
    <table className="mt-4 w-full text-sm">
      <tbody>
        {rows.map((row) => {
          return (
            <tr key={row.label}>
              <th className="w-48 py-1 text-left">{row.label}</th>
              <td>{row.value}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};
