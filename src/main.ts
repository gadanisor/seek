import "./demo.css";
import { SeekEditor } from "./editor/seek-editor";

const host = document.querySelector<HTMLElement>("#app")!;

new SeekEditor(host, {
  theme: "light"
});
