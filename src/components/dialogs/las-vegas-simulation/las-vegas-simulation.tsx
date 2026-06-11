
import { createEffect, createMemo, createSignal, For, Match, on, Switch } from 'solid-js';
import { CreateParameters, InteractiveDialog, Parameter, type Props } from '../interactive-dialog/interactive-dialog';
import { I18N, t } from '~/i18n/i18n';
import { EmbeddedSheetEvent, ICellAddress, MCEmbeddedSheetEvent } from 'riskamp-web';
import { Size } from '../dialog-base/dialog';
import { bootstrap_icons } from 's5-icon-lib';
import style from './las-vegas-simulation.module.css';
import { SpreadsheetType } from '~/lib/spreadsheet-type';
import { IsCellAddress } from '@trebco/treb/treb-base-types';
import { persistentData, setPersistentData } from '~/lib/app-data';
import { produce } from 'solid-js/store';
import { info } from 'node:console';

const [open, setOpen] = createSignal(false);

export const props: Omit<Props, 'sheet'> = {
  open, 
  setOpen,
};

interface ParameterType {
  label: keyof I18N;
  info: keyof I18N;
  validate?: (value: string) => boolean;
}

export function Dialog(props: Props) {

  let subscription = 0;
  const bindsize = createSignal<Size|undefined>({width: 360, height: 420});
  const [running, setRunning] = createSignal(false);


  function Cancel() {
    if (running()) {
      props.sheet()?.AbortSimulation();
    }
    else {
      props.setOpen(false);
    }
  }

  function HandleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      if (running()) {
        props.sheet()?.AbortSimulation();
      }
      else {
        props.setOpen(false);
      }
    }
  }

  function ValueType(value: string): { type: 'number', value: number } | { type: 'address', value: ICellAddress } | undefined {
    const sheet = props.sheet();
    if (sheet) {
      const n = sheet.ParseNumber(value);
      if (typeof n === 'number' && n > 0 && !isNaN(n) && n !== Infinity) {
        return {type: 'number', value: n};
      }

      const ref = sheet.Resolve(value);
      if (IsCellAddress(ref)) {
        return {type: 'address', value: ref};
      }

    }
    return undefined;
  }

  function ValidateAddress(value: string): boolean {
    const type = ValueType(value);
    return type?.type === 'address';
  }

  function ValidateAddressOrNumber(value: string): boolean {
    const type = ValueType(value);
    return type?.type === 'address'||type?.type === 'number';
  }

  function ValidateOptionalAddressOrNumber(value: string): boolean {
    if (!value) {
      return true;
    }
    const type = ValueType(value);
    return type?.type === 'address'||type?.type === 'number';
  }

  const parameters = CreateParameters<ParameterType>([
    {
      label: 'las-vegas-simulation.inputs.accept.title',
      info: 'las-vegas-simulation.inputs.accept.description',
      validate: ValidateAddress,
    }, {
      label: 'las-vegas-simulation.inputs.complete.title',
      info: 'las-vegas-simulation.inputs.complete.description',
      validate: ValidateAddressOrNumber,
    }, {
      label: 'las-vegas-simulation.inputs.fail.title',
      info: 'las-vegas-simulation.inputs.fail.description',
      validate: ValidateOptionalAddressOrNumber,
    }
  ]);

  function InitParameters(sheet: SpreadsheetType) {
    const user_data = sheet.user_data;
    parameters[0].setInitialValue(user_data?.lv?.accept || '');
    parameters[1].setInitialValue(user_data?.lv?.terminate || '');
    parameters[2].setInitialValue(user_data?.lv?.fail || '');
  }

  function ValidateAndSave(sheet: SpreadsheetType) {

    // FIXME: we should only save valid parameters, no?

    const user_data = sheet.user_data || {};
    if (!user_data?.lv) {
      user_data.lv = {};
    }

    const accept_value = ValueType(parameters[0].value());
    if (accept_value?.type === 'address') {
      user_data.lv.accept = parameters[0].value();
    }
    else {
      return false;
    }

    const terminate_value = ValueType(parameters[1].value());
    if (terminate_value?.type === 'address') {
      user_data.lv.terminate = parameters[1].value();
    }
    else if (terminate_value?.type === 'number') {
      user_data.lv.terminate = terminate_value.value.toString();
    }
    else {
      return false;
    }

    if (parameters[2].value()) {
      const fail_value = ValueType(parameters[2].value());
      if (fail_value?.type === 'address') {
        user_data.lv.fail = parameters[2].value();
      }
      else if (fail_value?.type === 'number') {
        user_data.lv.fail = fail_value.value.toString();
      }
      else {
        return false;
      }
    }
    else {
      user_data.lv.fail = '';
    }

    sheet.user_data = user_data;
    return true;

  }

  /*
  createEffect(on([parameters[0].value, parameters[1].value, parameters[2].value], values => {
    const sheet = props.sheet();
    if (sheet) {
      SaveParameters(sheet);
    }
  }));
  */

  createEffect(on(props.open, open => {
    if (open) {
      const sheet = props.sheet();
      if (sheet) {
        if (subscription) {
          sheet.Cancel(subscription);
        }
        subscription = sheet.Subscribe((event: EmbeddedSheetEvent|MCEmbeddedSheetEvent) => {
          switch (event.type) {
            case 'simulation-aborted':
              setRunning(false);
              setInfo('');
              break;
      
            case 'simulation-complete':
              setRunning(false);
              setInfo('');
              setOpen(false);
              break;
      
            case 'simulation-progress':
              setInfo(t('las-vegas-simulation.running-simulation'));
              // progress = event.progress;
              // console.info(event);
              break;
      
          }
        });
        InitParameters(sheet);
      }
      window.addEventListener('keydown', HandleKeyDown);
      requestAnimationFrame(() => {

      });
    }
    else {
      const sheet = props.sheet();
      if (sheet) {
        if (subscription) {
          sheet.Cancel(subscription);
        }
      }
      window.removeEventListener('keydown', HandleKeyDown);
      setInfo('');
    }
  }));

  const [failValid, setFailValid] = createSignal('');

  function Start() {
    if (running()) {
      return;
    }

    const sheet = props.sheet();
    if (sheet) {

      const valid = ValidateAndSave(sheet);
      if (!valid) {
        // warn
        return;
      }
      
      const user_data = sheet.user_data || {};
      const lv = user_data.lv || {};
      if (!lv.accept) {
        // fail
        return;
      }
      if (!lv.terminate) {
        // fail
        return;
      }

      const lhs_samples = 1000;
      const lv_config = JSON.parse(JSON.stringify(lv));
      const seed = sheet.user_data?.simulation?.seed ?? undefined;

      setRunning(true);

      sheet.RunSimulation(lhs_samples, { // trials, {
        // additional_cells,
        stepped: persistentData.stepped ? 25 : false,
        abort_on_dialog_close: false,
        // replay,
        lhs: !!persistentData.lhs,
        seed,
        workers: 1,
        lv_config,    
      });

    }
  }

  let [info, setInfo] = createSignal('');
  let start_button: HTMLButtonElement|undefined;

  const allValid = createMemo(() => {
    return parameters[0].valid() && parameters[1].valid() && parameters[2].valid();
  });

  function UpdateInfo(info?: keyof I18N) {
    if (info) {
      setInfo(t(info));
    }
    else {
      setInfo('');
    }
  }

  function close_label() {
    if (running()) {
      return t('run-simulation-cancel-label');
    }
    else {
      return t('dialog-close-label');
    }
  };

  return <>
      <InteractiveDialog moveable 
                         bindsize={bindsize}
                         help="https://riskamp.com/las-vegas-simulation/"
                         {...props}>
        <header>
          {t('las-vegas-simulation-panel.title')}
        </header>
        <section class={style.layout}>
          <div class={style.table}>

            <For each={parameters}>
              {parameter => 
                <div class={style.row}>
                  <div>{t(parameter.label)}</div>
                  <Parameter parameter={parameter} 
                            focusin={e => UpdateInfo(parameter.info)}
                            focusout={e => UpdateInfo()}
                            show-validation />
                </div>
              }
            </For>
          </div>

          <hr />

          <div class={style.info}>
            <p>{t('las-vegas-simulation.options-overview')}</p>
            <p>{info()}</p>
          </div>

          <hr />

          <div class={style.controls}>
            <div class={style.centered}>
              <label>
                <input disabled={running()} 
                        type="checkbox" 
                        onchange={e => setPersistentData(produce(s => { s.stepped = e.currentTarget.checked; })) }
                        checked={persistentData.stepped}></input>
                <span>{t('run-simulation.screen-updates')}</span>
              </label>
            </div>

            <div class={style.buttons}>
              <button class="control-button"
                      onclick={() => Start()} 
                      ref={start_button}
                      disabled={running() || !allValid()} >
                        {t('run-simulation-start-label')}</button>
              <button class="control-button" onclick={Cancel} innerText={close_label()} />
            </div>
          </div>

        </section>
      </InteractiveDialog>
    </>;

}
