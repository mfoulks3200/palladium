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

// JSDOM does not implement Fetch API globals required by react-router v7
if (!global.Request) {
  // @ts-ignore – minimal polyfill for react-router's createClientSideRequest
  global.Request = class Request {
    url: string;
    method: string;
    signal: AbortSignal;
    constructor(url: string, init?: any) {
      this.url = url;
      this.method = init?.method ?? 'GET';
      this.signal = init?.signal ?? new AbortController().signal;
    }
  };
}
if (!global.Response) {
  // @ts-ignore
  global.Response = class Response {
    constructor(public body: any, public init?: any) {}
  };
}
