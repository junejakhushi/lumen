/**
 * Lumen · Design Brief + Session Report — @react-pdf/renderer implementation.
 *
 * Delivered by Claude Design (public/brand/brief/DesignBrief.tsx, see react-pdf-spec.md).
 * The only change is the font path: react-pdf runs on the server here, so the TTFs are
 * read from the filesystem rather than fetched over HTTP.
 * Mirrors out/brief/design-brief-LUM-0042.html (see react-pdf-spec.md).
 * All sizes are in pt. A4 = 595.28 × 841.89 pt.
 */
import path from 'node:path';
import React from 'react';
import {
  Document, Page, View, Text, Svg, Path, Circle, Rect, G, Defs, ClipPath, Font, StyleSheet,
} from '@react-pdf/renderer';
import type { Style } from '@react-pdf/stylesheet';

/* ------------------------------------------------------------------ fonts */
// Use FULL (non-subset) TTFs from Google Fonts. Prices are set in dollars, which both
// families carry, so a figure may be set in either.
const FONT_DIR = path.join(process.cwd(), 'public', 'fonts');
Font.register({
  family: 'Cormorant Garamond',
  fonts: [
    { src: `${FONT_DIR}/CormorantGaramond-Regular.ttf`, fontWeight: 400 },
    { src: `${FONT_DIR}/CormorantGaramond-Medium.ttf`, fontWeight: 500 },
    { src: `${FONT_DIR}/CormorantGaramond-Italic.ttf`, fontWeight: 400, fontStyle: 'italic' },
  ],
});
Font.register({ family: 'Cormorant SC', fonts: [{ src: `${FONT_DIR}/CormorantSC-SemiBold.ttf`, fontWeight: 600 }] });
Font.register({
  family: 'Jost',
  fonts: [
    { src: `${FONT_DIR}/Jost-Light.ttf`, fontWeight: 300 },
    { src: `${FONT_DIR}/Jost-Regular.ttf`, fontWeight: 400 },
    { src: `${FONT_DIR}/Jost-Medium.ttf`, fontWeight: 500 },
  ],
});
Font.registerHyphenationCallback((word: string) => [word]); // never hyphenate names or codes

/* ---------------------------------------------------------------- tokens */
export const C = {
  ivory: '#F5F0E8', ink: '#1B1916', gold: '#A8844A', goldDeep: '#8C6C3A', pearl: '#E8E2D8',
  stoneDeep: '#655E54', eveningMuted: '#A39C90', eveningLine: '#4A443C',
} as const;
export const PAGE = { w: 595.28, h: 841.89, top: 44, side: 56, footBottom: 30, footH: 68 } as const;
export const CONTENT_W = PAGE.w - PAGE.side * 2; // 483.28
export const RULE = { hair: 0.5, head: 0.75 } as const;

/* ------------------------------------------------------------------ data */
export interface Change { attribute: string; original: string; requested: string }
export interface Look { placeholder: PlaceholderName; name: string; code: string; config: string; priceRange: string | null; note: string }
export interface JourneyStep { step: string; from?: string; to?: string; detail?: string[]; priceRange: string; final?: boolean }
export interface PieceRow { name: string; code: string; arTime: string; customisations: string; finalConfig: string }
export interface Signal { title: string; evidence: string }
export interface SessionReportData {
  briefNo: string; date: string; timeIst: string; timeLocal: string;
  durationMin: number; piecesWorn: number; snapshots: number; interestScore: number; outcome: 'Booked' | 'Saved' | 'Left';
  pieces: PieceRow[]; journeyPiece: string; journey: JourneyStep[]; signals: Signal[]; talkingPoints: string[];
}
export interface DesignBriefData {
  briefNo: string; clientName: string; studioName: string;
  consultation: { date: string; timeIst: string; timeLocal: string };
  visit: { type: 'Video call' | 'Studio visit'; note: string };
  piece: { code: string; name: string; collection: string; metal: string; karat: string; estWeight: string | null; size: string; stones: string; story: string; catalogueRange: string };
  snapshotCaption: string;
  changes: Change[];
  clientNotes: string;
  occasion: string; neededBy: string; budgetRange: string;
  indicativeRange: string; disclaimer: string;
  looks: Look[];
  session?: SessionReportData; // present => appended as the last page(s)
}

/** Indicative price formatting: "$12,400–14,900", en dash, no spaces. */
export function formatRange(lo: number, hi: number): string {
  const one = (n: number) => Math.round(n).toLocaleString("en-US");
  return `$${one(lo)}–${one(hi)}`;
}

