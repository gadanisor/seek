
import "./style.css";
import { TextModel } from "./editor/text-model";
import { EditorView } from "./editor/editor-view";
import { InputController } from "./editor/input-controller";
import { CursorView } from "./editor/cursor-view";
import { SelectionView } from "./editor/selection-view";
import { HistoryManager } from "./editor/history-manager";

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

function syncEditorFromModel(offset: number): void {
  editor.value = model.getText();

  const position = Math.min(offset, editor.value.length);
  editor.setSelectionRange(position, position);

  cursor.resetBlink();
  updatePosition();
}

function undo(): void {
  const change = history.undo();
  if (!change) return;

  // După undo, cursorul ajunge la sfârșitul
  // textului restaurat.
  const offset = change.start + change.deletedText.length;

  syncEditorFromModel(offset);
}

function redo(): void {
  const change = history.redo();
  if (!change) return;

  // După redo, cursorul ajunge la sfârșitul
  // textului inserat.
  const offset = change.start + change.insertedText.length;

  syncEditorFromModel(offset);
}

new InputController(
  editor,
  model,
  () => {
    cursor.resetBlink();
  },
  updatePosition
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
