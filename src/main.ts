import "./style.css";
import { TextModel } from "./editor/text-model";
import { EditorView } from "./editor/editor-view";
import { InputController } from "./editor/input-controller";
import { CursorView } from "./editor/cursor-view";
import { SelectionView } from "./editor/selection-view";
import { HistoryManager, type SelectionState } from "./editor/history-manager";

const editor = document.querySelector<HTMLTextAreaElement>("#editor")!;
const position = document.querySelector<HTMLElement>("#position")!;
const viewContainer = document.querySelector<HTMLElement>("#editor-view")!;

const model = new TextModel();
const view = new EditorView(viewContainer, model);
const history = new HistoryManager(model);

model.onChange((change) => {
  view.applyChange(change);
});

const cursorContainer = document.querySelector<HTMLElement>("#cursor-layer")!;
const cursor = new CursorView(cursorContainer, editor);

const selectionContainer = document.querySelector<HTMLElement>("#selection-layer")!;
const selection = new SelectionView(selectionContainer, editor);

function updatePosition(): void {
  const beforeCursor = editor.value.slice(0, editor.selectionStart);
  const lines = beforeCursor.split("\n");

  const line = lines.length;
  const column = lines[lines.length - 1].length + 1;

  position.textContent = `Ln ${line}, Col ${column}`;
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
updatePosition();
