
export class CursorView {
  private cursor: HTMLDivElement;

  private charWidth: number;
  private lineHeight: number;
  private paddingLeft: number;
  private paddingTop: number;

  private lastX = NaN;
  private lastY = NaN;
  private lastVisible = false;

  resetBlink(): void {
    this.cursor.getAnimations().forEach((animation) => {
      animation.cancel();
      animation.play();
    });
  }
  
  constructor(
    private container: HTMLElement,
    private editor: HTMLTextAreaElement
  ) {
    this.cursor = document.createElement("div");
    this.cursor.className = "editor-cursor";
    this.container.appendChild(this.cursor);

    // Măsurăm fontul o singură dată.
    const style = getComputedStyle(this.editor);

    this.lineHeight = parseFloat(style.lineHeight);
    this.paddingLeft = parseFloat(style.paddingLeft);
    this.paddingTop = parseFloat(style.paddingTop);

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("Could not create canvas context");
    }

    context.font = style.font;
    this.charWidth = context.measureText("M").width;

    this.cursor.style.height = `${this.lineHeight}px`;
    this.cursor.style.display = "none";
  }

  render(): void {
    const visible = document.activeElement === this.editor;

    if (visible !== this.lastVisible) {
      this.cursor.style.display = visible ? "block" : "none";
      this.lastVisible = visible;
    }

    if (!visible) return;

    const offset = this.editor.selectionStart;
    const value = this.editor.value;

    let line = 0;
    let column = 0;

    for (let i = 0; i < offset; i++) {
      if (value.charCodeAt(i) === 10) {
        line++;
        column = 0;
      } else {
        column++;
      }
    }

    const x =
      this.paddingLeft +
      column * this.charWidth -
      this.editor.scrollLeft;

    const y =
      this.paddingTop +
      line * this.lineHeight -
      this.editor.scrollTop;

    if (x === this.lastX && y === this.lastY) return;

    this.cursor.style.transform = `translate(${x}px, ${y}px)`;

    this.lastX = x;
    this.lastY = y;

    this.resetBlink();
  }
}
