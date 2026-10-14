// src/editor/text-model.ts

export class TextModel {
  private content: string;

  constructor(content: string = "") {
    this.content = content;
  }

  getText(): string {
    return this.content;
  }

  insert(offset: number, text: string): void {
    if (offset < 0 || offset > this.content.length) {
      throw new RangeError("Invalid insertion offset");
    }

    this.content =
      this.content.slice(0, offset) +
      text +
      this.content.slice(offset);
  }

  delete(start: number, end: number): void {
    if (start < 0 || end < start || end > this.content.length) {
      throw new RangeError("Invalid deletion range");
    }

    this.content =
      this.content.slice(0, start) +
      this.content.slice(end);
  }

  getLength(): number {
    return this.content.length;
  }
}