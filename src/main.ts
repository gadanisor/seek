
import "./style.css";
import { TextModel } from "./editor/text-model";

const editor = document.querySelector<HTMLTextAreaElement>("#editor")!;
const position = document.querySelector<HTMLElement>("#position")!;

const model = new TextModel();

function updatePosition(): void {
    const beforeCursor = editor.value.slice(0, editor.selectionStart);
    const lines = beforeCursor.split("\n");

    const line = lines.length;
    const column = lines[lines.length - 1].length + 1;

    position.textContent = `Ln ${line}, Col ${column}`;
}

function syncModel(): void {
  const newText = editor.value;
  const oldText = model.getText();

  if (newText === oldText) return;

  // Find the unchanged prefix.
  let start = 0;

  while (
    start < oldText.length &&
    start < newText.length &&
    oldText[start] === newText[start]
  ) {
    start++;
  }

  // Find the unchanged suffix.
  let oldEnd = oldText.length;
  let newEnd = newText.length;

  while (
    oldEnd > start &&
    newEnd > start &&
    oldText[oldEnd - 1] === newText[newEnd - 1]
  ) {
    oldEnd--;
    newEnd--;
  }

  model.delete(start, oldEnd);
  model.insert(start, newText.slice(start, newEnd));
  console.log("Seek TextModel:", model.getText());
}

editor.addEventListener("input", () => {
  syncModel();
  updatePosition();
});

editor.addEventListener("click", updatePosition);
editor.addEventListener("keyup", updatePosition);
editor.addEventListener("select", updatePosition);

updatePosition();