/* ---------------------------------------------------------------- styles */
const sc = { fontFamily: 'Cormorant SC', fontWeight: 600, textTransform: 'lowercase', fontSize: 9, letterSpacing: 1.44, lineHeight: 1.2, color: C.ink } as const;
export const s = StyleSheet.create({
  page: { width: PAGE.w, height: PAGE.h, backgroundColor: C.ivory, paddingTop: PAGE.top, paddingHorizontal: PAGE.side, paddingBottom: PAGE.footBottom + PAGE.footH + 12, fontFamily: 'Jost', fontSize: 9.5, lineHeight: 1.45, color: C.ink },
  sc,
  scMuted: { ...sc, color: C.stoneDeep },
  sub: { fontSize: 8, color: C.stoneDeep, lineHeight: 1.35 },
  v: { fontFamily: 'Cormorant Garamond', fontWeight: 500, fontSize: 14, lineHeight: 1.2 },
  vLg: { fontFamily: 'Cormorant Garamond', fontWeight: 500, fontSize: 20, lineHeight: 1.15 },
  rs: { fontFamily: 'Cormorant Garamond', fontWeight: 500 },
  // masthead
  mast: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingBottom: 12, borderBottomWidth: RULE.hair, borderBottomColor: C.gold },
  mastL: { flexDirection: 'row', alignItems: 'center' },
  brand: { fontFamily: 'Cormorant Garamond', fontWeight: 500, fontSize: 17, lineHeight: 1, letterSpacing: 0.34, marginBottom: 3 },
  docNo: { fontFamily: 'Cormorant Garamond', fontWeight: 500, fontSize: 26, lineHeight: 1, marginTop: 3, textAlign: 'right' },
  run: { flexDirection: 'row', alignItems: 'center', paddingBottom: 9, borderBottomWidth: RULE.hair, borderBottomColor: C.gold },
  runR: { marginLeft: 'auto', fontSize: 8.5, color: C.stoneDeep },
  // meta row (page 1)
  meta: { flexDirection: 'row', borderBottomWidth: RULE.hair, borderBottomColor: C.gold },
  metaCell: { paddingVertical: 12, paddingRight: 12 },
  metaCellNext: { paddingLeft: 12, borderLeftWidth: RULE.hair, borderLeftColor: C.gold },
  // hero
  hero: { flexDirection: 'row', marginTop: 22 },
  heroL: { width: 284, marginRight: 24, alignItems: 'center' },
  heroR: { flex: 1, justifyContent: 'space-between' },
  tile45: { width: 140, height: 175, borderWidth: RULE.hair, borderColor: C.gold },
  lyr: { fontFamily: 'Cormorant Garamond', fontWeight: 400, fontSize: 40, lineHeight: 1.02 },
  ruleShort: { width: 36, borderTopWidth: RULE.hair, borderTopColor: C.gold, marginTop: 12, marginBottom: 10 },
  story: { fontFamily: 'Cormorant Garamond', fontStyle: 'italic', fontSize: 12.5, lineHeight: 1.35, maxWidth: 175 },
  // sections + tables
  secH: { flexDirection: 'row', alignItems: 'flex-end', marginTop: 20, marginBottom: 6 },
  h2: { fontFamily: 'Cormorant Garamond', fontWeight: 500, fontSize: 24, lineHeight: 1.1, marginTop: 6 },
  tableTop: { borderTopWidth: RULE.hair, borderTopColor: C.gold },
  headRow: { flexDirection: 'row', paddingTop: 6, paddingBottom: 5, borderTopWidth: RULE.hair, borderTopColor: C.gold, borderBottomWidth: RULE.head, borderBottomColor: C.goldDeep },
  row: { flexDirection: 'row', alignItems: 'baseline', paddingTop: 5, paddingBottom: 4.5, borderBottomWidth: RULE.hair, borderBottomColor: C.gold },
  cellLabel: { ...sc, width: 118, color: C.stoneDeep },
  cellValue: { flex: 1 },
  cellOrig: { width: 130, color: C.stoneDeep },
  cellArrow: { width: 26, paddingTop: 2 },
  notes: { fontFamily: 'Cormorant Garamond', fontStyle: 'italic', fontSize: 13, lineHeight: 1.42, borderLeftWidth: RULE.hair, borderLeftColor: C.gold, paddingLeft: 14, paddingVertical: 2, marginTop: 4 },
  three: { flexDirection: 'row', marginTop: 20, borderTopWidth: RULE.hair, borderBottomWidth: RULE.hair, borderColor: C.gold },
  threeCell: { flex: 1, paddingTop: 10, paddingBottom: 11, paddingHorizontal: 12 },
  threeV: { fontFamily: 'Cormorant Garamond', fontWeight: 500, fontSize: 16, lineHeight: 1.2, marginTop: 5 },
  price: { flexDirection: 'row', alignItems: 'flex-end', marginTop: 16 },
  priceV: { fontFamily: 'Cormorant Garamond', fontWeight: 500, fontSize: 28, lineHeight: 1.05, marginTop: 4 },
  disc: { fontSize: 8, color: C.stoneDeep, lineHeight: 1.45, marginTop: 4 },
  // looks
  intro: { fontSize: 9, color: C.stoneDeep, maxWidth: 330, marginBottom: 14 },
  looks: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  look: { width: (CONTENT_W - 24) / 2, marginBottom: 20 },
  lookImg: { height: 170, borderWidth: RULE.hair, borderColor: C.gold, alignItems: 'center', justifyContent: 'center' },
  lookH: { fontFamily: 'Cormorant Garamond', fontWeight: 500, fontSize: 19, lineHeight: 1.1, marginTop: 3, marginBottom: 2 },
  lookF: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 6, paddingTop: 6, borderTopWidth: RULE.hair, borderTopColor: C.gold },
  lookPrice: { fontFamily: 'Cormorant Garamond', fontWeight: 500, fontSize: 12.5 },
  // session report
  strip: { flexDirection: 'row', borderBottomWidth: RULE.hair, borderBottomColor: C.gold },
  stripCell: { paddingVertical: 11, paddingLeft: 8, paddingRight: 6, borderLeftWidth: RULE.hair, borderLeftColor: C.gold },
  stripLabel: { ...sc, fontSize: 8, letterSpacing: 0.96, color: C.stoneDeep, marginBottom: 5 },
  stripV: { fontFamily: 'Cormorant Garamond', fontWeight: 500, fontSize: 17, lineHeight: 1.1 },
  ppCell: { fontSize: 8.5, lineHeight: 1.35, paddingRight: 8 },
  ppName: { fontFamily: 'Cormorant Garamond', fontWeight: 500, fontSize: 11.5 },
  code: { fontSize: 7.5, color: C.stoneDeep, letterSpacing: 0.3 },
  tl: { position: 'relative', flexDirection: 'row', marginTop: 6 },
  tlNode: { flex: 1, alignItems: 'center', paddingHorizontal: 4 },
  tlStep: { ...sc, fontSize: 8.5, letterSpacing: 1.19, color: C.stoneDeep, marginTop: 7 },
  tlDetail: { fontSize: 8.5, lineHeight: 1.35, marginTop: 2, minHeight: 23, textAlign: 'center' },
  tlPrice: { fontFamily: 'Cormorant Garamond', fontWeight: 500, fontSize: 12.5, marginTop: 2 },
  sig: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', borderTopWidth: RULE.hair, borderTopColor: C.gold },
  sigCell: { width: (CONTENT_W - 24) / 2, paddingVertical: 6, borderBottomWidth: RULE.hair, borderBottomColor: C.gold },
  sigH: { fontFamily: 'Cormorant Garamond', fontWeight: 500, fontSize: 12.5, lineHeight: 1.2 },
  sigE: { fontSize: 8.5, color: C.stoneDeep, lineHeight: 1.4, marginTop: 1 },
  tp: { flexDirection: 'row', paddingVertical: 3 },
  tpText: { flex: 1, fontSize: 9, lineHeight: 1.4 },
  // footer (fixed)
  foot: { position: 'absolute', left: PAGE.side, right: PAGE.side, bottom: PAGE.footBottom, height: PAGE.footH, paddingTop: 12, borderTopWidth: RULE.hair, borderTopColor: C.gold, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  footL: { width: 170 },
  atelier: { fontFamily: 'Jost', fontWeight: 300, fontSize: 10.5, lineHeight: 1.2 },
  conf: { fontSize: 7.5, color: C.stoneDeep, marginTop: 3 },
  footC: { flexDirection: 'row', alignItems: 'center' },
  footR: { width: 170, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' },
  pno: { fontSize: 8.5, letterSpacing: 0.34, marginRight: 14 },
  qr: { width: 56, height: 56, borderWidth: RULE.hair, borderColor: C.goldDeep, position: 'relative' },
});

