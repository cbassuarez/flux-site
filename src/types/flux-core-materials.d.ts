import "@flux-lang/core";

declare module "@flux-lang/core" {
  interface MaterialAudio {
    clip?: string;
    inSeconds?: number;
    outSeconds?: number;
    gain?: number;
  }

  interface MaterialText {
    body?: string;
    format?: "plain" | "markdown" | string;
  }

  interface MaterialSoundfont {
    name?: string;
    bank?: number;
    program?: number;
    source?: string;
  }

  interface Material {
    audio?: MaterialAudio;
    text?: MaterialText;
    soundfont?: MaterialSoundfont;
  }
}
