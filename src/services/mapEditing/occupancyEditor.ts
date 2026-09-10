import type { MapImageData, MapMetadata, Point2D } from '../../models';
import { base64ToUint8, uint8ToBase64 } from '../../utils/files';

export type OccupancyPaintMode = 'obstacle' | 'free' | 'erase';
export type OccupancyPaintCommand =
  | { shape: 'point'; point: Point2D; size: number }
  | { shape: 'line'; from: Point2D; to: Point2D; size: number }
  | { shape: 'rectangle'; from: Point2D; to: Point2D }
  | { shape: 'polygon'; points: Point2D[] };

async function load(url: string) {
  const img = new Image();
  img.src = url;
  await img.decode();
  return img;
}

function traceCommand(ctx: CanvasRenderingContext2D, command: OccupancyPaintCommand) {
  ctx.beginPath();
  if (command.shape === 'point') {
    ctx.arc(command.point.x, command.point.y, command.size / 2, 0, Math.PI * 2);
  } else if (command.shape === 'line') {
    ctx.moveTo(command.from.x, command.from.y);
    ctx.lineTo(command.to.x, command.to.y);
  } else if (command.shape === 'rectangle') {
    const x = Math.min(command.from.x, command.to.x);
    const y = Math.min(command.from.y, command.to.y);
    ctx.rect(x, y, Math.abs(command.to.x - command.from.x), Math.abs(command.to.y - command.from.y));
  } else {
    if (!command.points.length) return;
    ctx.moveTo(command.points[0].x, command.points[0].y);
    command.points.slice(1).forEach(p => ctx.lineTo(p.x, p.y));
    ctx.closePath();
  }
}

async function buildResult(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  image: MapImageData | null,
  metadata: MapMetadata,
  originalDataUrl: string,
  command: OccupancyPaintCommand,
  mode: OccupancyPaintMode,
): Promise<MapImageData> {
  const dataUrl = canvas.toDataURL('image/png');
  const rgba = ctx.getImageData(0, 0, metadata.width, metadata.height).data;
  const negate = image?.negate ?? 0;
  const occupied = image?.occupiedThresh ?? .65;
  const free = image?.freeThresh ?? .196;

  // Start from the existing semantic occupancy grid whenever possible. This keeps
  // custom brush colors purely visual while obstacle/free meaning stays correct.
  const occ = image?.occupancyBase64
    ? base64ToUint8(image.occupancyBase64)
    : new Uint8Array(metadata.width * metadata.height);

  const maskCanvas = document.createElement('canvas');
  maskCanvas.width = metadata.width;
  maskCanvas.height = metadata.height;
  const maskCtx = maskCanvas.getContext('2d');
  if (!maskCtx) throw new Error('Canvas is unavailable.');
  maskCtx.fillStyle = '#fff';
  maskCtx.strokeStyle = '#fff';
  maskCtx.lineCap = 'round';
  maskCtx.lineJoin = 'round';
  if (command.shape === 'line') maskCtx.lineWidth = Math.max(1, command.size);
  traceCommand(maskCtx, command);
  if (command.shape === 'line') maskCtx.stroke(); else maskCtx.fill();
  const mask = maskCtx.getImageData(0, 0, metadata.width, metadata.height).data;

  for (let i = 0; i < occ.length; i++) {
    if (mask[i * 4 + 3] === 0) continue;
    if (mode === 'obstacle') { occ[i] = 1; continue; }
    if (mode === 'free') { occ[i] = 0; continue; }
    // Eraser restores original pixels, so recover their semantic occupancy from
    // the resulting raster only for the erased region.
    const j = i * 4;
    const gray = Math.round(rgba[j] * .299 + rgba[j + 1] * .587 + rgba[j + 2] * .114);
    const prob = negate ? gray / 255 : (255 - gray) / 255;
    occ[i] = prob > occupied ? 1 : prob < free ? 0 : 2;
  }
  return {
    ...(image ?? {
      mimeType: 'image/png',
      originalFilename: 'edited-map.png',
      sourceFormat: 'png',
      negate: 0 as const,
      occupiedThresh: .65,
      freeThresh: .196
    }),
    dataUrl,
    originalDataUrl,
    occupancyBase64: uint8ToBase64(occ),
    mimeType: 'image/png',
    sourceFormat: 'png'
  };
}

/** Apply an occupancy-map edit using pixel coordinates. */
export async function paintOccupancyShape(
  image: MapImageData | null,
  metadata: MapMetadata,
  command: OccupancyPaintCommand,
  mode: OccupancyPaintMode = 'obstacle',
  color = '#000000',
): Promise<MapImageData> {
  const canvas = document.createElement('canvas');
  canvas.width = metadata.width;
  canvas.height = metadata.height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Canvas is unavailable.');

  let originalDataUrl = image?.originalDataUrl;
  if (image?.dataUrl) {
    ctx.drawImage(await load(image.dataUrl), 0, 0, metadata.width, metadata.height);
  } else {
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, metadata.width, metadata.height);
    originalDataUrl = canvas.toDataURL('image/png');
  }
  originalDataUrl ??= canvas.toDataURL('image/png');

  const isLine = command.shape === 'line';
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (isLine) ctx.lineWidth = Math.max(1, command.size);
  traceCommand(ctx, command);

  if (mode === 'erase') {
    const original = await load(originalDataUrl);
    // Restore the original image only inside the requested shape.
    ctx.clip();
    ctx.drawImage(original, 0, 0, metadata.width, metadata.height);
  } else {
    ctx.fillStyle = mode === 'obstacle' ? color : '#fff';
    ctx.strokeStyle = ctx.fillStyle;
    if (isLine) ctx.stroke();
    else ctx.fill();
  }
  ctx.restore();

  return buildResult(ctx, canvas, image, metadata, originalDataUrl, command, mode);
}

/** Backward-compatible freehand helper. */
export async function paintOccupancy(
  image: MapImageData | null,
  metadata: MapMetadata,
  px: number,
  py: number,
  mode: OccupancyPaintMode,
  size = 10,
  color = '#000000',
): Promise<MapImageData> {
  return paintOccupancyShape(image, metadata, { shape: 'point', point: { x: px, y: py }, size }, mode, color);
}
