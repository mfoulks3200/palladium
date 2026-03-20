import { renderHook } from '@testing-library/react';
import { useComboboxValues } from '../use-combobox-values';

describe('useComboboxValues', () => {
  it('returns undefined mappings when no options provided', () => {
    const { result } = renderHook(() => useComboboxValues({}));
    expect(result.current.itemToStringLabel).toBeUndefined();
    expect(result.current.itemToStringValue).toBeUndefined();
  });

  it('prefers getDisplayValue over itemToStringLabel', () => {
    const display = (v: string) => v.toUpperCase();
    const label = (v: string) => v.toLowerCase();
    const { result } = renderHook(() =>
      useComboboxValues({
        getDisplayValue: display,
        itemToStringLabel: label,
      }),
    );
    expect(result.current.itemToStringLabel).toBe(display);
  });

  it('falls back to itemToStringLabel when getDisplayValue is not provided', () => {
    const label = (v: string) => v.toLowerCase();
    const { result } = renderHook(() =>
      useComboboxValues({ itemToStringLabel: label }),
    );
    expect(result.current.itemToStringLabel).toBe(label);
  });

  it('prefers getFormValue over itemToStringValue', () => {
    const form = (v: { id: string }) => v.id;
    const value = (v: { id: string }) => `val-${v.id}`;
    const { result } = renderHook(() =>
      useComboboxValues({
        getFormValue: form,
        itemToStringValue: value,
      }),
    );
    expect(result.current.itemToStringValue).toBe(form);
  });

  it('falls back to itemToStringValue when getFormValue is not provided', () => {
    const value = (v: string) => `val-${v}`;
    const { result } = renderHook(() =>
      useComboboxValues({ itemToStringValue: value }),
    );
    expect(result.current.itemToStringValue).toBe(value);
  });

  it('returns a stable reference when inputs do not change', () => {
    const display = (v: string) => v;
    const { result, rerender } = renderHook(() =>
      useComboboxValues({ getDisplayValue: display }),
    );
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
  });
});
