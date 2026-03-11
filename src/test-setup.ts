import { TextEncoder, TextDecoder } from 'node:util';

// JSDOM does not implement TextEncoder and TextDecoder
if (!global.TextEncoder) {
  global.TextEncoder = TextEncoder;
}
if (!global.TextDecoder) {
  // @ts-ignore
  global.TextDecoder = TextDecoder;
}

// JSDOM does not implement structuredClone
if (!global.structuredClone) {
  global.structuredClone = <T>(val: T): T =>
    JSON.parse(JSON.stringify(val)) as T;
}