/* ------------------------------------------------------- vector artwork */
export const ARCH_D = 'M16 472V208 C16 150 48 118 96 92 C124 76 148 58 160 30 C172 58 196 76 224 92 C272 118 304 150 304 208V472';
const INSET = 'translate(160 262) scale(0.93) translate(-160 -262)';
const MONO_D = 'M9.5 8C9.5 6 12 5.5 12 7.5V21A4 4 0 0 0 16 25H21.5';
export type PlaceholderName = 'cuff' | 'bangle' | 'bracelet' | 'solitaire-ring';
export const PLACEHOLDER_D: Record<PlaceholderName, string> = {
  cuff: 'M220 150C260 170 264 220 230 246C190 276 110 276 76 240C50 212 64 168 106 152M210 164C240 180 244 218 218 236C186 260 116 260 90 232C70 212 80 178 114 166M220 150C216 154 212 158 210 164M106 152C110 156 113 161 114 166M211.5 157a3.5 3.5 0 1 0 7 0a3.5 3.5 0 1 0 -7 0M106.5 159a3.5 3.5 0 1 0 7 0a3.5 3.5 0 1 0 -7 0M120 250C140 238 180 238 200 250',
  bangle: 'M64 200a96 54 0 1 0 192 0a96 54 0 1 0 -192 0M78 200a82 44 0 1 0 164 0a82 44 0 1 0 -164 0M69.4 200a1.6 1.6 0 1 0 3.2 0a1.6 1.6 0 1 0 -3.2 0M72.4 212.7a1.6 1.6 0 1 0 3.2 0a1.6 1.6 0 1 0 -3.2 0M81.3 224.5a1.6 1.6 0 1 0 3.2 0a1.6 1.6 0 1 0 -3.2 0M95.5 234.6a1.6 1.6 0 1 0 3.2 0a1.6 1.6 0 1 0 -3.2 0M113.9 242.4a1.6 1.6 0 1 0 3.2 0a1.6 1.6 0 1 0 -3.2 0M135.4 247.3a1.6 1.6 0 1 0 3.2 0a1.6 1.6 0 1 0 -3.2 0M158.4 249a1.6 1.6 0 1 0 3.2 0a1.6 1.6 0 1 0 -3.2 0M181.4 247.3a1.6 1.6 0 1 0 3.2 0a1.6 1.6 0 1 0 -3.2 0M202.9 242.4a1.6 1.6 0 1 0 3.2 0a1.6 1.6 0 1 0 -3.2 0M221.3 234.6a1.6 1.6 0 1 0 3.2 0a1.6 1.6 0 1 0 -3.2 0M235.5 224.5a1.6 1.6 0 1 0 3.2 0a1.6 1.6 0 1 0 -3.2 0M244.4 212.7a1.6 1.6 0 1 0 3.2 0a1.6 1.6 0 1 0 -3.2 0M247.4 200a1.6 1.6 0 1 0 3.2 0a1.6 1.6 0 1 0 -3.2 0',
  bracelet: 'M251.6 205a4.4 4.4 0 1 0 8.8 0a4.4 4.4 0 1 0 -8.8 0M253.8 205H258.2M246.7 219.7a5.4 5.4 0 1 0 10.8 0a5.4 5.4 0 1 0 -10.8 0M249.4 219.7H254.8M235.4 233.1a5.4 5.4 0 1 0 10.8 0a5.4 5.4 0 1 0 -10.8 0M238.1 233.1H243.5M217.5 244.3a5.4 5.4 0 1 0 10.8 0a5.4 5.4 0 1 0 -10.8 0M220.2 244.3H225.6M194.5 252.3a5.4 5.4 0 1 0 10.8 0a5.4 5.4 0 1 0 -10.8 0M197.2 252.3H202.6M114.7 252.3a5.4 5.4 0 1 0 10.8 0a5.4 5.4 0 1 0 -10.8 0M117.4 252.3H122.8M91.7 244.3a5.4 5.4 0 1 0 10.8 0a5.4 5.4 0 1 0 -10.8 0M94.4 244.3H99.8M73.8 233.1a5.4 5.4 0 1 0 10.8 0a5.4 5.4 0 1 0 -10.8 0M76.5 233.1H81.9M62.5 219.7a5.4 5.4 0 1 0 10.8 0a5.4 5.4 0 1 0 -10.8 0M65.2 219.7H70.6M58.6 205a5.4 5.4 0 1 0 10.8 0a5.4 5.4 0 1 0 -10.8 0M61.3 205H66.7M63.5 190.3a4.4 4.4 0 1 0 8.8 0a4.4 4.4 0 1 0 -8.8 0M65.7 190.3H70.1M74.8 176.9a4.4 4.4 0 1 0 8.8 0a4.4 4.4 0 1 0 -8.8 0M77 176.9H81.4M92.7 165.7a4.4 4.4 0 1 0 8.8 0a4.4 4.4 0 1 0 -8.8 0M94.9 165.7H99.3M115.7 157.7a4.4 4.4 0 1 0 8.8 0a4.4 4.4 0 1 0 -8.8 0M117.9 157.7H122.3M141.9 153.5a4.4 4.4 0 1 0 8.8 0a4.4 4.4 0 1 0 -8.8 0M144.1 153.5H148.5M169.3 153.5a4.4 4.4 0 1 0 8.8 0a4.4 4.4 0 1 0 -8.8 0M171.5 153.5H175.9M195.5 157.7a4.4 4.4 0 1 0 8.8 0a4.4 4.4 0 1 0 -8.8 0M197.7 157.7H202.1M218.5 165.7a4.4 4.4 0 1 0 8.8 0a4.4 4.4 0 1 0 -8.8 0M220.7 165.7H225.1M236.4 176.9a4.4 4.4 0 1 0 8.8 0a4.4 4.4 0 1 0 -8.8 0M238.6 176.9H243M247.7 190.3a4.4 4.4 0 1 0 8.8 0a4.4 4.4 0 1 0 -8.8 0M249.9 190.3H254.3M151 250h18v14h-18z',
  'solitaire-ring': 'M122 214A46 46 0 1 0 198 214M122 214C128 204 138 198 146 196M198 214C192 204 182 198 174 196M140 196L146 176M180 196L174 176M150 196L152 180M170 196L168 180M136 176H184L196 162L160 128L124 162ZM124 162H196M148 176L142 162L160 128L178 162L172 176',
};

