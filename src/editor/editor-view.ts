
import { TextModel, type TextChange } from "./text-model";

export class EditorView {
  private container: HTMLElement;
  private model: TextModel;

  private lines: string[] = [];
  private elements: HTMLDivElement[] = [];
  private activeLineIndex = 0;

  constructor(container: HTMLElement, model: TextModel) {
    this.container = container;
    this.model = model;
  }

  setActiveLine(index: number): void {
    if (index === this.activeLineIndex) return;

    this.elements[this.activeLineIndex]
      ?.classList.remove("active-line");

    this.activeLineIndex = index;

    this.elements[this.activeLineIndex]
      ?.classList.add("active-line");
  }

  render(): void {
    const text = this.model.getText();

    this.lines = text.split("\n");
    this.elements = [];

    const fragment = document.createDocumentFragment();

    for (const line of this.lines) {
      const element = this.createLine(line);

      this.elements.push(element);
      fragment.appendChild(element);
    }

    this.container.replaceChildren(fragment);
    this.elements[this.activeLineIndex]
      ?.classList.add("active-line");
  }

  applyChange(change: TextChange): void {
    // Calculăm linia și coloana de unde începe modificarea.
    let lineIndex = 0;
    let lineStartOffset = 0;

    for (let i = 0; i < this.lines.length; i++) {
      const lineEndOffset =
        lineStartOffset + this.lines[i].length;

      if (change.start <= lineEndOffset) {
        lineIndex = i;
        break;
      }

      lineStartOffset = lineEndOffset + 1;
    }

    const column = change.start - lineStartOffset;

    // Pentru ștergere, aflăm unde se termina textul eliminat.
    const deleteEnd = change.start + change.deletedLength;

    let endLineIndex = lineIndex;
    let endLineStartOffset = lineStartOffset;

    while (
      endLineIndex < this.lines.length - 1 &&
      deleteEnd >
        endLineStartOffset + this.lines[endLineIndex].length
    ) {
      endLineStartOffset +=
        this.lines[endLineIndex].length + 1;

      endLineIndex++;
    }

    const endColumn = deleteEnd - endLineStartOffset;

    const firstLine = this.lines[lineIndex];
    const lastLine = this.lines[endLineIndex];

    const before = firstLine.slice(0, column);
    const after = lastLine.slice(endColumn);

    const replacement = (
      before + change.insertedText + after
    ).split("\n");

    const removedCount = endLineIndex - lineIndex + 1;

    // Actualizăm modelul local al liniilor.
    this.lines.splice(
      lineIndex,
      removedCount,
      ...replacement
    );

    // Refolosim elementul primei linii.
    const firstElement = this.elements[lineIndex];
    firstElement.textContent = replacement[0];

    // Eliminăm liniile vechi suplimentare.
    const removedElements = this.elements.splice(
      lineIndex + 1,
      removedCount - 1
    );

    for (const element of removedElements) {
      element.remove();
    }

    // Inserăm liniile noi suplimentare.
    if (replacement.length > 1) {
      const fragment = document.createDocumentFragment();
      const addedElements: HTMLDivElement[] = [];

      for (let i = 1; i < replacement.length; i++) {
        const element = this.createLine(replacement[i]);

        addedElements.push(element);
        fragment.appendChild(element);
      }

      firstElement.after(fragment);

      this.elements.splice(
        lineIndex + 1,
        0,
        ...addedElements
      );
    }

    this.elements.forEach((element, index) => {
      element.classList.toggle(
        "active-line",
        index === this.activeLineIndex
      );
    });
  }

  private createLine(text: string): HTMLDivElement {
    const element = document.createElement("div");

    element.className = "editor-line";
    element.textContent = text;

    return element;
  }
}
