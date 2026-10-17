import "./themes/dark.css";
import "./themes/light.css";
import "../style.css";

import { CursorView } from "./cursor-view";
import { EditorView } from "./editor-view";
import { FindWidget } from "./find-widget";
import { HistoryManager, type SelectionState } from "./history-manager";
import { InputController } from "./input-controller";
import { LineNumberView } from "./line-number-view";
import { ScrollbarView } from "./scrollbar-view";
import { SearchController } from "./search-controller";
import { SearchDecorationView } from "./search-decoration-view";
import { SelectionView } from "./selection-view";
import { TextModel } from "./text-model";

export type SeekEditorTheme = "dark" | "light";

export type SeekEditorOptions = {
  value?: string;
  theme?: SeekEditorTheme;
  scrollBeyondLastLine?: boolean;
};

export class SeekEditor {
  private root: HTMLDivElement;
  private editor: HTMLTextAreaElement;
  private viewContainer: HTMLDivElement;
  private lineNumberContainer: HTMLDivElement;
  private model: TextModel;
  private view: EditorView;
  private history: HistoryManager;
  private lineNumbers: LineNumberView;
  private cursor: CursorView;
  private selection: SelectionView;
  private scrollbar: ScrollbarView;
  private inputController: InputController;
  private search: SearchController;
  private searchDecorations: SearchDecorationView;
  private findWidget: FindWidget;
  private resizeObserver: ResizeObserver;
  private abortController = new AbortController();
  private unsubscribeModel: () => void;
  private unsubscribeSearch: () => void;
  private renderFrame: number | null = null;
  private disposed = false;
  private scrollBeyondLastLine: boolean;

  constructor(host: HTMLElement, options: SeekEditorOptions = {}) {
    this.scrollBeyondLastLine = options.scrollBeyondLastLine ?? true;
    this.root = this.createRoot(options.theme ?? "dark");
    this.lineNumberContainer = this.createLayer(
      "seek-line-number-layer",
      true
    );
    const selectionContainer = this.createLayer("seek-selection-layer", true);
    this.viewContainer = this.createLayer("seek-editor-view", true);
    const cursorContainer = this.createLayer("seek-cursor-layer", true);
    this.editor = document.createElement("textarea");
    this.editor.className = "seek-editor-input";
    this.editor.spellcheck = false;
    this.editor.setAttribute("aria-label", "Code editor");
    const scrollbarContainer = this.createLayer("seek-scrollbar-layer", true);

    this.root.append(
      this.lineNumberContainer,
      selectionContainer,
      this.viewContainer,
      cursorContainer,
      this.editor,
      scrollbarContainer
    );
    host.appendChild(this.root);

    this.model = new TextModel(options.value ?? "");
    this.editor.value = this.model.getText();
    this.view = new EditorView(this.viewContainer, this.model);
    this.history = new HistoryManager(this.model);
    this.lineNumbers = new LineNumberView(
      this.lineNumberContainer,
      this.model,
      this.editor
    );
    this.cursor = new CursorView(cursorContainer, this.editor);
    this.selection = new SelectionView(selectionContainer, this.editor);
    this.scrollbar = new ScrollbarView(scrollbarContainer, this.editor);
    this.search = new SearchController(this.model, this.history);
    this.searchDecorations = new SearchDecorationView(this.root, this.editor);

    this.unsubscribeModel = this.model.onChange((change) => {
      this.view.applyChange(change);
      this.lineNumbers.render();
      this.scheduleRender();
    });

    this.inputController = new InputController(
      this.editor,
      this.model,
      () => this.cursor.resetBlink(),
      () => this.updatePosition(),
      (change, selectionBefore, selectionAfter) => {
        this.history.record(change, selectionBefore, selectionAfter);
      }
    );

    this.findWidget = new FindWidget(this.root, this.search, {
      open: () => this.searchDecorations.setVisible(true),
      revealActive: () => this.revealSearchMatch(),
      replaceCurrent: (replacement) => this.replaceCurrent(replacement),
      replaceAll: (replacement) => this.replaceAll(replacement),
      close: () => this.closeFindWidget()
    });
    this.unsubscribeSearch = this.search.onChange((state) => {
      this.searchDecorations.setState(state);
    });

    const eventOptions = { signal: this.abortController.signal };
    this.editor.addEventListener("scroll", () => this.syncScroll(), eventOptions);
    this.editor.addEventListener(
      "keydown",
      (event) => this.onKeyDown(event),
      eventOptions
    );

    this.resizeObserver = new ResizeObserver(() => {
      this.updateScrollBeyondLastLine();
      this.scheduleRender();
    });
    this.resizeObserver.observe(this.editor);

    this.view.render();
    this.lineNumbers.render();
    this.updateScrollBeyondLastLine();
    this.scrollbar.render();
    this.updatePosition();
  }

  getValue(): string {
    return this.model.getText();
  }

  setValue(value: string): void {
    this.assertActive();
    this.model.replace(0, this.model.getLength(), value);
    this.history.clear();
    this.syncEditorFromModel({ start: 0, end: 0 });
  }

  focus(): void {
    this.assertActive();
    this.editor.focus();
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.abortController.abort();
    this.resizeObserver.disconnect();
    this.inputController.dispose();
    this.scrollbar.dispose();
    this.findWidget.dispose();
    this.unsubscribeSearch();
    this.search.dispose();
    this.unsubscribeModel();
    if (this.renderFrame !== null) cancelAnimationFrame(this.renderFrame);
    this.root.remove();
  }

  private createRoot(theme: SeekEditorTheme): HTMLDivElement {
    const root = document.createElement("div");
    root.className = `seek-editor seek-theme-${theme}`;
    return root;
  }

