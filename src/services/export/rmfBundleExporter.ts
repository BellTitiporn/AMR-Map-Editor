import JSZip from 'jszip';
import type {
  BuildingData,
  MapImageData,
  MapMetadata,
  MapZone,
  NavigationObject,
  NavigationPath,
  RobotConfig,
} from '../../models';
import { generateBuildingYaml } from './buildingExporter';
import { collectNavGraphIndices, generateNavGraphYaml } from './navGraphExporter';
import { generatePgmBytes, generateRosYaml } from './rosExporter';
import { exportBaseName, downloadBlob } from '../../utils/files';

async function occupancyPngBlob(image: MapImageData): Promise<Blob> {
  const response = await fetch(image.dataUrl);
  if (!response.ok) {
    throw new Error('Failed to read occupancy image for RMF Bundle export.');
  }
  return response.blob();
}

/**
 * Export a deployment-focused RMF bundle.
 *
 * The ZIP intentionally contains ONLY:
 *   map.building.yaml
 *   map.png
 *   map.pgm
 *   map.yaml
 *   nav_graphs/<graphIndex>.yaml
 *
 * The names inside the ZIP are always based on "map" so downstream launch
 * files and deployment scripts can use stable filenames regardless of the
 * filename chosen for the ZIP itself.
 *
 * zones/robots remain in the function signature for backward compatibility
 * with the existing ExportDialog call, but are not written into this bundle.
 */
export async function exportRmfBundle(
  metadata: MapMetadata,
  image: MapImageData,
  objects: NavigationObject[],
  paths: NavigationPath[],
  _zones: MapZone[],
  building: BuildingData,
  _robots: RobotConfig[],
  fileName = 'map',
): Promise<void> {
  const base = exportBaseName(fileName, 'map');
  const zip = new JSZip();
  const internalBase = 'map';

  if (!image.dataUrl) {
    throw new Error('RMF Bundle export requires a valid occupancy map image.');
  }
  if (metadata.resolution <= 0 || metadata.width <= 0 || metadata.height <= 0) {
    throw new Error('RMF Bundle export requires valid map dimensions and resolution.');
  }

  const graphIndices = collectNavGraphIndices(paths);
  if (!graphIndices.length) {
    throw new Error('RMF Bundle export requires at least one enabled path with 2 or more points for nav_graphs.');
  }

  const buildingYaml = generateBuildingYaml(
    metadata,
    objects,
    paths,
    building,
    {
      buildingName:
        building.config.buildingName ||
        metadata.name ||
        internalBase,
      levelName:
        building.config.levelName ||
        'L1',
      referenceLevelName:
        building.config.referenceLevelName ||
        building.config.levelName ||
        'L1',
      elevation: building.config.elevation,
      drawingFilename: `${internalBase}.png`,
      navmeshFilename: `${internalBase}_navmesh.nav`,
    },
  );

  zip.file(`${internalBase}.building.yaml`, buildingYaml);
  zip.file(`${internalBase}.png`, await occupancyPngBlob(image));
  zip.file(`${internalBase}.pgm`, await generatePgmBytes(image, metadata));
  zip.file(
    `${internalBase}.yaml`,
    generateRosYaml(metadata, image, `${internalBase}.pgm`),
  );

  for (const graphIndex of graphIndices) {
    zip.file(
      `nav_graphs/${graphIndex}.yaml`,
      generateNavGraphYaml(metadata, objects, paths, building, graphIndex),
    );
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  downloadBlob(blob, `${base}-rmf-bundle.zip`);
}
