'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { Combobox as ComboboxPrimitive } from '@base-ui/react';
import { CheckIcon, ChevronDownIcon, XIcon } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/components/ui/input-group';

const ComboboxRoot = ComboboxPrimitive.Root;

/**
 * Groups all parts of the combobox. Extends Base UI's Root with friendlier
 * `getDisplayValue` / `getFormValue` aliases so item values can differ from
 * what the input field shows.
 *
 * @example
 * ```tsx
 * // String values – show a human-friendly name in the input
 * <Combobox
 *   items={['us', 'gb', 'de']}
 *   getDisplayValue={(code) => countryNames[code]}
 * >
 *   …
 * </Combobox>
 *
 * // Object values – separate display from form value
 * <Combobox
 *   items={users}
 *   getDisplayValue={(u) => u.name}
 *   getFormValue={(u) => u.id}
 * >
 *   …
 * </Combobox>
 * ```
 */
function Combobox<Value, Multiple extends boolean | undefined = false>(
  props: ComboboxPrimitive.Root.Props<Value, Multiple> & {
    /** Converts an item value to the string displayed in the input when selected. */
    getDisplayValue?: (itemValue: Value) => string;
    /** Converts an item value to the string used for form submission. */
    getFormValue?: (itemValue: Value) => string;
  },
) {
  const {
    getDisplayValue,
    getFormValue,
    itemToStringLabel,
    itemToStringValue,
    ...rest
  } = props;

  const rootProps = {
    ...rest,
    itemToStringLabel: getDisplayValue ?? itemToStringLabel,
    itemToStringValue: getFormValue ?? itemToStringValue,
  } as ComboboxPrimitive.Root.Props<Value, Multiple>;

  return <ComboboxRoot {...rootProps} />;
}

function ComboboxValue({ ...props }: ComboboxPrimitive.Value.Props) {
  return <ComboboxPrimitive.Value data-slot="combobox-value" {...props} />;
}

function ComboboxTrigger({
  className,
  children,
  ...props
}: ComboboxPrimitive.Trigger.Props) {
  return (
    <ComboboxPrimitive.Trigger
      data-slot="combobox-trigger"
      className={cn("[&_svg:not([class*='size-'])]:size-4", className)}
      {...props}
    >
      {children}
      <ChevronDownIcon
        data-slot="combobox-trigger-icon"
        className="text-muted-foreground pointer-events-none size-4"
      />
    </ComboboxPrimitive.Trigger>
  );
}

function ComboboxClear({ className, ...props }: ComboboxPrimitive.Clear.Props) {
  return (
    <ComboboxPrimitive.Clear
      data-slot="combobox-clear"
      render={<InputGroupButton variant="ghost" size="icon-xs" />}
      className={cn(className)}
      {...props}
    >
      <XIcon className="pointer-events-none" />
    </ComboboxPrimitive.Clear>
  );
}

function ComboboxInput({
  className,
  children,
  disabled = false,
  showTrigger = true,
  showClear = false,
  ...props
}: ComboboxPrimitive.Input.Props & {
  showTrigger?: boolean;
  showClear?: boolean;
}) {
  return (
    <InputGroup
      className={cn(
        'bg-input/10 dark:bg-input/30 w-auto border-0 shadow-sm',
        className,
      )}
    >
      <ComboboxPrimitive.Input
        render={<InputGroupInput className="bg-none" disabled={disabled} />}
        className={'bg-none'}
        {...props}
      />
      <InputGroupAddon align="inline-end">
        {showTrigger && (
          <InputGroupButton
            size="icon-xs"
            variant="ghost"
            asChild
            data-slot="input-group-button"
            className="bg-none group-has-data-[slot=combobox-clear]/input-group:hidden data-pressed:bg-none"
            disabled={disabled}
          >
            <ComboboxTrigger />
          </InputGroupButton>
        )}
        {showClear && <ComboboxClear disabled={disabled} />}
      </InputGroupAddon>
      {children}
    </InputGroup>
  );
}

function ComboboxContent({
  className,
  side = 'bottom',
  sideOffset = 6,
  align = 'start',
  alignOffset = 0,
  anchor,
  ...props
}: ComboboxPrimitive.Popup.Props &
  Pick<
    ComboboxPrimitive.Positioner.Props,
    'side' | 'align' | 'sideOffset' | 'alignOffset' | 'anchor'
  >) {
  return (
    <ComboboxPrimitive.Portal>
      <ComboboxPrimitive.Positioner
        side={side}
        sideOffset={sideOffset}
        align={align}
        alignOffset={alignOffset}
        anchor={anchor}
        className="isolate z-50"
      >
        <ComboboxPrimitive.Popup
          data-slot="combobox-content"
          data-chips={!!anchor}
          className={cn(
            'bg-popover text-popover-foreground data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 data-closed:zoom-out-95 data-open:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 ring-foreground/10 *:data-[slot=input-group]:bg-input/30 *:data-[slot=input-group]:border-input/30 group/combobox-content relative max-h-96 w-(--anchor-width) max-w-(--available-width) min-w-[calc(var(--anchor-width)+--spacing(7))] origin-(--transform-origin) overflow-hidden rounded-md shadow-md ring-1 duration-100 data-[chips=true]:min-w-(--anchor-width) *:data-[slot=input-group]:m-1 *:data-[slot=input-group]:mb-0 *:data-[slot=input-group]:h-8 *:data-[slot=input-group]:shadow-none',
            className,
          )}
          {...props}
        />
      </ComboboxPrimitive.Positioner>
    </ComboboxPrimitive.Portal>
  );
}

