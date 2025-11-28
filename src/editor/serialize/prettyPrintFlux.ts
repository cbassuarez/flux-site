import type {
  DocstepAdvanceSpec,
  FluxCell,
  FluxDocument,
  FluxGrid,
  FluxParam,
  FluxRuntimeConfig,
  Material,
} from "@flux-lang/core";

function indent(level: number): string {
  return "  ".repeat(level);
}

function quote(str: string | undefined): string {
  return `"${(str ?? "").replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function formatTags(tags: string[] | undefined): string {
  if (!tags?.length) return "[]";
  return `[ ${tags.join(", ")} ]`;
}

function formatNumericMap(map?: Record<string, number>): string | null {
  if (!map || !Object.keys(map).length) return null;
  const entries = Object.entries(map)
    .map(([key, value]) => `${key} = ${value};`)
    .join(" ");
  return `{ ${entries} }`;
}

function printCell(cell: FluxCell, level: number): string {
  const parts: string[] = [];
  parts.push(`cell ${cell.id} {`);
  const body: string[] = [];
  body.push(`tags = ${formatTags(cell.tags)};`);
  if (cell.content !== undefined) {
    body.push(`content = ${quote(cell.content)};`);
  }
  if (cell.mediaId) {
    body.push(`mediaId = ${quote(cell.mediaId)};`);
  }
  if (cell.dynamic !== undefined) {
    body.push(`dynamic = ${cell.dynamic};`);
  }
  if ((cell as any).density !== undefined) {
    body.push(`density = ${(cell as any).density};`);
  }
  if ((cell as any).salience !== undefined) {
    body.push(`salience = ${(cell as any).salience};`);
  }
  const numericFields = formatNumericMap(cell.numericFields);
  if (numericFields) {
    body.push(`numericFields = ${numericFields};`);
  }
  parts.push(...body.map((line) => `${indent(level + 1)}${line}`));
  parts.push(`${indent(level)}}`);
  return parts.join("\n");
}

function printGrid(grid: FluxGrid, level: number): string {
  const parts: string[] = [];
  parts.push(`${indent(level)}grid ${grid.name} {`);
  parts.push(`${indent(level + 1)}topology = ${grid.topology};`);
  if (grid.size) {
    parts.push(`${indent(level + 1)}size { rows = ${grid.size.rows ?? 0}; cols = ${grid.size.cols ?? 0}; }`);
  }
  for (const cell of grid.cells) {
    parts.push(`${indent(level + 1)}${printCell(cell, level + 1)}`);
  }
  parts.push(`${indent(level)}}`);
  return parts.join("\n");
}

function printParams(params: FluxParam[] | undefined, level: number): string[] {
  if (!params?.length) return [];
  return params.map((p) => {
    const range = typeof p.min === "number" && typeof p.max === "number" ? ` [${p.min}, ${p.max}]` : "";
    return `${indent(level)}param ${p.name} : ${p.type}${range} @ ${p.initial};`;
  });
}

function printRuntime(runtime: FluxRuntimeConfig | undefined, level: number): string[] {
  if (!runtime) return [];
  const lines: string[] = [`${indent(level)}runtime {`];
  if (runtime.docstepAdvance?.length) {
    const adv = runtime.docstepAdvance.map((entry) => formatDocstepAdvance(entry)).join(", ");
    lines.push(`${indent(level + 1)}docstepAdvance = [ ${adv} ];`);
  }
  if (runtime.eventsApply) {
    lines.push(`${indent(level + 1)}eventsApply = ${quote(runtime.eventsApply)};`);
  }
  lines.push(`${indent(level)}}`);
  return lines;
}

function formatDocstepAdvance(entry: DocstepAdvanceSpec): string {
  if (entry.kind === "timer") {
    return `timer(${entry.amount}${entry.unit})`;
  }
  if (entry.kind === "transport") {
    return `transport(${entry.eventName})`;
  }
  if (entry.kind === "ruleRequest") {
    return `ruleRequest(${entry.name})`;
  }
  return "";
}

function printMaterial(material: Material, level: number): string {
  const parts: string[] = [];
  parts.push(`${indent(level)}material ${material.name} {`);
  const body: string[] = [];
  body.push(`tags = ${formatTags(material.tags)};`);
  if (material.label) body.push(`label = ${quote(material.label)};`);
  if (material.description) body.push(`description = ${quote(material.description)};`);
  if (material.color) body.push(`color = ${quote(material.color)};`);
  if ((material as any).score?.text) {
    body.push(`score { text = ${quote((material as any).score.text)}; }`);
  }
  if (material.midi) {
    const midiParts: string[] = [];
    if (material.midi.channel !== undefined) midiParts.push(`channel = ${material.midi.channel};`);
    if (material.midi.pitch !== undefined) midiParts.push(`pitch = ${material.midi.pitch};`);
    if (material.midi.velocity !== undefined) midiParts.push(`velocity = ${material.midi.velocity};`);
    if (material.midi.durationSeconds !== undefined)
      midiParts.push(`durationSeconds = ${material.midi.durationSeconds};`);
    if (midiParts.length) {
      body.push(`midi { ${midiParts.join(" ")} }`);
    }
  }
  const audio = (material as any).audio as
    | undefined
    | { clip?: string; inSeconds?: number; outSeconds?: number; gain?: number };
  if (audio?.clip) {
    const audioParts: string[] = [`clip = ${quote(audio.clip)};`];
    if (audio.inSeconds !== undefined) audioParts.push(`inSeconds = ${audio.inSeconds};`);
    if (audio.outSeconds !== undefined) audioParts.push(`outSeconds = ${audio.outSeconds};`);
    if (audio.gain !== undefined) audioParts.push(`gain = ${audio.gain};`);
    body.push(`audio { ${audioParts.join(" ")} }`);
  }
  if (material.video) {
    const videoParts: string[] = [`clip = ${quote(material.video.clip)};`];
    if (material.video.inSeconds !== undefined) videoParts.push(`inSeconds = ${material.video.inSeconds};`);
    if (material.video.outSeconds !== undefined) videoParts.push(`outSeconds = ${material.video.outSeconds};`);
    if (material.video.layer !== undefined) videoParts.push(`layer = ${quote(material.video.layer)};`);
    body.push(`video { ${videoParts.join(" ")} }`);
  }
  for (const line of body) {
    parts.push(`${indent(level + 1)}${line}`);
  }
  parts.push(`${indent(level)}}`);
  return parts.join("\n");
}

export function prettyPrintFluxDocument(doc: FluxDocument): string {
  const lines: string[] = [];
  lines.push("document {");

  if (doc.meta) {
    lines.push(`${indent(1)}meta {`);
    for (const [key, value] of Object.entries(doc.meta)) {
      if (value === undefined) continue;
      lines.push(`${indent(2)}${key} = ${quote(String(value))};`);
    }
    lines.push(`${indent(1)}}`);
  }

  if (doc.state) {
    lines.push(`${indent(1)}state {`);
    lines.push(...printParams(doc.state.params, 2));
    lines.push(`${indent(1)}}`);
  }

  for (const grid of doc.grids ?? []) {
    lines.push(printGrid(grid, 1));
  }

  lines.push(...printRuntime(doc.runtime, 1));

  if (doc.materials?.materials?.length) {
    lines.push(`${indent(1)}materials {`);
    for (const mat of doc.materials.materials) {
      lines.push(printMaterial(mat, 2));
    }
    lines.push(`${indent(1)}}`);
  }

  lines.push("}");
  return lines.join("\n");
}
