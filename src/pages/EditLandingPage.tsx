import { PageLayout } from "../components/PageLayout";

export default function EditLandingPage() {
  return (
    <PageLayout
      title="Flux Editor"
      subtitle="The guided transforms editor runs inside the Flux viewer server."
      headerSlot={
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          To use the editor, start the Flux viewer server and open <span className="font-semibold">/edit</span> on that same host.
        </div>
      }
    >
      <div className="space-y-4">
        <p>
          This hosted site does not include the viewer backend, so the editor UI is unavailable here. When the viewer is
          running, the editor loads live outline, diagnostics, and preview content from the server.
        </p>
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm text-slate-700">
          <div className="text-xs uppercase tracking-widest text-slate-400">Quick start</div>
          <ol className="mt-2 list-decimal pl-5 text-sm text-slate-600">
            <li>Run the Flux viewer server.</li>
            <li>Open <span className="font-semibold">http://localhost:&lt;port&gt;/edit</span>.</li>
            <li>Use Add Section / Add Figure to apply guided transforms.</li>
          </ol>
        </div>
      </div>
    </PageLayout>
  );
}
