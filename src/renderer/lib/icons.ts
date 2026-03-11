import { LucideProps } from 'lucide-react';
import * as Lucide from 'lucide-react';
import { ForwardRefExoticComponent, RefAttributes } from 'react';

export type LucideIcon = ForwardRefExoticComponent<
  Omit<LucideProps, 'ref'> & RefAttributes<SVGSVGElement>
>;

export const LucideIcons: Record<string, LucideIcon> =
  Lucide as unknown as Record<string, LucideIcon>;
