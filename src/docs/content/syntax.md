# Syntax

Flux documents are declared using a `.flux` source file. The snippet below matches the minimal sketch already used in the existing docs.

```flux
meta { title = "Viewer Demo"; version = "0.2.0"; }

assets bank demoImages {
  from "viewer-assets/*.(svg|png|jpg)"
  tags ["swap", "demo"]
}

page p1 {
  section intro {
    text paragraph1 {
      "Flux viewer demo shows "
      inline_slot word1 { reserve = fixedWidth(9ch); fit = ellipsis; }
        text { @choose(["moving","adaptive","dynamic","live","procedural","stochastic"]) }
      " text updates without reflow."
    }

    text paragraph2 {
      "This paragraph remains fixed while the inline slot updates on each docstep."
    }
  }

  section hero {
    slot imageSlot { reserve = fixed(360px, 240px); fit = scaleDown; }
      image heroImg { asset = @assets.pick(tags=["swap"]); }
    text caption { "Image slot swaps per docstep without changing layout." }
  }
}
```

## Slots And Fit Policies

Slots reserve geometry so content can evolve without repaginating:

- `inline_slot` reserves fixed width (for short inline changes).
- `slot` reserves fixed width + height.

If new content doesn't fit, apply fit policies such as `clip`, `ellipsis`, `shrink`, or `scaleDown`.
