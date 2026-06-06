
import { Title } from "@solidjs/meta";
import { useParams } from "@solidjs/router";
import { Spreadsheet } from '~/components/spreadsheet';
import { createEffect, createSignal, on, onMount } from 'solid-js';
import { Splitter } from '~/components/splitter/splitter';
import * as auth from '~/lib/auth';
import { spinner } from '~/components/spinner/spinner-control';
import { Toolbar } from '~/components/toolbar/toolbar';
import { ToolbarCommand, ToolbarCommandKey } from '~/components/toolbar/toolbar-commands';
// import { Dialog } from '~/components/dialog-base/dialog';
// import { InteractiveDialog } from '~/components/interactive-dialog/interactive-dialog';
import { TestDialog } from '~/components/dialogs/test-dialog/test-dialog';
import type { SpreadsheetType } from '~/lib/spreadsheet-type';
import { Sidebar } from '~/components/sidebar/sidebar-main';
import { OpenExternal } from '~/lib/navigate';

import { RunSimulationDialog } from '~/components/dialogs/run-simulation-dialog/run-simulation-dialog';
import { SparklineDialog, SparklineData } from '~/components/dialogs/sparkline-dialog/sparkline-dialog';

import { HijackDialog } from '~/lib/hijack-dialog';
import { ApplyProperty, BooleanKeys } from '~/lib/typescript-magic';
import { type CellStyle, type Color } from 'riskamp-web';
import { Heuristics } from '@trebco/treb/treb-data-model';
import { AwaitSignal } from '~/lib/await-signal';
import { createStore } from 'solid-js/store';
import { Area, IsArea, IsCellAddress } from '@trebco/treb/treb-base-types';
import { InsertSparkline, sparkline_props } from '~/components/dialogs/sparkline-dialog/sparkline';
import { TrendForecastingDialog } from '~/components/dialogs/trend-forecasting/trend-forecasting-dialog';
import { RunTrendForecast, trend_forecast_props } from '~/components/dialogs/trend-forecasting/trend-forecasting';
import { BorderConstants } from '@trebco/treb';
import { sessionData, setSessionData } from '~/lib/app-data';

function Spin() {
  spinner.show();
  setTimeout(() => {
    spinner.hide();
  }, 4000);
}

