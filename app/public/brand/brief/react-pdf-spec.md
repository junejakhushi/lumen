# Lumen Design Brief + Session Report: rebuild spec for @react-pdf/renderer

Reference render: `design-brief-LUM-0042.pdf` (4 pages), `session-report-LUM-0042.pdf` (1 page), HTML sources beside them, previews `preview-p1..p4.png` and `preview-report-p1.png`.
Reference implementation: `DesignBrief.tsx` (same folder). Every value below is in **pt** (react-pdf's unit), so it can be copied straight into styles.

---

## 1. Page, margins, grid

| | value |
|---|---|
| Page | A4, `size="A4"` = 595.28 × 841.89 pt, one colour: ivory `#F5F0E8` |
| Margins | top 44, left/right 56, bottom reserved for footer: `paddingBottom = 30 + 68 + 12 = 110` |
| Content box | x 56 → 539.28 (width **483.28**), y 44 → 731.89 |
| Footer box | `position:absolute`, left/right 56, bottom 30, height 68 (rule at its top edge) |
| Grid | 6 columns × 70.55 with 12 pt gutters (6 × 70.55 + 5 × 12 = 483.28). Two-up blocks (looks, signals) use 2 × 229.64 with a 24 pt gutter. |
| Vertical rhythm | 4 pt base; section heads 20 pt above (16 on the Session Report), 6 below (5 on the Session Report) |

Column usage:
- Page 1 meta row: flex 1.1 / 1 / 0.8 (Client / Consultation / Visit), 12 pt inner padding, 0.5 pt gold dividers.
- Page 1 hero: arch column 284 pt (≈ 4 columns), 24 pt gap, text column 175.28 pt (the rest).
- Tables: label column 118 pt (≈ 1.5 columns), value takes the rest.
- Session strip: flex 1.55 / 0.9 / 1.05 / 0.95 / 1.2 / 0.95.

## 2. Colour constants

```ts
export const C = {
  ivory: '#F5F0E8',       // page
  ink: '#1B1916',         // text, AR snapshot ground
  gold: '#A8844A',        // hairlines, drawings, small accents; never text or fills
  goldDeep: '#8C6C3A',    // lines that carry meaning: table header rule, arrows, timeline nodes, QR box
  pearl: '#E8E2D8',       // spare surface (not used in this doc)
  stoneDeep: '#655E54',   // secondary text < 24 px on ivory (labels, subs, disclaimer)
  eveningMuted: '#A39C90',// AR corner brackets inside the snapshot
  eveningLine: '#4A443C', // forearm hint inside the snapshot
} as const;
```
No shadows, gradients or filled panels. Elevation is a 0.5 pt hairline.

## 3. Fonts

The Chromium build used fontsource **latin** woff subsets. They have no ₹ (U+20B9) and no → (U+2192). For react-pdf, use the **full TTFs** from Google Fonts and follow two rules:
1. **Every ₹ amount is set in Cormorant Garamond** (the full Cormorant file has ₹; Jost does not). This covers price blocks, the budget, timeline prices and look prices. Inside Jost sentences, wrap the amount in a nested `<Text style={s.rs}>`.
2. **Arrows are drawn**, not typed: `<Arrow/>` is an `Svg` path in gold-deep, 11 × 6.3 pt.

```ts
Font.register({ family: 'Cormorant Garamond', fonts: [
  { src: '/fonts/CormorantGaramond-Regular.ttf', fontWeight: 400 },
  { src: '/fonts/CormorantGaramond-Medium.ttf',  fontWeight: 500 },
  { src: '/fonts/CormorantGaramond-Italic.ttf',  fontWeight: 400, fontStyle: 'italic' },
]});
Font.register({ family: 'Cormorant SC', fonts: [
  { src: '/fonts/CormorantSC-SemiBold.ttf', fontWeight: 600 },   // small-caps labels
]});
Font.register({ family: 'Jost', fonts: [
  { src: '/fonts/Jost-Light.ttf',   fontWeight: 300 },           // only "for {{studio_name}}"
  { src: '/fonts/Jost-Regular.ttf', fontWeight: 400 },
  { src: '/fonts/Jost-Medium.ttf',  fontWeight: 500 },
]});
Font.registerHyphenationCallback((w) => [w]);
```
**Small caps:** react-pdf has no `font-variant`. Use the *Cormorant SC* family with `textTransform: 'lowercase'`: its lowercase glyphs are drawn as small caps, which gives CSS `all-small-caps`. Tracking in react-pdf is absolute, so `letterSpacing = fontSize × 0.16` (9 pt → 1.44).

Type scale (smallest text on any page is 7.5 pt):

| role | family / weight | size / leading | colour |
|---|---|---|---|
| Doc number `LUM-0042` | Cormorant 500 | 26 / 1.0 | ink |
| Lyrical name (p1) | Cormorant 400 | 40 / 1.02 | ink |
| Section title (p3) | Cormorant 500 | 24 / 1.1 | ink |
| Client name | Cormorant 500 | 20 / 1.15 | ink |
| Values (meta, strip, 3-up) | Cormorant 500 | 14 / 16 / 17 | ink |
| Indicative price | Cormorant 500 | 28 / 1.05 | ink |
| Client notes | Cormorant italic 400 | 13 / 1.42 | ink |
| Small-caps label | Cormorant SC 600, lowercase | 9 (8–8.5 in strip, table heads, footer) / 1.2, tracking .16em | ink or stone-deep |
| Body | Jost 400 | 9.5 / 1.45 | ink |
| Table cells (session) | Jost 400 | 8.5 / 1.35 | ink |
| Sub / disclaimer | Jost 400 | 8 / 1.35–1.45 | stone-deep |
| Atelier line | Jost **300** | 10.5 / 1.2 | ink |
| Confidential line, piece codes | Jost 400 | 7.5 | stone-deep |

## 4. Rules and tables

- **Rule weights:** 0.5 pt gold `#A8844A` for every row rule, section rule, divider and frame. 0.75 pt gold-deep `#8C6C3A` only under table header rows. The timeline baseline is 0.5 pt gold; its nodes are 0.75 pt gold-deep.
- **Rows:** `flexDirection:'row'`, `alignItems:'baseline'`, `paddingTop 5`, `paddingBottom 4.5` (Changes table: 6 / 5.5), `borderBottomWidth 0.5`. The first row of the spec table also gets a 0.5 pt top rule (`tableTop`). No vertical rules inside tables. The 3-up strip, meta row and session strip use 0.5 pt vertical dividers with 12 pt (strip: 8/6) horizontal padding. The first cell has no left padding, so text lines up with the margin.
- **Alignment:** everything left-aligned, including numbers. AR time is a fixed 58 pt column. Timeline columns are centred. The doc number is right-aligned.
- **Header row:** small caps 8.5–9 pt stone-deep, 0.5 pt gold rule above and 0.75 pt gold-deep rule below.
- **Number formatting:**
  - Prices are ranges with an en dash and no spaces: `₹1.8–2.1L`, `₹38–44K`. Prefix with "Indicative " in price blocks and looks, or show "Price on consultation". Use `formatRange(lo, hi)` in the TSX.
  - Units take a space: `18.2 g`, `15.5 cm`, `2 mm`. Karat is `18K`. Dimensions use ×: `62 × 14 mm`. Durations read `8 min 20 s`. The score reads `86/100`, with `/100` at 10 pt stone-deep in HTML.
  - Times put IST first and client local time beneath: `7:30 PM IST` / `10:00 AM EDT · client local time`.
  - A null weight renders `To be confirmed`.

## 5. Style object (StyleSheet.create-ready)

The full object is `s` in `DesignBrief.tsx`. Key entries:

```ts
const sc = { fontFamily: 'Cormorant SC', fontWeight: 600, textTransform: 'lowercase', fontSize: 9, letterSpacing: 1.44, lineHeight: 1.2, color: C.ink } as const;
StyleSheet.create({
  page:   { backgroundColor: C.ivory, paddingTop: 44, paddingHorizontal: 56, paddingBottom: 110, fontFamily: 'Jost', fontSize: 9.5, lineHeight: 1.45, color: C.ink },
  // header
  mast:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingBottom: 12, borderBottomWidth: 0.5, borderBottomColor: C.gold },
  brand:  { fontFamily: 'Cormorant Garamond', fontWeight: 500, fontSize: 17, lineHeight: 1, marginBottom: 3 },
  docNo:  { fontFamily: 'Cormorant Garamond', fontWeight: 500, fontSize: 26, lineHeight: 1, marginTop: 3, textAlign: 'right' },
  run:    { flexDirection: 'row', alignItems: 'center', paddingBottom: 9, borderBottomWidth: 0.5, borderBottomColor: C.gold },   // pages 2–3
  runR:   { marginLeft: 'auto', fontSize: 8.5, color: C.stoneDeep },
  // labels / titles / body
  sc, scMuted: { ...sc, color: C.stoneDeep },
  v:      { fontFamily: 'Cormorant Garamond', fontWeight: 500, fontSize: 14, lineHeight: 1.2 },
  vLg:    { fontFamily: 'Cormorant Garamond', fontWeight: 500, fontSize: 20, lineHeight: 1.15 },
  lyr:    { fontFamily: 'Cormorant Garamond', fontWeight: 400, fontSize: 40, lineHeight: 1.02 },
  h2:     { fontFamily: 'Cormorant Garamond', fontWeight: 500, fontSize: 24, lineHeight: 1.1, marginTop: 6 },
  sub:    { fontSize: 8, color: C.stoneDeep, lineHeight: 1.35 },
  story:  { fontFamily: 'Cormorant Garamond', fontStyle: 'italic', fontSize: 12.5, lineHeight: 1.35, maxWidth: 175 },
  // tables
  headRow:{ flexDirection: 'row', paddingTop: 6, paddingBottom: 5, borderTopWidth: 0.5, borderTopColor: C.gold, borderBottomWidth: 0.75, borderBottomColor: C.goldDeep },
  row:    { flexDirection: 'row', alignItems: 'baseline', paddingTop: 5, paddingBottom: 4.5, borderBottomWidth: 0.5, borderBottomColor: C.gold },
  cellLabel: { ...sc, width: 118, color: C.stoneDeep },
  cellOrig:  { width: 130, color: C.stoneDeep },
  cellArrow: { width: 26, paddingTop: 2 },
  // notes
  notes:  { fontFamily: 'Cormorant Garamond', fontStyle: 'italic', fontSize: 13, lineHeight: 1.42, borderLeftWidth: 0.5, borderLeftColor: C.gold, paddingLeft: 14, paddingVertical: 2, marginTop: 4 },
  // three-up + price block
  three:  { flexDirection: 'row', marginTop: 20, borderTopWidth: 0.5, borderBottomWidth: 0.5, borderColor: C.gold },
  threeCell: { flex: 1, paddingTop: 10, paddingBottom: 11, paddingHorizontal: 12 },   // first: paddingLeft 0; others: borderLeft 0.5 gold
  threeV: { fontFamily: 'Cormorant Garamond', fontWeight: 500, fontSize: 16, marginTop: 5 },
  price:  { flexDirection: 'row', alignItems: 'flex-end', marginTop: 16 },
  priceV: { fontFamily: 'Cormorant Garamond', fontWeight: 500, fontSize: 28, lineHeight: 1.05, marginTop: 4 },
  disc:   { fontSize: 8, color: C.stoneDeep, lineHeight: 1.45, marginTop: 4 },
  // footer + QR
  foot:   { position: 'absolute', left: 56, right: 56, bottom: 30, height: 68, paddingTop: 12, borderTopWidth: 0.5, borderTopColor: C.gold, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  atelier:{ fontFamily: 'Jost', fontWeight: 300, fontSize: 10.5 },
  conf:   { fontSize: 7.5, color: C.stoneDeep, marginTop: 3 },
  pno:    { fontSize: 8.5, letterSpacing: 0.34, marginRight: 14 },
  qr:     { width: 56, height: 56, borderWidth: 0.5, borderColor: C.goldDeep, position: 'relative' },
});
```
The look cards, session strip, per-piece table, timeline, signals and talking points are in the same object (`look*`, `strip*`, `pp*`, `tl*`, `sig*`, `tp*`).

## 6. Component tree

```
<Document>
  Page 1  <Page size="A4" style={s.page}>
            <MastHead kind="Design brief" sub="Wear it before it’s made" no/>   View(row) > [Svg monogram 30pt, View>[Text Lumen, Text sc]] + View>[Text sc "design brief no.", Text docNo]
            <View meta row> 3 × View cell > [Text sc label, Text value(s), Text sub]
            <View hero wrap={false}>
               View heroL > [<ArchSnapshot width=284/>, Text sc "AR snapshot · Rough preview", Text sub caption]
               View heroR (space-between) > [View > [View tile45 > <PlaceholderArt cuff 140×175/>, Text "Original piece · as catalogued"],
                                             View > [Text sc "The piece", Text lyr, Text sc "LX-104 · Fine collection", View ruleShort, Text story]]
            <Footer fixed/>
  Page 2  <RunHead/> · <SecHead i "The piece"/> · View(wrap=false) > 7 × row[label, value]
          <SecHead ii "The changes"/> · View(wrap=false) > headRow + 5 × row[label, orig, <Arrow/>, requested]
          <SecHead iii "In the client’s words"/> · Text notes
          View three(wrap=false) > 3 × cell · View price(wrap=false) > [label + priceV, sub + disc] · <Footer/>
  Page 3  <RunHead/> · <SecHead iv "Saved looks" title/> · Text intro
          View looks(row, wrap) > 4 × View look(wrap=false) > [View lookImg > PlaceholderArt, label "Look n · code", Text name, Text config, View lookF > [price, note]] · <Footer/>
  Page 4  <SessionReportPage appended/>   (only when session.outcome === 'Booked')
            MastHead("Session report") · View strip(6 cells) · SecHead + per-piece table · SecHead + <Timeline/> · SecHead + signals grid (2×2) · SecHead + talking points (Bullet + Text) · <Footer/>
</Document>
```
The standalone report is `<Document><SessionReportPage appended={false}/></Document>`. The only difference is the masthead sub-line ("Companion to design brief LUM-0042"). Page numbers come from `totalPages`, so they read 4 / 4 in the brief and 1 / 1 on their own.

## 7. Artwork with `<Svg>`

react-pdf does **not** support `vector-effect: non-scaling-stroke`. Divide the stroke width you want by the drawing scale: `strokeWidth = pt / (renderedWidth / viewBoxWidth)`. The helper is `sw()` in the TSX.

**Arch frame (hero AR snapshot).** The shape is the brand `frame-arch.svg` in a 320 × 480 viewBox, rendered at 284 × 426 pt (scale 0.8875):
```
ARCH_D = "M16 472V208 C16 150 48 118 96 92 C124 76 148 58 160 30 C172 58 196 76 224 92 C272 118 304 150 304 208V472"
INSET  = "translate(160 262) scale(0.93) translate(-160 -262)"
```
```tsx
<Svg width={284} height={426} viewBox="0 0 320 480">
  <Defs><ClipPath id="archclip"><Path d={ARCH_D + 'Z'} transform={INSET}/></ClipPath></Defs>
  <Path d={ARCH_D + 'Z'} fill={C.ink} transform={INSET}/>                       {/* ink ground = the AR capture */}
  <G clipPath="url(#archclip)"><Path d={FOREARM_D} stroke={C.eveningLine} strokeWidth={0.85} fill="none"/></G>
  <Path d="M70 158V144H84 M250 158V144H236 M70 404V418H84 M250 404V418H236" stroke={C.eveningMuted} strokeWidth={0.85} fill="none"/>  {/* AR corner brackets */}
  <G transform="translate(0 76)"><Path d={PLACEHOLDER_D.cuff} stroke={C.gold} strokeWidth={1.13} fill="none"/></G>
  <G fill="none" stroke={C.gold} strokeWidth={0.85}>                          {/* brand arch hairline, closed with a sill */}
    <Path d={ARCH_D + 'Z'}/><Circle cx={160} cy={22} r={3}/><Path d="M160 19V10"/>
  </G>
</Svg>
```
`FOREARM_D = "M104 480C104 420 100 380 104 350C106 330 104 300 96 262C92 244 94 226 100 214 M218 480C218 420 222 380 218 350C216 330 220 300 228 262C232 244 230 226 224 214"`.
If your react-pdf version ignores `clipPath` on `G`, shorten the forearm paths so they end at y ≤ 455.

**Placeholders.** The `d` strings of `placeholder-{cuff,bangle,bracelet,solitaire-ring}.svg` (viewBox 320 × 400) are inlined in `PLACEHOLDER_D`. Draw them without their ivory `<rect>`, with `preserveAspectRatio="xMidYMid meet"` and a 0.9 pt effective stroke.

**Monogram.** viewBox 32. `<G transform="translate(-2 -0.6)">` contains `Path d="M9.5 8C9.5 6 12 5.5 12 7.5V21A4 4 0 0 0 16 25H21.5"` and `Circle cx=24 cy=25 r=2.5`, stroke gold 1.5. It renders at 30 pt on masthead pages and 18 pt in the running header.

**Seal.** 24 pt, from `seal-hallmark.svg`: three rings (r 58.5 / 56 / 41) and the diamond path `M60 49 L67 56 L60 71 L53 56 Z M53 56 H67 M57 52.5 L60 56 L63 52.5 M60 56 V71`. The arc lettering is dropped in react-pdf because it is illegible at 24 pt. The HTML build keeps it.

**QR placeholder.** A 56 × 56 View with a 0.5 pt gold-deep border. Over it sits an `Svg` 56 × 56 with three outlined finder squares (13 pt outer, 5 pt inner) at (4,4), (39,4) and (4,39), plus "qr" in small caps 8 pt stone-deep at the bottom right. It must read clearly as a placeholder, so never draw modules.

**Arrow.** `Svg 11 × 6.3, viewBox 0 0 14 8, Path "M0.5 4H13M9.5 0.8L13 4L9.5 7.2"`, stroke gold-deep 1. Inline arrows go in a `View` row: `[Text, Arrow, Text]`.

## 8. Session Report timeline

- The container is a `View` row of N equal columns (`flex: 1`, width 483.28 / N; N = 5 here), with `wrap={false}`.
- An absolutely positioned `Svg` (width 483.28, height 12, `top: 13`) sits behind the columns and draws:
  - the baseline `M{colW/2} 6 H{483.28 − colW/2}`, 0.5 pt gold, from the first node centre to the last;
  - each node at `cx = colW·i + colW/2`, `cy = 6`, as `Circle r=4`, fill ivory (masks the line), stroke 0.75 gold-deep;
  - the final node as a double ring: r 5.5 at 0.75 pt plus r 3 at 0.5 pt, both gold-deep, with no fill accent.
- Each column is centred. From top to bottom:
  1. `Start` or `Step n` in small caps 8 pt stone-deep, 12 pt tall.
  2. A 15 pt spacer, where the line sits.
  3. The step name in small caps 8.5 pt stone-deep.
  4. The detail (Jost 8.5 / 1.35, `minHeight 23`). Two-part details stack on two lines; `from → to` details use a row with `<Arrow/>`.
  5. The price at that step in Cormorant 500 12.5 pt.
- Steps used: As catalogued (Yellow 18K / Wrist 16.5 cm, ₹1.9–2.2L) → Metal (Yellow 18K → Rose 18K, ₹1.9–2.2L) → Size (16.5 → 15.5 cm, ₹1.85–2.15L) → Weight (Lighter / est. 16–17 g, ₹1.7–1.95L) → Stone (+ one 2 mm diamond, ₹1.8–2.1L, final).
- With more than 6 steps, keep the last 6 and show the first as "As catalogued", or split into two rows. Never let a column fall below 70 pt.

## 9. Page-break rules

- **`fixed` footer.** `<Footer/>` is a `View fixed` placed absolutely inside each `Page`. Page numbers use `<Text render={({ pageNumber, totalPages }) => \`${pageNumber} / ${totalPages}\`}/>`. The page's `paddingBottom: 110` keeps flowing content clear of it.
- **`wrap={false}`** goes on:
  - the hero, each table (spec, changes, per-piece), the 3-up strip, the price block, the session strip, the timeline and the signals grid;
  - each look card and each talking point.
- **Section heads** get `minPresenceAhead={60}` so a head never sits orphaned at the bottom of a page.
- **Pages 1–3 are explicit `<Page>`s**, not flowing text: a couture card should not reflow. If the client notes run past about 420 characters, drop them to 12 pt. If there are more than 4 looks, add a second looks page (4 per page).
- **The Session Report is designed to fit one page** at the sample data (content ends at y ≈ 703 of 732). If the per-piece table exceeds 6 rows, it may flow onto a second report page. Its header row is not repeated, so render the table in chunks of 6 rows per page, each with its own `headRow`.
- **Append rule.** The report goes after the brief only when `session.outcome === 'Booked'`. Otherwise the report is issued alone.

## 10. Data shape

```ts
type PlaceholderName = 'cuff' | 'bangle' | 'bracelet' | 'solitaire-ring';
interface Change { attribute: string; original: string; requested: string }
interface Look { placeholder: PlaceholderName; name: string; code: string; config: string; priceRange: string | null; note: string }
interface JourneyStep { step: string; from?: string; to?: string; detail?: string[]; priceRange: string; final?: boolean }
interface PieceRow { name: string; code: string; arTime: string; customisations: string; finalConfig: string }
interface Signal { title: string; evidence: string }

interface SessionReportData {
  briefNo: string; date: string; timeIst: string; timeLocal: string;
  durationMin: number; piecesWorn: number; snapshots: number; interestScore: number;
  outcome: 'Booked' | 'Saved' | 'Left';
  pieces: PieceRow[]; journeyPiece: string; journey: JourneyStep[];
  signals: Signal[]; talkingPoints: string[];            // 3–5 talking points
}

interface DesignBriefData {
  briefNo: string;                 // "LUM-0042"
  clientName: string;              // "{{client_name}}" (rendered literally)
  studioName: string;              // "{{studio_name}}" (footer atelier line)
  consultation: { date: string; timeIst: string; timeLocal: string };
  visit: { type: 'Video call' | 'Studio visit'; note: string };
  piece: { code: string; name: string; collection: string; metal: string; karat: string;
           estWeight: string | null; size: string; stones: string; story: string; catalogueRange: string };
  snapshotCaption: string;
  changes: Change[];
  clientNotes: string;
  occasion: string; neededBy: string; budgetRange: string;
  indicativeRange: string; disclaimer: string;
  looks: Look[];
  session?: SessionReportData;     // appended when outcome === 'Booked'
}
```
The sample data (`sampleBrief`, `sampleSession`) in `DesignBrief.tsx` matches the rendered PDFs and `catalog.json` (LX-104, `sample_client`, `sample_changes`).
