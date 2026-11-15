// Every plan of body and the function that draws it.

import type { Animal, Plan } from '../sim'
import { drawCetacean } from './cetacean'
import type { Ctx } from './common'
import { drawRay } from './ray'
import { drawSchool } from './school'
import { drawShark } from './shark'
import { drawSquid } from './squid'
import { drawTurtle } from './turtle'

export const DRAW: Record<Plan, (ctx: Ctx, a: Animal, tile: number) => void> = {
  shark: drawShark,
  cetacean: drawCetacean,
  turtle: drawTurtle,
  ray: drawRay,
  squid: drawSquid,
  school: drawSchool,
}
