import "./style.css";
import { TextModel } from "./editor/text-model";
import { EditorView } from "./editor/editor-view";
import { InputController } from "./editor/input-controller";
import { CursorView } from "./editor/cursor-view";

const editor = document.querySelector<HTMLTextAreaElement>("#editor")!;
const position = document.querySelector<HTMLElement>("#position")!;
const viewContainer = document.querySelector<HTMLElement>("#editor-view")!;

const model = new TextModel();
const view = new EditorView(viewContainer, model);
const cursorContainer = document.querySelector<HTMLElement>("#cursor-layer")!;
const cursor = new CursorView(cursorContainer, editor);

function updatePosition(): void {
  const beforeCursor = editor.value.slice(0, editor.selectionStart);
  const lines = beforeCursor.split("\n");

  const line = lines.length;
  const column = lines[lines.length - 1].length + 1;

  position.textContent = `Ln ${line}, Col ${column}`;
  cursor.render();
}

new InputController(
  editor,
  model,
  () => {
    view.render();
    cursor.resetBlink();
  },
  updatePosition
);

editor.addEventListener("scroll", () => {
  viewContainer.scrollTop = editor.scrollTop;
  viewContainer.scrollLeft = editor.scrollLeft;
  cursor.render();
});

view.render();
updatePosition();
