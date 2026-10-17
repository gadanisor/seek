import "./editor/themes/dark.css";
import "./editor/themes/light.css";
import "./style.css";
import { TextModel } from "./editor/text-model";
import { EditorView } from "./editor/editor-view";
import { InputController } from "./editor/input-controller";
import { CursorView } from "./editor/cursor-view";
import { SelectionView } from "./editor/selection-view";
import { ScrollbarView } from "./editor/scrollbar-view";
import { HistoryManager, type SelectionState } from "./editor/history-manager";
import { LineNumberView } from "./editor/line-number-view";
import { SearchController } from "./editor/search-controller";
import { SearchDecorationView } from "./editor/search-decoration-view";
import { FindWidget } from "./editor/find-widget";

const editor = document.querySelector<HTMLTextAreaElement>("#editor")!;
const viewContainer = document.querySelector<HTMLElement>("#editor-view")!;
const editorContainer = document.querySelector<HTMLElement>("#editor-container")!;

// Kept internal until editor options are introduced.
const scrollBeyondLastLine = true;

function updateScrollBeyondLastLine(): void {
  if (!scrollBeyondLastLine) {
    editorContainer.style.setProperty("--editor-padding-bottom", "0px");
    return;
  }

  const style = getComputedStyle(editor);
  const lineHeight = parseFloat(style.lineHeight);
  const paddingTop = parseFloat(style.paddingTop);

  if (!Number.isFinite(lineHeight) || !Number.isFinite(paddingTop)) {
    return;
  }

  // Padding is part of scrollHeight. This leaves one complete line in the
  // viewport when the final line has been scrolled to the top content inset.
  const paddingBottom = Math.max(
    0,
    editor.clientHeight - lineHeight - paddingTop
  );

  editorContainer.style.setProperty(
    "--editor-padding-bottom",
    `${paddingBottom}px`
  );
}

const model = new TextModel();
const view = new EditorView(viewContainer, model);
const history = new HistoryManager(model);

const lineNumberContainer =
  document.querySelector<HTMLElement>("#line-number-layer")!;

const lineNumbers = new LineNumberView(
  lineNumberContainer,
  model,
  editor
);

model.onChange((change) => {
  view.applyChange(change);
  lineNumbers.render();
  requestAnimationFrame(() => {
    scrollbar.render();
  });
});

const cursorContainer = document.querySelector<HTMLElement>("#cursor-layer")!;
const cursor = new CursorView(cursorContainer, editor);

const selectionContainer = document.querySelector<HTMLElement>("#selection-layer")!;
const selection = new SelectionView(selectionContainer, editor);

const scrollbarContainer =
  document.querySelector<HTMLElement>("#scrollbar-layer")!;

const scrollbar = new ScrollbarView(
  scrollbarContainer,
  editor
);

const resizeObserver = new ResizeObserver(() => {
  updateScrollBeyondLastLine();
  requestAnimationFrame(() => {
    searchDecorations.render();
    scrollbar.render();
  });
});

resizeObserver.observe(editor);

function updatePosition(): void {
  const beforeCursor = editor.value.slice(0, editor.selectionStart);
  const line = beforeCursor.split("\n").length;

  view.setActiveLine(line - 1);
  lineNumbers.setActiveLine(line - 1);

  cursor.render();
  selection.render();
  scrollbar.render();
}

function syncEditorFromModel(selection: SelectionState): void {
  editor.value = model.getText();

  editor.setSelectionRange(
    selection.start,
    selection.end
  );

  cursor.resetBlink();
  updatePosition();
  searchDecorations.render();
}

function undo(): void {
  const entry = history.undo();
  if (!entry) return;

  syncEditorFromModel(entry.selectionBefore);
}

function redo(): void {
  const entry = history.redo();
  if (!entry) return;

  syncEditorFromModel(entry.selectionAfter);
}