export default function Page() {

  const [split, setSplit] = createSignal(100);
  const OpenSignal = createSignal(false);
  const [open, setOpen] = OpenSignal;
  const [getSheet, setSheet] = createSignal<SpreadsheetType|undefined>();
  const [sidebar, setSidebar] = createSignal<string|undefined>();

  const RunSimulationSignal = createSignal(false);
  const [auto, setAuto] = createSignal(false);
  const [additionalCells, setAdditionalCells] = createSignal<string[]>([]);

  function ToggleStyle(sheet: SpreadsheetType, name: BooleanKeys<CellStyle>) {
    let value = false;
    if (sheet.selection_state?.style) {
      value = sheet.selection_state.style[name] || false;
    }
    sheet.ApplyStyle(undefined, { [name]: !value });
    sheet.Focus();
  }

  function NewDocument() {

    // TOOD: path

    // TODO: alert

    getSheet()?.Reset();

  }

  // FIXME: move this to a lib file, it doesn't need to clog up this file
  function HandleCommand(command: ToolbarCommand & { key: ToolbarCommandKey}) {

    const sheet = getSheet();
    if (!sheet) {
      return;
    }

    if (command?.key.startsWith('border-') && command.key !== 'border-color') {
      let border_command = command.key.substring(7);
      let width = 1;
      if (border_command.startsWith('double-')) {
        width = 2;
        border_command = border_command.substring(7);
      }
      sheet.ApplyBorders(undefined, border_command as BorderConstants, width);
      return;
    }

    switch (command.key) {
      case 'new':
        NewDocument();
        break;

      case 'save-to-desktop':

        // options? what are the defaults?
        sheet.SaveToDesktop();
        break;

      case 'import':
        sheet.LoadLocalFile().then(() => {
          sheet.Focus();
        });
        return;
        break;

      case 'export-csv':
        sheet.SaveToDesktop('csv');
        break;

      case 'export-xlsx':
        sheet.Export();
        break;

      case 'forecast':
        RunTrendForecast(getSheet());
        break;

      case 'sparkline':
        InsertSparkline(getSheet());
        break;

      case 'function-docs':
        OpenExternal('https://docs.riskamp.com');
        break;

      case 'run-simulation':
      case 'run-simulation-again':

        if (Array.isArray(command.additional_data)) {
          setAdditionalCells([...command.additional_data as string[]]);
        }
        else {
          setAdditionalCells([]);
        }

        setAuto(command.key === 'run-simulation-again');
        RunSimulationSignal[1](true);
        break;

      case 'recalculate':
        sheet.Recalculate();
        break;

      case 'insert-line-chart':
      // case 'insert-area-chart':
      case 'insert-column-chart':
      case 'insert-donut-chart':
      case 'insert-bar-chart':
      case 'insert-scatter-plot':
        sheet.HandleToolbarMessage({
          command: command.key
        });
        break;


    case 'number-format':
      ApplyProperty(sheet, 'number_format', typeof command.value === 'string' ? command.value : undefined);
      break;

    case 'text-color':
    case 'fill-color':
    case 'border-color':
      {
        let color: Color|undefined;
        if (command.type === 'color') {
          color = command.active_color;
        }
        sheet.HandleToolbarMessage({
          command: command.key,
          color,
        });
      }
      break;

      case 'lock-cells':
        ToggleStyle(sheet, 'locked');
        break;

      case 'bold':
      case 'underline':
      case 'strike':
      case 'italic':
      case 'wrap':
        ToggleStyle(sheet, command.key);
        break;

      case 'font-scale':
        if (typeof command.value === 'string') {
          let scale = sheet.ParseNumber(command.value);
          if (typeof scale !== 'number' || !scale || isNaN(scale)) {
            scale = 1;
          }  
          sheet.HandleToolbarMessage({ command: 'font-scale', scale });
        }
        break;

      case 'toggle-grouping':
      case 'increase-precision':
      case 'decrease-precision':
      case 'insert-column-chart':
      case 'insert-bar-chart':
      case 'insert-line-chart':
      case 'insert-donut-chart':
      case 'insert-scatter-plot':
      case 'insert-image':
      case 'indent':
      case 'outdent':

        sheet.HandleToolbarMessage({ command: command.key });
        sheet.Focus();
        break;

      case 'insert-column':
        sheet.InsertColumns();
        sheet.Focus();
        break;

      case 'insert-row':
        sheet.InsertRows();
        sheet.Focus();
        break;

      case 'delete-column':
        sheet.DeleteColumns();
        sheet.Focus();
        break;

      case 'delete-row':
        sheet.DeleteRows();
        sheet.Focus();
        break;

      case 'merge-cells':
        if (sheet.selection_state.merge) {
          sheet.UnmergeCells();
        }
        else {
          sheet.MergeCells();
        }
        sheet.Focus();
        break;

      case 'text-color':
      case 'fill-color':
      case 'border-color':
        {
          let color: Color|undefined;
          if (command.type === 'color') {
            color = command.active_color;
          }
          sheet.HandleToolbarMessage({
            command: command.key,
            color,
          });
        }
        break;

      case 'align-left':
        ApplyProperty(sheet, 'horizontal_align', 'left');
        sheet.Focus();
        break;

      case 'align-right':
        ApplyProperty(sheet, 'horizontal_align', 'right');
        sheet.Focus();
        break;

      case 'align-center':
        ApplyProperty(sheet, 'horizontal_align', 'center');
        sheet.Focus();
        break;

      case 'align-top':
        ApplyProperty(sheet, 'vertical_align', 'top');
        sheet.Focus();
        break;

      case 'align-middle':
        ApplyProperty(sheet, 'vertical_align', 'middle');
        sheet.Focus();
        break;

      case 'align-bottom':
        ApplyProperty(sheet, 'vertical_align', 'bottom');
        sheet.Focus();
        break;

      case 'function-docs':
        window.open('https://docs.riskamp.com', '_blank');
        break;

      case 'ai':
      case 'find':
      case 'names':
      case 'quick-view':
      case 'quick-view-correlation':
      case 'notes':
      case 'simulation-settings':
        if (active_sidebar() === command.key) {
          setSidebar(undefined);
        }
        else {
          setSidebar(command.key);
        }
        break;

      default:
        console.warn('unhandled', command.key);
        // setOpen(true);
    }

    sheet.Focus();

  }

  function InsertFunction() {
    OpenSignal[1](true);
  }

  /** 
   * hijack the dialog in an effect. we're relying on the fact
   * that the spreadsheet is only ever set once. 
   */
  createEffect(on(getSheet, sheet => {
    if (sheet) {
      HijackDialog(sheet);
    }
  }));

  /** show the sidebar when you select one (if it's hidden) */
  createEffect(on(sidebar, (value) => {
    if (value) {
      if (split() >= 90) {
        setSplit(sessionData.last_split); 
      }
    }
    else {
      setSplit(100);
    }
  }));

  /** FIXME: this should be part of a larger app state */
  createEffect(on(split, value => {
      if (value >= 90) {
        // setSidebar(undefined);
      }
      else {
        setSessionData({ last_split: value });
      }
    }, 
    { defer: true }
  ));

  function active_sidebar() {

    // I guess this has to be the threshold... that's unfortunate, we
    // should either have a visible/hidden signal or make the threshold
    // set split -> max

    if (split() < 90) {
      return sidebar();
    }
    return undefined;
  }

  return (
    <main class="app">
      
      <div>
        <Toolbar oncommand={HandleCommand} sidebar={active_sidebar} sheet={getSheet}/>
      </div>

      <div>
        <Splitter split={split} setSplit={setSplit} min={40} splitter-width={16} threshold={90}>
          <div data-left>
            <Spreadsheet fill bind={[getSheet, setSheet]} function-handler={() => InsertFunction()}/>
          </div>
          <div data-right>
            <Sidebar bind={[sidebar, setSidebar]} 
                     sheet={getSheet} 
                     oncommand={HandleCommand} 
                     split={split} ></Sidebar>
          </div>
        </Splitter>
      </div>  

      <SparklineDialog {...sparkline_props} sheet={getSheet} />
      <TrendForecastingDialog {...trend_forecast_props} sheet={getSheet} />

      <RunSimulationDialog open={RunSimulationSignal[0]} 
                           setOpen={RunSimulationSignal[1]}
                           auto-start={auto()}
                           additional-cells={additionalCells}
                           sheet={getSheet()} />


    </main>
  );
}
