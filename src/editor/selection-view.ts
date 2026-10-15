
type SelectionRect = {
  left: number;
  right: number;
  top: number;
  bottom: number;
};

type Point = {
  x: number;
  y: number;
};

export class SelectionView {
  private svg: SVGSVGElement;
  private path: SVGPathElement;
  private measureCanvas: HTMLCanvasElement;

  constructor(
    private container: HTMLElement,
    private editor: HTMLTextAreaElement
  ) {
    const namespace = "http://www.w3.org/2000/svg";

    this.svg = document.createElementNS(namespace, "svg");
    this.path = document.createElementNS(namespace, "path");

    this.svg.classList.add("editor-selection-svg");
    this.path.classList.add("editor-selection-path");

    this.svg.appendChild(this.path);
    this.container.replaceChildren(this.svg);

    this.measureCanvas = document.createElement("canvas");
  }

  render(): void {
    const start = this.editor.selectionStart;
    const end = this.editor.selectionEnd;

    if (start === end) {
      this.path.setAttribute("d", "");
      return;
    }

    const style = getComputedStyle(this.editor);

    const lineHeight = parseFloat(style.lineHeight);
    const paddingLeft = parseFloat(style.paddingLeft);
    const paddingTop = parseFloat(style.paddingTop);

    const context = this.measureCanvas.getContext("2d");
    if (!context) return;

    context.font = style.font;
    const charWidth = context.measureText("M").width;

    const lines = this.editor.value.split("\n");
    const rects: SelectionRect[] = [];

    let offset = 0;

    for (let i = 0; i < lines.length; i++) {
      const lineStart = offset;
      const lineEnd = lineStart + lines[i].length;

      const from = Math.max(start, lineStart);
      const to = Math.min(end, lineEnd);

      const includesNewline =
        start <= lineEnd && end > lineEnd;

      if (from < to || includesNewline) {
        const startColumn = from - lineStart;
        const endColumn = to - lineStart;

        const left =
          paddingLeft +
          startColumn * charWidth -
          this.editor.scrollLeft;

        const top =
          paddingTop +
          i * lineHeight -
          this.editor.scrollTop;

        const width =
          (endColumn - startColumn) * charWidth +
          (includesNewline ? charWidth : 0);

        rects.push({
          left,
          right: left + Math.max(width, 2),
          top,
          bottom: top + lineHeight
        });
      }

      offset = lineEnd + 1;
    }

    if (rects.length === 0) {
      this.path.setAttribute("d", "");
      return;
    }

    const outline = this.buildOutline(rects);
    const pathData = this.roundPath(outline, 4);

    this.path.setAttribute("d", pathData);
  }

  private buildOutline(rects: SelectionRect[]): Point[] {
    const first = rects[0];
    const last = rects[rects.length - 1];

    const points: Point[] = [
      { x: first.left, y: first.top },
      { x: first.right, y: first.top }
    ];

    // Coborâm pe marginea dreaptă.
    for (let i = 0; i < rects.length; i++) {
      const current = rects[i];
      const next = rects[i + 1];

      points.push({
        x: current.right,
        y: current.bottom
      });

      if (next && next.right !== current.right) {
        points.push({
          x: next.right,
          y: current.bottom
        });
      }
    }

    points.push({
      x: last.left,
      y: last.bottom
    });

    // Urcăm pe marginea stângă.
    for (let i = rects.length - 1; i >= 0; i--) {
      const current = rects[i];
      const previous = rects[i - 1];

      points.push({
        x: current.left,
        y: current.top
      });

      if (previous && previous.left !== current.left) {
        points.push({
          x: previous.left,
          y: current.top
        });
      }
    }

    return points;
  }

  private roundPath(points: Point[], radius: number): string {
    const clean: Point[] = [];

    // Eliminăm punctele consecutive identice.
    for (const point of points) {
      const previous = clean[clean.length - 1];

      if (
        !previous ||
        previous.x !== point.x ||
        previous.y !== point.y
      ) {
        clean.push(point);
      }
    }

    if (
      clean.length > 1 &&
      clean[0].x === clean[clean.length - 1].x &&
      clean[0].y === clean[clean.length - 1].y
    ) {
      clean.pop();
    }

    if (clean.length < 3) return "";

    const commands: string[] = [];

    for (let i = 0; i < clean.length; i++) {
      const previous =
        clean[(i - 1 + clean.length) % clean.length];

      const current = clean[i];
      const next = clean[(i + 1) % clean.length];

      const incoming = Math.hypot(
        current.x - previous.x,
        current.y - previous.y
      );

      const outgoing = Math.hypot(
        next.x - current.x,
        next.y - current.y
      );

      const r = Math.min(
        radius,
        incoming / 2,
        outgoing / 2
      );

      const before = {
        x: current.x + (previous.x - current.x) * r / incoming,
        y: current.y + (previous.y - current.y) * r / incoming
      };

      const after = {
        x: current.x + (next.x - current.x) * r / outgoing,
        y: current.y + (next.y - current.y) * r / outgoing
      };

      if (i === 0) {
        commands.push(`M ${before.x} ${before.y}`);
      } else {
        commands.push(`L ${before.x} ${before.y}`);
      }

      commands.push(
        `Q ${current.x} ${current.y} ${after.x} ${after.y}`
      );
    }

    commands.push("Z");

    return commands.join(" ");
  }
}
