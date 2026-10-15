
import { TextModel } from "./text-model";

export class EditorView {
  private container: HTMLElement;
  private model: TextModel;

  private lines: string[] = [];
  private elements: HTMLDivElement[] = [];

  constructor(container: HTMLElement, model: TextModel) {
    this.container = container;
    this.model = model;
  }

  render(): void {
    const nextLines = this.model.getText().split("\n");

    // Prima randare.
    if (this.elements.length === 0) {
      const fragment = document.createDocumentFragment();

      for (const line of nextLines) {
        const element = this.createLine(line);

        this.elements.push(element);
        fragment.appendChild(element);
      }

      this.container.appendChild(fragment);
      this.lines = nextLines;
      return;
    }

    // Căutăm liniile identice de la început.
    let start = 0;

    while (
      start < this.lines.length &&
      start < nextLines.length &&
      this.lines[start] === nextLines[start]
    ) {
      start++;
    }

    // Căutăm liniile identice de la sfârșit.
    let oldEnd = this.lines.length;
    let newEnd = nextLines.length;

    while (
      oldEnd > start &&
      newEnd > start &&
      this.lines[oldEnd - 1] === nextLines[newEnd - 1]
    ) {
      oldEnd--;
      newEnd--;
    }

    // Liniile modificate.
    const oldCount = oldEnd - start;
    const newCount = newEnd - start;

    // Actualizăm elementele pe care le putem reutiliza.
    const reusedCount = Math.min(oldCount, newCount);

    for (let i = 0; i < reusedCount; i++) {
      const index = start + i;
      this.elements[index].textContent = nextLines[index];
    }

    // Dacă au apărut linii noi, le inserăm.
    if (newCount > oldCount) {
      const fragment = document.createDocumentFragment();
      const addedElements: HTMLDivElement[] = [];

      for (let i = start + reusedCount; i < newEnd; i++) {
        const element = this.createLine(nextLines[i]);

        addedElements.push(element);
        fragment.appendChild(element);
      }

      const reference =
        this.elements[start + reusedCount] ?? null;

      this.container.insertBefore(fragment, reference);

      this.elements.splice(
        start + reusedCount,
        0,
        ...addedElements
      );
    }

    // Dacă au dispărut linii, le eliminăm.
    if (oldCount > newCount) {
      const removeStart = start + reusedCount;
      const removeCount = oldCount - newCount;

      const removed = this.elements.splice(
        removeStart,
        removeCount
      );

      for (const element of removed) {
        element.remove();
      }
    }

    this.lines = nextLines;
  }

  private createLine(text: string): HTMLDivElement {
    const element = document.createElement("div");

    element.className = "editor-line";
    element.textContent = text;

    return element;
  }
}
