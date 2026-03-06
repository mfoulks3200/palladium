import { FileTree, FileTreeObject } from '@/components/ui/file-tree';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import { EditorComponent } from './Editor';
import { cn } from '@/lib/utils';
import { ArrowLeft, Blocks, FishingHook, Settings } from 'lucide-react';

export const Workspace = () => {
  return <LegacyWorkspace />;
};

const treeObj: FileTreeObject[] = [
  { type: 'file', name: 'Palladium Settings', icon: ArrowLeft },
  {
    type: 'folder',
    name: 'Mods',
    icon: FishingHook,
    openByDefault: true,
    children: [
      {
        type: 'folder',
        name: 'Example Mod',
        openByDefault: true,
        children: [
          { type: 'file', name: 'Mod Settings', icon: Settings },
          { type: 'file', name: 'index.ts' },
        ],
      },
      {
        type: 'folder',
        name: 'Second Mod',
        openByDefault: true,
        children: [
          { type: 'file', name: 'Mod Settings', icon: Settings },
          { type: 'file', name: 'index.ts' },
        ],
      },
    ],
  },
];

const LegacyWorkspace = () => {
  return (
    <div className="flex h-full w-full flex-col">
      <div
        className={cn(
          'flex h-12 w-full items-center px-4',
          'bg-card border-b border-b-gray-200',
        )}
      >
        Mod Editor
      </div>
      <ResizablePanelGroup orientation="horizontal" className="h-full w-full">
        <ResizablePanel
          className="bg-card"
          defaultSize="250px"
          minSize="200px"
          maxSize="400px"
        >
          <FileTree tree={treeObj} />
        </ResizablePanel>
        <ResizableHandle className="bg-gray-200" />
        <ResizablePanel>
          <EditorComponent />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
};
