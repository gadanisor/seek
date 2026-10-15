
import { TextModel } from "./text-model";

export class LineNumberView {
  private elements: HTMLDivElement[] = [];

  constructor(
    private container: HTMLElement,
    private model: TextModel,
    private editor: HTMLTextAreaElement
  ) {}

  render(): void {
    const lineCount = this.model.getText().split("\n").length;

    // Adăugăm numerele lipsă.
    while (this.elements.length < lineCount) {
      const element = document.createElement("div");
      element.className = "line-number";

      this.elements.push(element);
      this.container.appendChild(element);
    }

    // Eliminăm numerele în plus.
    while (this.elements.length > lineCount) {
      const element = this.elements.pop();
      element?.remove();
    }

    // Actualizăm etichetele.
    for (let i = 0; i < this.elements.length; i++) {
      this.elements[i].textContent = String(i + 1);
    }

    this.syncScroll();
  }

  syncScroll(): void {
    this.container.scrollTop = this.editor.scrollTop;
  }
}
