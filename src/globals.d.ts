declare module '*.module.css' {
  const classes: { [key: string]: string };
  export default classes;
}

declare var VERSION: string;
declare var COMMITHASH: string;
declare var BRANCH: string;
declare var LASTCOMMITDATETIME: string;
