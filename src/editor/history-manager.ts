
import { TextModel, type TextChange } from "./text-model";

export class HistoryManager {
  private undoStack: TextChange[] = [];
  private redoStack: TextChange[] = [];

  private isRestoring = false;
  private lastEditTime = 0;

  private readonly mergeDelay = 750;

  constructor(private model: TextModel) {
    this.model.onChange((change) => {
      if (this.isRestoring) return;

      const now = Date.now();
      const previous = this.undoStack.at(-1);

      if (
        previous &&
        this.canMerge(previous, change, now)
      ) {
        // Extindem ultima inserare în loc să
        // creăm o intrare nouă în istoric.
        previous.insertedText += change.insertedText;
      } else {
        this.undoStack.push({ ...change });
      }

      this.redoStack = [];
      this.lastEditTime = now;
    });
  }

  private canMerge(
    previous: TextChange,
    current: TextChange,
    now: number
  ): boolean {
    const withinTime =
      now - this.lastEditTime < this.mergeDelay;

    const previousIsTyping =
      previous.deletedLength === 0 &&
      previous.insertedText.length > 0 &&
      !previous.insertedText.includes("\n");

    const currentIsTyping =
      current.deletedLength === 0 &&
      current.insertedText.length === 1 &&
      !current.insertedText.includes("\n");

    const isAdjacent =
      current.start ===
      previous.start + previous.insertedText.length;

    return (
      withinTime &&
      previousIsTyping &&
      currentIsTyping &&
      isAdjacent
    );
  }

  undo(): TextChange | null {
    const change = this.undoStack.pop();
    if (!change) return null;

    this.isRestoring = true;

    try {
      this.model.replace(
        change.start,
        change.start + change.insertedText.length,
        change.deletedText
      );

      this.redoStack.push(change);
      return change;
    } finally {
      this.isRestoring = false;
    }
  }

  redo(): TextChange | null {
    const change = this.redoStack.pop();
    if (!change) return null;

    this.isRestoring = true;

    try {
      this.model.replace(
        change.start,
        change.start + change.deletedText.length,
        change.insertedText
      );

      this.undoStack.push(change);
      return change;
    } finally {
      this.isRestoring = false;
    }
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }
}
