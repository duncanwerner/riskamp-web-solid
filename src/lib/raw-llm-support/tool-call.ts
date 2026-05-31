
import { ExecuteToolCall, StripNullProperties, type ExternalUI, type ToolCallContent, type ToolHandlerResponseType, type ToolResultContent } from 'treb-llm-support';
import type { EmbeddedSpreadsheet } from '@trebco/treb';
import { raw_tools } from './tool-schemas';
import * as v from 'valibot';

export interface RAWExternalUI extends ExternalUI {

  /** 
   * external function for running simulation. integrates with the UI.
   */
  RunSimulation: (options: {

    /** optionally override sheet trials */
    trials?: number,

    /** optionally override system setting */
    sampling?: 'lhs'|'standard',

    /** optionally override sheet seed */
    seed?: number,

    /** optionally override system setting */
    screen_updates?: boolean,

  }) => Promise<void>,

  /** 
   * external function for docs search
   */
  SearchDocumentation: (text: string, combine?: 'AND' | 'OR') => Promise<string>,

}

/**
 * unfortunately we're rewriting a lot of code from this method.
 * we need to find a way to consolidate these
 */
export async function RAWExecuteToolCall(sheet: EmbeddedSpreadsheet, ui: RAWExternalUI, content: ToolCallContent, partial = false): Promise<ToolHandlerResponseType> {

  // handle our tools

  for (const tool of raw_tools) {
    if (tool.name === content.name) {
    
      if (partial) {
        return {
          type: 'object', content: '',
        }
      }
      
      if (typeof content.input === 'string') {
        try {
          // special case for empty string, needs to echo back as empty object
          content.input = content.input === "" ? {} : JSON.parse(content.input);
        }
        catch (err) {
          console.error('error parsing JSON in ExecuteToolCall');
          console.info({err, input: content.input});
          throw err;
        }
      }

      const content_input = JSON.parse(JSON.stringify(content.input));
      StripNullProperties(content_input);

      const schema = tool?.schema;
      if (schema) {
        const validation = v.safeParse(schema, content_input);
        if (!validation.success) {
          return {
              type: 'error',
              content: {
                message: 'invalid tool input',
                detail: validation.issues.map(i => i.message),
              },
          };
        }
      }
      else {
        return {
          type: 'error',
          content: 'Missing schema validator',
        };
      }

      // ok input valid and tool is known: handle

      switch (tool.name) {
        case 'run_simulation':
          {
            const input = (content_input as v.InferInput<typeof tool.schema>);
            await ui.RunSimulation(input);
            return {
              type: 'object', content: '',
            };
          }
          break;

        case 'search_documentation':
          {
            const input = (content_input as v.InferInput<typeof tool.schema>);
            const result = await ui.SearchDocumentation(input.query, input.combine);
            return {
              type: 'object', content: result,
            };
          }
          break;

      }
    }
  }

  // pass through

  return ExecuteToolCall(sheet, ui, content, partial);

}


