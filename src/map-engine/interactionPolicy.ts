import type { NavObjectType, Tool } from '../models';

export interface InteractionContext {
  tool: Tool;
  placementObject: NavObjectType | null;
}

/**
 * Existing editor entities should capture pointer events only during ordinary
 * selection. Placement/drawing tools need Stage-level clicks instead.
 */
export function entityLayersInteractive(context: InteractionContext): boolean {
  return context.tool === 'select' && context.placementObject === null;
}

export function isDrawingInteraction(context: InteractionContext): boolean {
  return context.placementObject !== null || context.tool !== 'select';
}
