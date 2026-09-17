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
import { generateReferenceCoordinatesYaml } from './referenceCoordinatesExporter';
import { generateNavGraphYaml } from './navGraphExporter';
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

  let referenceYaml: string | null = null;

  try {
    referenceYaml =
      generateReferenceCoordinatesYaml(
        metadata,
        building,
      );
  } catch {
    // RMF Bundle remains exportable when no valid Floor reference geometry exists.
    // Standalone Reference Coordinates export will still show the validation error.
    referenceYaml = null;
  }

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
    'nav_graphs/0.yaml',
    generateNavGraphYaml(metadata, objects, paths, building),
  );

  if (referenceYaml) {
    zip.file(
      `${base}-reference-coordinates.yaml`,
      referenceYaml,
    );
  }

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
      'nav_graphs/0.yaml',
      '  RMF navigation graph generated directly from the same editor topology.',
      '',
      ...(referenceYaml
        ? [
            `${base}-reference-coordinates.yaml`,
            '  Auto-generated from matching Floor polygon vertices.',
            '  robot[i] = GeoJSON/world coordinate.',
            '  rmf[i] = the same physical point converted for building.yaml.',
            '',
          ]
        : [
            'Reference coordinates were not included because no enabled Floor polygon with at least 3 vertices was available.',
            '',
          ]),
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
