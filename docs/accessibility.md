# Accessibility

Controls have visible labels and focus indicators. Focus the Canvas and use arrows to pan, `+`/`-` to zoom, and `Home` for the complete genome. Strand is conveyed by arrow direction and text, not colour alone; stops use both colour and `*`; partial ends use dashed outlines.

The Canvas has an accessible record/feature summary and a textual visible-range description. Selection details and warnings are ordinary HTML. Contrast targets readable light/dark combinations, and reduced-motion preferences are respected.

Canvas graphics cannot expose every base as an accessibility-tree node without severe performance costs. The summary, coordinate controls, inspector, and qualifiers are the supported textual alternatives; richer tabular sequence export is future accessibility work.
