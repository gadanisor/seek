
export class CursorView {
  private cursor: HTMLDivElement;
  private measureCanvas: HTMLCanvasElement;

  constructor(
    private container: HTMLElement,
    private editor: HTMLTextAreaElement
  ) {
    this.cursor = document.createElement("div");
    this.cursor.className = "editor-cursor";
    this.container.appendChild(this.cursor);

    this.measureCanvas = document.createElement("canvas");
  }

  render(): void {
    this.cursor.style.display =
        document.activeElement === this.editor ? "block" : "none";
    const offset = this.editor.selectionStart;
    const text = this.editor.value.slice(0, offset);
    const lines = text.split("\n");

    const line = lines.length - 1;
    const column = lines[lines.length - 1].length;

    const style = getComputedStyle(this.editor);

    const lineHeight = parseFloat(style.lineHeight);
    const paddingLeft = parseFloat(style.paddingLeft);
    const paddingTop = parseFloat(style.paddingTop);

    const context = this.measureCanvas.getContext("2d");

    if (!context) return;

    context.font = style.font;

    const charWidth = context.measureText("M").width;

    const x = paddingLeft + column * charWidth - this.editor.scrollLeft;
    const y = paddingTop + line * lineHeight - this.editor.scrollTop;

    this.cursor.style.transform = `translate(${x}px, ${y}px)`;
    this.cursor.style.height = `${lineHeight}px`;
  }
}
