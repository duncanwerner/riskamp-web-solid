
import { Dialog, type Props as DialogProps } from '~/components/dialog-base/dialog';
import { SpreadsheetType } from '~/lib/spreadsheet-type';
import { Accessor, createEffect, createSignal, on, splitProps } from 'solid-js';
import { t } from '~/i18n/i18n';
import style from './run-simulation-dialog.module.css';
import { EmbeddedSheetEvent, MCEmbeddedSheetEvent } from 'riskamp-web';
import { NumberFormatCache } from '@trebco/treb/treb-format';
import { sessionData, persistentData, setPersistentData } from '~/lib/app-data';
import { produce } from 'solid-js/store';
import { ICellAddress } from '@trebco/treb';
import { IsArea, IsCellAddress } from '@trebco/treb/treb-base-types';

interface Props extends DialogProps<boolean> {
  sheet?: SpreadsheetType;
  'auto-start'?: boolean;
  'additional-cells': Accessor<string[]>;
}

export function RunSimulationDialog(props: Props) {

  const [local, base_props] = splitProps(props, ['sheet', 'auto-start']);
  const [running, setRunning] = createSignal(false);
  const [progress, setProgress] = createSignal(0);

  // const [screenUpdates, setScreenUpdates] = createSignal(true);
  // const [trials, setTrials] = createSignal(5000);

  const number_format = NumberFormatCache.Get('#,##0');

  function progress_message() {
    /*
    if (starting) {
      return t('run-simulation.starting');
    }
    */
    return `${progress()}% ${t('run-simulation.percent-complete')}`;
  }

  function Stop() {
    
  }

  function Start() {
    if (local.sheet) {

      console.info("AC", props['additional-cells']());

      const additional_cells: ICellAddress[] = [];
      for (const cell of props['additional-cells']?.() || []) {
        const resolved = local.sheet.Resolve(cell);
        if (IsCellAddress(resolved)) {
          additional_cells.push(resolved);
        }
        else if (IsArea(resolved)) {
          additional_cells.push(resolved.start);
        }
      }

      setRunning(true);
      local.sheet.RunSimulation(persistentData.trials, {
        abort_on_dialog_close: false,
        // TODO lhs
        stepped: persistentData.stepped ? 25 : false,
        additional_cells,
      });
    }
  }

  let subscription = 0;

  createEffect(on(props.open, value => {
    if (value) {

      setProgress(0);

      if (local.sheet) {
        subscription = local.sheet.Subscribe((event: MCEmbeddedSheetEvent|EmbeddedSheetEvent) => {
          switch (event.type) {
            case 'simulation-complete':
              setRunning(false);
              props.setOpen(false);
              break;

            case 'simulation-aborted':
              setRunning(false);
              break;

            case 'simulation-progress':
              setProgress(event.progress);
              // starting = false;
              break;

            case 'simulation-progress-complete':
              setProgress(100);
              break;

          }
        });

        if (local['auto-start']) {
          queueMicrotask(() => Start());
        }

      }
    }
    else {
      if (subscription) {
        local.sheet?.Cancel(subscription);
        subscription = 0;
      }
    }
  }));

  function close_label() {
    if (running()) {
      return t('run-simulation-cancel-label');
    }
    else {
      return t('dialog-close-label');
    }
  };

  function UpdateTrials(event: Event) {
    if (event.currentTarget instanceof HTMLInputElement) {
      let value = Number(event.currentTarget.value);
      if (value <= 0 || isNaN(value)) {
        value = persistentData.trials;
        event.currentTarget.value = number_format.Format(value);
      }
      else {
        setPersistentData(produce(s => { s.trials = value; }));
        event.currentTarget.value = number_format.Format(value);
      }
    }
  }

  return <>
    <Dialog moveable {...props} escape={false}>
      <header>
        <span>{t('run-simulation-dialog-title')}</span>
      </header>
      <section class={style.layout}>
        <div>
          <span>{t('run-simulation.number-of-trials')}</span>
          <input disabled={running()} 
                 value={number_format.Format(persistentData.trials)}
                 onchange={UpdateTrials}
                 type="text" 
                 class="input"></input>
        </div>
        <div>
          <label>
            <input disabled={running()} 
                   type="checkbox" 
                   onchange={e => setPersistentData(produce(s => { s.stepped = e.currentTarget.checked; })) }
                   checked={persistentData.stepped}></input>
            <span>{t('run-simulation.screen-updates')}</span>
          </label>
        </div>
        <div class={style.progress}>
          <div class={style["progress-bar-frame"]}>
            <div class={style["progress-bar"]} style={{
              width: `${progress()}%`
            }}></div>
          </div>
          <div class={style["progress-bar-label"]}>{progress_message()}</div>
        </div>
      </section>
      <footer>
        <div> 
          <button autofocus class="button" onclick={Start} disabled={running()}>{t('run-simulation-start-label')}</button>
          <button class="button" onClick={Stop} >{close_label()}</button>
        </div>
      </footer>
    </Dialog>
  </>;
}