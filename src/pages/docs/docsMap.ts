import getStarted from "../../docs/content/get-started.md?raw";
import installation from "../../docs/content/installation.md?raw";
import cliOverview from "../../docs/content/cli-overview.md?raw";
import cliCommands from "../../docs/content/cli-commands.md?raw";
import languageOverview from "../../docs/content/language-overview.md?raw";
import syntax from "../../docs/content/syntax.md?raw";
import examples from "../../docs/content/examples.md?raw";
import renderHtml from "../../docs/content/render-html.md?raw";
import viewer from "../../docs/content/viewer.md?raw";
import editorOverview from "../../docs/content/editor-overview.md?raw";
import repoStructure from "../../docs/content/repo-structure.md?raw";
import releaseAndPublishing from "../../docs/content/release-and-publishing.md?raw";

export type DocsPage = {
  slug: string;
  title: string;
  description: string;
  section: string;
  content: string;
};

export type DocsSection = {
  title: string;
  pages: DocsPage[];
};

export const defaultDocSlug = "get-started";

export const docsSections: DocsSection[] = [
  {
    title: "Getting Started",
    pages: [
      {
        slug: "get-started",
        title: "Get Started",
        description: "Install the launcher, run Flux, and orient to the core ideas.",
        section: "Getting Started",
        content: getStarted,
      },
      {
        slug: "installation",
        title: "Installation",
        description: "Install and update the launcher-managed toolchain.",
        section: "Getting Started",
        content: installation,
      },
    ],
  },
  {
    title: "CLI",
    pages: [
      {
        slug: "cli-overview",
        title: "CLI Overview",
        description: "Viewer workflows plus parser and check commands.",
        section: "CLI",
        content: cliOverview,
      },
      {
        slug: "cli-commands",
        title: "CLI Commands",
        description: "Reference commands for viewing, stepping, and parsing.",
        section: "CLI",
        content: cliCommands,
      },
    ],
  },
  {
    title: "Language",
    pages: [
      {
        slug: "language-overview",
        title: "Language Overview",
        description: "How Flux evaluates source into a runtime snapshot.",
        section: "Language",
        content: languageOverview,
      },
      {
        slug: "syntax",
        title: "Syntax",
        description: "Core constructs, slots, and fit policies.",
        section: "Language",
        content: syntax,
      },
      {
        slug: "examples",
        title: "Examples",
        description: "Reference snippets and mental models.",
        section: "Language",
        content: examples,
      },
    ],
  },
  {
    title: "Rendering",
    pages: [
      {
        slug: "render-html",
        title: "Render HTML",
        description: "Paged HTML rendering and slot patching flow.",
        section: "Rendering",
        content: renderHtml,
      },
      {
        slug: "viewer",
        title: "Viewer",
        description: "Viewer server behavior and live playback modes.",
        section: "Rendering",
        content: viewer,
      },
    ],
  },
  {
    title: "Editor",
    pages: [
      {
        slug: "editor-overview",
        title: "Editor Overview",
        description: "Guided transforms and editor capabilities.",
        section: "Editor",
        content: editorOverview,
      },
    ],
  },
  {
    title: "Contributing / Internals",
    pages: [
      {
        slug: "repo-structure",
        title: "Repo Structure",
        description: "Where the site, viewer, and brand packages live.",
        section: "Contributing / Internals",
        content: repoStructure,
      },
      {
        slug: "release-and-publishing",
        title: "Release And Publishing",
        description: "Local dev, build steps, and release notes.",
        section: "Contributing / Internals",
        content: releaseAndPublishing,
      },
    ],
  },
];

export const docsPages = docsSections.flatMap((section) => section.pages);

export function getDocsPage(slug: string | undefined) {
  if (!slug) return docsPages.find((page) => page.slug === defaultDocSlug) ?? null;
  return docsPages.find((page) => page.slug === slug) ?? null;
}
