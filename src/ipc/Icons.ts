import { LucideProps } from 'lucide-react';
import * as Lucide from 'lucide-react';
import { ForwardRefExoticComponent, RefAttributes } from 'react';

export type LucideIcon = ForwardRefExoticComponent<
  Omit<LucideProps, 'ref'> & RefAttributes<SVGSVGElement>
>;

export type IpcIcons = keyof typeof Lucide;
export const LucideIcons: Record<keyof typeof Lucide, LucideIcon> =
  Lucide as unknown as Record<keyof typeof Lucide, LucideIcon>;
