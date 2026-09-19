import type * as React from 'react';
type State = 'hover' | 'pressed' | 'focus';
type Opt = string | { value: string; label: string; swatch?: string; disabled?: boolean };
export type Stone = 'diamond' | 'ruby' | 'emerald' | 'sapphire' | 'pearl' | 'polki';
export type Metal = 'yellow' | 'white' | 'rose';
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> { variant?: 'primary' | 'secondary' | 'quiet'; size?: 'md' | 'sm'; block?: boolean; icon?: IconName; href?: string; state?: State }
export declare function Button(props: ButtonProps): React.ReactElement;
export interface TextLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> { disabled?: boolean; state?: State }
export declare function TextLink(props: TextLinkProps): React.ReactElement;
export interface FilterChipProps { selected?: boolean; defaultSelected?: boolean; onChange?: (selected: boolean) => void; count?: number; disabled?: boolean; state?: State; children?: React.ReactNode }
export declare function FilterChip(props: FilterChipProps): React.ReactElement;
export interface SegmentedControlProps { label?: string; 'aria-label'?: string; options: Opt[]; value?: string; defaultValue?: string; onChange?: (value: string) => void; disabled?: boolean }
export declare function SegmentedControl(props: SegmentedControlProps): React.ReactElement;
export interface StoneSwatchProps { stone: Stone; selected?: boolean; onSelect?: () => void; showLabel?: boolean; label?: string; disabled?: boolean; state?: State }
export declare function StoneSwatch(props: StoneSwatchProps): React.ReactElement;
export interface MetalSwatchProps { metal: Metal; selected?: boolean; onSelect?: () => void; showLabel?: boolean; label?: string; disabled?: boolean; state?: State }
export declare function MetalSwatch(props: MetalSwatchProps): React.ReactElement;
export interface SwatchGroupProps { kind?: 'stone' | 'metal'; options?: string[]; value?: string; defaultValue?: string; onChange?: (id: string) => void; label?: string; showLabels?: boolean; showValue?: boolean; unavailable?: string[] }
export declare function SwatchGroup(props: SwatchGroupProps): React.ReactElement;
export interface StepperProps { label?: string; value?: number; defaultValue?: number; min?: number; max?: number; step?: number; format?: (v: number) => React.ReactNode; onChange?: (v: number) => void; hint?: string; disabled?: boolean }
export declare function Stepper(props: StepperProps): React.ReactElement;
export interface TextFieldProps extends React.InputHTMLAttributes<HTMLInputElement> { label: string; hint?: string; error?: string; optional?: boolean; state?: State; inputClassName?: string }
export declare function TextField(props: TextFieldProps): React.ReactElement;
export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> { label: string; options: Opt[]; placeholder?: string; hint?: string; error?: string; state?: State }
export declare function Select(props: SelectProps): React.ReactElement;
export interface ConsentCheckboxProps { checked?: boolean; defaultChecked?: boolean; onChange?: (checked: boolean) => void; required?: boolean; error?: string; disabled?: boolean; children: React.ReactNode }
export declare function ConsentCheckbox(props: ConsentCheckboxProps): React.ReactElement;
export interface OverlayProps { open?: boolean; title: string; onClose?: (() => void) | null; inline?: boolean; children?: React.ReactNode }
export declare function BottomSheet(props: OverlayProps & { footer?: React.ReactNode }): React.ReactElement | null;
export declare function Modal(props: OverlayProps & { actions?: React.ReactNode }): React.ReactElement | null;
export interface ToastProps { tone?: 'neutral' | 'positive' | 'error'; action?: string; onAction?: () => void; onClose?: () => void; children: React.ReactNode }
export declare function Toast(props: ToastProps): React.ReactElement;
export interface PricePillProps { low?: string | number; high?: string | number; unit?: string; currency?: string; label?: string; children?: React.ReactNode }
export declare function PricePill(props: PricePillProps): React.ReactElement;
export interface SpecTableProps { rows?: { label: string; value: React.ReactNode }[]; caption?: string }
export declare function SpecTable(props: SpecTableProps): React.ReactElement;
export interface SlotPickerProps { slots: string[]; unavailable?: string[]; value?: string; defaultValue?: string; onChange?: (iso: string) => void; localTimeZone?: string; localLabel?: string; atelierTimeZone?: string }
export declare function SlotPicker(props: SlotPickerProps): React.ReactElement;
export declare function RoughPreviewBadge(props: { children?: React.ReactNode; title?: string }): React.ReactElement;
export declare function TrackingPill(props: { status?: 'finding' | 'good' | 'closer'; children?: React.ReactNode }): React.ReactElement;
export declare function ARTopBar(props: { pieceName?: string; detail?: string; onClose?: () => void; closeLabel?: string; rough?: boolean }): React.ReactElement;
export interface Piece { id: string; name: string; glyph?: 'jhumka' | 'chandbali' | 'polki' | 'drop' | 'paisley' | 'choker'; thumb?: string }
export declare function PieceCarousel(props: { pieces?: Piece[]; value?: string; defaultValue?: string; onChange?: (id: string) => void }): React.ReactElement;
export declare function SizeSlider(props: { label?: string; min?: number; max?: number; step?: number; value?: number; defaultValue?: number; format?: (v: number) => React.ReactNode; onChange?: (v: number) => void }): React.ReactElement;
export declare function ShutterButton(props: { onCapture?: () => void; label?: string; disabled?: boolean; state?: State }): React.ReactElement;
export interface ARControlRailProps { pieces?: Piece[]; piece?: string; defaultPiece?: string; onPieceChange?: (id: string) => void; metal?: Metal; defaultMetal?: Metal; onMetalChange?: (m: Metal) => void; stone?: Stone; defaultStone?: Stone; onStoneChange?: (s: Stone) => void; unavailableStones?: Stone[]; size?: number; defaultSize?: number; onSizeChange?: (v: number) => void; sizeMin?: number; sizeMax?: number; formatSize?: (v: number) => React.ReactNode; onCapture?: () => void; leading?: React.ReactNode; trailing?: React.ReactNode }
export declare function ARControlRail(props: ARControlRailProps): React.ReactElement;
export interface AccessGateProps { atelier?: string; onSubmit?: (code: string) => void; error?: string; busy?: boolean; onRequest?: () => void; requestHref?: string; title?: string; lead?: string; accent?: string | false; defaultCode?: string }
export declare function AccessGate(props: AccessGateProps): React.ReactElement;
export interface LumenLockupProps { layout?: 'horizontal' | 'stacked'; atelier?: string; prefix?: string | false; height?: number; nonScaling?: boolean; className?: string }
export declare function LumenLockup(props: LumenLockupProps): React.ReactElement;
export declare function LumenMonogram(props: { size?: number; title?: string; className?: string }): React.ReactElement;
export type IconName = 'minus' | 'plus' | 'arrow-right' | 'alert' | 'closer' | 'diamond' | 'ar-try-on' | 'camera' | 'flip-camera' | 'snapshot' | 'necklace' | 'choker' | 'earring-jhumka' | 'earring-stud' | 'bracelet' | 'bangle' | 'ring' | 'pendant' | 'maang-tikka' | 'set' | 'metal' | 'karat' | 'stone' | 'size' | 'length' | 'weight' | 'budget-rupee' | 'calendar' | 'clock' | 'studio-visit' | 'video-call' | 'compare' | 'undo' | 'save-look' | 'share' | 'download-pdf' | 'chat' | 'phone' | 'email' | 'location-pin' | 'check' | 'close' | 'info' | 'chevron-up' | 'chevron-down' | 'chevron-left' | 'chevron-right' | 'filter' | 'search' | '3d-rotate' | 'hallmark-shield' | 'lock' | 'eye-off';
export declare function Icon(props: { name: IconName; size?: number; strokeWidth?: number; title?: string; className?: string }): React.ReactElement;
declare global { interface Window { QuietHeritage: { Button: typeof Button; TextLink: typeof TextLink; FilterChip: typeof FilterChip; SegmentedControl: typeof SegmentedControl; StoneSwatch: typeof StoneSwatch; MetalSwatch: typeof MetalSwatch; SwatchGroup: typeof SwatchGroup; Stepper: typeof Stepper; TextField: typeof TextField; Select: typeof Select; ConsentCheckbox: typeof ConsentCheckbox; BottomSheet: typeof BottomSheet; Modal: typeof Modal; Toast: typeof Toast; PricePill: typeof PricePill; SpecTable: typeof SpecTable; SlotPicker: typeof SlotPicker; RoughPreviewBadge: typeof RoughPreviewBadge; TrackingPill: typeof TrackingPill; ARTopBar: typeof ARTopBar; PieceCarousel: typeof PieceCarousel; SizeSlider: typeof SizeSlider; ShutterButton: typeof ShutterButton; ARControlRail: typeof ARControlRail; AccessGate: typeof AccessGate; LumenLockup: typeof LumenLockup; LumenMonogram: typeof LumenMonogram; Icon: typeof Icon } } }
