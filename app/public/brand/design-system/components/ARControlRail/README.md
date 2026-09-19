# ARControlRail

The Evening bottom rail: piece carousel, stone swatches, metal swatches with a size slider, and the shutter.

- **Props:** `pieces` (`[{ id, name, glyph?, thumb? }]`), `piece` / `defaultPiece` / `onPieceChange`, `metal` / `defaultMetal` / `onMetalChange`, `stone` / `defaultStone` / `onStoneChange`, `unavailableStones`, `size` / `defaultSize` / `onSizeChange`, `sizeMin`, `sizeMax`, `formatSize`, `onCapture`, `leading` and `trailing` (slots beside the shutter, e.g. a “Look book” link and a secondary “Book” button).
- Parts are exported too: `PieceCarousel`, `SwatchGroup`, `SizeSlider`, `ShutterButton`.
- Everything is 44px+; the rail is `surface-control` with a gold top hairline. Keep ruby out of the rail: the booking CTA lives after the snapshot.
