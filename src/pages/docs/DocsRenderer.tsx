import type { ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const headingClasses = {
  h2: "font-display text-2xl font-normal tracking-tight text-slate-900",
  h3: "font-display text-xl font-normal tracking-tight text-slate-900",
  h4: "font-display text-lg font-normal tracking-tight text-slate-900",
};

function CodeBlock({
  inline,
  className,
  children,
}: {
  inline?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const language = className?.match(/language-(\w+)/)?.[1];

  if (inline) {
    return (
      <code className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-xs text-slate-800">
        {children}
      </code>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-2 text-[11px] uppercase tracking-[0.2em] text-slate-500">
        <span>{language ? `Code (${language})` : "Code"}</span>
      </div>
      <pre className="overflow-auto px-4 py-3 text-xs leading-relaxed text-slate-800">
        <code className="font-mono">{children}</code>
      </pre>
    </div>
  );
}

export function DocsRenderer({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ children }) => <h2 className="sr-only">{children}</h2>,
        h2: ({ children }) => <h2 className={headingClasses.h2}>{children}</h2>,
        h3: ({ children }) => <h3 className={headingClasses.h3}>{children}</h3>,
        h4: ({ children }) => <h4 className={headingClasses.h4}>{children}</h4>,
        p: ({ children }) => <p className="text-sm leading-relaxed text-slate-700 md:text-base">{children}</p>,
        a: ({ href, children }) => (
          <a
            href={href}
            className="font-medium text-slate-900 underline decoration-slate-300 underline-offset-4 transition hover:decoration-slate-500"
          >
            {children}
          </a>
        ),
        ul: ({ children }) => <ul className="ml-5 list-disc space-y-2 text-sm text-slate-700 md:text-base">{children}</ul>,
        ol: ({ children }) => <ol className="ml-5 list-decimal space-y-2 text-sm text-slate-700 md:text-base">{children}</ol>,
        li: ({ children }) => <li className="leading-relaxed">{children}</li>,
        blockquote: ({ children }) => (
          <blockquote className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-600">
            {children}
          </blockquote>
        ),
        code: CodeBlock,
        hr: () => <hr className="border-slate-200" />,
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
