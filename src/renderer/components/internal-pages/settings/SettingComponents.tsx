import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { PropsWithChildren, ReactElement } from 'react';

export const SettingsCard = ({
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
        // 'bg-linear-to-bl from-gray-900/35 to-gray-950',
        'min-h-24 p-0 drop-shadow-lg',
        // 'border-x-gray-600/35 border-t-gray-600/50 border-b-gray-600/20',
      )}
      apperance="Solid"
    >
      <div className="rounded-lg p-4">
        {title && <h1 className="text-2xl font-semibold">{title}</h1>}
        {description && <div className="text-xs opacity-50">{description}</div>}
        {customContents}
        {children && (
          <div className="flex flex-col gap-8 py-4 pt-8">{children}</div>
        )}
      </div>
    </Card>
  );
};

export const SettingsOption = ({
  name,
  description,
  disabled,
  className,
  children,
}: PropsWithChildren<{
  name: string;
  description?: string;
  disabled?: boolean;
  className?: string;
}>) => {
  return (
    <div className="flex min-h-9 gap-4 px-4">
      <div className="flex w-1/2 flex-col justify-center">
        <div className="text-sm font-medium">{name}</div>
        {description && <div className="text-xs opacity-30">{description}</div>}
      </div>
      <div className={cn('flex w-1/2 items-center', className)}>{children}</div>
    </div>
  );
};

export const SettingsTab = ({
  icon,
  name,
  disabled,
  isActive,
  onClick,
}: {
  icon: ReactElement;
  name: string;
  disabled: boolean;
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
          ['cursor-auto opacity-25']: disabled,
        },
      )}
      onClick={disabled ? () => {} : onClick}
    >
      {icon}
      {name}
    </div>
  );
};
