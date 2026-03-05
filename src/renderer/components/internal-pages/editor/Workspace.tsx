import { FileTree } from '@/components/ui/file-tree';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';

import { Layout, Model } from 'flexlayout-react';

const json = {
  global: {},
  borders: [],
  layout: {
    type: 'row',
    weight: 100,
    children: [
      {
        type: 'tabset',
        weight: 50,
        children: [
          {
            type: 'tab',
            name: 'One',
            component: 'placeholder',
          },
        ],
      },
      {
        type: 'tabset',
        weight: 50,
        children: [
          {
            type: 'tab',
            name: 'Two',
            component: 'placeholder',
          },
        ],
      },
    ],
  },
};

const model = Model.fromJson(json);

export const Workspace = () => {
  const factory = (node) => {
    const component = node.getComponent();

    if (component === 'placeholder') {
      return <div>{node.getName()}</div>;
    }
  };

  return <Layout model={model} factory={factory} />;
};

const legacyWorkspace = () => {
  return (
    <ResizablePanelGroup orientation="horizontal" className="h-full w-full">
      <ResizablePanel defaultSize="250px" minSize="200px" maxSize="400px">
        <FileTree />
      </ResizablePanel>
      <ResizableHandle />
      <ResizablePanel>Editor</ResizablePanel>
    </ResizablePanelGroup>
  );
};
