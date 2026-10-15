import { TextModel, type TextChange } from "./text-model";

export type SelectionState = {
  start: number;
  end: number;
};

export type HistoryEntry = {
  change: TextChange;
  selectionBefore: SelectionState;
  selectionAfter: SelectionState;
};

export class HistoryManager {
  private undoStack: HistoryEntry[] = [];
  private redoStack: HistoryEntry[] = [];

  private lastEditTime = 0;
  private readonly mergeDelay = 750;

  constructor(private model: TextModel) {}

  record(
    change: TextChange,
    selectionBefore: SelectionState,
    selectionAfter: SelectionState
  ): void {
    const now = Date.now();
    const previous = this.undoStack.at(-1);

    if (
      previous &&
      this.canMerge(previous.change, change, now)
    ) {
      if (change.insertedText) {
        previous.change.insertedText += change.insertedText;
      } else {
        previous.change.start = change.start;
        previous.change.deletedText =
          change.deletedText + previous.change.deletedText;

        previous.change.deletedLength =
          previous.change.deletedText.length;
      }

      // Păstrăm selecția inițială a grupului,
      // dar actualizăm selecția finală.
      previous.selectionAfter = { ...selectionAfter };
    } else {
      this.undoStack.push({
        change: { ...change },
        selectionBefore: { ...selectionBefore },
        selectionAfter: { ...selectionAfter }
      });
    }

    this.redoStack = [];
    this.lastEditTime = now;
  }

  private canMerge(
    previous: TextChange,
    current: TextChange,
    now: number
  ): boolean {
    if (now - this.lastEditTime >= this.mergeDelay) {
      return false;
    }

    const previousIsTyping =
      previous.deletedLength === 0 &&
      previous.insertedText.length > 0 &&
      !previous.insertedText.includes("\n");

    const currentIsTyping =
      current.deletedLength === 0 &&
      current.insertedText.length === 1 &&
      !current.insertedText.includes("\n");

    const previousIsReplacement =
        previous.deletedLength > 0 &&
        previous.insertedText.length > 0 &&
        !previous.deletedText.includes("\n") &&
        !previous.insertedText.includes("\n");

    if (
        (previousIsTyping || previousIsReplacement) &&
        currentIsTyping
    ) {
        return (
            current.start ===
            previous.start + previous.insertedText.length
        );
    }

    const previousIsDeleting =
      previous.insertedText === "" &&
      previous.deletedLength > 0 &&
      !previous.deletedText.includes("\n");

    const currentIsDeleting =
      current.insertedText === "" &&
      current.deletedLength === 1 &&
      !current.deletedText.includes("\n");

    if (previousIsDeleting && currentIsDeleting) {
      return (
        current.start + current.deletedLength ===
        previous.start
      );
    }

    return false;
  }

  undo(): HistoryEntry | null {
    const entry = this.undoStack.pop();
    if (!entry) return null;

    const change = entry.change;

    this.model.replace(
      change.start,
      change.start + change.insertedText.length,
      change.deletedText
    );

    this.redoStack.push(entry);
    return entry;
  }

  redo(): HistoryEntry | null {
    const entry = this.redoStack.pop();
    if (!entry) return null;

    const change = entry.change;

    this.model.replace(
      change.start,
      change.start + change.deletedText.length,
      change.insertedText
    );

    this.undoStack.push(entry);
    return entry;
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }
}

