import React from 'react';
import Svg, { Path, Rect, Circle, Line } from 'react-native-svg';

interface IconProps {
  color: string;
  size?: number;
}

// 1. Dashboard Icon (Grid layout icon)
export function DashboardIcon({ color, size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="3" width="8" height="11" rx="2" stroke={color} strokeWidth="2" />
      <Rect x="13" y="3" width="8" height="6" rx="2" stroke={color} strokeWidth="2" />
      <Rect x="3" y="16" width="8" height="5" rx="2" stroke={color} strokeWidth="2" />
      <Rect x="13" y="11" width="8" height="10" rx="2" stroke={color} strokeWidth="2" />
    </Svg>
  );
}

// 2. Warga Icon (2 People/Users outline icon)
export function WargaIcon({ color, size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Front User */}
      <Circle cx="9" cy="7" r="3.5" stroke={color} strokeWidth="2" />
      <Path d="M2.5 19C2.5 15.5 5.5 13.5 9 13.5C12.5 13.5 15.5 15.5 15.5 19" stroke={color} strokeWidth="2" strokeLinecap="round" />
      {/* Second User Behind */}
      <Path d="M14.5 4.2A3.5 3.5 0 0 1 17 9.5" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <Path d="M15.5 14C17.5 14.8 19.5 16.2 19.5 19" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}

// 3. Keuangan Icon (Banknote/Cash icon)
export function KeuanganIcon({ color, size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="2" y="5" width="20" height="14" rx="3" stroke={color} strokeWidth="2" />
      <Circle cx="12" cy="12" r="3" stroke={color} strokeWidth="2" />
      <Rect x="5" y="11" width="2" height="2" rx="0.5" fill={color} />
      <Rect x="17" y="11" width="2" height="2" rx="0.5" fill={color} />
    </Svg>
  );
}

// 4. Kegiatan Icon (Calendar with binder rings & 6 grid dots icon)
export function KegiatanIcon({ color, size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="4" width="18" height="17" rx="3" stroke={color} strokeWidth="2" />
      <Line x1="3" y1="9" x2="21" y2="9" stroke={color} strokeWidth="2" />
      <Line x1="8" y1="2" x2="8" y2="5" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <Line x1="16" y1="2" x2="16" y2="5" stroke={color} strokeWidth="2" strokeLinecap="round" />
      {/* Grid dots */}
      <Rect x="7" y="12" width="2" height="2" fill={color} />
      <Rect x="11" y="12" width="2" height="2" fill={color} />
      <Rect x="15" y="12" width="2" height="2" fill={color} />
      <Rect x="7" y="16" width="2" height="2" fill={color} />
      <Rect x="11" y="16" width="2" height="2" fill={color} />
      <Rect x="15" y="16" width="2" height="2" fill={color} />
    </Svg>
  );
}

// 5. Pengumuman Icon (Megaphone icon)
export function PengumumanIcon({ color, size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M3 11V14C3 14.55 3.45 15 4 15H6L11 19V5L6 9H4C3.45 9 3 9.45 3 10V11Z" stroke={color} strokeWidth="2" strokeLinejoin="round" />
      <Path d="M15 8C16.5 9.5 16.5 14.5 15 16" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <Path d="M18.5 5.5C21.5 8.5 21.5 15.5 18.5 18.5" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <Path d="M6 15L7.5 20H10L8.5 15" stroke={color} strokeWidth="2" strokeLinejoin="round" />
    </Svg>
  );
}

// 6. Iuran Icon (Card / Receipt icon)
export function IuranIcon({ color, size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="5" width="18" height="14" rx="3" stroke={color} strokeWidth="2" />
      <Line x1="3" y1="10" x2="21" y2="10" stroke={color} strokeWidth="2" />
      <Rect x="7" y="14" width="4" height="2" rx="0.5" fill={color} />
    </Svg>
  );
}

// 7. Surat Icon (Document / Letter icon)
export function SuratIcon({ color, size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2Z" stroke={color} strokeWidth="2" strokeLinejoin="round" />
      <Path d="M14 2V8H20" stroke={color} strokeWidth="2" strokeLinejoin="round" />
      <Line x1="8" y1="13" x2="16" y2="13" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <Line x1="8" y1="17" x2="14" y2="17" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}

// 8. Search Icon (Magnifying glass outline)
export function SearchIcon({ color = '#888', size = 18 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="11" cy="11" r="7" stroke={color} strokeWidth="2" />
      <Line x1="16.5" y1="16.5" x2="21" y2="21" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}

// 9. Lock Icon (Admin / Key icon)
export function LockIcon({ color = '#fff', size = 16 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="5" y="11" width="14" height="10" rx="2" stroke={color} strokeWidth="2" />
      <Path d="M8 11V7C8 4.79 9.79 3 12 3C14.21 3 16 4.79 16 7V11" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <Circle cx="12" cy="16" r="1.5" fill={color} />
    </Svg>
  );
}

// 10. Menu Icon (3 Lines Hamburger Icon)
export function MenuIcon({ color = '#00216e', size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Line x1="3" y1="6" x2="21" y2="6" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      <Line x1="3" y1="12" x2="21" y2="12" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      <Line x1="3" y1="18" x2="21" y2="18" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
    </Svg>
  );
}

// 11. Settings Icon (Gear icon)
export function SettingsIcon({ color = '#00216e', size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <Circle cx="12" cy="12" r="3" />
      <Path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </Svg>
  );
}

// 12. Terms / Scroll Icon
export function TermsIcon({ color = '#00216e', size = 20 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M19 3H5C3.89 3 3 3.89 3 5V19C3 20.11 3.89 21 5 21H19C20.11 21 21 20.11 21 19V5C21 3.89 20.11 3 19 3Z" stroke={color} strokeWidth="2" strokeLinejoin="round" />
      <Line x1="7" y1="7" x2="17" y2="7" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <Line x1="7" y1="11" x2="17" y2="11" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <Line x1="7" y1="15" x2="13" y2="15" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}

export function renderTabIcon(routeName: string, color: string) {
  switch (routeName) {
    case 'Dashboard':
      return <DashboardIcon color={color} />;
    case 'Warga':
      return <WargaIcon color={color} />;
    case 'Keuangan':
      return <KeuanganIcon color={color} />;
    case 'Kegiatan':
      return <KegiatanIcon color={color} />;
    case 'Pengumuman':
      return <PengumumanIcon color={color} />;
    case 'Iuran':
      return <IuranIcon color={color} />;
    case 'Surat':
      return <SuratIcon color={color} />;
    case 'Menu':
      return <MenuIcon color={color} />;
    default:
      return <DashboardIcon color={color} />;
  }
}
