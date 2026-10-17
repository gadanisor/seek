import { HistoryManager, type SelectionState } from "./history-manager";
import { TextModel, type TextChange } from "./text-model";

export type SearchMatch = {
  start: number;
  end: number;
};

export type SearchState = {
  query: string;
  caseSensitive: boolean;
  matches: readonly SearchMatch[];
  activeIndex: number;
};

type SearchListener = (state: SearchState) => void;

export class SearchController {
  private query = "";
  private caseSensitive = false;
  private matches: SearchMatch[] = [];
  private activeIndex = -1;
  private listeners = new Set<SearchListener>();

  constructor(
    private model: TextModel,
    private history: HistoryManager
  ) {
    this.model.onChange(() => {
      const activeStart = this.getActiveMatch()?.start ?? 0;
      this.recalculate(activeStart);
    });
  }

  getState(): SearchState {
    return {
      query: this.query,
      caseSensitive: this.caseSensitive,
      matches: this.matches,
      activeIndex: this.activeIndex
    };
  }

  getActiveMatch(): SearchMatch | null {
    return this.matches[this.activeIndex] ?? null;
  }

  setQuery(query: string): void {
    if (query === this.query) return;
    this.query = query;
    this.recalculate(0);
  }

  setCaseSensitive(caseSensitive: boolean): void {
    if (caseSensitive === this.caseSensitive) return;
    this.caseSensitive = caseSensitive;
    this.recalculate(this.getActiveMatch()?.start ?? 0);
  }

  navigate(direction: 1 | -1): SearchMatch | null {
    if (this.matches.length === 0) return null;

    this.activeIndex =
      (this.activeIndex + direction + this.matches.length) %
      this.matches.length;
    this.emit();
    return this.getActiveMatch();
  }

  replaceCurrent(
    replacement: string,
    selectionBefore: SelectionState
  ): SelectionState | null {
    const match = this.getActiveMatch();
    if (!match) return null;

    const change: TextChange = {
      start: match.start,
      deletedText: this.model.getText().slice(match.start, match.end),
      deletedLength: match.end - match.start,
      insertedText: replacement
    };
    const selectionAfter = {
      start: match.start + replacement.length,
      end: match.start + replacement.length
    };

    this.model.replace(match.start, match.end, replacement);
    this.activeIndex = this.matches.findIndex(
      (candidate) => candidate.start >= selectionAfter.end
    );
    if (this.activeIndex === -1 && this.matches.length > 0) {
      this.activeIndex = 0;
    }
    this.emit();
    this.history.record(change, selectionBefore, selectionAfter);
    return selectionAfter;
  }

  replaceAll(
    replacement: string,
    selectionBefore: SelectionState
  ): SelectionState | null {
    if (this.matches.length === 0) return null;

    const first = this.matches[0];
    const last = this.matches[this.matches.length - 1];
    const text = this.model.getText();
    let insertedText = "";
    let offset = first.start;

    for (const match of this.matches) {
      insertedText += text.slice(offset, match.start) + replacement;
      offset = match.end;
    }

    insertedText += text.slice(offset, last.end);

    const deletedText = text.slice(first.start, last.end);
    const change: TextChange = {
      start: first.start,
      deletedText,
      deletedLength: deletedText.length,
      insertedText
    };
    const caret = first.start + insertedText.length;
    const selectionAfter = { start: caret, end: caret };

    this.model.replace(first.start, last.end, insertedText);
    this.history.record(change, selectionBefore, selectionAfter);
    return selectionAfter;
  }

  onChange(listener: SearchListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }

  private recalculate(preferredStart: number): void {
    this.matches = [];

    if (this.query !== "") {
      const text = this.caseSensitive
        ? this.model.getText()
        : this.model.getText().toLowerCase();
      const query = this.caseSensitive
        ? this.query
        : this.query.toLowerCase();

      let offset = 0;
      while (offset <= text.length - query.length) {
        const start = text.indexOf(query, offset);
        if (start === -1) break;
        this.matches.push({ start, end: start + query.length });
        offset = start + query.length;
      }
    }

    this.activeIndex = this.matches.findIndex(
      (match) => match.start >= preferredStart
    );
    if (this.activeIndex === -1 && this.matches.length > 0) {
      this.activeIndex = 0;
    }
    this.emit();
  }

  private emit(): void {
    const state = this.getState();
    for (const listener of this.listeners) listener(state);
  }
}
