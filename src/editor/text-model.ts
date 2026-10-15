
export type TextChange = {
  start: number;
  deletedLength: number;
  insertedText: string;
};

export type TextChangeListener = (change: TextChange) => void;

export class TextModel {
  private text: string;
  private listeners = new Set<TextChangeListener>();

  constructor(text = "") {
    this.text = text;
  }

  getText(): string {
    return this.text;
  }

  getLength(): number {
    return this.text.length;
  }

  insert(offset: number, text: string): void {
    if (!text) return;

    this.text =
      this.text.slice(0, offset) +
      text +
      this.text.slice(offset);

    this.emit({
      start: offset,
      deletedLength: 0,
      insertedText: text
    });
  }

  delete(start: number, end: number): void {
    if (start === end) return;

    this.text =
      this.text.slice(0, start) +
      this.text.slice(end);

    this.emit({
      start,
      deletedLength: end - start,
      insertedText: ""
    });
  }

  onChange(listener: TextChangeListener): () => void {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit(change: TextChange): void {
    for (const listener of this.listeners) {
      listener(change);
    }
  }
}
