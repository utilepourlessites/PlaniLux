declare module 'lucide-react' {
  import * as React from 'react';
  export interface LucideProps extends React.SVGProps<SVGSVGElement> {
    size?: string | number;
    color?: string;
    strokeWidth?: string | number;
  }
  export type LucideIcon = React.ForwardRefExoticComponent<LucideProps>;

  export const Archive: LucideIcon;
  export const ArchiveRestore: LucideIcon;
  export const ArrowLeft: LucideIcon;
  export const ArrowLeftRight: LucideIcon;
  export const ArrowRight: LucideIcon;
  export const ArrowUpRight: LucideIcon;
  export const Bell: LucideIcon;
  export const BookOpen: LucideIcon;
  export const CalendarCheck2: LucideIcon;
  export const CalendarDays: LucideIcon;
  export const Check: LucideIcon;
  export const ChevronDown: LucideIcon;
  export const ChevronLeft: LucideIcon;
  export const ChevronRight: LucideIcon;
  export const CircleHelp: LucideIcon;
  export const Clock3: LucideIcon;
  export const Command: LucideIcon;
  export const Copy: LucideIcon;
  export const Download: LucideIcon;
  export const Ellipsis: LucideIcon;
  export const FileClock: LucideIcon;
  export const FileText: LucideIcon;
  export const FolderOpen: LucideIcon;
  export const Grid3X3: LucideIcon;
  export const Heart: LucideIcon;
  export const Home: LucideIcon;
  export const Image: LucideIcon;
  export const Layers: LucideIcon;
  export const LayoutGrid: LucideIcon;
  export const LayoutTemplate: LucideIcon;
  export const Lock: LucideIcon;
  export const LogOut: LucideIcon;
  export const Mail: LucideIcon;
  export const MapPin: LucideIcon;
  export const Menu: LucideIcon;
  export const Minus: LucideIcon;
  export const Monitor: LucideIcon;
  export const Moon: LucideIcon;
  export const NotebookPen: LucideIcon;
  export const Palette: LucideIcon;
  export const Plus: LucideIcon;
  export const Printer: LucideIcon;
  export const Radio: LucideIcon;
  export const Redo2: LucideIcon;
  export const RefreshCw: LucideIcon;
  export const RotateCcw: LucideIcon;
  export const Search: LucideIcon;
  export const Settings2: LucideIcon;
  export const Share2: LucideIcon;
  export const Shield: LucideIcon;
  export const SlidersHorizontal: LucideIcon;
  export const Smartphone: LucideIcon;
  export const Sparkles: LucideIcon;
  export const Star: LucideIcon;
  export const Sun: LucideIcon;
  export const SunMedium: LucideIcon;
  export const Trash2: LucideIcon;
  export const TriangleAlert: LucideIcon;
  export const Type: LucideIcon;
  export const Undo2: LucideIcon;
  export const Upload: LucideIcon;
  export const UserRound: LucideIcon;
  export const WifiOff: LucideIcon;
  export const X: LucideIcon;
  export const Zap: LucideIcon;
  export const ZoomIn: LucideIcon;
  export const ZoomOut: LucideIcon;

  const icons: Record<string, LucideIcon>;
  export default icons;
}

declare module 'jspdf' {
  export class jsPDF {
    constructor(options?: any);
    internal: {
      pageSize: {
        getWidth(): number;
        getHeight(): number;
      };
    };
    setFont(font: string, style?: string): void;
    setFontSize(size: number): void;
    setTextColor(r: number, g?: number, b?: number): void;
    setFillColor(r: number, g?: number, b?: number): void;
    setDrawColor(r: number, g?: number, b?: number): void;
    setLineWidth(width: number): void;
    rect(x: number, y: number, w: number, h: number, style?: string): void;
    roundedRect(x: number, y: number, w: number, h: number, rx: number, ry: number, style?: string): void;
    line(x1: number, y1: number, x2: number, y2: number): void;
    text(text: string, x: number, y: number, options?: any): void;
    addPage(): void;
    save(filename: string): void;
  }
}
