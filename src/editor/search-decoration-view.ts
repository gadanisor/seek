import type { SearchState } from "./search-controller";

export class SearchDecorationView {
  private container: HTMLDivElement;
  private measureCanvas = document.createElement("canvas");
  private state: SearchState | null = null;

  constructor(
    parent: HTMLElement,
    private editor: HTMLTextAreaElement
  ) {
    this.container = document.createElement("div");
    this.container.className = "search-decoration-layer";
    this.container.setAttribute("aria-hidden", "true");
    parent.appendChild(this.container);
  }

  setState(state: SearchState): void {
    this.state = state;
    this.render();
  }

  setVisible(visible: boolean): void {
    this.container.hidden = !visible;
    if (visible) this.render();
  }

  render(): void {
    if (!this.state || this.state.matches.length === 0) {
      this.container.replaceChildren();
      return;
    }

    const style = getComputedStyle(this.editor);
    const context = this.measureCanvas.getContext("2d");
    if (!context) return;

    context.font = style.font;
    const charWidth = context.measureText("M").width;
    const lineHeight = parseFloat(style.lineHeight);
    const paddingLeft = parseFloat(style.paddingLeft);
    const paddingTop = parseFloat(style.paddingTop);
    const text = this.editor.value;
    const lineStarts = [0];

    for (let i = 0; i < text.length; i++) {
      if (text.charCodeAt(i) === 10) lineStarts.push(i + 1);
    }

    const fragment = document.createDocumentFragment();
    this.state.matches.forEach((match, matchIndex) => {
      let start = match.start;

      while (start < match.end) {
        const line = this.lineAtOffset(lineStarts, start);
        const lineStart = lineStarts[line];
        const newline = text.indexOf("\n", start);
        const segmentEnd = newline === -1
          ? match.end
          : Math.min(match.end, newline);
        const length = Math.max(1, segmentEnd - start);
        const decoration = document.createElement("div");

        decoration.className = "search-decoration";
        if (matchIndex === this.state!.activeIndex) {
          decoration.classList.add("active-search-decoration");
        }
        decoration.style.left = `${
          paddingLeft + (start - lineStart) * charWidth - this.editor.scrollLeft
        }px`;
        decoration.style.top = `${
          paddingTop + line * lineHeight - this.editor.scrollTop
        }px`;
        decoration.style.width = `${length * charWidth}px`;
        decoration.style.height = `${lineHeight}px`;
        fragment.appendChild(decoration);

        start = segmentEnd;
        if (text[start] === "\n") start++;
      }
    });

    this.container.replaceChildren(fragment);
  }

  private lineAtOffset(lineStarts: number[], offset: number): number {
    let low = 0;
    let high = lineStarts.length - 1;

    while (low < high) {
      const middle = Math.ceil((low + high) / 2);
      if (lineStarts[middle] <= offset) low = middle;
      else high = middle - 1;
    }
    return low;
  }
}
