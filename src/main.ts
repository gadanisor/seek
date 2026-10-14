import "./style.css";

const editor = document.querySelector<HTMLTextAreaElement>("#editor")!;
const position = document.querySelector<HTMLElement>("#position")!;

function updatePosition() {
    const beforeCursor = editor.value.slice(0, editor.selectionStart);
    const lines = beforeCursor.split("\n");

    const line = lines.length;
    const column = lines[lines.length - 1].length + 1;

    position.textContent = 'Ln ${line}, Col ${column}';
}

editor.addEventListener("input", updatePosition);
editor.addEventListener("click", updatePosition);
editor.addEventListener("keyup", updatePosition);
editor.addEventListener("select", updatePosition);

updatePosition();