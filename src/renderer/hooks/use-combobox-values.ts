import { useMemo } from 'react';

interface UseComboboxValuesOptions<Value> {
  /** Converts an item value to the string displayed in the input when selected. */
  getDisplayValue?: (itemValue: Value) => string;
  /** Converts an item value to the string used for form submission. */
  getFormValue?: (itemValue: Value) => string;
  /** Base UI's itemToStringLabel (overridden by getDisplayValue if provided). */
  itemToStringLabel?: (itemValue: Value) => string;
  /** Base UI's itemToStringValue (overridden by getFormValue if provided). */
  itemToStringValue?: (itemValue: Value) => string;
}

/**
 * Resolves combobox display/form value mapping functions.
 *
 * Prefers `getDisplayValue`/`getFormValue` aliases when provided,
 * falling back to Base UI's `itemToStringLabel`/`itemToStringValue`.
 *
 * Returns a stable object (via useMemo) suitable for spreading into
 * a Base UI Combobox.Root.
 */
export function useComboboxValues<Value>({
  getDisplayValue,
  getFormValue,
  itemToStringLabel,
  itemToStringValue,
}: UseComboboxValuesOptions<Value>) {
  return useMemo(
    () => ({
      itemToStringLabel: getDisplayValue ?? itemToStringLabel,
      itemToStringValue: getFormValue ?? itemToStringValue,
    }),
    [getDisplayValue, getFormValue, itemToStringLabel, itemToStringValue],
  );
}
