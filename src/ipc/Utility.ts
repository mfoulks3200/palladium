export type NestedKeysOf<T> =
  T extends Array<any>
    ? never
    : T extends object
      ? {
          [K in keyof T]: `${K & string}${NestedKeysOf<T[K]> extends never ? '' : `.${NestedKeysOf<T[K]>}`}`;
        }[keyof T]
      : never;

export type GetPathType<
  T,
  P extends string,
> = P extends `${infer Key}.${infer Rest}`
  ? Key extends keyof T
    ? GetPathType<T[Key], Rest>
    : never
  : P extends keyof T
    ? T[P]
    : never;

export const getDeepProp = <O extends object, T extends NestedKeysOf<O>>(
  obj: O,
  path: T,
): GetPathType<O, T> | null => {
  if (!path) return obj as any;
  if (obj == null) return null;
  const properties = path.split('.');
  const nextProp = properties.shift();
  if (nextProp) {
    return getDeepProp(
      (obj as Record<string, any>)[nextProp],
      properties.join('.'),
    );
  } else {
    return null;
  }
};

export const setDeepProp = <O extends object, T extends NestedKeysOf<O>>(
  obj: O,
  path: T,
  value: GetPathType<O, T>,
): O => {
  const properties = path.split('.');
  const nextProp = properties.shift();
  if (nextProp) {
    if (properties.length === 0) {
      (obj as Record<string, any>)[nextProp] = value;
      return { ...obj, [nextProp]: value } as any;
    } else {
      return {
        ...obj,
        [nextProp]: setDeepProp(
          (obj as Record<string, any>)[nextProp],
          properties.join('.'),
          value,
        ),
      } as any;
    }
  } else {
    return obj as any;
  }
};

const deepEqual = (a: unknown, b: unknown): boolean => {
  if (a === b) return true;
  if (a == null || b == null) return a === b;
  if (typeof a !== typeof b) return false;

  if (Array.isArray(a)) {
    if (!Array.isArray(b) || a.length !== b.length) return false;
    return a.every((val, i) => deepEqual(val, b[i]));
  }

  if (typeof a === 'object') {
    const aObj = a as Record<string, unknown>;
    const bObj = b as Record<string, unknown>;
    const allKeys = new Set([
      ...Object.keys(aObj),
      ...Object.keys(bObj),
    ]);
    return [...allKeys].every((key) => deepEqual(aObj[key], bObj[key]));
  }

  return false;
};

export const diffObjects = (
  o1: Record<string, any>,
  o2: Record<string, any>,
) => {
  const diff: Record<string, any> = {};
  if (deepEqual(o1, o2)) return {};

  const allKeys = new Set([...Object.keys(o1), ...Object.keys(o2)]);

  for (const k of allKeys) {
    const v1 = o1[k];
    const v2 = o2[k];

    if (deepEqual(v1, v2)) continue;

    if (Array.isArray(v1) || Array.isArray(v2)) {
      diff[k] = v2;
    } else if (
      v1 !== null &&
      v2 !== null &&
      typeof v1 === 'object' &&
      typeof v2 === 'object'
    ) {
      const nested = diffObjects(v1, v2);
      if (Object.keys(nested).length > 0) {
        diff[k] = nested;
      }
    } else {
      diff[k] = v2;
    }
  }

  return diff;
};
