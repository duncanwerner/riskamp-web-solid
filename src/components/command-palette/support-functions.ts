
import type { CellStyle, Color } from '@trebco/treb';
// import type { EmbeddedSpreadsheet } from 'riskamp-web';
// import type { Options } from '$lib/options';
import type { ToolbarMessage } from '@trebco/treb/treb-embed/src/toolbar-message';
// import type { Command as ToolbarCommandType } from './command-list';
// import type { EventDispatcher } from 'svelte';
import type { SelectionState } from '@trebco/treb/treb-embed/src/selection-state';
import type { EmbeddedSpreadsheet as EmbeddedSpreadsheetBase } from '@trebco/treb/treb-embed/src/embedded-spreadsheet';
import type { SpreadsheetType as Spreadsheet } from '~/lib/spreadsheet-type';
import type { BooleanKeys } from '~/lib/typescript-magic';

export interface ColorParameter {
  type: 'color';
  default?: Color;
  value?: Color;
  
  /** default color resolved for rendering */
  resolved?: string;
}

export interface TextParameter {
  type: 'text';
  default?: string;
  value?: string;
  candidates?: (string|{ label: string, value: string})[];
}

export interface MultiLineTextParameter {
  type: 'multi-line-text';
  default?: string;
  value?: string;
}

export interface NumberParameter {
  type: 'number';
  default?: number;
  style?: 'percent';
  value?: number;
  format?: string;
}

export type Parameter = (ColorParameter | TextParameter | NumberParameter | MultiLineTextParameter) & {
  name?: string;
  label?: string;
  choices?: (string | { label: string, value: string })[];
};

export interface Context {
  sheet: Spreadsheet,
  // sheet: EmbeddedSpreadsheet,
  // options: Options,
  parameters?: Parameter[];
  selection_state?: SelectionState;
  document_styles?: EmbeddedSpreadsheetBase['document_styles'];
  
  // FIXME: wrap up this type so we don't need all these details
  // dispatcher: EventDispatcher<{ command: { command: ToolbarCommandType, data?: any }}>;
  
}

export const ApplyStyle = (style: CellStyle) => {
  return (ctx: Context) => ctx.sheet.ApplyStyle(undefined, style);
};

export const StyleParameters = (keys: (keyof CellStyle)[]) => {
  return (ctx: Context) => {
    const style: CellStyle = {};
    for (const [index, key] of keys.entries()) {
      const parameter = ctx.parameters?.[index];
      if (parameter) {
        (style as any)[key] = parameter.value;
      }
    }
    ctx.sheet.ApplyStyle(undefined, style);
  };
};

export const SheetToolbarCommand = (message: ToolbarMessage) => {
  return (ctx: Context) => ctx.sheet.HandleToolbarMessage(message);
};

export const ToolbarCommand = (command: string) => {
  return (_ctx: Context) => {
    console.warn("ENOTIMPL toolbar command", command);
  };
};

/*
export const ToolbarCommand = (command: ToolbarCommandType) => {
  return (ctx: Context) => ctx.dispatcher('command', {command});
};
*/

export const ToggleStyle = (key: BooleanKeys<CellStyle>) => {
  return (ctx: Context) => {
    const style: CellStyle = {};
    const selected_style: CellStyle|undefined = ctx.selection_state?.style;
    if (selected_style) {
      const current = selected_style[key];
      if (typeof current === 'boolean') {
        style[key] = !current;
      }
      else {
        style[key] = true;
      }
    }
    else {
      style[key] = true;
    }
    ctx.sheet.ApplyStyle(undefined, style);
  };
};

