# Navigating and zooming

The viewer begins at the whole-record view. Coordinates shown to users are one-based and inclusive.

- Select **+** or **−**, use the mouse wheel over the Canvas, or press <kbd>+</kbd>/<kbd>−</kbd> to zoom around the pointer or viewport centre.
- Drag horizontally or use <kbd>←</kbd>/<kbd>→</kbd> while the Canvas is focused to pan.
- Enter a position such as `5000` or a range such as `5,000-10,000` or `5000..10000` in **Position or range (1-based)**, then select **Go** or press <kbd>Enter</kbd>.
- Select **Whole genome** or press <kbd>Home</kbd> while the Canvas is focused to reset the view.

Panning and zooming are clamped to the record boundaries. The status output reports the visible one-based range and bases per pixel. At 1.6 bases per pixel or closer, the renderer changes from compact stop tracks to nucleotide and amino-acid letters; see [Six reading frames](translation.md).

See [Keyboard controls](keyboard-controls.md) for focus and shortcut behavior.
