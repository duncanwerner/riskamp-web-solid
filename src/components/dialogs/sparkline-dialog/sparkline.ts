
import { createSignal } from 'solid-js';
import { createStore } from 'solid-js/store';
import { SparklineData, type SparklineDialog } from '~/components/dialogs/sparkline-dialog/sparkline-dialog';
import { SpreadsheetType } from '~/lib/spreadsheet-type';
import { Heuristics } from '@trebco/treb/treb-data-model';
import { AwaitSignal } from '~/lib/await-signal';
import { Area, IsArea, IsCellAddress } from '@trebco/treb/treb-base-types';

const [sparklineData, setSparklineData] = createStore<SparklineData>({});  
const [open, setOpen] = createSignal(false);
const [sparklineResult, setSparklineResult] = createSignal<boolean|undefined>(false);

export const sparkline_props: Omit<Parameters<typeof SparklineDialog>[0], 'sheet'> = {
  open,
  setOpen,
  data: sparklineData,
  updateData: setSparklineData,
  setResult: setSparklineResult,
  closebox: true,
  moveable: true,
  resizeable: true,
  clear_primary_selection: true,
};

export async function InsertSparkline(sheet?: SpreadsheetType) {

  if (!sheet) {
    return;
  }

  // check the selected cell. we'll use heuristics here (are they exported)?

  let data: SparklineData = {};

  const sel = sheet.grid.GetSelection();
  if (!sel.empty) {

    let area = sel.area.Clone();
    const cell_data = sheet.grid.active_sheet.CellData(area.start);

    if (area.count === 1) {
  
      // 1. if it's a single cell, check if it's a sparkline
      const formula = sheet.GetRange(area, { type: 'formula' });
      if (typeof formula === 'string') {
        const parsed = sheet.parser.Parse(formula);
        if (parsed.expression && parsed.expression.type === 'call' &&
            /sparkline/i.test(parsed.expression.name)) {
          data.source = sheet.parser.Render(parsed.expression.args[0]);
          data.target = area.spreadsheet_label;
          data.type = /column/i.test(parsed.expression.name) ? 'column' : 'line';
        }
      }

      // 2. otherwise, expand, set as source
      else if (formula || cell_data.spill || cell_data.area) {
        const expanded = Heuristics.ExpandRegion(sel.area, sheet.grid.active_sheet);
        data.source = expanded.spreadsheet_label;
        data.target = '';
      }
      else {

        // use as target
        data.target = area.spreadsheet_label;
        data.source = '';

      }

    }
    else {

      // multi, set as source

      data.source = area.spreadsheet_label;
      data.target = '';

    }

  }

  setSparklineData(data);
  setOpen(true);

  await AwaitSignal(open, (val) => val === false);
  const result = sparklineResult();

  if (result) {
    console.info({data: sparklineData});
    const fn = sparklineData.type === 'line' ?
      `Sparkline.Line` : `Sparkline.Column`;

    let area = sheet.Resolve(sparklineData.target || '');
    if (IsArea(area)) {
      sheet.MergeCells(area);
      sheet.Select(area);
      area = area.start; 
    }

    if (IsCellAddress(area)) {
      sheet.SetRange(new Area(area).spreadsheet_label, `=${fn}(${sparklineData.source})`, {
        argument_separator: ',',
      });
    }

    sheet.Select(area);

  }
  else {
    sheet.Select(sel?.area);
  }

  sheet.Focus();

}