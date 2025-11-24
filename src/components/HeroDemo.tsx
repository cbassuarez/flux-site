import { useMemo } from "react";
import { parseDocument } from "@flux-lang/core";

const FLUX_EXAMPLE = `document {
  meta {
    title   = "Landing Example";
    version = "0.1.0";
  }

  state {
    param tempo : float [40, 72] @ 60;
  }

  grid main {
    topology = grid;
    size { rows = 1; cols = 3; }

    cell c1 {
      tags    = [ noise ];
      content = "";
      dynamic = 0.6;
    }

    cell c2 {
      tags    = [ noise ];
      content = "";
      dynamic = 0.6;
    }

    cell c3 {
      tags    = [ noise ];
      content = "";
      dynamic = 0.4;
    }
  }

  runtime {
    eventsApply    = "deferred";
    docstepAdvance = [ timer(8 s) ];
  }

  rule growNoise(mode = docstep, grid = main) {
    when cell.content == "" and neighbors.all().dynamic > 0.5
    then {
      cell.content = "noise";
    }
  }
}
`;

export default function HeroDemo() {
  const { irJson, error } = useMemo(() => {
    try {
      const doc = parseDocument(FLUX_EXAMPLE);
      const json = JSON.stringify(doc, null, 2);
      return { irJson: json, error: null as string | null };
    } catch (err) {
      const msg =
        (err as Error)?.message ?? "Unknown error while parsing Flux example.";
      return { irJson: "", error: msg };
    }
  }, []);

  return (
    <section className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] items-stretch">
      {/* Left: Flux source */}
      <div className="code-panel overflow-hidden">
        <div className="code-header">
          <div className="code-header-badges">
            <span className="badge badge-pill">Flux source</span>
            <span className="badge">v0.1</span>
          </div>
          <span className="text-[10px] text-zinc-500">
            document → FluxDocument
          </span>
        </div>
        <pre className="overflow-auto text-xs sm:text-[13px] leading-relaxed p-4 font-mono text-zinc-100">
          <code>{FLUX_EXAMPLE}</code>
        </pre>
      </div>

      {/* Right: IR JSON */}
      <div className="code-panel overflow-hidden">
        <div className="code-header">
          <div className="code-header-badges">
            <span className="badge badge-pill">Flux IR</span>
            <span className="badge">FluxDocument</span>
          </div>
          <span className="text-[10px] text-zinc-500">
            parseDocument(source)
          </span>
        </div>
        <pre className="overflow-auto text-[11px] sm:text-xs leading-relaxed p-4 font-mono text-zinc-100">
          <code>
            {error
              ? `// Failed to parse example:\n// ${error}`
              : irJson}
          </code>
        </pre>
      </div>
    </section>
  );
}