/** react-pdf has no vector-effect: divide the desired pt stroke by the drawing scale. */
const sw = (pt: number, rendered: number, viewBox: number) => pt / (rendered / viewBox);

const Monogram = ({ size }: { size: number }) => (
  <Svg width={size} height={size} viewBox="0 0 32 32">
    <G transform="translate(-2 -0.6)">
      <Path d={MONO_D} fill="none" stroke={C.gold} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx={24} cy={25} r={2.5} fill="none" stroke={C.gold} strokeWidth={1.5} />
    </G>
  </Svg>
);

const Arrow = ({ w = 11 }: { w?: number }) => (
  <Svg width={w} height={w * 8 / 14} viewBox="0 0 14 8">
    <Path d="M0.5 4H13M9.5 0.8L13 4L9.5 7.2" fill="none" stroke={C.goldDeep} strokeWidth={1} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

/** Hallmark seal, simplified for 24 pt: rings + diamond (the arc lettering is illegible at this size). */
const Seal = ({ size = 24 }: { size?: number }) => {
  const k = sw(0.5, size, 120);
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120">
      <G fill="none" stroke={C.gold} strokeWidth={k}>
        <Circle cx={60} cy={60} r={58.5} /><Circle cx={60} cy={60} r={56} /><Circle cx={60} cy={60} r={41} />
        <Path d="M60 49 L67 56 L60 71 L53 56 Z M53 56 H67 M57 52.5 L60 56 L63 52.5 M60 56 V71" />
      </G>
    </Svg>
  );
};

