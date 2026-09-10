import type { MapImageData, MapMetadata } from '../../models';
import {
  getFileExtension,
  normalizeFilename,
  readFileAsDataURL,
  readFileAsText,
  uint8ToBase64,
} from '../../utils/files';
import { parsePGM, pgmToDataURL } from './pgmParser';
import { parseRosMapYaml } from './yamlMapParser';

export enum OccupancyState {
  Free = 0,
  Occupied = 1,
  Unknown = 2,
}

export interface ImportedMapPreview {
  metadata: MapMetadata;
  image: MapImageData;
  yamlFile?: string;
  imageFile: string;
}

function classify(
  gray: number,
  negate: 0 | 1,
  occupied: number,
  free: number,
): OccupancyState {
  const occupancyProbability =
    negate === 1 ? gray / 255 : (255 - gray) / 255;

  if (occupancyProbability > occupied) {
    return OccupancyState.Occupied;
  }

  if (occupancyProbability < free) {
    return OccupancyState.Free;
  }

  return OccupancyState.Unknown;
}

async function imageInfo(file: File) {
  const dataUrl = await readFileAsDataURL(file);

  const image = new Image();
  image.src = dataUrl;
  await image.decode();

  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas is unavailable.');
  }

  ctx.drawImage(image, 0, 0);

  return {
    dataUrl,
    width: image.naturalWidth,
    height: image.naturalHeight,
    pixels: ctx.getImageData(0, 0, canvas.width, canvas.height).data,
  };
}

export async function importMapFiles(
  files: File[],
  fallback?: {
    resolution: number;
    originX: number;
    originY: number;
    originYaw: number;
  },
): Promise<ImportedMapPreview> {
  if (!files.length) {
    throw new Error('No files selected.');
  }

  const lookup = new Map(
    files.map((file) => [normalizeFilename(file.name), file]),
  );

  const yaml = files.find((file) =>
    ['yaml', 'yml'].includes(getFileExtension(file.name)),
  );

  let imageFile: File | undefined;

  let resolution = fallback?.resolution ?? 0.05;
  let originX = fallback?.originX ?? 0;
  let originY = fallback?.originY ?? 0;
  let originYaw = fallback?.originYaw ?? 0;

  // IMPORTANT:
  // Keep this as a literal union, not a generic number.
  let negate: 0 | 1 = 0;

  let occupied = 0.65;
  let free = 0.196;

  if (yaml) {
    const meta = parseRosMapYaml(await readFileAsText(yaml));

    resolution = meta.resolution;
    [originX, originY, originYaw] = meta.origin;

    // Normalize explicitly so TypeScript always preserves 0 | 1.
    negate = meta.negate === 1 ? 1 : 0;

    occupied = meta.occupied_thresh;
    free = meta.free_thresh;

    imageFile = lookup.get(normalizeFilename(meta.image));

    if (!imageFile) {
      throw new Error(
        `Map image "${normalizeFilename(meta.image)}" was not selected.\n\n` +
          'Please select both the YAML file and its map image.',
      );
    }
  } else {
    imageFile = files.find((file) =>
      ['pgm', 'png', 'jpg', 'jpeg'].includes(getFileExtension(file.name)),
    );
  }

  if (!imageFile) {
    throw new Error(
      'Unsupported file selection. Select a YAML map and image, or a PNG/JPG/PGM image.',
    );
  }

  if (!Number.isFinite(resolution) || resolution <= 0) {
    throw new Error(
      'Invalid map resolution. Resolution must be greater than 0.',
    );
  }

  const ext = getFileExtension(imageFile.name);

  let width = 0;
  let height = 0;
  let dataUrl = '';
  let originalBase64: string | undefined;
  let occupancy: Uint8Array;

  if (ext === 'pgm') {
    const pgm = await parsePGM(imageFile);

    width = pgm.width;
    height = pgm.height;
    dataUrl = pgmToDataURL(pgm);

    originalBase64 = uint8ToBase64(
      new Uint8Array(await imageFile.arrayBuffer()),
    );

    occupancy = Uint8Array.from(pgm.pixels, (value) =>
      classify(value, negate, occupied, free),
    );
  } else {
    const info = await imageInfo(imageFile);

    width = info.width;
    height = info.height;
    dataUrl = info.dataUrl;

    occupancy = new Uint8Array(width * height);

    for (let i = 0; i < occupancy.length; i += 1) {
      const pixelIndex = i * 4;

      const gray = Math.round(
        info.pixels[pixelIndex] * 0.299 +
          info.pixels[pixelIndex + 1] * 0.587 +
          info.pixels[pixelIndex + 2] * 0.114,
      );

      occupancy[i] = classify(gray, negate, occupied, free);
    }
  }

  const name = imageFile.name.replace(/\.[^.]+$/, '');

  const metadata: MapMetadata = {
    id: crypto.randomUUID(),
    name,
    width,
    height,
    resolution,
    originX,
    originY,
    originYaw,
  };

  const image: MapImageData = {
    dataUrl,
    originalDataUrl: dataUrl,
    mimeType:
      ext === 'pgm'
        ? 'image/x-portable-graymap'
        : imageFile.type || `image/${ext}`,
    originalFilename: imageFile.name,
    sourceFormat: ext as MapImageData['sourceFormat'],
    originalBase64,
    occupancyBase64: uint8ToBase64(occupancy),

    // Now guaranteed to be exactly 0 | 1.
    negate,

    occupiedThresh: occupied,
    freeThresh: free,
  };

  return {
    metadata,
    image,
    yamlFile: yaml?.name,
    imageFile: imageFile.name,
  };
}
