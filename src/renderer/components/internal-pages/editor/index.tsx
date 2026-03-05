import Editor, { loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';

loader.config({ monaco });

export const EditorPage = () => {
  return (
    <>
      <EditorComponent />
    </>
  );
};

const EditorComponent = () => {
  return (
    <Editor
      height="100%"
      width="100%"
      defaultLanguage="javascript"
      defaultValue="// some comment"
    />
  );
};
