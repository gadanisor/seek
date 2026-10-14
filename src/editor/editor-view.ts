
import { TextModel } from "./text-model";

export class EditorView {
  private container: HTMLElement;
  private model: TextModel;

  constructor(container: HTMLElement, model: TextModel) {
    this.container = container;
    this.model = model;
  }

  render(): void {
    const text = this.model.getText();
    const lines = text.split("\n");

    const fragment = document.createDocumentFragment();

    lines.forEach((line, index) => {
      const element = document.createElement("div");

      element.className = "editor-line";
      element.textContent = line || "\u00A0";
      element.dataset.line = String(index + 1);

      fragment.appendChild(element);
    });

    this.container.replaceChildren(fragment);
  }
}
