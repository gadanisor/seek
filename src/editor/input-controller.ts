import { TextModel, type TextChange } from "./text-model";
import type { SelectionState } from "./history-manager";

export class InputController {
  private selectionFrame: number | null = null;
  private selectionBefore: SelectionState | null = null;

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
    private onSelectionChange: () => void,
    private onEdit: (
      change: TextChange,
      selectionBefore: SelectionState,
      selectionAfter: SelectionState
    ) => void
  ) {

    this.editor.addEventListener("beforeinput", () => {
      this.selectionBefore = {
          start: this.editor.selectionStart,
          end: this.editor.selectionEnd
      };
    });
    
    this.editor.addEventListener("input", () => {
      const selectionAfter: SelectionState = {
        start: this.editor.selectionStart,
        end: this.editor.selectionEnd
      };

      const selectionBefore = this.selectionBefore;
      this.selectionBefore = null;

      const change = this.syncModel();

      if (change && selectionBefore) {
        this.onEdit(change, selectionBefore, selectionAfter);
      }

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

  private syncModel(): TextChange | null {
    const newText = this.editor.value;
    const oldText = this.model.getText();

    if (newText === oldText) return null;

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

    const change: TextChange = {
      start,
      deletedText: oldText.slice(start, oldEnd),
      deletedLength: oldEnd - start,
      insertedText: newText.slice(start, newEnd)
    };

    this.model.replace(
      change.start,
      oldEnd,
      change.insertedText
    );

    return change;
  }
}
