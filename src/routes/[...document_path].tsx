
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

import { RunSimulationDialog } from '~/components/dialogs/test-dialog/run-simulation-dialog/run-simulation-dialog';
import { HijackDialog } from '~/lib/hijack-dialog';

function Spin() {
  spinner.show();
  setTimeout(() => {
    spinner.hide();
  }, 4000);
}

export default function Page() {

  const params = useParams();

  let initial_value = 40;

  onMount(() => {
    const text = localStorage.getItem('split');
    if (text) {
      setSplit(JSON.parse(text));
    }
    queueMicrotask(() => {
      setInitialized(true);
    });
  });

  const [split, setSplit] = createSignal(initial_value);
  const [initialized, setInitialized] = createSignal(false);
  const OpenSignal = createSignal(false);
  const [open, setOpen] = OpenSignal;
  const [getSheet, setSheet] = createSignal<SpreadsheetType|undefined>();
  const [sidebar, setSidebar] = createSignal<string|undefined>();

  const RunSimulationSignal = createSignal(false);
  const [auto, setAuto] = createSignal(false);

  // FIXME: move this to a lib file, it doesn't need to clog up this file
  function HandleCommand(command: ToolbarCommand & { key: ToolbarCommandKey}) {

    const sheet = getSheet();
    if (!sheet) {
      return;
    }

    switch (command.key) {
      case 'function-docs':
        OpenExternal('https://docs.riskamp.com');
        break;

      case 'run-simulation':
      case 'run-simulation-again':
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

      case 'ai':
      case 'find':
      case 'names':
      case 'quick-view':
      case 'quick-view-correlation':
      case 'notes':
      case 'simulation-settings':
        setSidebar(command.key);
        break;

      default:
        console.warn('unhandled', command.key);
        // setOpen(true);
    }

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


  createEffect(on(sidebar, (value) => {

    if (value) {

      console.info("Value", value, "split", split());

      if (split() >= 90) {
        setSplit(75);
      }
    }
    else {
      setSplit(100);
    }
  }));

  /** FIXME: this should be part of a larger app state */
  createEffect(
    on(
      split, 
      (value) => {
        localStorage.setItem('split', JSON.stringify(value));
        if (value >= 90) {
          setSidebar(undefined);
        }
      }, 
      { defer: true }
    )
  );

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
        <Toolbar oncommand={HandleCommand} sidebar={active_sidebar}/>
      </div>

      <div>
        <Splitter bind={[split, setSplit]} min={40} splitter-width={16} threshold={90}>
          <div data-left>
            <Spreadsheet fill bind={[getSheet, setSheet]} function-handler={() => InsertFunction()}/>
          </div>
          <div data-right>
            <Sidebar bind={[sidebar, setSidebar]}></Sidebar>
          </div>
        </Splitter>
      </div>  

      <TestDialog 
          bind={OpenSignal} 
          sheet={getSheet()} 
          closebox moveable resizeable />

      <RunSimulationDialog bind={RunSimulationSignal} 
                           auto-start={auto()}
                           sheet={getSheet()} />


    </main>
  );
}
