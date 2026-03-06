import { useDesignTokens } from '@/hooks/use-design-tokens';
import { getLuminance, toHex } from '@/lib/colors';
import Editor, { loader, Monaco } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';

loader.config({ monaco });

const sampleCode = `
import React from 'react';
import ReactDOM from 'react-dom';

import Editor from '@monaco-editor/react';

function App() {
  const [fileName, setFileName] = useState('script.js');

  const file = files[fileName];

  return (
    <>
      <button disabled={fileName === 'script.js'} onClick={() => setFileName('script.js')}>
        script.js
      </button>
      <button disabled={fileName === 'style.css'} onClick={() => setFileName('style.css')}>
        style.css
      </button>
      <button disabled={fileName === 'index.html'} onClick={() => setFileName('index.html')}>
        index.html
      </button>
      <Editor
        height="80vh"
        theme="vs-dark"
        path={file.name}
        defaultLanguage={file.language}
        defaultValue={file.value}
      />
    </>
  );
}

const rootElement = document.getElementById('root');
ReactDOM.render(<App />, rootElement);`;

export const EditorComponent = () => {
  const tokens = useDesignTokens();

  const isDarkMode = getLuminance(tokens.tokens.surface) < 0.5;

  const beforeMount = (editor: Monaco) => {
    editor.editor.defineTheme('transparent-theme', {
      base: isDarkMode ? 'vs-dark' : 'vs', // or 'vs-dark' or 'hc-black'
      inherit: true,
      rules: [],
      colors: {
        'editor.background': toHex(tokens.tokens.surface),
        'editorGutter.background': toHex(tokens.tokens.surfaceRaised),
        'minimap.background': toHex(tokens.tokens.surfaceRaised),
      },
    });
  };

  return (
    <Editor
      height="100%"
      width="100%"
      defaultLanguage="javascript"
      defaultValue={sampleCode}
      options={{}}
      beforeMount={beforeMount}
      theme={'transparent-theme'}
    />
  );
};
