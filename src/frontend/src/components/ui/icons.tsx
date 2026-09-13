import type { ReactElement } from 'react'
import type { ComponentType, SVGAttributes } from 'react'
import {
  LuPencil,
  LuTrash2,
  LuSearch,
  LuFilter,
  LuPlus,
  LuBox,
  LuLayers,
  LuInbox,
  LuTruck,
  LuChartLine,
  LuLogOut,
  LuMenu,
  LuCheck,
  LuX,
  LuBan,
  LuEllipsisVertical,
  LuArrowUp,
  LuArrowDown,
  LuArrowUpDown,
  LuUsers,
  LuShield,
  LuUser,
  LuLock,
  LuMail,
  LuEye,
} from 'react-icons/lu'
import type { NavId } from '../../data/mock.js'

type IconProps = SVGAttributes<SVGSVGElement>
export type IconComp = ComponentType<IconProps>

/** Wrap a react-icons component so callers can pass the same props as before. */
function wrap(Ic: ComponentType<{ size?: number | string } & IconProps>): IconComp {
  const Wrapped = (props: IconProps): ReactElement => <Ic size="1em" {...props} />
  return Wrapped
}

export const IconEdit = wrap(LuPencil)
export const IconTrash = wrap(LuTrash2)
export const IconEye = wrap(LuEye)
export const IconSearch = wrap(LuSearch)
export const IconFilter = wrap(LuFilter)
export const IconPlus = wrap(LuPlus)
export const IconBox = wrap(LuBox)
export const IconLayers = wrap(LuLayers)
export const IconInbox = wrap(LuInbox)
export const IconTruck = wrap(LuTruck)
export const IconChart = wrap(LuChartLine)
export const IconLogout = wrap(LuLogOut)
export const IconMenu = wrap(LuMenu)
export const IconCheck = wrap(LuCheck)
export const IconX = wrap(LuX)
export const IconBan = wrap(LuBan)
export const IconMore = wrap(LuEllipsisVertical)
export const IconArrowUp = wrap(LuArrowUp)
export const IconArrowDown = wrap(LuArrowDown)
export const IconArrowUpDown = wrap(LuArrowUpDown)
export const IconUsers = wrap(LuUsers)
export const IconShield = wrap(LuShield)
export const IconUser = wrap(LuUser)
export const IconLock = wrap(LuLock)
export const IconMail = wrap(LuMail)

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
