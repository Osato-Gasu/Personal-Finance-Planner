export function displayNameToEditor(value: string): string {
  return value
    .replaceAll("\\", "\\\\")
    .replaceAll("\r", "\\r")
    .replaceAll("\n", "\\n");
}

export function displayNameFromEditor(value: string): string {
  let result = "";
  for (let index = 0; index < value.length; index += 1) {
    const character = value.charAt(index);
    if (character !== "\\" || index + 1 >= value.length) {
      result += character;
      continue;
    }
    const escaped = value.charAt(index + 1);
    if (escaped === "r") result += "\r";
    else if (escaped === "n") result += "\n";
    else if (escaped === "\\") result += "\\";
    else {
      result += `\\${escaped}`;
    }
    index += 1;
  }
  return result;
}
