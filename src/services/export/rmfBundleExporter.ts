import JSZip from 'jszip';
import type {
  BuildingData,
  BuildingLevelConfig,
  MapImageData,
  MapMetadata,
  MapZone,
  NavigationObject,
  NavigationPath,
  RobotConfig,
} from '../../models';
import { generateBuildingYaml } from './buildingExporter';
import { generateReferenceCoordinatesYaml } from './referenceCoordinatesExporter';
import { exportBaseName, downloadBlob } from '../../utils/files';

function navigationPayload(
  metadata: MapMetadata,
  objects: NavigationObject[],
  paths: NavigationPath[],
  zones: MapZone[],
  robots: RobotConfig[],
) {
  return {
    map: {
      id: metadata.id,
      name: metadata.name,
      width: metadata.width,
      height: metadata.height,
      resolution: metadata.resolution,
      origin: [
        metadata.originX,
        metadata.originY,
        metadata.originYaw,
      ],
    },
    objects: objects.map(object => ({
      ...object,
      headingDegrees: object.yaw * 180 / Math.PI,
    })),
    paths,
    zones,
    robots,
  };
}

async function occupancyPngBlob(
  image: MapImageData,
): Promise<Blob> {
  const response = await fetch(image.dataUrl);
  if (!response.ok) {
    throw new Error('Failed to read occupancy image for RMF Bundle export.');
  }
  return response.blob();
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
  referenceConfig?: BuildingLevelConfig,
): Promise<void> {
  const base = exportBaseName(fileName, 'map');
  const zip = new JSZip();

  const buildingYaml = generateBuildingYaml(
    metadata,
    objects,
    paths,
    building,
    {
      buildingName:
        building.config.buildingName ||
        metadata.name ||
        base,
      levelName:
        building.config.levelName ||
        'L1',
      referenceLevelName:
        building.config.referenceLevelName ||
        building.config.levelName ||
        'L1',
      elevation:
        building.config.elevation,
      drawingFilename: `${base}.png`,
      navmeshFilename: `${base}_navmesh.nav`,
    },
  );

  const navigationJson = JSON.stringify(
    navigationPayload(
      metadata,
      objects,
      paths,
      zones,
      robots,
    ),
    null,
    2,
  );

  const referenceYaml =
    generateReferenceCoordinatesYaml(
      referenceConfig ?? building.config,
    );

  zip.file(
    `${base}.building.yaml`,
    buildingYaml,
  );

  zip.file(
    `${base}.png`,
    await occupancyPngBlob(image),
  );

  zip.file(
    `${base}-navigation.json`,
    navigationJson,
  );

  zip.file(
    `${base}-reference-coordinates.yaml`,
    referenceYaml,
  );

  zip.file(
    'README.txt',
    [
      'AMR Map Editor - RMF Bundle',
      '',
      `${base}.building.yaml`,
      '  Open-RMF / Traffic Editor building map.',
      '',
      `${base}.png`,
      '  Occupancy/reference image used by the building map.',
      '',
      `${base}-navigation.json`,
      '  AMR navigation objects, paths, zones, robot config, yaw and headingDegrees.',
      '',
      `${base}-reference-coordinates.yaml`,
      '  RMF <-> Robot coordinate correspondence points.',
      '  Pairing is positional: rmf[0] <-> robot[0], rmf[1] <-> robot[1], etc.',
      '',
    ].join('\n'),
  );

  const blob = await zip.generateAsync({
    type: 'blob',
  });

  downloadBlob(
    blob,
    `${base}-rmf-bundle.zip`,
  );
}
