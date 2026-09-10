import YAML from 'yaml';
import { z } from 'zod';
const RosMapYamlSchema=z.object({image:z.string().min(1),resolution:z.number().positive(),origin:z.tuple([z.number(),z.number(),z.number()]),negate:z.union([z.literal(0),z.literal(1)]).default(0),occupied_thresh:z.number().min(0).max(1).default(.65),free_thresh:z.number().min(0).max(1).default(.196),mode:z.string().optional()});
export type RosMapYaml=z.infer<typeof RosMapYamlSchema>;
export function parseRosMapYaml(text:string):RosMapYaml{let value:unknown;try{value=YAML.parse(text)}catch(e){throw new Error(`Invalid YAML: ${e instanceof Error?e.message:String(e)}`)}const parsed=RosMapYamlSchema.safeParse(value);if(!parsed.success)throw new Error('Invalid ROS map YAML: '+parsed.error.issues.map(i=>`${i.path.join('.')||'root'}: ${i.message}`).join('; '));if(parsed.data.free_thresh>=parsed.data.occupied_thresh)throw new Error('Invalid ROS thresholds: free_thresh must be lower than occupied_thresh.');return parsed.data}
