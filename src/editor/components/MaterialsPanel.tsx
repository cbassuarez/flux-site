import React, { useEffect, useRef } from "react";
import type { Material } from "@flux-lang/core";
import { looksLikeUrl } from "../materials/linkUtils";
import { inferMaterialKind, type MaterialKind } from "../model/materials";

interface MaterialsPanelProps {
  materials: Material[];
  selectedMaterialName?: string | null;
  materialDraft: Material | null;
  boundToSelectedCell?: string | null;
  onSelectMaterial(name: string): void;
  onAddMaterial(): void;
  onChangeDraft(updater: (draft: Material | null) => Material | null): void;
  onSaveDraft(): void;
  onDeleteMaterial(name: string): void;
  canApplyToSelection?: boolean;
  onApplyToSelection?: () => void;
}

const KIND_ORDER: MaterialKind[] = ["audio", "video", "text", "soundfont", "other"];

export function MaterialsPanel({
  materials,
  selectedMaterialName,
  materialDraft,
  boundToSelectedCell,
  onSelectMaterial,
  onAddMaterial,
  onChangeDraft,
  onSaveDraft,
  onDeleteMaterial,
  canApplyToSelection,
  onApplyToSelection,
}: MaterialsPanelProps) {
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!listRef.current || !selectedMaterialName) return;
    const el = listRef.current.querySelector<HTMLButtonElement>(`[data-material-id="${selectedMaterialName}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [selectedMaterialName]);

  return (
    <div className="flex h-full gap-3">
      <div className="w-1/3 min-w-[200px] border-r border-slate-200 pr-2">
        <div className="mb-2 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          <span>Materials</span>
          <button
            type="button"
            onClick={onAddMaterial}
            className="rounded bg-slate-900 px-2 py-1 text-[10px] font-semibold text-white shadow hover:bg-slate-800"
          >
            + Add
          </button>
        </div>
        <div ref={listRef} className="space-y-1 overflow-y-auto pr-1 text-sm">
          {materials.length === 0 && (
            <p className="text-xs text-slate-500">No materials yet. Add one to start annotating the score.</p>
          )}
          {materials.map((mat) => (
            <button
              key={mat.name}
              data-material-id={mat.name}
              type="button"
              onClick={() => onSelectMaterial(mat.name)}
              className={
                "flex w-full items-center justify-between rounded px-2 py-2 text-left text-[13px] " +
                (selectedMaterialName === mat.name
                  ? "bg-slate-100 ring-1 ring-slate-900/20"
                  : "hover:bg-slate-50")
              }
            >
              <div className="flex items-center gap-2">
                <span
                  className="inline-block h-3 w-3 rounded-full border border-slate-200"
                  style={mat.color ? { backgroundColor: mat.color } : undefined}
                />
                <div className="flex flex-col">
                  <span className="font-medium text-slate-800">{mat.label ?? mat.name}</span>
                  <span className="text-[11px] text-slate-500">{renderKindTag(mat)}</span>
                </div>
              </div>
              <span className="text-[10px] uppercase text-slate-400">{mat.tags?.slice(0, 2).join(", ")}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 pl-2">
        {!materialDraft && (
          <div className="flex h-full flex-col items-center justify-center rounded border border-dashed border-slate-300 p-4 text-sm text-slate-500">
            Select or create a material.
          </div>
        )}

        {materialDraft && (
          <MaterialDetail
            draft={materialDraft}
            onChangeDraft={onChangeDraft}
            onSaveDraft={onSaveDraft}
            onDelete={onDeleteMaterial}
            boundToSelectedCell={boundToSelectedCell}
            canApplyToSelection={canApplyToSelection}
            onApplyToSelection={onApplyToSelection}
            isSaved={materials.some((m) => m.name === materialDraft.name)}
          />
        )}
      </div>
    </div>
  );
}

function renderKindTag(material: Material) {
  const kind = inferMaterialKind(material);
  switch (kind) {
    case "audio":
      return "Audio";
    case "video":
      return "Video";
    case "text":
      return "Text";
    case "soundfont":
      return "Soundfont";
    default:
      return "Other";
  }
}

function MaterialDetail({
  draft,
  onChangeDraft,
  onSaveDraft,
  onDelete,
  boundToSelectedCell,
  canApplyToSelection,
  onApplyToSelection,
  isSaved,
}: {
  draft: Material;
  onChangeDraft: (updater: (draft: Material | null) => Material | null) => void;
  onSaveDraft: () => void;
  onDelete: (name: string) => void;
  boundToSelectedCell?: string | null;
  canApplyToSelection?: boolean;
  onApplyToSelection?: () => void;
  isSaved: boolean;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const kind = inferMaterialKind(draft);

  const handleKindChange = (nextKind: MaterialKind) => {
    onChangeDraft((current) => {
      if (!current) return current;
      const nextDraft: Material = { ...current };
      if (nextKind === "audio") {
        nextDraft.audio = nextDraft.audio ?? ({ clip: "" } as any);
        nextDraft.video = undefined;
        nextDraft.text = undefined;
        nextDraft.soundfont = undefined;
      } else if (nextKind === "video") {
        nextDraft.video = nextDraft.video ?? ({ clip: "" } as any);
        nextDraft.audio = undefined;
        nextDraft.text = undefined;
        nextDraft.soundfont = undefined;
      } else if (nextKind === "text") {
        nextDraft.text = nextDraft.text ?? ({ body: "" } as any);
        nextDraft.audio = undefined;
        nextDraft.video = undefined;
        nextDraft.soundfont = undefined;
      } else if (nextKind === "soundfont") {
        nextDraft.soundfont = nextDraft.soundfont ?? ({ name: "" } as any);
        nextDraft.audio = undefined;
        nextDraft.video = undefined;
        nextDraft.text = undefined;
      } else {
        nextDraft.audio = undefined;
        nextDraft.video = undefined;
        nextDraft.text = undefined;
        nextDraft.soundfont = undefined;
      }
      return nextDraft;
    });
  };

  const updateField = (patch: Partial<Material>) => {
    onChangeDraft((current) => (current ? { ...current, ...patch } : current));
  };

  const updateFacet = <K extends keyof Material>(key: K, value: Material[K]) => {
    onChangeDraft((current) => (current ? ({ ...current, [key]: value } as Material) : current));
  };

  const handleSave = () => {
    if (!draft.name.trim()) return;
    onSaveDraft();
  };

  const previewText = draft.text?.body ?? "";

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="text-sm font-semibold text-slate-800">{draft.label ?? draft.name}</div>
          {boundToSelectedCell && (
            <div className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-700">
              Bound to selected cell
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {onApplyToSelection && (
            <button
              type="button"
              onClick={() => onApplyToSelection()}
              disabled={!canApplyToSelection || !isSaved}
              className="rounded bg-slate-900 px-3 py-1 text-[11px] font-semibold text-white shadow-sm enabled:hover:bg-slate-800 disabled:opacity-40"
            >
              Apply to selection
            </button>
          )}
          <button
            type="button"
            onClick={() => onDelete(draft.name)}
            disabled={!isSaved}
            className="text-[11px] text-red-500 hover:text-red-600 disabled:opacity-40"
          >
            Delete
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="rounded bg-slate-900 px-3 py-1 text-[11px] font-semibold text-white shadow-sm hover:bg-slate-800"
          >
            Save material
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <label className="space-y-1 text-xs text-slate-600">
          <span className="block font-semibold">Name</span>
          <input
            value={draft.name}
            onChange={(e) => updateField({ name: e.target.value })}
            className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
          />
        </label>
        <label className="space-y-1 text-xs text-slate-600">
          <span className="block font-semibold">Label</span>
          <input
            value={draft.label ?? ""}
            onChange={(e) => updateField({ label: e.target.value })}
            className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
          />
        </label>
        <label className="space-y-1 text-xs text-slate-600">
          <span className="block font-semibold">Tags</span>
          <input
            value={(draft.tags || []).join(", ")}
            onChange={(e) => updateField({ tags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean) })}
            className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
            placeholder="comma,separated"
          />
        </label>
        <label className="space-y-1 text-xs text-slate-600">
          <span className="block font-semibold">Color</span>
          <input
            value={draft.color ?? ""}
            onChange={(e) => updateField({ color: e.target.value })}
            className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
            placeholder="#334155"
          />
        </label>
      </div>

      <label className="space-y-1 text-xs text-slate-600">
        <span className="block font-semibold">Description</span>
        <textarea
          value={draft.description ?? ""}
          onChange={(e) => updateField({ description: e.target.value })}
          className="h-20 w-full rounded border border-slate-300 px-2 py-1 text-sm"
        />
      </label>

      <div>
        <div className="mb-2 inline-flex rounded-full bg-slate-100 p-0.5 text-[11px] font-semibold text-slate-600">
          {KIND_ORDER.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => handleKindChange(k)}
              className={`rounded-full px-3 py-1 ${kind === k ? "bg-white shadow" : "hover:text-slate-800"}`}
            >
              {k === "text" ? "Text / Instruction" : k.charAt(0).toUpperCase() + k.slice(1)}
            </button>
          ))}
        </div>

        {kind === "audio" && (
          <div className="space-y-2 rounded border border-slate-200 bg-slate-50 p-3">
            <FacetField
              label="Clip URL"
              value={draft.audio?.clip ?? ""}
              onChange={(v) => updateFacet("audio", { ...(draft.audio ?? {}), clip: v })}
            />
            <NumberField
              label="In (seconds)"
              value={draft.audio?.inSeconds}
              onChange={(v) => updateFacet("audio", { ...(draft.audio ?? {}), inSeconds: v })}
            />
            <NumberField
              label="Out (seconds)"
              value={draft.audio?.outSeconds}
              onChange={(v) => updateFacet("audio", { ...(draft.audio ?? {}), outSeconds: v })}
            />
            <NumberField
              label="Gain"
              value={draft.audio?.gain}
              onChange={(v) => updateFacet("audio", { ...(draft.audio ?? {}), gain: v })}
            />
            <MediaPreview
              audioClip={draft.audio?.clip}
              videoClip={undefined}
              audioRef={audioRef}
              videoRef={videoRef}
            />
          </div>
        )}

        {kind === "video" && (
          <div className="space-y-2 rounded border border-slate-200 bg-slate-50 p-3">
            <FacetField
              label="Clip URL"
              value={draft.video?.clip ?? ""}
              onChange={(v) => updateFacet("video", { ...(draft.video ?? {}), clip: v })}
            />
            <NumberField
              label="In (seconds)"
              value={draft.video?.inSeconds}
              onChange={(v) => updateFacet("video", { ...(draft.video ?? {}), inSeconds: v })}
            />
            <NumberField
              label="Out (seconds)"
              value={draft.video?.outSeconds}
              onChange={(v) => updateFacet("video", { ...(draft.video ?? {}), outSeconds: v })}
            />
            <FacetField
              label="Layer"
              value={draft.video?.layer ?? ""}
              onChange={(v) => updateFacet("video", { ...(draft.video ?? {}), layer: v })}
            />
            <MediaPreview
              audioClip={undefined}
              videoClip={draft.video?.clip}
              audioRef={audioRef}
              videoRef={videoRef}
            />
          </div>
        )}

        {kind === "text" && (
          <div className="space-y-2 rounded border border-slate-200 bg-slate-50 p-3">
            <label className="space-y-1 text-xs text-slate-600">
              <span className="block font-semibold">Body</span>
              <textarea
                value={draft.text?.body ?? ""}
                onChange={(e) => updateFacet("text", { ...(draft.text ?? {}), body: e.target.value })}
                className="h-28 w-full rounded border border-slate-300 px-2 py-1 text-sm"
              />
            </label>
            <label className="space-y-1 text-xs text-slate-600">
              <span className="block font-semibold">Format</span>
              <select
                value={draft.text?.format ?? "plain"}
                onChange={(e) => updateFacet("text", { ...(draft.text ?? {}), format: e.target.value })}
                className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
              >
                <option value="plain">Plain</option>
                <option value="markdown">Markdown</option>
              </select>
            </label>
            <div className="rounded border border-slate-200 bg-white p-2 text-sm text-slate-700">
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Preview</div>
              <div className="max-h-40 overflow-auto whitespace-pre-wrap text-sm">
                {draft.text?.format === "markdown" ? (
                  <span className="text-slate-600">{previewText || "(markdown preview)"}</span>
                ) : (
                  <span>{previewText || "(plain text)"}</span>
                )}
              </div>
            </div>
          </div>
        )}

        {kind === "soundfont" && (
          <div className="space-y-2 rounded border border-slate-200 bg-slate-50 p-3">
            <FacetField
              label="Instrument name"
              value={draft.soundfont?.name ?? ""}
              onChange={(v) => updateFacet("soundfont", { ...(draft.soundfont ?? {}), name: v })}
            />
            <NumberField
              label="Bank"
              value={draft.soundfont?.bank}
              onChange={(v) => updateFacet("soundfont", { ...(draft.soundfont ?? {}), bank: v })}
            />
            <NumberField
              label="Program"
              value={draft.soundfont?.program}
              onChange={(v) => updateFacet("soundfont", { ...(draft.soundfont ?? {}), program: v })}
            />
            <FacetField
              label="Source (SF2/SFZ URL)"
              value={draft.soundfont?.source ?? ""}
              onChange={(v) => updateFacet("soundfont", { ...(draft.soundfont ?? {}), source: v })}
            />
            <div className="rounded border border-dashed border-slate-300 bg-white px-3 py-2 text-[12px] text-slate-600">
              Playback not yet wired; used for instrumentation metadata.
            </div>
          </div>
        )}

        {kind === "other" && (
          <div className="rounded border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
            No primary facet yet. Add audio, video, text, or soundfont metadata to get started.
          </div>
        )}
      </div>
    </div>
  );
}

function MediaPreview({
  audioClip,
  videoClip,
  audioRef,
  videoRef,
}: {
  audioClip?: string;
  videoClip?: string;
  audioRef: React.RefObject<HTMLAudioElement>;
  videoRef: React.RefObject<HTMLVideoElement>;
}) {
  const hasAudioUrl = looksLikeUrl(audioClip);
  const hasVideoUrl = looksLikeUrl(videoClip);

  return (
    <div className="space-y-2 text-xs text-slate-600">
      {hasAudioUrl && audioClip && (
        <div className="space-y-1">
          <div className="font-semibold text-slate-700">Audio preview</div>
          <audio ref={audioRef} controls src={audioClip} className="w-full rounded bg-slate-100" />
          <a href={audioClip} target="_blank" rel="noreferrer" className="text-[11px] text-sky-600 underline">
            Open audio in new tab
          </a>
        </div>
      )}

      {!hasAudioUrl && audioClip && (
        <div className="rounded border border-slate-200 bg-white px-2 py-1 font-mono text-[11px] text-slate-700">
          Clip: {audioClip}
        </div>
      )}

      {hasVideoUrl && videoClip && (
        <div className="space-y-1">
          <div className="font-semibold text-slate-700">Video preview</div>
          <video ref={videoRef} controls src={videoClip} className="w-full max-h-40 rounded bg-black" />
          <a href={videoClip} target="_blank" rel="noreferrer" className="text-[11px] text-sky-600 underline">
            Open video in new tab
          </a>
        </div>
      )}

      {!hasVideoUrl && videoClip && (
        <div className="rounded border border-slate-200 bg-white px-2 py-1 font-mono text-[11px] text-slate-700">
          Clip: {videoClip}
        </div>
      )}
    </div>
  );
}

function FacetField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="space-y-1 text-xs text-slate-600">
      <span className="block font-semibold">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
      />
    </label>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: number;
  onChange: (value: number | undefined) => void;
}) {
  return (
    <label className="space-y-1 text-xs text-slate-600">
      <span className="block font-semibold">{label}</span>
      <input
        type="number"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))}
        className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
      />
    </label>
  );
}

export default MaterialsPanel;
