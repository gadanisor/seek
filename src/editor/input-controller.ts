import { TextModel, type TextChange } from "./text-model";
import type { SelectionState } from "./history-manager";

export class InputController {
  private abortController = new AbortController();
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
    const eventOptions = { signal: this.abortController.signal };

    this.editor.addEventListener("beforeinput", () => {
      this.selectionBefore = {
          start: this.editor.selectionStart,
          end: this.editor.selectionEnd
      };
    }, eventOptions);
    
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
    }, eventOptions);

    this.editor.addEventListener(
      "pointerup",
      this.scheduleSelectionUpdate,
      eventOptions
    );

    this.editor.addEventListener(
      "keydown",
      this.scheduleSelectionUpdate,
      eventOptions
    );

    this.editor.addEventListener(
      "keyup",
      this.scheduleSelectionUpdate,
      eventOptions
    );

    this.editor.addEventListener(
      "select",
      this.scheduleSelectionUpdate,
      eventOptions
    );

    this.editor.addEventListener(
      "focus",
      this.scheduleSelectionUpdate,
      eventOptions
    );

    this.editor.addEventListener(
      "blur",
      this.scheduleSelectionUpdate,
      eventOptions
    );

    document.addEventListener("selectionchange", () => {
      if (document.activeElement === this.editor) {
        this.scheduleSelectionUpdate();
      }
    }, eventOptions);
  }

  dispose(): void {
    this.abortController.abort();
    if (this.selectionFrame !== null) {
      cancelAnimationFrame(this.selectionFrame);
      this.selectionFrame = null;
    }
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
