

import { CreateParameters, InteractiveDialog, 
         Parameter,
         type ParameterType as BaseParameterType,
         type Props as InteractiveDialogProps } from '~/components/interactive-dialog/interactive-dialog';
import style from './sparkline-dialog.module.css';
import { t } from '~/i18n/i18n';
import { createEffect, createSignal, Match, on, Show, Switch, type Signal } from 'solid-js';
import { bootstrap_icons } from 's5-icon-lib';
import { createStore, SetStoreFunction, StoreSetter } from 'solid-js/store';
import { IsArea, IsCellAddress } from '@trebco/treb/treb-base-types';
import { type SpreadsheetType } from '~/lib/spreadsheet-type';

type SparklineType = 'line'|'column';

export interface SparklineData {
  source?: string;
  target?: string;
  type?: SparklineType;
}

export interface SparklineProps {
  data: SparklineData;
  updateData: SetStoreFunction<SparklineData>;
}

type ParameterType = BaseParameterType & {
  key: keyof SparklineData;
}

export function SparklineDialog(props: InteractiveDialogProps & SparklineProps) {

  const [type, setType] = createSignal<SparklineType>('column');

  function AreaOrAddress(value: string, sheet?: SpreadsheetType) {
    if (sheet) {
      const resolved = sheet.Resolve(value);
      return IsArea(resolved) || IsCellAddress(resolved);
    }
    return false;
  }

  const parameters: ParameterType[] = CreateParameters([{
    key: 'source',
    validate: (value: string) => AreaOrAddress(value, props.sheet()),
  }, {
    key: 'target',
    validate: (value: string) => AreaOrAddress(value, props.sheet()),
  }]);

  createEffect(on(props.open, value => {
    if (value) {
      const data = props.data;
      setType(data.type || 'column');
      parameters[0].setInitialValue(data.source||'');
      parameters[1].setInitialValue(data.target||'');
    }
  }));  

  function Close(result: boolean) {
    if (result) {
      props.updateData({
        source: parameters[0].value(),
        target: parameters[1].value(),
        type: type(),
      });
    }
    props.setResult?.(result);
    props.setOpen(false);
  }


  return <>
    <InteractiveDialog {...props}>

      <header>
        {t('sparkline-dialog.title')}
      </header>

      <section>

        <div class="flex-column">
          <div class="flex-row gap-0_5">
            <span>{t('sparkline-dialog.sparkline-type')}</span>
            <select class="select" 
                    value={type()}
                    onchange={e => setType(e.currentTarget.value as SparklineType)}>
              <option value='column'>{t('sparkline-dialog.sparkline-type-column-chart')}</option>
              <option value='line'>{t('sparkline-dialog.sparkline-type-line-chart')}</option>
            </select>
          </div>
          <hr />
          <div class={style['parameters-table']}>

            <label>{t('sparkline-dialog.parameters.source.title')}</label>
            <Parameter show-validation parameter={parameters[0]} />

            <label>{t('sparkline-dialog.parameters.target.title')}</label>
            <Parameter show-validation parameter={parameters[1]} />

          </div>
          <hr/>
          <div>
            {t('sparkline-dialog.info')}
          </div>
        </div>
        
      </section>

      <footer>
          <button disabled={parameters.some(param => !param.valid?.())}
                  onclick={() => Close(true)}>{t('standard-buttons.accept.title')}</button>
          <button onclick={() => Close(false)}>{t('standard-buttons.cancel.title')}</button>
      </footer>

    </InteractiveDialog>
  </>;
}
