
import type { CellValue, IArea } from "riskamp-web";
import type { Parser, UnitCall } from '@trebco/treb/treb-parser';
import type { Grid } from '@trebco/treb/treb-grid';

// import type { Calculator } from '@trebco/treb/treb-calculator';
import type { FormulaBar } from '@trebco/treb/treb-grid/src/editors/formula_bar';
import type { OverlayEditor } from '@trebco/treb/treb-grid/src/editors/overlay_editor';
import type { SpreadsheetType } from '~/lib/spreadsheet-type';

export interface CheckFunctionData {

  /** where was the focus when we were called */
  source: 'formula-bar' | 'overlay-editor' | 'sheet';

  /** 
   * if we're updating an existing function, this is the expression.
   * we use this to set the initial state, but also to replace later.
   */
  target?: UnitCall;

  /** cell format, for rendering the function result */
  cell_format?: string;

  /** current value of the cell -- ? */
  current_value?: CellValue;

  /** full text of the cell formula */
  full_text?: string;

  /** caret position, if it's from an editor */
  caret?: number;

  /** target for setting value */
  sheet_selection?: string,

  /** was this originally an array? if so, set array when patching */
  array?: IArea;

  /** 
   * this is control flow, but we can only generate it by reading the data,
   * and we still need to unwind, so this seems like a reasonable place for
   * it.
   * 
   * if set, don't show the function dialog, revert to the editor. 
   */
  reject?: boolean

}

const PatchFormula = (sheet: SpreadsheetType, check: CheckFunctionData, result: string) => {

  const parser = sheet?.parser as Parser;

  if (check.target) {

    console.info("parsing result:", result);

    let replacement: UnitCall|undefined;
    let parse_result = parser.Parse(result);
    if (parse_result.expression) {
      if (parse_result.expression.type === 'call') {  
        replacement = parse_result.expression;
      }
    }

    if (!replacement) {
      console.warn('no replacement');
    }

    if (check.full_text && replacement) {
      parse_result = parser.Parse(check.full_text);
      if (parse_result.expression) {
        let patched = false;
        const replaced = parser.Walk2(parse_result.expression, unit => {
          if (unit.type === 'call' && unit.position === check.target?.position) {
            patched = true;
            return replacement;
          }
          return true;
        });
        if (!patched) {
          console.warn('patch failed');
        }
        return parser.Render(replaced, { missing: '' });
      }
    }
    else {
      // ?? should not happen
      throw new Error('never');
    }
  }
  else if (!check.full_text || check.full_text === '=') {

    // I guess this could happen? an empty formula?
    return result;

  }
  else {
    
    // maybe just insert at the insert point? pad with spaces? 

    const text = check.full_text || '';
    if (typeof check.caret === 'number') {

      const base = text.substring(1, check.caret) + ' ' + result + ' ' + text.substring(check.caret);
      /*
      const parse_result = parser.Parse(base);
      if (parse_result.expression) {
        return parser.Render(parse_result.expression, { missing: '' });
      }
      */
      return base;
    }
  

  }


};

export const RestoreEditor = (sheet: SpreadsheetType, check: CheckFunctionData, result?: string) => {

  const grid = sheet.grid;
  const formula_bar: FormulaBar = (grid as any)?.formula_bar;
  let patched: string|undefined;

  switch (check.source) {
    case 'formula-bar':

      if (check.reject) {
        formula_bar.Restore();
        return;
      }

      formula_bar.Release();

      // we need to tell grid to repaint the formula bar text to
      // whatever we have now, or the old version (if we canceled).
      // that will remove any color highlights.

      // actually if we just call SetRange it should work, no?
      // update: see below

      if (result) {
        patched = PatchFormula(sheet, check, result);
      }

      break;
    
    case 'overlay-editor':

      if (check.reject) {
        grid.RestoreOverlayEditor();
        return;
      }

      grid.ReleaseOverlayEditor();

      if (result) {
        patched = PatchFormula(sheet, check, result);
      }

      break;

    default:

      if (check.reject) {

        // this actually can't happen, because in this case we'll overwrite

        console.info('it happened anyway');

        sheet.Focus();
        return;

      }

      if ((typeof check.full_text !== 'string') || !check.full_text.startsWith('=')) {

        // original cell was blank, so we can just insert
        // OR: original cell was not a formula, we overwrite

        if (result) {
          patched = result;
        }

      }
      else {

        // original cell was not blank, we have to update. if 
        // we were not in an editor, then the position is at 
        // the end. 

        if (result) {
          patched = PatchFormula(sheet, check, result);
        }

      }

      break;
    
  }

  if (typeof patched === 'string') {

    // FIXME: check array, handle
    // FIXME: this is letting me break an array... should not happen.
    
    sheet.SetRange(check.array || check.sheet_selection, '=' + patched, { array: !!check.array });

  }
  else {
    if (result) {
      console.warn('result but no patch', {check, result});
    }
    (grid as any).UpdateFormulaBarFormula();
  }

  sheet.Focus();


};

