export function editCodeWithKeyboard(value, start, end, key) {
  if (key === "Tab") {
    return { value: `${value.slice(0, start)}  ${value.slice(end)}`, selection: start + 2 };
  }
  if (key === "Enter") {
    const lineStart = value.lastIndexOf("\n", Math.max(0, start - 1)) + 1;
    const indentation = value.slice(lineStart, start).match(/^\s*/)?.[0] || "";
    return { value: `${value.slice(0, start)}\n${indentation}${value.slice(end)}`, selection: start + indentation.length + 1 };
  }
  return null;
}
