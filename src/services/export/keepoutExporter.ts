import YAML from 'yaml';
import type { MapMetadata, MapZone, Point2D } from '../../models';
import { worldToPixel } from '../../map-engine/coordinates';

/**
 * Create the Nav2/RMF companion keepout mask YAML.
 * White pixels are free (occupancy 0) and black pixels are keepout (occupancy 100)
 * with negate=0 and trinary mode.
 */
export function generateKeepoutYaml(metadata: MapMetadata, imageName = 'map_keepout.png') {
  return YAML.stringify({
    image: imageName,
    mode: 'trinary',
    resolution: metadata.resolution,
    origin: [metadata.originX, metadata.originY, metadata.originYaw],
    negate: 0,
    occupied_thresh: 0.65,
    free_thresh: 0.196,
  });
}

function drawPolygon(ctx: CanvasRenderingContext2D, polygon: Point2D[], metadata: MapMetadata) {
  if (polygon.length < 3) return;
  const first = worldToPixel(polygon[0].x, polygon[0].y, metadata);
  ctx.beginPath();
  ctx.moveTo(first.x, first.y);
  for (let i = 1; i < polygon.length; i += 1) {
    const point = worldToPixel(polygon[i].x, polygon[i].y, metadata);
    ctx.lineTo(point.x, point.y);
  }
  ctx.closePath();
  ctx.fill();
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (blob) resolve(blob);
      else reject(new Error('Failed to generate keepout PNG.'));
    }, 'image/png');
  });
}

/**
 * Generate a map-sized keepout mask.
 * Only enabled zones with type "keepout" are painted into this file.
 */
export async function generateKeepoutPngBlob(metadata: MapMetadata, zones: MapZone[]): Promise<Blob> {
  if (metadata.width <= 0 || metadata.height <= 0 || metadata.resolution <= 0) {
    throw new Error('Keepout export requires valid map dimensions and resolution.');
  }
  if (typeof document === 'undefined') {
    throw new Error('Keepout PNG generation requires a browser canvas.');
  }

  const canvas = document.createElement('canvas');
  canvas.width = metadata.width;
  canvas.height = metadata.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is unavailable for keepout export.');

  // ROS map_server with negate=0 interprets white as free and black as occupied.
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#000000';

  for (const zone of zones) {
    if (!zone.enabled || zone.type !== 'keepout') continue;
    drawPolygon(ctx, zone.polygon, metadata);
  }

  return canvasToBlob(canvas);
}