  private createLayer(className: string, ariaHidden: boolean): HTMLDivElement {
    const layer = document.createElement("div");
    layer.className = className;
    if (ariaHidden) layer.setAttribute("aria-hidden", "true");
    return layer;
  }

  private scheduleRender(): void {
    if (this.renderFrame !== null || this.disposed) return;
    this.renderFrame = requestAnimationFrame(() => {
      this.renderFrame = null;
      if (this.disposed) return;
      this.searchDecorations.render();
      this.scrollbar.render();
    });
  }

  private updateScrollBeyondLastLine(): void {
    if (!this.scrollBeyondLastLine) {
      this.root.style.setProperty("--editor-padding-bottom", "0px");
      return;
    }

    const style = getComputedStyle(this.editor);
    const lineHeight = parseFloat(style.lineHeight);
    const paddingTop = parseFloat(style.paddingTop);
    if (!Number.isFinite(lineHeight) || !Number.isFinite(paddingTop)) return;

    const paddingBottom = Math.max(
      0,
      this.editor.clientHeight - lineHeight - paddingTop
    );
    this.root.style.setProperty(
      "--editor-padding-bottom",
      `${paddingBottom}px`
    );
  }

  private updatePosition(): void {
    const beforeCursor = this.editor.value.slice(0, this.editor.selectionStart);
    const line = beforeCursor.split("\n").length - 1;
    this.view.setActiveLine(line);
    this.lineNumbers.setActiveLine(line);
    this.cursor.render();
    this.selection.render();
    this.scrollbar.render();
  }

  private syncEditorFromModel(selection: SelectionState): void {
    this.editor.value = this.model.getText();
    this.editor.setSelectionRange(selection.start, selection.end);
    this.cursor.resetBlink();
    this.updatePosition();
    this.searchDecorations.render();
  }

  private syncScroll(): void {
    this.viewContainer.scrollTop = this.editor.scrollTop;
    this.viewContainer.scrollLeft = this.editor.scrollLeft;
    this.cursor.render();
    this.lineNumbers.syncScroll();
    this.selection.render();
    this.searchDecorations.render();
    this.scrollbar.render();
  }

  private undo(): void {
    const entry = this.history.undo();
    if (entry) this.syncEditorFromModel(entry.selectionBefore);
  }

  private redo(): void {
    const entry = this.history.redo();
    if (entry) this.syncEditorFromModel(entry.selectionAfter);
  }

  private onKeyDown(event: KeyboardEvent): void {
    if (!event.ctrlKey && !event.metaKey) return;
    const key = event.key.toLowerCase();

    if (key === "f" || key === "h") {
      event.preventDefault();
      const selectedText = this.editor.value.slice(
        this.editor.selectionStart,
        this.editor.selectionEnd
      );
      this.findWidget.open(
        key === "h",
        selectedText.includes("\n") ? undefined : selectedText
      );
      return;
    }

    if (key === "z") {
      event.preventDefault();
      if (event.shiftKey) this.redo();
      else this.undo();
    } else if (key === "y") {
      event.preventDefault();
      this.redo();
    }
  }

  private currentSelection(): SelectionState {
    return {
      start: this.editor.selectionStart,
      end: this.editor.selectionEnd
    };
  }

  private replaceCurrent(replacement: string): void {
    const selection = this.search.replaceCurrent(
      replacement,
      this.currentSelection()
    );
    if (!selection) return;
    this.syncEditorFromModel(selection);
    this.revealSearchMatch();
  }

  private replaceAll(replacement: string): void {
    const selection = this.search.replaceAll(
      replacement,
      this.currentSelection()
    );
    if (!selection) return;
    this.syncEditorFromModel(selection);
    this.revealSearchMatch();
  }

  private closeFindWidget(): void {
    this.findWidget.close();
    this.searchDecorations.setVisible(false);
    this.editor.focus();
    this.updatePosition();
  }

  private revealSearchMatch(): void {
    const match = this.search.getActiveMatch();
    if (!match) return;

    const style = getComputedStyle(this.editor);
    const lineHeight = parseFloat(style.lineHeight);
    const paddingLeft = parseFloat(style.paddingLeft);
    const paddingTop = parseFloat(style.paddingTop);
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) return;
    context.font = style.font;

    const charWidth = context.measureText("M").width;
    const text = this.model.getText();
    const beforeMatch = text.slice(0, match.start);
    const line = beforeMatch.split("\n").length - 1;
    const column = match.start - (beforeMatch.lastIndexOf("\n") + 1);
    const matchLineLength = Math.max(
      1,
      text.slice(match.start, match.end).split("\n", 1)[0].length
    );
    const left = paddingLeft + column * charWidth;
    const right = left + matchLineLength * charWidth;
    const top = paddingTop + line * lineHeight;
    const bottom = top + lineHeight;
    const availableWidth = this.editor.clientWidth - paddingLeft - 20;

    if (
      left < this.editor.scrollLeft + paddingLeft ||
      right - left > availableWidth
    ) {
      this.editor.scrollLeft = left - paddingLeft;
    } else if (right > this.editor.scrollLeft + this.editor.clientWidth - 20) {
      this.editor.scrollLeft = right - this.editor.clientWidth + 20;
    }

    if (top < this.editor.scrollTop) {
      this.editor.scrollTop = top;
    } else if (bottom > this.editor.scrollTop + this.editor.clientHeight) {
      this.editor.scrollTop = bottom - this.editor.clientHeight;
    }

    this.searchDecorations.render();
    this.scrollbar.render();
  }

  private assertActive(): void {
    if (this.disposed) throw new Error("SeekEditor has been disposed");
  }
}
