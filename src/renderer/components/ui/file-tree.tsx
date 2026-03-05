import { cn } from '@/lib/utils';
import { FolderClosed, FolderOpen, File, LucideIcon } from 'lucide-react';
import { PropsWithChildren, ReactElement, useMemo, useState } from 'react';

interface FileTreeBaseObject {
  type: string;
  name: string;
  icon?: LucideIcon;
  afterElements?: ReactElement;
  afterDecorators?: ReactElement;
  onClick?: () => void;
}

interface FileTreeFileObject extends FileTreeBaseObject {
  type: 'file';
}

interface FileTreeFolderObject extends FileTreeBaseObject {
  type: 'folder';
  openByDefault?: boolean;
  children?: FileTreeObject[];
}

export type FileTreeObject = FileTreeFileObject | FileTreeFolderObject;

export const FileTree = ({ tree }: { tree: FileTreeObject[] }) => {
  const [activePath, setActivePath] = useState('');

  const getTreeComponents = (
    fto: FileTreeObject,
    parentPath: string = '/',
    indent: number = 0,
  ) => {
    const children: ReactElement[] = [];
    const currentPath = parentPath + fto.name;
    if (fto.type === 'folder' && fto.children) {
      for (const child of fto.children) {
        children.push(
          getTreeComponents(child, parentPath + child.name + '/', indent + 1),
        );
      }
      return (
        <FileTreeFolder
          key={parentPath + fto.name}
          text={fto.name}
          icon={fto.icon}
          indentLevel={indent}
          openByDefault={fto.openByDefault}
          afterElements={fto.afterElements}
          afterDecorators={fto.afterDecorators}
          onClick={fto.onClick}
        >
          {children}
        </FileTreeFolder>
      );
    } else {
      return (
        <FileTreeItem
          key={parentPath + fto.name}
          icon={fto.icon ?? File}
          text={fto.name}
          isActive={currentPath === activePath}
          afterElements={fto.afterElements}
          afterDecorators={fto.afterDecorators}
          onClick={() => {
            setActivePath(currentPath);
            fto.onClick?.();
          }}
          indentLevel={indent}
        />
      );
    }
  };

  const treeComponents = useMemo(() => {
    const components: ReactElement[] = [];
    for (const item of tree) {
      components.push(getTreeComponents(item));
    }
    return components;
  }, [activePath]);

  return (
    <div className="h-full w-full">
      <div className="flex flex-col">{treeComponents}</div>
    </div>
  );
};

interface FileTreeFolderProps {
  icon?: LucideIcon;
  text: string;
  indentLevel?: number;
  openByDefault?: boolean;
  afterElements?: ReactElement;
  afterDecorators?: ReactElement;
  onClick?: () => void;
}

const FileTreeFolder = ({
  icon,
  text,
  indentLevel,
  openByDefault,
  afterElements,
  afterDecorators,
  onClick,
  children,
}: PropsWithChildren<FileTreeFolderProps>) => {
  const [isOpen, setOpen] = useState(openByDefault ?? false);

  return (
    <>
      <FileTreeItem
        icon={icon ?? (isOpen ? FolderOpen : FolderClosed)}
        indentLevel={indentLevel}
        text={text}
        afterElements={afterElements}
        afterDecorators={afterDecorators}
        onClick={() => {
          setOpen((wasOpen) => !wasOpen);
          onClick?.();
        }}
      />
      {isOpen && children}
    </>
  );
};

interface FileTreeItemProps {
  icon: LucideIcon;
  text: string;
  indentLevel?: number;
  afterElements?: ReactElement;
  afterDecorators?: ReactElement;
  isActive?: boolean;
  onClick?: () => void;
}

const FileTreeItem = ({
  icon: Icon,
  text,
  indentLevel,
  afterElements,
  afterDecorators,
  isActive,
  onClick,
}: FileTreeItemProps) => {
  const indentShift = 8;
  const indent = (indentLevel ?? 0) * indentShift;
  const indentPixels = indent + 8;

  return (
    <>
      <div
        className={cn(
          'group flex items-center gap-1 select-none',
          'py-0.5 pr-2 text-sm hover:bg-black/10',
          {
            ['bg-black/20']: isActive,
          },
        )}
        style={{
          paddingLeft: indentPixels + 'px',
        }}
        onClick={onClick}
      >
        <Icon size={'14px'} />
        <div className={'grow'}>{text}</div>
        {afterDecorators && (
          <div
            className={cn({ ['block group-hover:hidden']: !!afterElements })}
          >
            {afterDecorators}
          </div>
        )}
        {afterElements && (
          <div className="hidden group-hover:block">{afterElements}</div>
        )}
      </div>
    </>
  );
};