const PlaceholderArt = ({ name, width, height }: { name: PlaceholderName; width: number; height: number }) => {
  const scale = Math.min(width / 320, height / 400);
  return (
    <Svg width={width} height={height} viewBox="0 0 320 400" preserveAspectRatio="xMidYMid meet">
      <Path d={PLACEHOLDER_D[name]} fill="none" stroke={C.gold} strokeWidth={0.9 / scale} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
};

/** Hero AR snapshot: brand arch (gold hairline + sill) around an ink-filled inset arch holding the cuff drawing. */
export const ArchSnapshot = ({ width = 284 }: { width?: number }) => {
  const height = width * 1.5;
  const k = (pt: number) => sw(pt, width, 320);
  return (
    <Svg width={width} height={height} viewBox="0 0 320 480">
      <Defs>
        <ClipPath id="archclip"><Path d={`${ARCH_D}Z`} transform={INSET} /></ClipPath>
      </Defs>
      <Path d={`${ARCH_D}Z`} fill={C.ink} transform={INSET} />
      <G clipPath="url(#archclip)">
        <Path d="M104 480C104 420 100 380 104 350C106 330 104 300 96 262C92 244 94 226 100 214 M218 480C218 420 222 380 218 350C216 330 220 300 228 262C232 244 230 226 224 214" fill="none" stroke={C.eveningLine} strokeWidth={k(0.75)} />
      </G>
      <Path d="M70 158V144H84 M250 158V144H236 M70 404V418H84 M250 404V418H236" fill="none" stroke={C.eveningMuted} strokeWidth={k(0.75)} />
      <G transform="translate(0 76)">
        <Path d={PLACEHOLDER_D.cuff} fill="none" stroke={C.gold} strokeWidth={k(1)} strokeLinecap="round" strokeLinejoin="round" />
      </G>
      <G fill="none" stroke={C.gold} strokeWidth={k(0.75)}>
        <Path d={`${ARCH_D}Z`} />
        <Circle cx={160} cy={22} r={3} />
        <Path d="M160 19V10" />
      </G>
    </Svg>
  );
};

/** QR placeholder: 56 pt hairline square, three outlined finder squares, "qr" in small caps. */
const QrPlaceholder = () => (
  <View style={s.qr}>
    <Svg width={56} height={56} viewBox="0 0 56 56" style={{ position: 'absolute', left: -0.5, top: -0.5 }}>
      <G fill="none" stroke={C.goldDeep} strokeWidth={0.5}>
        <Rect x={4} y={4} width={13} height={13} /><Rect x={8} y={8} width={5} height={5} />
        <Rect x={39} y={4} width={13} height={13} /><Rect x={43} y={8} width={5} height={5} />
        <Rect x={4} y={39} width={13} height={13} /><Rect x={8} y={43} width={5} height={5} />
      </G>
    </Svg>
    <Text style={[s.scMuted, { position: 'absolute', right: 7, bottom: 6, fontSize: 8 }]}>qr</Text>
  </View>
);

/* ------------------------------------------------------------ shared UI */
const Label = ({ children, muted = false, style }: { children: string; muted?: boolean; style?: Style }) => (
  <Text style={[muted ? s.scMuted : s.sc, style ?? {}]}>{children}</Text>
);

const Footer = ({ studioName }: { studioName: string }) => (
  <View style={s.foot} fixed>
    <View style={s.footL}>
      <Text style={s.atelier}>for {studioName}</Text>
      <Text style={s.conf}>Confidential — prepared for the atelier</Text>
    </View>
    <View style={s.footC}>
      <Seal size={24} />
      <Text style={[s.sc, { fontSize: 8.5, marginLeft: 7 }]}>Hallmarked &amp; certified</Text>
    </View>
    <View style={s.footR}>
      <Text style={s.pno} render={({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) => `${pageNumber} / ${totalPages}`} />
      <QrPlaceholder />
    </View>
  </View>
);

const MastHead = ({ kind, sub, no }: { kind: string; sub: string; no: string }) => (
  <View style={s.mast}>
    <View style={s.mastL}>
      <Monogram size={30} />
      <View style={{ marginLeft: 10 }}>
        <Text style={s.brand}>Lumen</Text>
        <Label muted>{sub}</Label>
      </View>
    </View>
    <View>
      <Label style={{ textAlign: 'right' }}>{`${kind} no.`}</Label>
      <Text style={s.docNo}>{no}</Text>
    </View>
  </View>
);

const RunHead = ({ kind, right }: { kind: string; right: string }) => (
  <View style={s.run}>
    <Monogram size={18} />
    <Label style={{ marginLeft: 8 }}>{kind}</Label>
    <Text style={s.runR}>{right}</Text>
  </View>
);

const SecHead = ({ num, label, title }: { num: string; label: string; title?: string }) => (
  <View style={title ? { marginTop: 20, marginBottom: 6 } : s.secH} minPresenceAhead={60}>
    <Label>{`${num} · ${label}`}</Label>
    {title ? <Text style={s.h2}>{title}</Text> : null}
  </View>
);

/* ------------------------------------------------------------ pages */
const BriefPage1 = ({ d }: { d: DesignBriefData }) => (
  <Page size="A4" style={s.page}>
    <MastHead kind="Design brief" sub="Wear it before it’s made" no={d.briefNo} />
    <View style={s.meta}>
      <View style={[s.metaCell, { flex: 1.1 }]}>
        <Label style={{ marginBottom: 5 }}>Client</Label>
        <Text style={s.vLg}>{d.clientName}</Text>
      </View>
      <View style={[s.metaCell, s.metaCellNext, { flex: 1 }]}>
        <Label style={{ marginBottom: 5 }}>Consultation</Label>
        <Text style={s.v}>{d.consultation.date}</Text>
        <Text style={s.v}>{d.consultation.timeIst}</Text>
        <Text style={s.sub}>{`${d.consultation.timeLocal} · client local time`}</Text>
      </View>
      <View style={[s.metaCell, s.metaCellNext, { flex: 0.8 }]}>
        <Label style={{ marginBottom: 5 }}>Visit</Label>
        <Text style={s.v}>{d.visit.type}</Text>
        <Text style={s.sub}>{d.visit.note}</Text>
      </View>
    </View>
    <View style={s.hero} wrap={false}>
      <View style={s.heroL}>
        <ArchSnapshot width={284} />
        <Label muted style={{ marginTop: 8, textAlign: 'center' }}>AR snapshot · Rough preview</Label>
        <Text style={[s.sub, { textAlign: 'center', marginTop: 2 }]}>{d.snapshotCaption}</Text>
      </View>
      <View style={s.heroR}>
        <View>
          <View style={s.tile45}><PlaceholderArt name="cuff" width={140} height={175} /></View>
          <Text style={{ marginTop: 6 }}>
            <Text style={s.scMuted}>Original piece</Text>
            <Text style={s.sub}> · as catalogued</Text>
          </Text>
        </View>
        <View>
          <Label muted style={{ marginBottom: 6 }}>The piece</Label>
          <Text style={s.lyr}>{d.piece.name}</Text>
          <Label style={{ marginTop: 8 }}>{`${d.piece.code} · ${d.piece.collection} collection`}</Label>
          <View style={s.ruleShort} />
          <Text style={s.story}>{d.piece.story}</Text>
        </View>
      </View>
    </View>
    <Footer studioName={d.studioName} />
  </Page>
);

const BriefPage2 = ({ d }: { d: DesignBriefData }) => {
  const spec: [string, string][] = [
    ['Code', d.piece.code], ['Collection', d.piece.collection], ['Metal', d.piece.metal], ['Karat', d.piece.karat],
    ['Est. weight', d.piece.estWeight ?? 'To be confirmed'], ['Length / size', d.piece.size], ['Stones', d.piece.stones],
  ];
  return (
    <Page size="A4" style={s.page}>
      <RunHead kind="Design brief" right={`${d.briefNo} · ${d.piece.name}`} />
      <SecHead num="i" label="The piece" />
      <View style={s.tableTop} wrap={false}>
        {spec.map(([k, v]) => (
          <View key={k} style={s.row}><Text style={s.cellLabel}>{k}</Text><Text style={s.cellValue}>{v}</Text></View>
        ))}
      </View>
      <SecHead num="ii" label="The changes" />
      <View wrap={false}>
        <View style={s.headRow}>
          <Text style={s.cellLabel}>Attribute</Text>
          <Text style={[s.scMuted, { width: 130 }]}>Original</Text>
          <View style={{ width: 26 }} />
          <Text style={[s.scMuted, { flex: 1 }]}>Requested</Text>
        </View>
        {d.changes.map((c) => (
          <View key={c.attribute} style={[s.row, { paddingTop: 6, paddingBottom: 5.5 }]}>
            <Text style={s.cellLabel}>{c.attribute}</Text>
            <Text style={s.cellOrig}>{c.original}</Text>
            <View style={s.cellArrow}><Arrow /></View>
            <Text style={s.cellValue}>{c.requested}</Text>
          </View>
        ))}
      </View>
      <SecHead num="iii" label="In the client’s words" />
      <Text style={s.notes}>{d.clientNotes}</Text>
      <View style={s.three} wrap={false}>
        {([['Occasion', d.occasion], ['Needed by', d.neededBy], ['Budget', d.budgetRange]] as [string, string][]).map(([k, v], i) => (
          <View key={k} style={[s.threeCell, i === 0 ? { paddingLeft: 0 } : { borderLeftWidth: RULE.hair, borderLeftColor: C.gold }]}>
            <Label muted>{k}</Label>
            <Text style={s.threeV}>{v}</Text>
          </View>
        ))}
      </View>
      <View style={s.price} wrap={false}>
        <View style={{ marginRight: 24 }}>
          <Label muted>Indicative range after changes</Label>
          <Text style={s.priceV}>{`Indicative ${d.indicativeRange}`}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.sub}>As catalogued: <Text style={s.rs}>{d.piece.catalogueRange}</Text></Text>
          <Text style={s.disc}>{d.disclaimer}</Text>
        </View>
      </View>
      <Footer studioName={d.studioName} />
    </Page>
  );
};

const BriefPage3 = ({ d }: { d: DesignBriefData }) => (
  <Page size="A4" style={s.page}>
    <RunHead kind="Design brief" right={`${d.briefNo} · Saved looks`} />
    <SecHead num="iv" label="Saved looks" title={`${d.looks.length === 4 ? 'Four' : d.looks.length} looks, saved during the session`} />
    <Text style={s.intro}>Each look keeps the configuration the client last wore. Ranges are indicative and follow the same gold rate as page 2.</Text>
    <View style={s.looks}>
      {d.looks.map((l, i) => (
        <View key={l.code} style={s.look} wrap={false}>
          <View style={s.lookImg}><PlaceholderArt name={l.placeholder} width={(CONTENT_W - 24) / 2 - 1} height={169} /></View>
          <View style={{ paddingTop: 9 }}>
            <Label muted>{`Look ${i + 1} · ${l.code}`}</Label>
            <Text style={s.lookH}>{l.name}</Text>
            <Text style={{ fontSize: 9 }}>{l.config}</Text>
            <View style={s.lookF}>
              <Text style={s.lookPrice}>{l.priceRange ? `Indicative ${l.priceRange}` : 'Price on consultation'}</Text>
              <Text style={s.sub}>{l.note}</Text>
            </View>
          </View>
        </View>
      ))}
    </View>
    <Footer studioName={d.studioName} />
  </Page>
);

const Timeline = ({ steps }: { steps: JourneyStep[] }) => {
  const colW = CONTENT_W / steps.length;
  return (
    <View style={s.tl} wrap={false}>
      {/* the gold hairline + nodes are one Svg laid behind the text columns */}
      <Svg width={CONTENT_W} height={12} viewBox={`0 0 ${CONTENT_W} 12`} style={{ position: 'absolute', left: 0, top: 13 }}>
        <Path d={`M${colW / 2} 6H${CONTENT_W - colW / 2}`} stroke={C.gold} strokeWidth={0.5} />
        {steps.map((st, i) => {
          const cx = colW * i + colW / 2;
          return st.final ? (
            <G key={i}>
              <Circle cx={cx} cy={6} r={5.5} fill={C.ivory} stroke={C.goldDeep} strokeWidth={0.75} />
              <Circle cx={cx} cy={6} r={3} fill="none" stroke={C.goldDeep} strokeWidth={0.5} />
            </G>
          ) : (
            <Circle key={i} cx={cx} cy={6} r={4} fill={C.ivory} stroke={C.goldDeep} strokeWidth={0.75} />
          );
        })}
      </Svg>
      {steps.map((st, i) => (
        <View key={i} style={s.tlNode}>
          <Text style={[s.scMuted, { fontSize: 8, height: 12 }]}>{i === 0 ? 'Start' : `Step ${i}`}</Text>
          <View style={{ height: 15 }} />
          <Text style={s.tlStep}>{st.step}</Text>
          {st.from && st.to ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2, minHeight: 23 }}>
              <Text style={{ fontSize: 8.5 }}>{st.from} </Text><Arrow /><Text style={{ fontSize: 8.5 }}> {st.to}</Text>
            </View>
          ) : (
            <Text style={s.tlDetail}>{(st.detail ?? []).join('\n')}</Text>
          )}
          <Text style={s.tlPrice}>{st.priceRange}</Text>
        </View>
      ))}
    </View>
  );
};

