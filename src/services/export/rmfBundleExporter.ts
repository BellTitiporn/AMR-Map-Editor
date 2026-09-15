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
import { downloadBlob, exportBaseName } from '../../utils/files';
import { generateBuildingYaml } from './buildingExporter';
import { navigationPayload } from './navigationExporters';

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const response = await fetch(dataUrl);
  if (!response.ok) {
    throw new Error('Unable to read occupancy image for RMF bundle export.');
  }
  return response.blob();
}

export interface RmfBundlePayloadOptions {
  baseName?: string;
}

/**
 * Export a portable RMF handoff bundle.
 *
 * Traffic Editor consumes:
 *   - <base>.building.yaml
 *   - <base>.png
 *
 * Robot/Fleet integrations consume:
 *   - <base>-navigation.json
 *
 * The building file keeps `amr_yaw` as a custom vertex parameter, while the
 * companion navigation JSON stores x/y/yaw explicitly in the ROS `map` frame.
 */
export async function exportRmfBundle(
  metadata: MapMetadata,
  image: MapImageData,
  objects: NavigationObject[],
  paths: NavigationPath[],
  zones: MapZone[],
  building: BuildingData,
  robotConfigs: RobotConfig[] = [],
  fileName = 'map',
) {
  if (!image?.dataUrl) {
    throw new Error('RMF Bundle export requires an occupancy map image.');
  }

  if (!(metadata.resolution > 0) || metadata.width <= 0 || metadata.height <= 0) {
    throw new Error('RMF Bundle export requires valid map resolution and dimensions.');
  }

  const base = exportBaseName(fileName, 'map');
  const zip = new JSZip();

  const buildingYaml = generateBuildingYaml(
    metadata,
    objects,
    paths,
    building,
    {
      buildingName: building.config.buildingName || metadata.name || base,
      levelName: building.config.levelName || 'L1',
      referenceLevelName:
        building.config.referenceLevelName || building.config.levelName || 'L1',
      elevation: building.config.elevation,
      drawingFilename: `${base}.png`,
    },
  );

  const nav = navigationPayload(
    metadata,
    objects,
    paths,
    zones,
    robotConfigs,
  );

  zip.file(`${base}.building.yaml`, buildingYaml);
  zip.file(`${base}.png`, await dataUrlToBlob(image.dataUrl));
  zip.file(
    `${base}-navigation.json`,
    JSON.stringify(nav, null, 2),
  );

  zip.file(
    'README.txt',
    [
      'AMR Map Editor — RMF Export Bundle',
      '',
      'Files:',
      `- ${base}.building.yaml : Open-RMF / Traffic Editor building map`,
      `- ${base}.png : background/reference occupancy image`,
      `- ${base}-navigation.json : AMR navigation data in ROS map coordinates`,
      '',
      'Important:',
      '- Traffic Editor does not render the custom amr_yaw property as a heading arrow.',
      '- Heading/orientation is preserved in the navigation JSON as waypoint.yaw (radians).',
      '- building.yaml uses reference_image coordinates so geometry aligns with the PNG.',
      '- Keep building.yaml and PNG in the same folder when opening in Traffic Editor.',
      '',
      'Waypoint yaw convention:',
      '0 rad = +X / East',
      '+pi/2 = +Y / North',
      'pi = West',
      '-pi/2 = South',
      '',
    ].join('\n'),
  );

  const blob = await zip.generateAsync({ type: 'blob' });
  downloadBlob(blob, `${base}-rmf-bundle.zip`);
}
