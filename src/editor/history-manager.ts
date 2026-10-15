
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
        if (change.insertedText) {
            // Tastare: adăugăm caracterele la final.
            previous.insertedText += change.insertedText;
        } else {
            // Backspace: caracterele șterse vin în față.
            previous.start = change.start;
            previous.deletedText =
            change.deletedText + previous.deletedText;

            previous.deletedLength =
            previous.deletedText.length;
        }
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

    if (!withinTime) return false;

    // Grupăm caracterele tastate consecutiv.
    const previousIsTyping =
      previous.deletedLength === 0 &&
      previous.insertedText.length > 0 &&
      !previous.insertedText.includes("\n");

    const currentIsTyping =
      current.deletedLength === 0 &&
      current.insertedText.length === 1 &&
      !current.insertedText.includes("\n");

    if (previousIsTyping && currentIsTyping) {
      return (
        current.start ===
        previous.start + previous.insertedText.length
      );
    }

    // Grupăm ștergerile consecutive cu Backspace.
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
