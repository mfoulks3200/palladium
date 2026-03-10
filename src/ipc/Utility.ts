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

export const diffObjects = (
  o1: Record<string, any>,
  o2: Record<string, any>,
) => {
  var diff: Record<string, any> = {};
  if (JSON.stringify(o1) === JSON.stringify(o2)) return {};

  for (var k in o1) {
    if (Array.isArray(o1[k]) && Array.isArray(o2[k]) && o2[k].length > 0) {
      diff[k] = o2[k];
    } else if (typeof o1[k] === 'object' && typeof o2[k] === 'object') {
      const newObj = diffObjects(o1[k], o2[k]);
      if (Object.keys(newObj).length > 0) {
        diff[k] = newObj;
      }
    } else if (o1[k] !== o2[k]) {
      diff[k] = o2[k];
    }
  }
  return diff;
};