/** Diamond bullet: 4 pt square outlined in gold, rotated 45°. */
const Bullet = () => (
  <Svg width={10} height={10} viewBox="0 0 10 10" style={{ marginTop: 2, marginRight: 6 }}>
    <Path d="M5 1.6L8.4 5L5 8.4L1.6 5Z" fill="none" stroke={C.gold} strokeWidth={0.75} />
  </Svg>
);

export const SessionReportPage = ({ r, studioName, appended }: { r: SessionReportData; studioName: string; appended: boolean }) => {
  const strip: { k: string; v: string; sub?: string; flex: number }[] = [
    { k: 'Session', v: r.date, sub: `${r.timeIst} · ${r.timeLocal}`, flex: 1.55 },
    { k: 'Duration', v: `${r.durationMin} min`, flex: 0.9 },
    { k: 'Pieces worn', v: String(r.piecesWorn), flex: 1.05 },
    { k: 'Snapshots', v: String(r.snapshots), flex: 0.95 },
    { k: 'Interest score', v: `${r.interestScore}/100`, flex: 1.2 },
    { k: 'Outcome', v: r.outcome, flex: 0.95 },
  ];
  return (
    <Page size="A4" style={s.page}>
      <MastHead kind="Session report" sub={`${appended ? 'Appended to' : 'Companion to'} design brief ${r.briefNo}`} no={r.briefNo} />
      <View style={s.strip} wrap={false}>
        {strip.map((c, i) => (
          <View key={c.k} style={[s.stripCell, { flex: c.flex }, i === 0 ? { paddingLeft: 0, borderLeftWidth: 0 } : {}]}>
            <Text style={s.stripLabel}>{c.k}</Text>
            <Text style={[s.stripV, i === 0 ? { fontSize: 13 } : {}]}>{c.v}</Text>
            {c.sub ? <Text style={s.sub}>{c.sub}</Text> : null}
          </View>
        ))}
      </View>
      <SecHead num="i" label="Pieces worn" />
      <View wrap={false}>
        <View style={s.headRow}>
          {([['Piece', 128], ['AR time', 58], ['Customisations', 128], ['Final configuration', 0]] as [string, number][]).map(([h, w]) => (
            <Text key={h} style={[s.scMuted, { fontSize: 8.5 }, w ? { width: w } : { flex: 1 }]}>{h}</Text>
          ))}
        </View>
        {r.pieces.map((p) => (
          <View key={p.code} style={s.row}>
            <Text style={[s.ppCell, { width: 128 }]}><Text style={s.ppName}>{p.name}</Text> <Text style={s.code}>{p.code}</Text></Text>
            <Text style={[s.ppCell, { width: 58 }]}>{p.arTime}</Text>
            <Text style={[s.ppCell, { width: 128 }]}>{p.customisations}</Text>
            <Text style={[s.ppCell, { flex: 1, paddingRight: 0 }]}>{p.finalConfig}</Text>
          </View>
        ))}
      </View>
      <SecHead num="ii" label={`Configuration journey · ${r.journeyPiece}`} />
      <Timeline steps={r.journey} />
      <SecHead num="iii" label="Derived signals" />
      <View style={s.sig} wrap={false}>
        {r.signals.map((g) => (
          <View key={g.title} style={s.sigCell}>
            <Text style={s.sigH}>{g.title}</Text>
            <Text style={s.sigE}>{g.evidence}</Text>
          </View>
        ))}
      </View>
      <SecHead num="iv" label="Talking points for the consultation" />
      {r.talkingPoints.map((t) => (
        <View key={t} style={s.tp} wrap={false}><Bullet /><Text style={s.tpText}>{t}</Text></View>
      ))}
      <Footer studioName={studioName} />
    </Page>
  );
};

