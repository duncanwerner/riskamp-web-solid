

import { IsCellAddress } from '@trebco/treb/treb-base-types';
import { UA, type Grid } from '@trebco/treb/treb-grid';
import { type Parameter, type Context, ApplyStyle, SheetToolbarCommand, ToolbarCommand, ToggleStyle, StyleParameters } from './support-functions';
import type { CellStyle, EmbeddedSpreadsheet } from 'riskamp-web';
import { NumberFormatCache } from '@trebco/treb/treb-format';
import { Sheet } from '@trebco/treb/treb-data-model';
// import { goto } from '$app/navigation';

export interface PaletteCommand {

  /** default label (in english) */
  label: string;

  /** translated label, if any (TODO) */
  translated_label?: string;

  /** other text you might search for, we'll pass this to the algo */
  alt?: string;

  /** translation of the alt text */
  translated_alt?: string;

  /** 
   * we're requiring functions as a sanity check, part of the 
   * restructuring of commands. 
   */
  fn: (ctx: Context) => void;

  /** optional function to init parameters */
  init?: (ctx: Context) => void;

  /** WIP */
  parameters?: Parameter[];

}

export const commands: PaletteCommand[] = [

  {
    label: 'Remove hyperlink',
    alt: 'delete clear link',
    fn: (ctx: Context) => {
      const grid = (ctx.sheet as EmbeddedSpreadsheet & {grid: Grid}).grid;
      const sel = grid.GetSelection();
      if (!sel.empty) {
        ctx.sheet.SetLink(sel.target);
      }
    },
  },

  {
    label: 'Insert hyperlink',
    alt: 'add set link',
    parameters: [{
      type: 'text',
      label: 'Enter link address (URL)',
    }],
    fn: (ctx: Context) => {
      const text = (ctx.parameters?.[0]?.type === 'text') ? ctx.parameters[0].value : '';
      const grid = (ctx.sheet as EmbeddedSpreadsheet & {grid: Grid}).grid;
      const sel = grid.GetSelection();
      if (!sel.empty) {
        ctx.sheet.SetLink(sel.target, text);
      }
    },
    init: (ctx: Context) => {

      if (ctx.parameters?.[0]?.type === 'text') {
        const grid = (ctx.sheet as EmbeddedSpreadsheet & {grid: Grid}).grid;
        const sel = grid.GetSelection();
        if (!sel.empty) {
          const data = grid.active_sheet.CellData(sel.target);
          if (data.hyperlink) {
            ctx.parameters[0].value = data.hyperlink;
          }
          else if (data.value) {
            const text = data.value.toString();
            if (/^https?:\/\/(?:www\.)?[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\/[^\s]*)?$/.test(text)) {
              ctx.parameters[0].value = text;
            }
          }
        }
      }

    },
  },

  {
    label: 'Add or edit cell comment',
    alt: 'note comment',
    parameters: [{
      type: 'multi-line-text',
      label: UA.is_mac ? 
        'Enter a comment. Press Cmd + Enter to save.' :
        'Enter a comment. Press Ctrl + Enter to save.' ,
    }],
    fn: (ctx: Context) => {
      ctx.sheet.SetNote(undefined, ctx.parameters?.[0].value?.toString() || '');
      (ctx.sheet.grid as any).layout.HideNote();

    },
    init: (ctx: Context) => {
      if (ctx.parameters?.[0].type === 'multi-line-text') {
        ctx.parameters[0].value = ctx.selection_state?.comment || '';
      }
    },
  },
  {
    label: 'Remove cell comment',
    alt: 'note',
    fn: (ctx: Context) => {
      ctx.sheet.SetNote(undefined, '');
      (ctx.sheet.grid as any).layout.HideNote();
    },
  },

  {
    label: 'Reset background color in selection',
    alt: 'clear fill',
    fn: ApplyStyle({ fill: {}}),
  },

  {
    label: 'Set background color for selection',
    alt: 'fill',
    parameters: [{
        type: 'color', 
      }],
    fn: StyleParameters(['fill']),
  },

  {
    label: 'Reset text color in selection',
    fn: ApplyStyle({ text: {}}),
    alt: 'clear foreground',
  },

  {
    label: 'Set text color for selection',
    alt: 'foreground',
    parameters: [{
        type: 'color', 
      }],
      fn: StyleParameters(['text']),
    },

  {
    label: 'Reset border color in selection',
    alt: 'clear',
    fn: ApplyStyle({ 
      border_top_fill: {},
      border_left_fill: {},
      border_right_fill: {},
      border_bottom_fill: {},
    }),
  },

  {
    label: 'Set border color for selection',
    parameters: [{
        type: 'color', 
      }],
    fn: (ctx: Context) => {
      const color = ctx.parameters?.[0].value;
      const style: CellStyle = {
        border_bottom_fill: color,
        border_top_fill: color,
        border_left_fill: color,
        border_right_fill: color,
      }
      ctx.sheet.ApplyStyle(undefined, style);
    },
  },

  {
    label: 'Borders: clear borders',
    fn: SheetToolbarCommand({ command: 'border-none' }),
  },

  {
    label: 'Borders: set top border on selection',
    fn: SheetToolbarCommand({ command: 'border-top' }),
  },

  {
    label: 'Borders: set bottom border on selection',
    fn: SheetToolbarCommand({ command: 'border-bottom' }),
  },

  {
    label: 'Borders: set double bottom border on selection',
    fn: SheetToolbarCommand({ command: 'border-double-bottom' }),
  },

  {
    label: 'Borders: set left border on selection',
    fn: SheetToolbarCommand({ command: 'border-left' }),
  },

  {
    label: 'Borders: set right border on selection',
    fn: SheetToolbarCommand({ command: 'border-right' }),
  },

  {
    label: 'Borders: set outside border on selection',
    alt: 'outer',
    fn: SheetToolbarCommand({ command: 'border-outside' }),
  },

  {
    label: 'Borders: set all borders on selection',
    fn: SheetToolbarCommand({ command: 'border-all' }),
  },

  {
    label: 'Reset font scale',
    fn: SheetToolbarCommand({ command: 'font-scale', scale: 1.0 }),
    alt: 'text font size'
  },

  {
    label: 'Font scale: increase 10%',
    fn: SheetToolbarCommand({ command: 'adjust-font-scale', delta: .1 }),
    alt: 'text font size'
  },

  {
    label: 'Font scale: decrease 10%',
    fn: SheetToolbarCommand({ command: 'adjust-font-scale', delta: -.1 }),
    alt: 'text font size'
  },

  {
    label: 'Insert donut chart',
    fn: SheetToolbarCommand({ command: 'insert-donut-chart' }),
    alt: 'chart graph'
  },
  {
    label: 'Insert column chart',
    fn: SheetToolbarCommand({ command: 'insert-column-chart' }),
    alt: 'chart graph'
  },
  {
    label: 'Insert bar chart',
    fn: SheetToolbarCommand({ command: 'insert-bar-chart' }),
    alt: 'chart graph'
  },
  {
    label: 'Insert line chart',
    fn: SheetToolbarCommand({ command: 'insert-line-chart' }),
    alt: 'chart graph'
  },
  {
    label: 'Insert scatter plot',
    fn: SheetToolbarCommand({ command: 'insert-scatter-plot' }),
    alt: 'chart graph'
  },
  {
    label: 'Insert box plot',
    fn: SheetToolbarCommand({ command: 'insert-box-plot' }),
    alt: 'chart graph whiskers'
  },

  /*
  {
    label: 'Insert text box',
    alt: 'create textarea',
    parameters: [{
      type: 'multi-line-text',
      label: UA.is_mac ? 
        'Enter a comment. Press Cmd + Enter to save.' :
        'Enter a comment. Press Ctrl + Enter to save.' ,
    }],
    fn: (ctx: Context) => {
      const grid: Grid = (ctx.sheet as any).grid;

      const { x, y } = grid.GetScrollOffset();
      const scale = grid.scale || 1;
      const auto_size = { width: 301 / scale, height: 301 / scale };

      const text = ctx.parameters?.[0]?.value?.toString() || '';
      const lines = text.split(/\n/g);

      grid.CreateAnnotation({
          type: 'textbox',
          data: {
            paragraphs: lines.map(line => ({
              content: [{ text: line }],
            })),
          },
        }, true, undefined, { top: y / scale + 30, left: x / scale + 30, ...auto_size });

    },
  },
  */

  {
    label: 'Insert image',
    fn: SheetToolbarCommand({ command: 'insert-image' }),
  },

  /*
  case 'insert-image': this.InsertImage(); break;
  */

  {
    label: 'Conditional format gradient: red-green',
    fn: (ctx: Context) => {
      ctx.sheet.ConditionalFormatGradient(undefined, 'red-green');
    }
  },

  {
    label: 'Conditional format gradient: green-red',
    fn: (ctx: Context) => {
      ctx.sheet.ConditionalFormatGradient(undefined, 'green-red');
    }
  },

  /*
  {
    label: 'Conditional formats',
    fn: () => alert('ENOTIMPL'),
  },
  */

  {
    label: 'Conditional format: unique values',
    parameters: [{
      label: 'Select color for unique values',
      type: 'color',
      default: { theme: 9, tint: .66 },
    }],
    fn: (ctx: Context) => {
      const parameter = ctx.parameters?.[0];
      if (parameter?.type === 'color') {
        ctx.sheet.ConditionalFormatDuplicateValues(undefined, { 
          unique: true, 
          style: { 
            fill: parameter.value || parameter.default || {}
          } 
        });
      }
    }
  },

  {
    label: 'Conditional format: data bars',
    alt: 'databar',
    parameters: [{
      label: 'Select color for data bars',
      type: 'color',
      default: { theme: 4, tint: .5 },
    }],
    fn: (ctx: Context) => {
      const parameter = ctx.parameters?.[0];
      if (parameter?.type === 'color') {
        ctx.sheet.ConditionalFormatDataBars(undefined, { 
          fill: parameter.value || parameter.default || {}
        });
      }
    }
  },

  {
    label: 'Conditional format: duplicate values',
    parameters: [{
      label: 'Select color for duplicate values',
      type: 'color',
      default: { theme: 7, tint: .66 },
    }],
    fn: (ctx: Context) => {
      const parameter = ctx.parameters?.[0];
      if (parameter?.type === 'color') {
        ctx.sheet.ConditionalFormatDuplicateValues(undefined, { 
          unique: true, 
          style: { 
            fill: parameter.value || parameter.default || {}
          } 
        });
      }
    }
  },

  {
    label: 'Clear conditional formatting from selection',
    alt: 'remove',
    fn: (ctx: Context) => {
      ctx.sheet.RemoveConditionalFormats()
    }
  },


  { 
    label: 'Fit selected column widths (auto-size)',
    fn: (ctx: Context) => {
      const columns: number[] = [];
      const sel = ctx.sheet.GetSelection();
      if (sel) {
        const resolved = ctx.sheet.Resolve(sel);
        if (resolved) {
          if (IsCellAddress(resolved)) {
            columns.push(resolved.column);
          }
          else {
            for (let c = resolved.start.column; c <= resolved.end.column; c++) {
              columns.push(c);
            }
          }
        }
      }
      if (columns.length) {
        ctx.sheet.SetColumnWidth(columns);
      }
    },
  },

  /*
  {
    label: 'Split view',
    fn: ToolbarCommand('split-view'),
  },

  {
    label: 'Unsplit view',
    fn: ToolbarCommand('unsplit-view'),
  },
  */

  {
    label: 'Fit data', 
    fn: ToolbarCommand('fit-data'),
    alt: 'fit',
  },

  {
    label: 'Named ranges and expressions',
    fn: ToolbarCommand('names'),
    alt: 'name manager define name delete name clear',
  },

  {
    label: 'Set tab color',
    parameters: [{
      type: 'color',
    }],
    fn: (ctx: Context) => {
      const parameter = ctx.parameters?.[0];
      if (parameter?.type === 'color' && parameter.value) {
        ctx.sheet.SetTabColor(undefined, parameter.value);
      }
    },
  },

  {
    label: 'Reset tab color',
    alt: 'clear remove',
    fn: (ctx: Context) => {
      ctx.sheet.SetTabColor(undefined, undefined);
    },
  },
  
  { 
    label: 'Fit selected row heights (auto-size)',
    fn: (ctx: Context) => {
      const rows: number[] = [];
      const sel = ctx.sheet.GetSelection();
      if (sel) {
        const resolved = ctx.sheet.Resolve(sel);
        if (resolved) {
          if (IsCellAddress(resolved)) {
            rows.push(resolved.row);
          }
          else {
            for (let r = resolved.start.row; r <= resolved.end.row; r++) {
              rows.push(r);
            }
          }
        }
      }
      if (rows.length) {
        ctx.sheet.SetRowHeight(rows);
      }
    },
  },

  {
    label: 'Check correlation matrix',
    fn: ToolbarCommand('correlation-matrix'),
  },

  {
    label: 'Hide sheet',
    alt: 'visible',
    fn: (ctx: Context) => {
      ctx.sheet.HideSheet(ctx.sheet.active_sheet, true);
    },
  },

  {
    label: 'Unhide all sheets',
    alt: 'visible',
    fn: (ctx: Context) => {
      for (const sheet of ctx.sheet.grid.model.sheets.list) {
        if (!sheet.visible) {
          ctx.sheet.HideSheet(sheet.name, false);
        }
      }
    },
  },

  {
    label: 'Unhide sheet columns',
    fn: (ctx: Context) => {
      const columns: number[] = [];

      const count = ctx.sheet.grid.active_sheet.columns;
      for (let i = 0; i < count; i++) {
        const width = ctx.sheet.grid.active_sheet.GetColumnWidth(i);
        if (width === 0) {
          columns.push(i);
        }
      }
      if (columns.length) {
        ctx.sheet.SetColumnWidth(columns, ctx.sheet.grid.active_sheet.default_column_width);
      }
    },
  },

  {
    label: 'Unhide sheet rows',
    fn: (ctx: Context) => {
      const rows: number[] = [];

      const count = ctx.sheet.grid.active_sheet.rows;
      for (let i = 0; i < count; i++) {
        const height = ctx.sheet.grid.active_sheet.GetRowHeight(i);
        if (height === 0) {
          rows.push(i);
        }
      }
      if (rows.length) {
        ctx.sheet.SetRowHeight(rows, ctx.sheet.grid.active_sheet.default_row_height);
      }
    },
  },

  { 
    label: 'Hide selected rows',
    fn: (ctx: Context) => {
      const rows: number[] = [];
      const sel = ctx.sheet.GetSelection();
      if (sel) {
        const resolved = ctx.sheet.Resolve(sel);
        if (resolved) {
          if (IsCellAddress(resolved)) {
            rows.push(resolved.row);
          }
          else {
            for (let r = resolved.start.row; r <= resolved.end.row; r++) {
              rows.push(r);
            }
          }
        }
      }
      if (rows.length) {
        ctx.sheet.SetRowHeight(rows, 0);
        ctx.sheet.Select(undefined);
      }
    },
  },

  { 
    label: 'Hide selected columns',
    fn: (ctx: Context) => {
      const columns: number[] = [];
      const sel = ctx.sheet.GetSelection();
      if (sel) {
        const resolved = ctx.sheet.Resolve(sel);
        if (resolved) {
          if (IsCellAddress(resolved)) {
            columns.push(resolved.column);
          }
          else {
            for (let c = resolved.start.column; c <= resolved.end.column; c++) {
              columns.push(c);
            }
          }
        }
      }
      if (columns.length) {
        ctx.sheet.SetColumnWidth(columns, 0);
        ctx.sheet.Select(undefined);
      }
    },
  },

  /*
  {
    label: 'View: toggle notes pane',
    fn: (ctx: Context) => {
      // ctx.options.document_panel = !ctx.options.document_panel;
      // ctx.dispatcher('command', { command: 'update-view' });
    },
  },

  {
    label: 'View: toggle info panel',
    fn: (ctx: Context) => {
      // ctx.options.document_information = !ctx.options.document_information;
      // ctx.dispatcher('command', { command: 'update-view' });
    },
  },

  {
    label: 'View: toggle spreadsheet toolbar',
    fn: (ctx: Context) => {
      // ctx.options.spreadsheet_toolbar = !ctx.options.spreadsheet_toolbar;
      // ctx.dispatcher('command', { command: 'update-view' });
    },
  },
  */

  {
    label: 'Las Vegas simulation...',
    fn: ToolbarCommand('run-lv-simulation'),
  },

  {
    label: 'Simulation settings...',
    fn: ToolbarCommand('simulation-settings'),
  },

  {
    label: 'Language settings...',
    fn: ToolbarCommand('language-settings'),
  },

  {
    label: 'Load desktop file...',
    alt: 'excel csv import',
    fn: (ctx: Context) => ctx.sheet.LoadLocalFile(),
  },

  {
    label: 'Save as XLSX',
    alt: 'download excel',
    fn: (ctx: Context) => ctx.sheet.Export(),
  },

  {
    label: 'Save current sheet as CSV',
    alt: 'download export',
    fn: (ctx: Context) => ctx.sheet.ExportDelimited(),
  },

  {
    label: 'Save to cloud',
    fn: ToolbarCommand('save'),
  },

  {
    label: 'Load document...',
    alt: 'open',
    fn: (ctx: Context) => goto('/documents'),
  },

  {
    label: 'Download to desktop (JSON)',
    alt: 'save',
    fn: (ctx: Context) => ctx.sheet.SaveToDesktop(),
  },

  {
    label: 'Insert function...',
    fn: ToolbarCommand('insert-function'),
  },

  {
    label: 'Find in values/formulas...',
    fn: ToolbarCommand('find'),
  },
  {
    label: 'Insert random distribution...',
    fn: ToolbarCommand('insert-distribution'),
  },
  {
    label: 'Run simulation...',
    fn: ToolbarCommand('run-simulation-again'),
  },
  {
    label: 'Quick view...',
    fn: ToolbarCommand('quick-view'),
  },
  {
    label: 'New model',
    fn: ToolbarCommand('new-document'),
  },
  {
    label: 'Revert file',
    fn: ToolbarCommand('revert'),
  },

  {
    label: 'Recalculate',
    fn: (ctx: Context) => ctx.sheet.Recalculate(),
  },

  {
    label: 'Undo',
    fn: (ctx: Context) => ctx.sheet.Undo(),
  },

  {
    label: 'Delete selected columns',
    fn: (ctx: Context) => ctx.sheet.DeleteColumns(),
  },
  {
    label: 'Delete selected rows',
    fn: (ctx: Context) => ctx.sheet.DeleteRows(),
  },

  {
    label: 'Insert column',
    fn: (ctx: Context) => ctx.sheet.InsertColumns(),
  },
  {
    label: 'Insert row',
    fn: (ctx: Context) => ctx.sheet.InsertRows(),
  },

  {
    label: 'Set view scale (zoom)',
    parameters: [{
      type: 'number',
      style: 'percent',
      label: 'Enter the view scale'
    }],
    fn: (ctx: Context) => {
      const parameter = ctx.parameters?.[0];
      if (parameter?.type === 'number' && parameter.value) {

        ctx.sheet.grid.SetScale(parameter.value);
      }
    }
  },

  {
    label: 'Reset view scale (zoom)',
    fn: (ctx: Context) => {
      ctx.sheet.grid.SetScale(1);
    }
  },

  {
    label: 'Rename tab',
    alt: 'sheet page',
    parameters: [{
      type: 'text',
      label: 'Enter a name for this tab'
    }],
    fn: (ctx: Context) => {
      const parameter = ctx.parameters?.[0];
      if (parameter?.type === 'text' && parameter.value) {
        ctx.sheet.RenameSheet(undefined, parameter.value);
      }
    }
  },

  {
    label: 'Add tab',
    alt: 'sheet page',
    parameters: [{
      label: 'Enter a name for the new tab',
      type: 'text',
    }],
    init: (ctx: Context) => {
      const parameter = ctx.parameters?.[0];
      if (parameter?.type === 'text') {

        // what would the new sheet name be? this is done when it's 
        // added, but we can estimate

        let name = Sheet.default_sheet_name;
        
        // this is copied from grid

        while (ctx.sheet.grid.model.sheets.list.some((test) => test.name === name)) {

          const match = name.match(/^(.*?)(\d+)$/);
          if (match) {
            name = match[1] + (Number(match[2]) + 1);
          }
          else {
            name = name + '2';
          }
    
        }

        parameter.value = name;

      }
    },
    fn: (ctx: Context) => {
      let name: string|undefined;
      const parameter = ctx.parameters?.[0];
      if (parameter?.type === 'text') {
        name = parameter.value;
      }
      ctx.sheet.AddSheet(name);
    },
  },
  {
    label: 'Delete tab',
    alt: 'sheet page',
    fn: (ctx: Context) => ctx.sheet.DeleteSheet(),
  },

  {
    label: 'Increase indent',
    alt: 'more',
    fn: SheetToolbarCommand({ command: 'indent' }),
    // fn: (ctx: Context) => (ctx.sheet as any).HandleToolbarMessage({ command: 'indent'}),
  },
  {
    label: 'Decrease indent',
    alt: 'less',
    // fn: (ctx: Context) => (ctx.sheet as any).HandleToolbarMessage({ command: 'outdent'}),
    fn: SheetToolbarCommand({ command: 'outdent' }),
  },

  /*
  {
    label: 'Conditional format: gradient...',
    parameters: [
      { name: 'Minimum', type: 'text' },
      { name: 'Maximum', type: 'text' }
    ],
  },
  */


  {
    label: 'Number format: increase precision',
    alt: 'more decimal places',
    fn: SheetToolbarCommand({ command: 'increase-precision' }),
  },
  {
    label: 'Number format: decrease precision',
    alt: 'less fewer decimal places',
    fn: SheetToolbarCommand({ command: 'decrease-precision' }),
  },

  {
    label: 'Number format',
    alt: 'custom number format',
    parameters: [{ 
      name: 'Format', 
      type: 'text', 
      label: 'Enter number format or a symbolic name',
      choices: [],
    }],
    fn: StyleParameters(['number_format']),
    init: (ctx: Context) => {

      const number_formats: string[] = [
      ];
  
      const date_formats: string[] = [
      ];
  
      if (ctx.document_styles) {
        for (const format of ctx.document_styles.number_formats) {
          if (NumberFormatCache.SymbolicName(NumberFormatCache.Translate(format))) { continue; }
          const instance = NumberFormatCache.Get(format);
          if (instance.date_format) {
            date_formats.push(format);
          }
          else {
            number_formats.push(format);
          }
        }
      }

      number_formats.push('General', 'Number', 'Integer', 'Percent', 'Fraction', 'Accounting', 'Currency', 'Scientific');
      date_formats.push('Timestamp', 'Long Date', 'Short Date');

      if (ctx.parameters?.[0]) {
        ctx.parameters[0].choices = [
          ...number_formats, ...date_formats,
        ];
      }

    },
  },

  /*
  {
    label: 'Number format: custom number format',
    alt: 'number format number format',
    parameters: [{ 
      name: 'Format', 
      type: 'text', 
      label: 'Enter number format or a symbolic name',
    }],
    fn: StyleParameters(['number_format']),
  },

  {
    label: 'Number format: general',
    fn: ApplyStyle({ number_format: 'General' }),
  },
  {
    label: 'Number format: percent',
    fn: ApplyStyle({ number_format: 'Percent' }),
  },
  {
    label: 'Number format: accounting',
    fn: ApplyStyle({ number_format: 'Accounting' }),
  },
  {
    label: 'Number format: integer',
    fn: ApplyStyle({ number_format: 'Integer' }),
  },
  {
    label: 'Number format: number',
    fn: ApplyStyle({ number_format: 'Number' }),
  },
  */


  {
    label: 'Merge selected cells',
    fn: (ctx: Context) => ctx.sheet.MergeCells(),
  },
  {
    label: 'Unmerge selected cells',
    fn: (ctx: Context) => ctx.sheet.UnmergeCells(),
  },

  {
    label: 'Lock selected cells',
    fn: (ctx: Context) => ctx.sheet.ApplyStyle(undefined, {
      locked: true,
    }),
  },
  {
    label: 'Unlock selected cells',
    fn: (ctx: Context) => ctx.sheet.ApplyStyle(undefined, {
      locked: false,
    }),
  },

  {
    label: 'Format selection: vertical align top',
    fn: ApplyStyle({ vertical_align: 'top' }),
  },
  {
    label: 'Format selection: vertical align bottom',
    fn: ApplyStyle({ vertical_align: 'bottom' }),
  },
  {
    label: 'Format selection: vertical align middle',
    // alt: 'center',
    fn: ApplyStyle({ vertical_align: 'middle' }),
  },

  {
    label: 'Format selection: left justify text',
    alt: 'horizontal align',
    fn: (ctx: Context) => ctx.sheet.ApplyStyle(undefined, {
      horizontal_align: 'left',
    }),
  },
  {
    label: 'Format selection: right justify text',
    alt: 'horizontal align',
    fn: (ctx: Context) => ctx.sheet.ApplyStyle(undefined, {
      horizontal_align: 'right',
    }),
  },
  {
    label: 'Format selection: center text',
    alt: 'horizontal align justify',
    fn: (ctx: Context) => ctx.sheet.ApplyStyle(undefined, {
      horizontal_align: 'center',
    }),
  },

  { 
    label: 'Format selection: toggle word wrap',
    fn: ToggleStyle('wrap'),
  },
  { 
    label: 'Format selection: toggle bold',
    fn: ToggleStyle('bold'),
  },
  { 
    label: 'Format selection: toggle italic',
    fn: ToggleStyle('italic'),
  },
  { 
    label: 'Format selection: toggle underline',
    fn: ToggleStyle('underline'),
  },
  { 
    label: 'Format selection: toggle strikethrough',
    fn: ToggleStyle('strike'),
  },

  /*
  {
    label: 'Format selection: wrap text',
    fn: (ctx: Context) => ctx.sheet.ApplyStyle(undefined, {
      wrap: true
    }),
  },
  {
    label: 'Format selection: unwrap text',
    fn: (ctx: Context) => ctx.sheet.ApplyStyle(undefined, {
      wrap: false
    }),
  },

  {
    label: 'Format selection: bold',
    fn: (ctx: Context) => ctx.sheet.ApplyStyle(undefined, {
      bold: true
    }),

  },
  {
    label: 'Format selection: italic',
    fn: (ctx: Context) => ctx.sheet.ApplyStyle(undefined, {
      italic: true
    }),
  },
  {
    label: 'Format selection: underline',
    fn: (ctx: Context) => ctx.sheet.ApplyStyle(undefined, {
      underline: true
    }),
  },
  {
    label: 'Format selection: strikethrough',
    fn: (ctx: Context) => ctx.sheet.ApplyStyle(undefined, {
      strike: true
    }),
  },
  */

  {
    label: 'Format selection: reset text formatting',
    alt: 'clear',
    fn: ApplyStyle({
      bold: false, 
      italic: false, 
      underline: false, 
      strike: false
    }),
  }
]

/*
if (dev_mode) {

  commands.push(
    { 
      label: 'Set font',
      alt: 'typeface',
      parameters: [{
        type: 'text',
        label: 'Enter a font or select one of the font sets',
        choices: [
          { label: 'Handwritten', value : 'stack:handwritten' },
          { label: 'Serif', value: 'stack:transitional' },
          { label: 'Sans-serif', value: 'stack:default' },
          { label: 'Monospace', value: 'stack:monospace' },
          { label: 'System UI', value: 'stack:ui' },
        ]
      }],
      fn: (ctx: Context) => {

        const value = ctx.parameters?.[0].value?.toString();
        // console.info(value);
        
        const grid: Grid = (ctx.sheet as any).grid;
        if (grid.AnnotationSelected()) {
          grid.ApplyAnnotationStyle({ font_face: value }, true);
        }
        else {
          ctx.sheet.ApplyStyle(undefined, { font_face: value }, true);
        }

      },
    }
  );

}
*/
