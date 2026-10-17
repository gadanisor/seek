type ScrollAxis = "vertical" | "horizontal";

type ScrollbarParts = {
  track: HTMLDivElement;
  thumb: HTMLDivElement;
};

export class ScrollbarView {
  private abortController = new AbortController();
  private readonly scrollbars: Record<ScrollAxis, ScrollbarParts>;

  constructor(
    private container: HTMLElement,
    private editor: HTMLTextAreaElement
  ) {
    this.scrollbars = {
      vertical: this.createScrollbar("vertical"),
      horizontal: this.createScrollbar("horizontal")
    };

    this.container.replaceChildren(
      this.scrollbars.vertical.track,
      this.scrollbars.horizontal.track
    );
  }

  render(): void {
    const verticalVisible =
      this.editor.scrollHeight > this.editor.clientHeight + 1;
    const horizontalVisible =
      this.editor.scrollWidth > this.editor.clientWidth + 1;

    this.container.classList.toggle(
      "has-vertical-scrollbar",
      verticalVisible
    );
    this.container.classList.toggle(
      "has-horizontal-scrollbar",
      horizontalVisible
    );

    this.renderAxis("vertical", verticalVisible);
    this.renderAxis("horizontal", horizontalVisible);
  }

  private createScrollbar(axis: ScrollAxis): ScrollbarParts {
    const eventOptions = { signal: this.abortController.signal };
    const track = document.createElement("div");
    track.className = `editor-scrollbar-track editor-scrollbar-track-${axis}`;

    const thumb = document.createElement("div");
    thumb.className = `editor-scrollbar-thumb editor-scrollbar-thumb-${axis}`;
    track.appendChild(thumb);

    let dragging = false;
    let dragStartPointer = 0;
    let dragStartScroll = 0;

    thumb.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      event.stopPropagation();

      dragging = true;
      dragStartPointer = this.pointerPosition(axis, event);
      dragStartScroll = this.scrollPosition(axis);
      thumb.setPointerCapture(event.pointerId);
    }, eventOptions);

    thumb.addEventListener("pointermove", (event) => {
      if (!dragging) return;

      const maxScroll = this.maxScroll(axis);
      const maxThumbTravel =
        this.trackSize(axis, track) - this.thumbSize(axis, thumb);

      if (maxThumbTravel <= 0) return;

      const delta = this.pointerPosition(axis, event) - dragStartPointer;
      this.setScrollPosition(
        axis,
        dragStartScroll + (delta / maxThumbTravel) * maxScroll
      );
      this.render();
    }, eventOptions);

    const stopDragging = (): void => {
      dragging = false;
    };

    thumb.addEventListener("pointerup", stopDragging, eventOptions);
    thumb.addEventListener("pointercancel", stopDragging, eventOptions);
    thumb.addEventListener("lostpointercapture", stopDragging, eventOptions);

    track.addEventListener("pointerdown", (event) => {
      if (event.target === thumb) return;

      event.preventDefault();

      const rect = track.getBoundingClientRect();
      const clickPosition = axis === "vertical"
        ? event.clientY - rect.top
        : event.clientX - rect.left;
      const maxScroll = this.maxScroll(axis);
      const thumbSize = this.thumbSize(axis, thumb);
      const maxThumbTravel = this.trackSize(axis, track) - thumbSize;

      if (maxThumbTravel <= 0) return;

      const targetThumbPosition = Math.max(
        0,
        Math.min(clickPosition - thumbSize / 2, maxThumbTravel)
      );

      this.setScrollPosition(
        axis,
        (targetThumbPosition / maxThumbTravel) * maxScroll
      );
      this.render();
    }, eventOptions);

    return { track, thumb };
  }

  dispose(): void {
    this.abortController.abort();
  }

  private renderAxis(axis: ScrollAxis, visible: boolean): void {
    const { track, thumb } = this.scrollbars[axis];

    if (!visible) {
      track.style.display = "none";
      return;
    }

    track.style.display = "block";

    const trackSize = this.trackSize(axis, track);
    const maxScroll = this.maxScroll(axis);
    const viewportSize = axis === "vertical"
      ? this.editor.clientHeight
      : trackSize;
    const contentSize = axis === "vertical"
      ? this.editor.scrollHeight
      : viewportSize + maxScroll;
    const thumbSize = Math.min(
      trackSize,
      Math.max(24, (viewportSize / contentSize) * trackSize)
    );
    const maxThumbTravel = trackSize - thumbSize;
    const thumbPosition = maxScroll > 0
      ? (this.scrollPosition(axis) / maxScroll) * maxThumbTravel
      : 0;

    if (axis === "vertical") {
      thumb.style.height = `${thumbSize}px`;
      thumb.style.transform = `translateY(${thumbPosition}px)`;
    } else {
      thumb.style.width = `${thumbSize}px`;
      thumb.style.transform = `translateX(${thumbPosition}px)`;
    }
  }

  private pointerPosition(axis: ScrollAxis, event: PointerEvent): number {
    return axis === "vertical" ? event.clientY : event.clientX;
  }

  private scrollPosition(axis: ScrollAxis): number {
    return axis === "vertical"
      ? this.editor.scrollTop
      : this.editor.scrollLeft;
  }

  private setScrollPosition(axis: ScrollAxis, value: number): void {
    if (axis === "vertical") {
      this.editor.scrollTop = value;
    } else {
      this.editor.scrollLeft = value;
    }
  }

  private maxScroll(axis: ScrollAxis): number {
    return axis === "vertical"
      ? this.editor.scrollHeight - this.editor.clientHeight
      : this.editor.scrollWidth - this.editor.clientWidth;
  }

  private trackSize(axis: ScrollAxis, track: HTMLElement): number {
    return axis === "vertical" ? track.clientHeight : track.clientWidth;
  }

  private thumbSize(axis: ScrollAxis, thumb: HTMLElement): number {
    return axis === "vertical" ? thumb.clientHeight : thumb.clientWidth;
  }
}
