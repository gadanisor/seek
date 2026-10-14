
import { TextModel } from "./text-model";

export class InputController {
  constructor(
    private editor: HTMLTextAreaElement,
    private model: TextModel,
    private onChange: () => void,
    private onSelectionChange: () => void
  ) {
    this.editor.addEventListener("input", () => {
      this.syncModel();
      this.onChange();
      this.onSelectionChange();
    });

    this.editor.addEventListener("click", this.onSelectionChange);
    this.editor.addEventListener("keyup", this.onSelectionChange);
    this.editor.addEventListener("select", this.onSelectionChange);
  }

  private syncModel(): void {
    const newText = this.editor.value;
    const oldText = this.model.getText();

    if (newText === oldText) return;

    let start = 0;

    while (
      start < oldText.length &&
      start < newText.length &&
      oldText[start] === newText[start]
    ) {
      start++;
    }

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

    this.model.delete(start, oldEnd);
    this.model.insert(start, newText.slice(start, newEnd));
  }
}
