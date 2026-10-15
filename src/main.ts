import "./style.css";
import { TextModel } from "./editor/text-model";
import { EditorView } from "./editor/editor-view";
import { InputController } from "./editor/input-controller";
import { CursorView } from "./editor/cursor-view";
import { SelectionView } from "./editor/selection-view";
import { HistoryManager, type SelectionState } from "./editor/history-manager";
import { LineNumberView } from "./editor/line-number-view";

const editor = document.querySelector<HTMLTextAreaElement>("#editor")!;
const viewContainer = document.querySelector<HTMLElement>("#editor-view")!;

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
});

const cursorContainer = document.querySelector<HTMLElement>("#cursor-layer")!;
const cursor = new CursorView(cursorContainer, editor);

const selectionContainer = document.querySelector<HTMLElement>("#selection-layer")!;
const selection = new SelectionView(selectionContainer, editor);

function updatePosition(): void {
  const beforeCursor = editor.value.slice(0, editor.selectionStart);
  const line = beforeCursor.split("\n").length;

  view.setActiveLine(line - 1);
  lineNumbers.setActiveLine(line - 1);

  cursor.render();
  selection.render();
}

function syncEditorFromModel(selection: SelectionState): void {
  editor.value = model.getText();

  editor.setSelectionRange(
    selection.start,
    selection.end
  );

  cursor.resetBlink();
  updatePosition();
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

editor.addEventListener("scroll", () => {
  viewContainer.scrollTop = editor.scrollTop;
  viewContainer.scrollLeft = editor.scrollLeft;
  cursor.render();
  lineNumbers.syncScroll();
  selection.render();
});

editor.addEventListener("keydown", (event) => {
  const modifier = event.ctrlKey || event.metaKey;

  if (!modifier) return;

  const key = event.key.toLowerCase();

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
updatePosition();
