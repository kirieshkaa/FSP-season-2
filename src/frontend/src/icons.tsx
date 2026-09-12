import type { ReactElement, SVGProps } from 'react'
import type { NavId } from './data.js'

type IconProps = SVGProps<SVGSVGElement>

function S(props: IconProps): ReactElement {
  return <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" {...props} />
}

export const IconEdit = (p: IconProps): ReactElement => (
  <S {...p}>
    <path d="M11.5 2.5 13.5 4.5 5 13l-2.5.5L3 11l8.5-8.5Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    <path d="M10 4 12 6" stroke="currentColor" strokeWidth="1.3" />
  </S>
)

export const IconTrash = (p: IconProps): ReactElement => (
  <S {...p}>
    <path d="M3 4h10M6.5 4V2.8h3V4M4.5 4l.5 9h6l.5-9" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    <path d="M6.5 7v4M9.5 7v4" stroke="currentColor" strokeWidth="1.3" />
  </S>
)

export const IconSearch = (p: IconProps): ReactElement => (
  <S {...p}>
    <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.3" />
    <path d="m10.5 10.5 3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
  </S>
)

export const IconFilter = (p: IconProps): ReactElement => (
  <S {...p}>
    <path d="M2.5 3.5h11L9 8v4l-2 1.5V8L2.5 3.5Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
  </S>
)

export const IconPlus = (p: IconProps): ReactElement => (
  <S {...p}>
    <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </S>
)

export const IconBox = (p: IconProps): ReactElement => (
  <S {...p}>
    <path d="M2.5 5 8 2l5.5 3-5.5 3L2.5 5Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    <path d="M2.5 5v5.5L8 14l5.5-3.5V5M8 8v6" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
  </S>
)

export const IconLayers = (p: IconProps): ReactElement => (
  <S {...p}>
    <path d="m3 10 5 3 5-3M3 6l5 3 5-3L8 3 3 6Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
  </S>
)

export const IconInbox = (p: IconProps): ReactElement => (
  <S {...p}>
    <path d="M2.5 5.5h3l1 2h3l1-2h3" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    <path d="M4 3h8l1.5 2.5.5 6.5H2l.5-6.5L4 3Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
  </S>
)

export const IconTruck = (p: IconProps): ReactElement => (
  <S {...p}>
    <path d="M1.5 4h8v7h-8zM9.5 6.5h3L15 9v2h-1.5" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    <circle cx="5" cy="11.5" r="1.5" stroke="currentColor" strokeWidth="1.3" />
    <circle cx="12" cy="11.5" r="1.5" stroke="currentColor" strokeWidth="1.3" />
  </S>
)

export const IconChart = (p: IconProps): ReactElement => (
  <S {...p}>
    <path d="M2.5 13.5v-11M2.5 13.5h11" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    <path d="m5 10 2.5-3L10 9l3.5-4.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
  </S>
)

export const IconLogout = (p: IconProps): ReactElement => (
  <S {...p}>
    <path d="M6 2.5H3.5V13.5H6M8 4.5 11.5 8 8 11.5M4 8h7.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
  </S>
)

export const IconMenu = (p: IconProps): ReactElement => (
  <S {...p}>
    <path d="M2.5 4h11M2.5 8h11M2.5 12h11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </S>
)

export const IconCheck = (p: IconProps): ReactElement => (
  <S {...p}>
    <path d="m3 8.5 3.5 3.5L13 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </S>
)

export const IconX = (p: IconProps): ReactElement => (
  <S {...p}>
    <path d="m4 4 8 8M12 4 4 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </S>
)

export const IconBan = (p: IconProps): ReactElement => (
  <S {...p}>
    <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.3" />
    <path d="m4.5 4.5 7 7" stroke="currentColor" strokeWidth="1.3" />
  </S>
)

export const IconMore = (p: IconProps): ReactElement => (
  <S {...p}>
    <circle cx="8" cy="3.5" r="1.2" fill="currentColor" />
    <circle cx="8" cy="8" r="1.2" fill="currentColor" />
    <circle cx="8" cy="12.5" r="1.2" fill="currentColor" />
  </S>
)

export const IconArrowUp = (p: IconProps): ReactElement => (
  <S {...p}>
    <path d="M8 12V4M4.5 7.5 8 4l3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </S>
)

export const IconArrowDown = (p: IconProps): ReactElement => (
  <S {...p}>
    <path d="M8 4v8M4.5 8.5 8 12l3.5-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </S>
)

export const IconArrowUpDown = (p: IconProps): ReactElement => (
  <S {...p}>
    <path d="M7 3.5v9M4.5 6 7 3.5 9.5 6M9 6.5v9M11.5 4 9 6.5 6.5 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
  </S>
)

export const IconUsers = (p: IconProps): ReactElement => (
  <S {...p}>
    <circle cx="5.5" cy="6" r="2.5" stroke="currentColor" strokeWidth="1.3" />
    <path d="M1.5 13c.3-2.2 2-3.5 4-3.5s3.7 1.3 4 3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    <circle cx="11.5" cy="6.5" r="2" stroke="currentColor" strokeWidth="1.3" />
    <path d="M11 9.6c1.6.2 2.8 1.3 3.2 3.4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
  </S>
)

export const IconShield = (p: IconProps): ReactElement => (
  <S {...p}>
    <path d="M8 1.8 13.2 4v3.3c0 3.4-2 5.9-5.2 6.9-3.2-1-5.2-3.5-5.2-6.9V4L8 1.8Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    <path d="m5.8 7.8 1.6 1.6 2.8-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
  </S>
)

export type IconComp = (props: IconProps) => ReactElement

export const NAV_ICON: Record<NavId, IconComp> = {
  boxes: IconBox,
  products: IconLayers,
  receiving: IconInbox,
  shipping: IconTruck,
  reports: IconChart,
  admin: IconShield
}

export function NavIcon({ id }: { id: NavId }): ReactElement {
  const C = NAV_ICON[id] ?? IconBox
  return <C />
}