new InputController(
  editor,
  model,
  () => {
    cursor.resetBlink();
  },
  updatePosition,
  (change, selectionBefore, selectionAfter) => {
    history.record(
      change,
      selectionBefore,
      selectionAfter
    );
  }
);

const search = new SearchController(model, history);
const searchDecorations = new SearchDecorationView(editorContainer, editor);

function revealSearchMatch(): void {
  const match = search.getActiveMatch();
  if (!match) return;

  const style = getComputedStyle(editor);
  const lineHeight = parseFloat(style.lineHeight);
  const paddingLeft = parseFloat(style.paddingLeft);
  const paddingTop = parseFloat(style.paddingTop);
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) return;

  context.font = style.font;
  const charWidth = context.measureText("M").width;
  const beforeMatch = model.getText().slice(0, match.start);
  const line = beforeMatch.split("\n").length - 1;
  const column = match.start - (beforeMatch.lastIndexOf("\n") + 1);
  const matchLineLength = Math.max(
    1,
    model.getText().slice(match.start, match.end).split("\n", 1)[0].length
  );
  const left = paddingLeft + column * charWidth;
  const right = left + matchLineLength * charWidth;
  const top = paddingTop + line * lineHeight;
  const bottom = top + lineHeight;

  const availableWidth = editor.clientWidth - paddingLeft - 20;

  if (
    left < editor.scrollLeft + paddingLeft ||
    right - left > availableWidth
  ) {
    editor.scrollLeft = left - paddingLeft;
  } else if (right > editor.scrollLeft + editor.clientWidth - 20) {
    editor.scrollLeft = right - editor.clientWidth + 20;
  }

  if (top < editor.scrollTop) {
    editor.scrollTop = top;
  } else if (bottom > editor.scrollTop + editor.clientHeight) {
    editor.scrollTop = bottom - editor.clientHeight;
  }

  searchDecorations.render();
  scrollbar.render();
}

function currentSelection(): SelectionState {
  return {
    start: editor.selectionStart,
    end: editor.selectionEnd
  };
}

function closeFindWidget(): void {
  findWidget.close();
  searchDecorations.setVisible(false);
  editor.focus();
  updatePosition();
}

const findWidget = new FindWidget(editorContainer, search, {
  open: () => searchDecorations.setVisible(true),
  revealActive: revealSearchMatch,
  replaceCurrent: (replacement) => {
    const selection = search.replaceCurrent(replacement, currentSelection());
    if (!selection) return;
    syncEditorFromModel(selection);
    revealSearchMatch();
  },
  replaceAll: (replacement) => {
    const selection = search.replaceAll(replacement, currentSelection());
    if (!selection) return;
    syncEditorFromModel(selection);
    revealSearchMatch();
  },
  close: closeFindWidget
});

search.onChange((state) => {
  searchDecorations.setState(state);
});

editor.addEventListener("scroll", () => {
  viewContainer.scrollTop = editor.scrollTop;
  viewContainer.scrollLeft = editor.scrollLeft;
  cursor.render();
  lineNumbers.syncScroll();
  selection.render();
  searchDecorations.render();
  scrollbar.render();
});

editor.addEventListener("keydown", (event) => {
  const modifier = event.ctrlKey || event.metaKey;

  if (!modifier) return;

  const key = event.key.toLowerCase();

  if (key === "f" || key === "h") {
    event.preventDefault();
    const selectedText = editor.value.slice(
      editor.selectionStart,
      editor.selectionEnd
    );
    findWidget.open(key === "h", selectedText.includes("\n") ? undefined : selectedText);
    return;
  }

  if (key === "z") {
    event.preventDefault();

    if (event.shiftKey) {
      redo();
    } else {
      undo();
    }
  }

  if (key === "y") {
    event.preventDefault();
    redo();
  }
});

view.render();
lineNumbers.render();
updateScrollBeyondLastLine();
scrollbar.render();
updatePosition();