function ComboboxList({ className, ...props }: ComboboxPrimitive.List.Props) {
  return (
    <ComboboxPrimitive.List
      data-slot="combobox-list"
      className={cn(
        'max-h-[min(calc(--spacing(96)---spacing(9)),calc(var(--available-height)---spacing(9)))] scroll-py-1 overflow-y-auto p-1 data-empty:p-0',
        className,
      )}
      {...props}
    />
  );
}

function ComboboxItem({
  className,
  children,
  ...props
}: ComboboxPrimitive.Item.Props) {
  return (
    <ComboboxPrimitive.Item
      data-slot="combobox-item"
      className={cn(
        "data-highlighted:bg-accent data-highlighted:text-accent-foreground relative flex w-full cursor-default items-center gap-2 rounded-sm py-1.5 pr-8 pl-2 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    >
      {children}
      <ComboboxPrimitive.ItemIndicator
        data-slot="combobox-item-indicator"
        render={
          <span className="pointer-events-none absolute right-2 flex size-4 items-center justify-center" />
        }
      >
        <CheckIcon className="pointer-events-none size-4 pointer-coarse:size-5" />
      </ComboboxPrimitive.ItemIndicator>
    </ComboboxPrimitive.Item>
  );
}

function ComboboxItemWithDetail({
  className,
  children,
  detail,
  detailSide = 'right',
  detailSideOffset = 6,
  detailClassName,
  ...props
}: ComboboxPrimitive.Item.Props & {
  /** Content to render in the side-popover when this item is highlighted. */
  detail?: React.ReactNode;
  /** Which side of the dropdown the detail panel appears on. @default 'right' */
  detailSide?: 'left' | 'right';
  /** Gap (px) between the dropdown edge and the detail panel. @default 6 */
  detailSideOffset?: number;
  /** Extra classes applied to the detail panel. */
  detailClassName?: string;
}) {
  const [showDetail, setShowDetail] = React.useState(false);
  const itemRef = React.useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = React.useState({
    top: 0,
    left: 0,
    right: 0,
    maxHeight: 0,
  });

  // Track the data-highlighted attribute that Base UI toggles on
  // mouse hover *and* keyboard navigation.
  React.useEffect(() => {
    const el = itemRef.current;
    if (!el || !detail) return;

    const update = () => {
      setShowDetail(el.hasAttribute('data-highlighted'));
    };

    const observer = new MutationObserver(update);
    observer.observe(el, {
      attributes: true,
      attributeFilter: ['data-highlighted'],
    });

    // Sync initial state in case the attribute is already set.
    update();

    return () => observer.disconnect();
  }, [detail]);

  // Recompute the floating position whenever the detail becomes visible.
  React.useEffect(() => {
    if (!showDetail || !itemRef.current) return;

    const popup = itemRef.current.closest(
      '[data-slot="combobox-content"]',
    ) as HTMLElement | null;
    if (!popup) return;

    const popupRect = popup.getBoundingClientRect();

    setPosition({
      top: popupRect.top,
      left: popupRect.right + detailSideOffset,
      right: popupRect.left - detailSideOffset,
      maxHeight: popupRect.height,
    });
  }, [showDetail, detailSide, detailSideOffset]);

  return (
    <>
      <ComboboxPrimitive.Item
        ref={itemRef}
        data-slot="combobox-item"
        className={cn(
          "data-highlighted:bg-accent data-highlighted:text-accent-foreground relative flex w-full cursor-default items-center gap-2 rounded-sm py-1.5 pr-8 pl-2 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
          className,
        )}
        {...props}
      >
        {children}
        <ComboboxPrimitive.ItemIndicator
          data-slot="combobox-item-indicator"
          render={
            <span className="pointer-events-none absolute right-2 flex size-4 items-center justify-center" />
          }
        >
          <CheckIcon className="pointer-events-none size-4 pointer-coarse:size-5" />
        </ComboboxPrimitive.ItemIndicator>
      </ComboboxPrimitive.Item>

      {showDetail &&
        detail &&
        createPortal(
          <div
            data-slot="combobox-item-detail"
            className={cn(
              'bg-popover text-popover-foreground animate-in fade-in-0 zoom-in-95 ring-foreground/10 pointer-events-auto z-50 overflow-y-auto rounded-md shadow-md ring-1',
              detailSide === 'right'
                ? 'slide-in-from-left-2'
                : 'slide-in-from-right-2',
              detailClassName,
            )}
            style={{
              position: 'fixed',
              top: position.top,
              ...(detailSide === 'right'
                ? { left: position.left }
                : { right: `calc(100vw - ${position.right}px)` }),
              maxHeight: position.maxHeight || undefined,
            }}
          >
            {detail}
          </div>,
          document.body,
        )}
    </>
  );
}

function ComboboxGroup({ className, ...props }: ComboboxPrimitive.Group.Props) {
  return (
    <ComboboxPrimitive.Group
      data-slot="combobox-group"
      className={cn(className)}
      {...props}
    />
  );
}

function ComboboxLabel({
  className,
  ...props
}: ComboboxPrimitive.GroupLabel.Props) {
  return (
    <ComboboxPrimitive.GroupLabel
      data-slot="combobox-label"
      className={cn(
        'text-muted-foreground px-2 py-1.5 text-xs pointer-coarse:px-3 pointer-coarse:py-2 pointer-coarse:text-sm',
        className,
      )}
      {...props}
    />
  );
}

function ComboboxCollection({ ...props }: ComboboxPrimitive.Collection.Props) {
  return (
    <ComboboxPrimitive.Collection data-slot="combobox-collection" {...props} />
  );
}

function ComboboxEmpty({ className, ...props }: ComboboxPrimitive.Empty.Props) {
  return (
    <ComboboxPrimitive.Empty
      data-slot="combobox-empty"
      className={cn(
        'text-muted-foreground hidden w-full justify-center py-2 text-center text-sm group-data-empty/combobox-content:flex',
        className,
      )}
      {...props}
    />
  );
}

function ComboboxSeparator({
  className,
  ...props
}: ComboboxPrimitive.Separator.Props) {
  return (
    <ComboboxPrimitive.Separator
      data-slot="combobox-separator"
      className={cn('bg-border -mx-1 my-1 h-px', className)}
      {...props}
    />
  );
}

function ComboboxChips({
  className,
  ...props
}: React.ComponentPropsWithRef<typeof ComboboxPrimitive.Chips> &
  ComboboxPrimitive.Chips.Props) {
  return (
    <ComboboxPrimitive.Chips
      data-slot="combobox-chips"
      className={cn(
        'dark:bg-input/30 border-input focus-within:border-ring focus-within:ring-ring/50 has-aria-invalid:ring-destructive/20 dark:has-aria-invalid:ring-destructive/40 has-aria-invalid:border-destructive dark:has-aria-invalid:border-destructive/50 flex min-h-9 flex-wrap items-center gap-1.5 rounded-md border bg-transparent bg-clip-padding px-2.5 py-1.5 text-sm shadow-xs transition-[color,box-shadow] focus-within:ring-[3px] has-aria-invalid:ring-[3px] has-data-[slot=combobox-chip]:px-1.5',
        className,
      )}
      {...props}
    />
  );
}

function ComboboxChip({
  className,
  children,
  showRemove = true,
  ...props
}: ComboboxPrimitive.Chip.Props & {
  showRemove?: boolean;
}) {
  return (
    <ComboboxPrimitive.Chip
      data-slot="combobox-chip"
      className={cn(
        'bg-muted text-foreground flex h-[calc(--spacing(5.5))] w-fit items-center justify-center gap-1 rounded-sm px-1.5 text-xs font-medium whitespace-nowrap has-disabled:pointer-events-none has-disabled:cursor-not-allowed has-disabled:opacity-50 has-data-[slot=combobox-chip-remove]:pr-0',
        className,
      )}
      {...props}
    >
      {children}
      {showRemove && (
        <ComboboxPrimitive.ChipRemove
          render={<Button variant="ghost" size="icon-xs" />}
          className="-ml-1 opacity-50 hover:opacity-100"
          data-slot="combobox-chip-remove"
        >
          <XIcon className="pointer-events-none" />
        </ComboboxPrimitive.ChipRemove>
      )}
    </ComboboxPrimitive.Chip>
  );
}

function ComboboxChipsInput({
  className,
  children,
  ...props
}: ComboboxPrimitive.Input.Props) {
  return (
    <ComboboxPrimitive.Input
      data-slot="combobox-chip-input"
      className={cn('min-w-16 flex-1 outline-none', className)}
      {...props}
    />
  );
}

function useComboboxAnchor() {
  return React.useRef<HTMLDivElement | null>(null);
}

export {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxItemWithDetail,
  ComboboxGroup,
  ComboboxLabel,
  ComboboxCollection,
  ComboboxEmpty,
  ComboboxSeparator,
  ComboboxChips,
  ComboboxChip,
  ComboboxChipsInput,
  ComboboxTrigger,
  ComboboxValue,
  useComboboxAnchor,
};
