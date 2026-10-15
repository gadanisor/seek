
import { TextModel } from "./text-model";

export class InputController {
  private selectionFrame: number | null = null;

  private scheduleSelectionUpdate = (): void => {
    if (this.selectionFrame !== null) return;
    this.selectionFrame = requestAnimationFrame(() => {
      this.selectionFrame = null;
      this.onSelectionChange();
    });
  };

  constructor(
    private editor: HTMLTextAreaElement,
    private model: TextModel,
    private onChange: () => void,
    private onSelectionChange: () => void
  ) {
    
    this.editor.addEventListener("input", () => {
      this.syncModel();
      this.onChange();
      this.scheduleSelectionUpdate();
    });

    this.editor.addEventListener(
      "pointerup",
      this.scheduleSelectionUpdate
    );

    this.editor.addEventListener(
      "keydown",
      this.scheduleSelectionUpdate
    );

    this.editor.addEventListener(
      "keyup",
      this.scheduleSelectionUpdate
    );

    this.editor.addEventListener(
      "select",
      this.scheduleSelectionUpdate
    );

    this.editor.addEventListener(
      "focus",
      this.scheduleSelectionUpdate
    );

    this.editor.addEventListener(
      "blur",
      this.scheduleSelectionUpdate
    );

    document.addEventListener("selectionchange", () => {
      if (document.activeElement === this.editor) {
        this.scheduleSelectionUpdate();
      }
    });
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

    this.model.replace(start, oldEnd, newText.slice(start, newEnd));
  }
}
