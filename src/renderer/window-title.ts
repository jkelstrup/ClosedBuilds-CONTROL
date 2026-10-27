export interface WindowTitleInput {
  version?: string;
  filename: string;
  activePort?: string | false;
}

export function formatWindowTitle(input: WindowTitleInput): {
  title: string;
  detail: string;
} {
  let detail = input.version === undefined ? '' : ` v${input.version}`;
  if (input.filename.length > 0) detail += ` / ${input.filename}`;
  if (input.activePort) detail += ` / connected to ${input.activePort}`;
  return { title: `CBC${detail}`, detail };
}
