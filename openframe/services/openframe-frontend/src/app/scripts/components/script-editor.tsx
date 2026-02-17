'use client'

import Editor, { type Monaco } from '@monaco-editor/react'
import { useCallback, useRef } from 'react'

const ODS_THEME_NAME = 'ods-dark'

const SHELL_TO_LANGUAGE: Record<string, string> = {
  powershell: 'powershell',
  cmd: 'bat',
  bash: 'shell',
  python: 'python',
  nushell: 'shell',
  deno: 'typescript',
  shell: 'shell',
}

function defineOdsTheme(monaco: Monaco) {
  monaco.editor.defineTheme(ODS_THEME_NAME, {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: '', foreground: 'fafafa', background: '161616' },
      { token: 'comment', foreground: '747474', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'ffc008' },
      { token: 'keyword.flow', foreground: 'ffc008' },
      { token: 'string', foreground: '5efaf0' },
      { token: 'string.escape', foreground: '44c8c0' },
      { token: 'number', foreground: 'f5b600' },
      { token: 'variable', foreground: 'fafafa' },
      { token: 'variable.predefined', foreground: '5efaf0' },
      { token: 'type', foreground: '5ea62e' },
      { token: 'function', foreground: '5ea62e' },
      { token: 'operator', foreground: '888888' },
      { token: 'delimiter', foreground: '888888' },
      { token: 'tag', foreground: 'ffc008' },
      { token: 'attribute.name', foreground: '5ea62e' },
      { token: 'attribute.value', foreground: '5efaf0' },
      { token: 'constant', foreground: 'f5b600' },
      { token: 'regexp', foreground: 'f36666' },
      { token: 'annotation', foreground: 'ffc008' },
      { token: 'metatag', foreground: 'ffc008' },
    ],
    colors: {
      'editor.background': '#161616',
      'editor.foreground': '#fafafa',
      'editor.lineHighlightBackground': '#21212180',
      'editor.selectionBackground': '#ffc00830',
      'editor.selectionHighlightBackground': '#ffc00815',
      'editor.inactiveSelectionBackground': '#3a3a3a40',
      'editorLineNumber.foreground': '#747474',
      'editorLineNumber.activeForeground': '#fafafa',
      'editorCursor.foreground': '#ffc008',
      'editorGutter.background': '#161616',
      'editorWidget.background': '#212121',
      'editorWidget.border': '#3a3a3a',
      'editorIndentGuide.background': '#3a3a3a40',
      'editorIndentGuide.activeBackground': '#3a3a3a80',
      'editorWhitespace.foreground': '#3a3a3a60',
      'editorBracketMatch.background': '#ffc00820',
      'editorBracketMatch.border': '#ffc00860',
      'editor.findMatchBackground': '#ffc00830',
      'editor.findMatchHighlightBackground': '#ffc00815',
      'editorOverviewRuler.border': '#3a3a3a',
      'scrollbar.shadow': '#00000000',
      'scrollbarSlider.background': '#3a3a3a60',
      'scrollbarSlider.hoverBackground': '#3a3a3a90',
      'scrollbarSlider.activeBackground': '#ffc00840',
      'input.background': '#212121',
      'input.border': '#3a3a3a',
      'input.foreground': '#fafafa',
      'focusBorder': '#ffc008',
      'list.activeSelectionBackground': '#ffc00820',
      'list.hoverBackground': '#2b2b2b',
      'minimap.background': '#161616',
    },
  })
}

interface ScriptEditorProps {
  value: string
  onChange?: (value: string) => void
  shell?: string
  readOnly?: boolean
  height?: string
}

export function ScriptEditor({
  value,
  onChange,
  shell = 'bash',
  readOnly = false,
  height = '400px',
}: ScriptEditorProps) {
  const editorRef = useRef<ReturnType<Monaco['editor']['create']> | null>(null)

  const language = SHELL_TO_LANGUAGE[shell.toLowerCase()] || 'shell'

  const handleBeforeMount = useCallback((monaco: Monaco) => {
    defineOdsTheme(monaco)
  }, [])

  const handleMount = useCallback(
    (editor: ReturnType<Monaco['editor']['create']>) => {
      editorRef.current = editor
    },
    [],
  )

  const handleChange = useCallback(
    (val: string | undefined) => {
      onChange?.(val ?? '')
    },
    [onChange],
  )

  return (
    <div className="rounded-md border border-ods-border overflow-hidden">
      <Editor
        height={height}
        language={language}
        value={value}
        theme={ODS_THEME_NAME}
        beforeMount={handleBeforeMount}
        onMount={handleMount}
        onChange={handleChange}
        loading={
          <div className="flex items-center justify-center h-full bg-ods-bg text-ods-text-secondary">
            Loading editor...
          </div>
        }
        options={{
          readOnly,
          fontSize: 14,
          fontFamily: 'var(--font-azeret-mono), "SF Mono", Monaco, Inconsolata, Consolas, monospace',
          lineHeight: 22,
          minimap: { enabled: !readOnly },
          scrollBeyondLastLine: false,
          wordWrap: 'off',
          automaticLayout: true,
          tabSize: 2,
          renderLineHighlight: readOnly ? 'none' : 'line',
          cursorBlinking: 'smooth',
          cursorSmoothCaretAnimation: 'on',
          smoothScrolling: true,
          padding: { top: 12, bottom: 12 },
          bracketPairColorization: { enabled: true },
          matchBrackets: 'always',
          suggest: {
            showKeywords: true,
            showSnippets: true,
          },
          quickSuggestions: !readOnly,
          folding: true,
          foldingHighlight: true,
          lineNumbers: 'on',
          glyphMargin: false,
          lineDecorationsWidth: 0,
          overviewRulerLanes: 0,
          hideCursorInOverviewRuler: true,
          overviewRulerBorder: false,
          domReadOnly: readOnly,
          contextmenu: !readOnly,
          scrollbar: {
            verticalScrollbarSize: 8,
            horizontalScrollbarSize: 8,
            useShadows: false,
          },
        }}
      />
    </div>
  )
}
