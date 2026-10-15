import { TextModel } from "./text-model";

export class LineNumberView {
  private elements: HTMLDivElement[] = [];
  private activeLineIndex = 0;

  constructor(
    private container: HTMLElement,
    private model: TextModel,
    private editor: HTMLTextAreaElement
  ) {}

  setActiveLine(index: number): void {
    if (index === this.activeLineIndex) return;

    this.elements[this.activeLineIndex]
        ?.classList.remove("active-line-number");

    this.activeLineIndex = index;

    this.elements[this.activeLineIndex]
        ?.classList.add("active-line-number");
    }

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
    this.elements.forEach((element, index) => {
        element.classList.toggle(
            "active-line-number",
            index === this.activeLineIndex
        );
    });
  }

  syncScroll(): void {
    this.container.scrollTop = this.editor.scrollTop;
  }
}