const ParseFormula = (parser: Parser, text: string, position: number) => {

  let target: UnitCall|undefined;

  if (text && text.startsWith('=')) {
    const parse_result = parser.Parse(text);
    if (parse_result.expression) {
      parser.Walk(parse_result.expression, unit => {
        if (unit.type === 'call') {
          if (unit.end && position > unit.position && position <= unit.end + 1) {
            target = unit;
            // return false;
            return true;
            
          }
        }
        // return !target;
        return true;
      });
    }
  }

  return target;
  
};

export const CheckFunction = (sheet: SpreadsheetType): CheckFunctionData => {

  sheet = (sheet as any).focus_target;  

  //
  // too much reacharound, we need to resolve
  //

  const grid: Grid = (sheet as any).grid;
  const formula_bar: FormulaBar = (grid as any)?.formula_bar;
  const overlay_editor: OverlayEditor = (grid as any)?.overlay_editor;

  const parser = (sheet as any)?.parser as Parser;
  if (!parser) {
    throw new Error('missing parser');
  }

  let source: CheckFunctionData['source'] = 'sheet';
  let target: UnitCall|undefined;
  let array: IArea|undefined;
  let caret: number|undefined;
  let reject = false;

  let full_text = '';
  const sheet_selection = sheet.GetSelection();

  let current = sheet.GetRange(sheet_selection, { formula: true });
  if (Array.isArray(current)) {
    current = current[0][0];
  }
  
  let cell = grid.active_sheet.CellData((grid as any).primary_selection.target);
  if (cell.area) {
    array = cell.area.toJSON();
    cell = grid.active_sheet.CellData(cell.area.start);
  }

  let style = sheet.GetStyle(sheet_selection);
  if (Array.isArray(style)) {
    style = style[0][0];
  }
  
  // console.info({current});

  const cell_format = style?.number_format || 'General';

  if (formula_bar.tolled) {
    
    // console.info("formula bar tolled", JSON.stringify(formula_bar.tolled));
    
    source = 'formula-bar';
    full_text = formula_bar.tolled.text;
    if (full_text && !full_text.startsWith('=') && full_text !== '=') {
      reject = true;
    }
    else {
      caret = formula_bar.tolled.substring.length;
      target = ParseFormula(parser, formula_bar.tolled.text, formula_bar.tolled.substring.length);  
    }
  }
  else if (overlay_editor.editing) {
    
    // console.info("overlay editor editing");
    
    const edit_state = overlay_editor.GetEditState();
    console.info({edit_state});
    source = 'overlay-editor';
    full_text = edit_state.text;
    if (full_text && !full_text.startsWith('=') && full_text !== '=') {
      reject = true;
    }
    else {
      caret = edit_state.substring.length;
      target = ParseFormula(parser, edit_state.text, edit_state.substring.length);
    }
  }
  else {

    if ((typeof current === 'string') && /^\s*=/.test(current)) {
      full_text = current;
      target = ParseFormula(parser, full_text, full_text.length);
    }

  }

  return {
    source,
    target, 
    cell_format, 
    current_value: current,
    full_text,
    sheet_selection,
    array,
    caret,
    reject,
  };

};