/* ------------------------------------------------------------ documents */
export const DesignBriefDocument = ({ d }: { d: DesignBriefData }) => (
  <Document title={`Design brief ${d.briefNo}`} author="Lumen" subject={`Prepared for ${d.studioName}`}>
    <BriefPage1 d={d} />
    <BriefPage2 d={d} />
    {d.looks.length > 0 ? <BriefPage3 d={d} /> : null}
    {d.session && d.session.outcome === 'Booked' ? <SessionReportPage r={d.session} studioName={d.studioName} appended /> : null}
  </Document>
);

export const SessionReportDocument = ({ r, studioName }: { r: SessionReportData; studioName: string }) => (
  <Document title={`Session report ${r.briefNo}`} author="Lumen">
    <SessionReportPage r={r} studioName={studioName} appended={false} />
  </Document>
);

/* ------------------------------------------------------------ sample data */
export const sampleSession: SessionReportData = {
  briefNo: 'LUM-0042', date: 'Sat 19 Sep 2026', timeIst: '9:12 PM IST', timeLocal: '11:42 AM EDT',
  durationMin: 18, piecesWorn: 4, snapshots: 6, interestScore: 86, outcome: 'Booked',
  pieces: [
    { name: 'The Quiet River', code: 'LX-104', arTime: '8 min 20 s', customisations: '9 (metal 5, size 2, weight 1, stone 1)', finalConfig: 'Rose gold 18K · Wrist 15.5 cm · Lighter · 1 diamond' },
    { name: 'Temple Dawn', code: 'LX-130', arTime: '3 min 10 s', customisations: '2 (karat 22K and 18K, back to 22K)', finalConfig: 'Yellow gold 22K · 2.4 (61 mm)' },
    { name: 'Courtyard Rain', code: 'LX-122', arTime: '2 min 30 s', customisations: '1 (size 17 to 16 cm)', finalConfig: 'White gold 18K · Wrist 16 cm' },
    { name: 'First Light', code: 'LX-301', arTime: '1 min 20 s', customisations: 'None', finalConfig: 'White gold 18K · IN 12 · US 6' },
  ],
  journeyPiece: 'The Quiet River',
  journey: [
    { step: 'As catalogued', detail: ['Yellow 18K', 'Wrist 6.5 in'], priceRange: '$2,150–2,480' },
    { step: 'Metal', from: 'Yellow 18K', to: 'Rose 18K', priceRange: '$2,150–2,480' },
    { step: 'Size', from: '6.5 in', to: '6.25 in', priceRange: '$2,090–2,420' },
    { step: 'Weight', detail: ['Lighter', 'est. 16–17 g'], priceRange: '$1,920–2,200' },
    { step: 'Stone', detail: ['+ one 2 mm', 'diamond'], priceRange: '$2,040–2,360', final: true },
  ],
  signals: [
    { title: 'Undecided: rose vs yellow', evidence: 'Switched metal 5 times; 62% of AR time on the cuff was in rose.' },
    { title: 'Weight-conscious', evidence: 'Chose “Lighter” 40 s after opening weight; opened the weight note twice.' },
    { title: 'Within budget, with room', evidence: 'Final range $2,040–2,360 sits under the stated $2,500–3,500 budget.' },
    { title: 'Fixed date, calm lead time', evidence: 'Needed by 12 Dec 2026: about 11 weeks after the consultation.' },
  ],
  talkingPoints: [
    'Show rose and yellow side by side on camera, in warm light, before discussing price.',
    'Confirm the wrist at 15.5 cm with a tape on the call; explain how the cuff opening flexes.',
    'Explain what “lighter” means in hand: a thinner gauge, est. 16–17 g, and how it wears over three days.',
    'Walk through the 2 mm diamond at the polished edge: setting, sparkle at arm’s length, effect on range.',
    'Note Temple Dawn was worn with the cuff; ask whether it is part of the same wedding look.',
  ],
};

