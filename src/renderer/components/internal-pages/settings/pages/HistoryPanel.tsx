import { useEffect, useState } from 'react';
import { HistoryItem } from '../../../../../ipc';
import { Button } from '@/components/ui/button';
import { Trash2, ExternalLink, Globe } from 'lucide-react';
import { Card } from '@/components/ui/card';

export const HistoryPanel = () => {
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    const removeListener = window.electron.ipcRenderer.on(
      'history-data',
      (data: HistoryItem[]) => {
        setHistory(data);
      },
    );

    window.electron.ipcRenderer.sendMessage('get-history');

    return () => {
      removeListener();
    };
  }, []);

  const clearHistory = () => {
    if (confirm('Are you sure you want to clear all history?')) {
      window.electron.ipcRenderer.sendMessage('clear-history');
      setHistory([]);
    }
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="-mt-14 mb-4 flex justify-end bg-none px-4">
        <Button
          variant="destructive"
          size="sm"
          onClick={clearHistory}
          disabled={history.length === 0}
          className="flex gap-2"
        >
          <Trash2 className="size-4" />
          Clear History
        </Button>
      </div>

      <div className="flex flex-col gap-2 px-4 pb-4">
        {history.length === 0 ? (
          <div className="py-8 text-center text-white/50">No history found</div>
        ) : (
          history.map((item) => (
            <Card key={item.id} className="group flex flex-col gap-1 p-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded">
                    <Globe className="size-4" />
                  </div>
                  <div className="flex flex-col overflow-hidden">
                    <div className="truncate text-sm font-medium">
                      {item.title || 'Untitled'}
                    </div>
                    <div className="truncate text-xs opacity-40">
                      {item.url}
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <div className="text-[10px] opacity-30">
                    {formatDate(item.timestamp)}
                  </div>
                  <button
                    onClick={() =>
                      window.electron.ipcRenderer.sendMessage('open-new-tab', {
                        newUrl: item.url,
                      })
                    }
                    className="opacity-0 transition-opacity group-hover:opacity-100"
                    title="Open in new tab"
                  >
                    <ExternalLink className="size-3 opacity-50" />
                  </button>
                </div>
              </div>
              {item.metaDescription && (
                <div className="mt-1 line-clamp-2 text-xs opacity-30">
                  {item.metaDescription}
                </div>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  );
};
