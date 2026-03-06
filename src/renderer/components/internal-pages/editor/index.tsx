import { FileTree } from '@/components/ui/file-tree';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import { Workspace } from './Workspace';
import { useContext, useEffect } from 'react';
import { InternalTabMetaContext } from '@/windows/main-ui/App';
import { Info } from 'lucide-react';

export const EditorPage = () => {
  const internalTabMeta = useContext(InternalTabMetaContext);

  useEffect(() => {
    if (internalTabMeta) {
      internalTabMeta.setTabMeta({
        title: `Mods - Editor`,
        icon: <Info />,
      });
    }
  }, []);

  return <Workspace />;
};