export const sampleBrief: DesignBriefData = {
  briefNo: 'LUM-0042', clientName: '{{client_name}}', studioName: '{{studio_name}}',
  consultation: { date: 'Tue 22 Sep 2026', timeIst: '7:30 PM IST', timeLocal: '10:00 AM EDT' },
  visit: { type: 'Video call', note: 'Link sent with the confirmation' },
  piece: { code: 'LX-104', name: 'The Quiet River', collection: 'Fine', metal: 'Yellow gold', karat: '18K', estWeight: '18.2 g as shown; to be confirmed after changes', size: '62 × 14 mm · Wrist 6.5 in', stones: 'None', story: 'A single bend of gold, like water finding its way around a stone.', catalogueRange: '$2,150–2,480' },
  snapshotCaption: 'Captured during try-on · Rose gold 18K · Wrist 15.5 cm',
  changes: [
    { attribute: 'Metal', original: 'Yellow gold', requested: 'Rose gold' },
    { attribute: 'Karat', original: '18K', requested: '18K (no change)' },
    { attribute: 'Size', original: 'Wrist 16.5 cm', requested: 'Wrist 15.5 cm' },
    { attribute: 'Weight', original: 'As shown (18.2 g)', requested: 'Lighter (est. 16–17 g)' },
    { attribute: 'Stones', original: 'None', requested: 'One 2 mm round diamond at the polished edge' },
  ],
  clientNotes: 'I’d like it to sit a little lower on the wrist, closer to the hand, so it shows below a blouse sleeve. Rose felt warmer against my skin in the evening light, but I keep going back to yellow, so I’d love to see both side by side. I’ll wear it for all three days of my sister’s wedding, so lighter would be kinder.',
  occasion: 'Sister’s wedding', neededBy: '12 Dec 2026', budgetRange: '$2,500–3,500',
  indicativeRange: '$2,040–2,360',
  disclaimer: 'Indicative range based on today’s gold rate and the requested changes. The atelier confirms weight and price after the consultation.',
  looks: [
    { placeholder: 'cuff', name: 'The Quiet River', code: 'LX-104', config: 'Rose gold · 18K · Wrist 6.25 in', priceRange: '$2,040–2,360', note: 'Booked for consultation' },
    { placeholder: 'bangle', name: 'Temple Dawn', code: 'LX-130', config: 'Yellow gold · 22K · 2.4 (61 mm)', priceRange: '$2,380–2,720', note: 'Worn with the cuff, left wrist' },
    { placeholder: 'bracelet', name: 'Courtyard Rain', code: 'LX-122', config: 'White gold · 18K · Wrist 6.25 in', priceRange: '$3,060–3,630', note: 'Size changed from 6.75 in' },
    { placeholder: 'solitaire-ring', name: 'First Light', code: 'LX-301', config: 'White gold · 18K · IN 12 · US 6', priceRange: null, note: 'Tried once, not changed' },
  ],
  session: sampleSession,
};

export default function DesignBrief() {
  return <DesignBriefDocument d={sampleBrief} />;
}
