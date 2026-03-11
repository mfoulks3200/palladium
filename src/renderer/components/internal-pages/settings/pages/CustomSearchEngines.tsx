import { useContext, useState } from 'react';
import { SettingsContext } from '@/lib/settings';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, Search, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/card';

export const CustomSearchEngines = () => {
  const { useSetting } = useContext(SettingsContext);
  const [customEngines, setCustomEngines] = useSetting('searchEngines.custom');

  const [newName, setNewName] = useState('');
  const [newShortcut, setNewShortcut] = useState('');
  const [newUrlPattern, setNewUrlPattern] = useState('');

  const addEngine = () => {
    if (!newName || !newShortcut || !newUrlPattern) return;

    setCustomEngines([
      ...customEngines,
      { name: newName, shortcut: newShortcut, urlPattern: newUrlPattern },
    ]);

    setNewName('');
    setNewShortcut('');
    setNewUrlPattern('');
  };

  const removeEngine = (index: number) => {
    const nextEngines = [...customEngines];
    nextEngines.splice(index, 1);
    setCustomEngines(nextEngines);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        {customEngines.map((engine, index) => (
          <div
            key={index}
            className="flex items-center gap-2 rounded-md bg-accent p-2"
          >
            <div className="flex-1">
              <div className="text-sm font-medium">{engine.name}</div>
              <div className="text-xs text-muted-foreground">{engine.urlPattern}</div>
            </div>
            <div className="rounded bg-secondary px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
              {engine.shortcut}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={() => removeEngine(index)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      <Card
        apperance="Hero"
        className="mt-2 flex flex-col gap-3 rounded-lg border border-border bg-accent p-4"
      >
        <div className="mb-1 text-sm font-medium">Add Search Engine</div>
        <div className="grid grid-cols-2 gap-2">
          <Input
            placeholder="Name (e.g. GitHub)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="h-8 text-sm"
          />
          <Input
            placeholder="Shortcut (e.g. gh)"
            value={newShortcut}
            onChange={(e) => setNewShortcut(e.target.value)}
            className="h-8 text-sm"
          />
        </div>
        <Input
          placeholder="URL Pattern (use %s for query)"
          value={newUrlPattern}
          onChange={(e) => setNewUrlPattern(e.target.value)}
          className="h-8 text-sm"
        />
        <Button
          onClick={addEngine}
          disabled={!newName || !newShortcut || !newUrlPattern}
          className="h-8"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Engine
        </Button>
      </Card>
    </div>
  );
};
