import type { SearchController, SearchState } from "./search-controller";

type FindWidgetCallbacks = {
  open: () => void;
  revealActive: () => void;
  replaceCurrent: (replacement: string) => void;
  replaceAll: (replacement: string) => void;
  close: () => void;
};

export class FindWidget {
  private element: HTMLDivElement;
  private findInput: HTMLInputElement;
  private replaceInput: HTMLInputElement;
  private replaceRow: HTMLDivElement;
  private count: HTMLSpanElement;
  private caseButton: HTMLButtonElement;
  private replaceVisible = false;

  constructor(
    parent: HTMLElement,
    private search: SearchController,
    private callbacks: FindWidgetCallbacks
  ) {
    this.element = document.createElement("div");
    this.element.className = "find-widget";
    this.element.hidden = true;
    this.element.innerHTML = `
      <div class="find-widget-row">
        <button class="find-widget-toggle" type="button" title="Toggle Replace" aria-label="Toggle Replace">›</button>
        <input class="find-widget-input find-input" type="text" aria-label="Find" placeholder="Find">
        <span class="find-widget-count" aria-live="polite">No results</span>
        <button class="find-widget-button case-toggle" type="button" title="Match Case" aria-label="Match Case">Aa</button>
        <button class="find-widget-button previous-match" type="button" title="Previous Match" aria-label="Previous Match">↑</button>
        <button class="find-widget-button next-match" type="button" title="Next Match" aria-label="Next Match">↓</button>
        <button class="find-widget-button close-find" type="button" title="Close" aria-label="Close">×</button>
      </div>
      <div class="find-widget-row replace-row">
        <span class="find-widget-toggle-spacer"></span>
        <input class="find-widget-input replace-input" type="text" aria-label="Replace" placeholder="Replace">
        <button class="find-widget-button replace-current" type="button" title="Replace" aria-label="Replace">Replace</button>
        <button class="find-widget-button replace-all" type="button" title="Replace All" aria-label="Replace All">All</button>
      </div>`;
    parent.appendChild(this.element);

    this.findInput = this.query<HTMLInputElement>(".find-input");
    this.replaceInput = this.query<HTMLInputElement>(".replace-input");
    this.replaceRow = this.query<HTMLDivElement>(".replace-row");
    this.count = this.query<HTMLSpanElement>(".find-widget-count");
    this.caseButton = this.query<HTMLButtonElement>(".case-toggle");

    this.query<HTMLButtonElement>(".find-widget-toggle").onclick = () => {
      this.setReplaceVisible(!this.replaceVisible);
    };
    this.query<HTMLButtonElement>(".previous-match").onclick = () => this.navigate(-1);
    this.query<HTMLButtonElement>(".next-match").onclick = () => this.navigate(1);
    this.query<HTMLButtonElement>(".close-find").onclick = this.callbacks.close;
    this.query<HTMLButtonElement>(".replace-current").onclick = () => {
      this.callbacks.replaceCurrent(this.replaceInput.value);
    };
    this.query<HTMLButtonElement>(".replace-all").onclick = () => {
      this.callbacks.replaceAll(this.replaceInput.value);
    };
    this.caseButton.onclick = () => {
      this.search.setCaseSensitive(!this.search.getState().caseSensitive);
      this.callbacks.revealActive();
    };
    this.findInput.addEventListener("input", () => {
      this.search.setQuery(this.findInput.value);
      this.callbacks.revealActive();
    });
    this.element.addEventListener("keydown", (event) => this.onKeyDown(event));
    this.search.onChange((state) => this.update(state));
    this.setReplaceVisible(false);
  }

  open(showReplace: boolean, initialQuery?: string): void {
    this.element.hidden = false;
    this.callbacks.open();
    this.setReplaceVisible(showReplace);
    if (initialQuery !== undefined && initialQuery !== "") {
      this.findInput.value = initialQuery;
      this.search.setQuery(initialQuery);
    }
    this.findInput.focus();
    this.findInput.select();
    this.callbacks.revealActive();
  }

  close(): void {
    this.element.hidden = true;
  }

  private navigate(direction: 1 | -1): void {
    this.search.navigate(direction);
    this.callbacks.revealActive();
  }

  private onKeyDown(event: KeyboardEvent): void {
    const modifier = event.ctrlKey || event.metaKey;
    const key = event.key.toLowerCase();

    if (event.key === "Escape") {
      event.preventDefault();
      this.callbacks.close();
    } else if (event.key === "Enter" && event.target === this.findInput) {
      event.preventDefault();
      this.navigate(event.shiftKey ? -1 : 1);
    } else if (modifier && (key === "f" || key === "h")) {
      event.preventDefault();
      this.open(key === "h");
    }
  }

  private setReplaceVisible(visible: boolean): void {
    this.replaceVisible = visible;
    this.replaceRow.hidden = !visible;
    this.element.classList.toggle("replace-visible", visible);
    const toggle = this.query<HTMLButtonElement>(".find-widget-toggle");
    toggle.classList.toggle("expanded", visible);
  }

  private update(state: SearchState): void {
    this.caseButton.classList.toggle("active", state.caseSensitive);
    this.caseButton.setAttribute("aria-pressed", String(state.caseSensitive));

    if (state.query === "") this.count.textContent = "No results";
    else if (state.matches.length === 0) this.count.textContent = "0 of 0";
    else this.count.textContent = `${state.activeIndex + 1} of ${state.matches.length}`;
  }

  private query<T extends Element>(selector: string): T {
    const element = this.element.querySelector<T>(selector);
    if (!element) throw new Error(`Missing FindWidget element: ${selector}`);
    return element;
  }
}
