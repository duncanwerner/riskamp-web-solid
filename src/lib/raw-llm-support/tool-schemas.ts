
import { type ToolDefinition, type ToolDefinitionOptions, defineTool } from 'treb-llm-support';
import * as v from 'valibot';
import { toJsonSchema } from '@valibot/to-json-schema';

const RunSimulationSchema = v.object({
  trials: v.optional(
    v.pipe(
      v.number(),
      v.description(
        'Number of simulation trials to run. If omitted, uses the trial count configured in the spreadsheet, which is preferred.',
      ),
    ),
  ),
  sampling_method: v.optional(
    v.pipe(
      v.picklist(['standard', 'lhs']),
      v.description(
        'Sampling method: "standard" for standard Monte Carlo, "lhs" for Latin Hypercube Sampling. If omitted, uses the system-level setting, which is preferred.',
      ),
    ),
  ),
  seed: v.optional(
    v.pipe(
      v.number(),
      v.description(
        'PRNG seed value for reproducible results. If omitted, uses the seed configured in the spreadsheet, which is preferred.',
      ),
    ),
  ),
  screen_updates: v.optional(
    v.pipe(
      v.boolean(),
      v.description(
        'Show screen updates during simulation. Updates let the user see progress but slow down the simulation. Defaults to false.',
      ),
    ),
  ),
});

const SearchDocumentationSchema = v.object({
  query: v.pipe(
    v.string(),
    v.description('Search query string. Matched against documentation using fuzzy matching.'),
  ),
  combine: v.optional(
    v.pipe(
      v.picklist(['AND', 'OR']),
      v.description('How to combine search terms. Defaults to "AND".'),
    ),
  ),
});

export const raw_tools = [
  defineTool(
    'run_simulation',
    'Run a Monte Carlo simulation. This is a long-running async operation — do not issue additional tool calls in parallel, as they will not execute until the simulation completes. All parameters are optional; the spreadsheet and system defaults are preferred unless you have a specific reason to override them.',
    RunSimulationSchema,
  ),
  defineTool(
    'search_documentation',
    'Search documentation for information on RiskAMP spreadsheet functions and concepts. Uses fuzzy matching to find results even with partial or approximate queries.',
    SearchDocumentationSchema,
  ),
] as const satisfies ToolDefinition[];


export type raw_ToolInputMap = {
  run_simulation: v.InferInput<typeof RunSimulationSchema>;
  search_documentation: v.InferInput<typeof SearchDocumentationSchema>;
};



