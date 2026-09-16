import YAML from 'yaml';
import type {
  BuildingLevelConfig,
  ReferenceCoordinatesConfig,
} from '../../models';
import {
  downloadTextFile,
  exportBaseName,
} from '../../utils/files';

export function getReferenceCoordinates(
  config: BuildingLevelConfig,
): ReferenceCoordinatesConfig {
  const reference = config.referenceCoordinates;

  if (!reference) {
    throw new Error(
      'Reference coordinates are not configured. Add RMF ↔ Robot reference points before export.',
    );
  }

  const mapName = reference.mapName.trim();

  if (!mapName) {
    throw new Error(
      'Reference coordinate map name is empty. Enter a map name before export.',
    );
  }

  if (reference.points.length < 2) {
    throw new Error(
      'Reference coordinates require at least 2 RMF ↔ Robot point pairs before export.',
    );
  }

  return {
    mapName,
    points: reference.points,
  };
}

export function generateReferenceCoordinatesYaml(
  config: BuildingLevelConfig,
): string {
  const reference = getReferenceCoordinates(config);

  return YAML.stringify(
    {
      reference_coordinates: {
        [reference.mapName]: {
          rmf: reference.points.map(point => [
            point.rmf.x,
            point.rmf.y,
          ]),
          robot: reference.points.map(point => [
            point.robot.x,
            point.robot.y,
          ]),
        },
      },
    },
    {
      lineWidth: 0,
    },
  );
}

export function downloadReferenceCoordinatesYaml(
  config: BuildingLevelConfig,
  fileName = 'map',
): void {
  const base = exportBaseName(fileName, 'map');

  downloadTextFile(
    generateReferenceCoordinatesYaml(config),
    `${base}-reference-coordinates.yaml`,
    'application/yaml;charset=utf-8',
  );
}
