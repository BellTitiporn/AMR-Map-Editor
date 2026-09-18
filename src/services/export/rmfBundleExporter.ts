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
  if (!response.ok) throw new Error('Failed to read occupancy image for RMF Bundle export.');
  return response.blob();
}

/**
 * Generate the deployment RMF Bundle without downloading it.
 * Used by normal export and by Database Save.
 *
 * ZIP contents are intentionally fixed to:
 *   map.building.yaml
 *   map.png
 *   map.pgm
 *   map.yaml
 *   nav_graphs/<graphIndex>.yaml
 */
export async function generateRmfBundleBlob(
  metadata: MapMetadata,
  image: MapImageData,
  objects: NavigationObject[],
  paths: NavigationPath[],
  _zones: MapZone[],
  building: BuildingData,
  _robots: RobotConfig[],
): Promise<Blob> {
  const zip = new JSZip();
  const internalBase = 'map';

  if (!image.dataUrl) throw new Error('RMF Bundle requires a valid occupancy map image.');
  if (metadata.resolution <= 0 || metadata.width <= 0 || metadata.height <= 0) {
    throw new Error('RMF Bundle requires valid map dimensions and resolution.');
  }

  const graphIndices = collectNavGraphIndices(paths);
  if (!graphIndices.length) {
    throw new Error('RMF Bundle requires at least one enabled path with 2 or more points for nav_graphs.');
  }

  const buildingYaml = generateBuildingYaml(metadata, objects, paths, building, {
    buildingName: building.config.buildingName || metadata.name || internalBase,
    levelName: building.config.levelName || 'L1',
    referenceLevelName: building.config.referenceLevelName || building.config.levelName || 'L1',
    elevation: building.config.elevation,
    drawingFilename: `${internalBase}.png`,
    navmeshFilename: `${internalBase}_navmesh.nav`,
  });

  zip.file(`${internalBase}.building.yaml`, buildingYaml);
  zip.file(`${internalBase}.png`, await occupancyPngBlob(image));
  zip.file(`${internalBase}.pgm`, await generatePgmBytes(image, metadata));
  zip.file(`${internalBase}.yaml`, generateRosYaml(metadata, image, `${internalBase}.pgm`));

  for (const graphIndex of graphIndices) {
    zip.file(
      `nav_graphs/${graphIndex}.yaml`,
      generateNavGraphYaml(metadata, objects, paths, building, graphIndex),
    );
  }

  return zip.generateAsync({ type: 'blob' });
}

export async function exportRmfBundle(
  metadata: MapMetadata,
  image: MapImageData,
  objects: NavigationObject[],
  paths: NavigationPath[],
  zones: MapZone[],
  building: BuildingData,
  robots: RobotConfig[],
  fileName = 'map',
): Promise<void> {
  const base = exportBaseName(fileName, 'map');
  const blob = await generateRmfBundleBlob(metadata, image, objects, paths, zones, building, robots);
  downloadBlob(blob, `${base}-rmf-bundle.zip`);
}
