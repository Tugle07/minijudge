/* Điểm vào đóng gói CodeMirror 6 thành một file ES module: public/vendor/codemirror.js.
 * Build lại sau khi đổi phiên bản thư viện: npm run build:editor */
export {
  EditorView, keymap, lineNumbers, highlightActiveLineGutter, highlightSpecialChars, drawSelection, dropCursor,
  rectangularSelection, crosshairCursor, highlightActiveLine,
} from '@codemirror/view';
export { EditorState, Compartment } from '@codemirror/state';
export { cpp } from '@codemirror/lang-cpp';
export { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
export { indentUnit, HighlightStyle, syntaxHighlighting, indentOnInput, bracketMatching, foldGutter, foldKeymap } from '@codemirror/language';
export { searchKeymap, highlightSelectionMatches } from '@codemirror/search';
export { setDiagnostics, lintGutter, linter, lintKeymap } from '@codemirror/lint';
export { autocompletion, completeAnyWord, snippetCompletion, closeBrackets, closeBracketsKeymap, completionKeymap } from '@codemirror/autocomplete';
export { tags } from '@lezer/highlight';
