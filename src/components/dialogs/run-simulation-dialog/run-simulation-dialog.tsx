
import { Dialog, type Props as DialogProps } from '~/components/dialogs/dialog-base/dialog';
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

export interface Options {
  trials: number;
  seed: number;
  auto: boolean;
  additional_cells: string[];
}

interface Props extends DialogProps<boolean> {
  sheet: Accessor<SpreadsheetType|undefined>;
  options: Accessor<Partial<Options>>;
}

export function RunSimulationDialog(props: Props) {

  const [running, setRunning] = createSignal(false);
  const [progress, setProgress] = createSignal(0);
  const [trials, setTrials] = createSignal(0);

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
    if (running()) {
      props.sheet()?.AbortSimulation();
      setRunning(false);
    }
    else {
      props.setOpen(false);
    }
  }

  function Start() {
    const sheet = props.sheet();
    if (sheet) {

      const additional_cells: ICellAddress[] = [];
      const options = props.options();

      if (options?.additional_cells) {
        for (const cell of options?.additional_cells) {
          const resolved = sheet.Resolve(cell);
          if (IsCellAddress(resolved)) {
            additional_cells.push(resolved);
          }
          else if (IsArea(resolved)) {
            additional_cells.push(resolved.start);
          }
        }
      }

      const seed = sheet.user_data?.simulation?.seed || 0;

      setRunning(true);
      sheet.RunSimulation(trials(), {
          abort_on_dialog_close: false,
          lhs: persistentData.lhs,
          stepped: persistentData.stepped ? 25 : false,
          additional_cells,
          seed: seed === 0 ? undefined : seed, // this is clunky
        });
    }
  }

  let subscription = 0;

  function HandleEscape(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.stopPropagation();
      event.preventDefault();
      Stop();
    }
  }

  createEffect(on(props.open, value => {
    if (value) {

      setProgress(0);
      const sheet = props.sheet();
      window.addEventListener('keydown', HandleEscape);

      if (sheet) {

        setTrials(sheet.user_data?.simulation?.trials || persistentData.trials);

        subscription = sheet.Subscribe((event: MCEmbeddedSheetEvent|EmbeddedSheetEvent) => {
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

        if (props.options()?.auto) {
          queueMicrotask(() => Start());
        }

      }
    }
    else {
      const sheet = props.sheet();
      if (sheet && subscription) {
        sheet.Cancel(subscription);
        subscription = 0;
      }
      window.removeEventListener('keydown', HandleEscape);
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
    if (event.target instanceof HTMLInputElement) {

      const sheet = props.sheet();
      if (sheet) {
        let value = sheet.ParseNumber(event.target.value || '');
        if (typeof value === 'number' && value > 0 && !isNaN(value)) {
          const num = value;
          setPersistentData(produce(s => { s.trials = num; }));
          const user_data = sheet.user_data || {};
          user_data.simulation = user_data.simulation || {};
          user_data.simulation.trials = value;
          sheet.user_data = user_data;
        }
        else {
          value = trials();
        }
        event.target.value = number_format.Format(value);
      }
    }
  }

  function InputKeyDown(event: KeyboardEvent) {
    if (event.target instanceof HTMLInputElement) {
      if (event.key === 'Enter') {
        event.stopPropagation();
        event.preventDefault();
        event.target.blur();
        queueMicrotask(() => Start());
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
                 onkeydown={InputKeyDown}
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
        <div class={style.buttons}> 
          <button autofocus class="button" onclick={Start} disabled={running()}>{t('run-simulation-start-label')}</button>
          <button class="button" onClick={Stop} >{close_label()}</button>
        </div>
      </footer>
    </Dialog>
  </>;
}