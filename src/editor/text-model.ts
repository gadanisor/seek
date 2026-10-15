export type TextChange = {
  start: number;
  deletedText: string;
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
    this.replace(offset, offset, text);
  }

  delete(start: number, end: number): void {
    this.replace(start, end, "");
  }

  replace(start: number, end: number, text: string): void {
    if (start === end && text === "") return;
    const deletedText = this.text.slice(start, end);

    this.text =
      this.text.slice(0, start) +
      text +
      this.text.slice(end);

    this.emit({
      start,
      deletedText,
      deletedLength: deletedText.length,
      insertedText: text
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
