import { describe,expect,it } from 'vitest';import { parseRosMapYaml } from '../services/import/yamlMapParser';
it('parses ROS YAML',()=>{const m=parseRosMapYaml('image: map.pgm\nresolution: 0.05\norigin: [-10, -8, 0]\nnegate: 0\noccupied_thresh: 0.65\nfree_thresh: 0.196\n');expect(m.image).toBe('map.pgm');expect(m.origin[1]).toBe(-8)});
