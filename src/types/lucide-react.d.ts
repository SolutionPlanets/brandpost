declare module 'lucide-react' {
  import { FC, SVGProps } from 'react';
  export interface IconProps extends SVGProps<SVGSVGElement> {
    size?: string | number;
    color?: string;
    strokeWidth?: string | number;
  }
  export type Icon = FC<IconProps>;
  export const LayoutDashboard: Icon;
  export const Palette: Icon;
  export const FileText: Icon;
  export const Calendar: Icon;
  export const Settings: Icon;
  export const LogOut: Icon;
  export const ChevronLeft: Icon;
  export const ChevronRight: Icon;
  export const Bell: Icon;
  export const Search: Icon;
  export const User: Icon;
  export const Upload: Icon;
  export const Plus: Icon;
  export const Check: Icon;
  export const Building2: Icon;
  export const MessageSquare: Icon;
  export const Share2: Icon;
  export const Facebook: Icon;
  export const FacebookIcon: Icon;
  export const Instagram: Icon;
  export const InstagramIcon: Icon;
  export const ArrowRight: Icon;
  export const ArrowLeft: Icon;
  export const TrendingUp: Icon;
  export const Users: Icon;
  export const MoreHorizontal: Icon;
  export const Image: Icon;
  export const Sparkles: Icon;
  export const BarChart3: Icon;
  export const Clock: Icon;
  export const Layout: Icon;
  export const Camera: Icon;
}
