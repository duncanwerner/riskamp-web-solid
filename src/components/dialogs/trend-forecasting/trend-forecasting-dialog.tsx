
import { CreateParameters, InteractiveDialog, 
         Parameter,
         type ParameterType as BaseParameterType,
         type Props as InteractiveDialogProps } from '~/components/dialogs/interactive-dialog/interactive-dialog';
import style from './trend-forecasting-dialog.module.css';
import { t } from '~/i18n/i18n';
import { createEffect, createSignal, Match, on, onMount, Show, Switch, type Signal } from 'solid-js';
import { bootstrap_icons } from 's5-icon-lib';
import { createStore, SetStoreFunction, StoreSetter } from 'solid-js/store';
import { Area, IsArea, IsCellAddress } from '@trebco/treb/treb-base-types';
import { type SpreadsheetType } from '~/lib/spreadsheet-type';
import type { ForecastData } from './forecast';

import { Chart } from '@trebco/treb/treb-charts';
import { type ChartData } from '@trebco/treb/treb-charts/src/chart-types';
import { Scale, type RangeScale } from '@trebco/treb/treb-utils';
import { Heuristics } from '@trebco/treb/treb-data-model';
import type { Size } from '~/components/dialogs/dialog-base/dialog';

import './chart.css';

export interface ForecastProps {
  data: ForecastData;
  setData: SetStoreFunction<ForecastData>;
}

type ParameterType = BaseParameterType & {
  key: keyof ForecastData;
}

export function TrendForecastingDialog(props: InteractiveDialogProps & ForecastProps) {

  function ValidateArea(value: string, sheet?: SpreadsheetType) {
    if (sheet) {
      const resolved = sheet.Resolve(value);
      return IsArea(resolved) || IsCellAddress(resolved);
    }
    return false;
  }

  const parameters: ParameterType[] = CreateParameters([{
    key: 'timeline',
    validate: (value: string) => ValidateArea(value, props.sheet()),
  }, {
    key: 'values',
    validate: (value: string) => ValidateArea(value, props.sheet()),
  }]);

  createEffect(on(props.open, value => {
    if (value) {
      const data = props.data;
      // setType(data.type || 'column');
      parameters[0].setInitialValue(data.timeline||'');
      parameters[1].setInitialValue(data.values||'');
      RedrawChart();
    }
  }));  

  function Close(value: boolean) {
    props.setResult?.(value);
    props.setOpen(false);
  }

  let chart: Chart|undefined;
  let chart_container: HTMLDivElement|undefined;
  const [chartError, setChartError] = createSignal(false);

  function RedrawChart() {

    setChartError(false);

    try {

    const dates = props.data.timeline || ''; // parameters[0].value() || '';
    const values = props.data.values || ''; // parameters[1].value() || '';
    const sheet = props.sheet();

    if (dates && values && sheet && chart_container) {

      if (!chart) {
        chart = new Chart();
        chart.Initialize(chart_container);
      }

      const values_resolved = sheet.Resolve(values);
      let values_numbers: number[] = [];
      if (IsArea(values_resolved)) {
        const area = new Area(values_resolved.start, values_resolved.end);
        values_numbers = Heuristics.AllNumeric(area, (sheet as any).grid.active_sheet) || [];
      } 

      // values, timeline, seasonality, fill, aggregation, model type

      let params = sheet.Evaluate(`=RiskAMP.Forecast.Params(${values}, ${dates},${props.data.seasonality === undefined ? '' : props.data.seasonality},${props.data.fill === undefined ? '' : props.data.fill},${props.data.aggregation === undefined ? '' : props.data.aggregation},${props.data.type})`, { argument_separator: ','});
      // console.info({params});

      if (!Array.isArray(params)) {
        setChartError(true);
        chart.Clear();
        chart.Update();
        return;
      };

      const flat_params = params.flat();
      const seasonality = (flat_params[4] as number) || 0;
      const values_count = (flat_params[6] as number) || 0;

      const literal_params = `{${ params.flat().join(',') }}`;
      // console.info("LP", literal_params);

      // values, timeline, params, fill, aggregation

      let model = sheet.Evaluate(`=RiskAMP.Forecast.Model(${values}, ${dates}, ${literal_params},${props.data.fill === undefined ? '' : props.data.fill},${props.data.aggregation === undefined ? '' : props.data.aggregation})`, { argument_separator: ','});
      // console.info(model);

      if (!Array.isArray(model)) {
        setChartError(true);
        chart.Clear();
        chart.Update();
        return;
      };

      const flat_model = `{${ model.flat().join(',') }}`;
      const projections = props.data.periods; // Math.max(seasonality * 2, 10);

      let project = sheet.Evaluate(`=RiskAMP.Forecast.Project(${flat_model}, ${literal_params}, ${projections})`, { argument_separator: ',' });
      // console.info({project});

      // I guess it's possible you just project 1 value? or 0?

      if (!Array.isArray(project)) {
        if (typeof project !== 'number') {
          setChartError(true);
          chart.Clear();
          chart.Update();
        }
        project = [[project]];
      }
      const flat_project = project.flat() as number[];

      const x_scale = Scale(0, values_count + projections);
      const y_scale = Scale(Math.min(...values_numbers, ...flat_project), Math.max(...values_numbers, ...flat_project));

      const x1: number[] = [];
      const x2: number[] = [];

      for (let i = 0; i < values_numbers.length; i++) {
        x1.push(i);
      }

      for (let i = 0; i <= flat_project.length; i++) {
        x2.push(i + values_numbers.length - 1);
      }

      const last_number = values_numbers.slice(-1)[0] || 0;

      if (props.data.chart_type === 'column') {

        const chart_data: ChartData = {
          type: 'column',
          legend_position: 1,
          legend_style: 0,
          legend: [{
            label: t('forecast-dialog.chart-labels.values'),
            index: 1,
          }, {
            label: t('forecast-dialog.chart-labels.forecast'),
            index: 2,
          }],
          series2: [
            {
              x: {
                data: x1,
              },
              y: {
                data: [...values_numbers, ...flat_project.map(_ => undefined)],
              },
              index: 1,
            }, 
            {
              x: {
                data: x2,
              },
              y: {
                data: [...values_numbers.slice(0, -1).map(_ => undefined), last_number, ...flat_project],
              },
              index: 2,
            }, 
          ],
          scale: y_scale,
        };

        (chart as any).chart_data = chart_data;

      }
      else {
        const chart_data: ChartData = {
          type: 'scatter2',
          legend_position: 1,
          legend_style: 0,
          legend: [{
            label: t('forecast-dialog.chart-labels.values'),
            index: 1,
          }, {
            label: t('forecast-dialog.chart-labels.forecast'),
            index: 2,
          }],
          series: [
            {
              x: {
                data: x1,
              },
              y: {
                data: values_numbers,
              },
              index: 1,
            }, 
            {
              x: {
                data: x2,
              },
              y: {
                data: [last_number, ...flat_project],
              },
              index: 2,
            }, 
          ], // : [{x, y}],
          lines: true,
          x_scale,
          y_scale,
        };

        (chart as any).chart_data = chart_data;
      }
      chart.Update();
      
    }
    else console.info('missing', {
      dates, values, sheet, chart_container
    });

    }
    catch (err) {
      console.error(err);
      setChartError(true);
    }

  }

  createEffect(on(() => JSON.stringify(props.data), value => RedrawChart(), { defer: true }));

  createEffect(on([parameters[0].value, parameters[1].value], ([timeline, values]) => {
    props.setData({
      timeline, values,
    });
  }));

  createEffect(on(props.open, value => {
    if (value) {
      queueMicrotask(() => RedrawChart());
    }
  }));

  const bindsize = props.bindsize || createSignal<Size|undefined>(undefined);
  createEffect(on(bindsize[0], value => {
    chart?.Update();
  }));

  return <>
      <InteractiveDialog bindsize={bindsize} {...props}>

        <header>
          {t('forecast-dialog.title')}
        </header>

        <section>
          <div class={style.layout}>
            <div class={style.inputs}>
              <div class={style.group}>
                <label>{t('forecast-dialog.parameters.dates.title')}</label>
                <Parameter show-validation parameter={parameters[0]} />
              </div>

              <div class={style.group}>
                <label>{t('forecast-dialog.parameters.values.title')}</label>
                <Parameter show-validation parameter={parameters[1]} />
              </div>

              <div class={style.group}>
                <label>{t('forecast-dialog.settings')}</label>
                <div classList={{"simple-grid-table": true, [style.table]: true }}>

                  <div class="row">
                    <div>{t('forecast-dialog.options.forecast-type')}</div>
                    <select class="select" value={props.data.forecast_type} onchange={
                        e => {
                          const update: Partial<ForecastData> = { 
                            forecast_type: e.currentTarget.value as typeof props.data.forecast_type,
                          };
                          if (update.forecast_type === 'excel-compatible') {
                            update.type = 0; // force AAA
                          }
                          props.setData(update);
                        }
                      }>
                      <option value='excel-compatible'>{t('forecast-dialog.model-type.excel-compatible-forecast')}</option>
                      <option value='static'>{t('forecast-dialog.model-type.static-forecast')}</option>
                      <option value='stochastic'>{t('forecast-dialog.model-type.stochastic-forecast')}</option>
                    </select>
                  </div>

                  <div class="row">
                    <div>{t('forecast-dialog.options.model-type')}</div>
                      <select class="select" value={props.data.type} onchange={e => props.setData({ type: Number(e.currentTarget.value) as 0|1|2 })}>
                        <option value={0}>AAA</option>
                        <option value={1} disabled={props.data.forecast_type === 'excel-compatible'}>MAM</option>
                        <option value={2} disabled={props.data.forecast_type === 'excel-compatible'}>MAdM</option>
                      </select>
                  </div>

                  <div class="row">
                    <div>{t('forecast-dialog.parameters.seasonality')}</div>
                    <input class="input" 
                           type="text" 
                           value={props.data.seasonality || ''}
                           placeholder={t('forecast-dialog.seasonality.auto-detect')} 
                           onchange={e => {
                            if (!e.currentTarget.value) {
                              props.setData({ seasonality: undefined });
                            }
                            else {
                              props.setData({ seasonality: Number(e.currentTarget.value) || 0 });
                            }
                           }}
                           />
                  </div>

                  <div class="row">
                    <div>{t("forecast-dialog.parameters.fill-empty")}</div>
                    <select class="select" value={props.data.fill} onchange={
                        e => props.setData({ fill: (Number(e.currentTarget.value) || 0) as typeof props.data.fill }) }>
                      <option value={0}>{t('forecast-dialog.fill-options.interpolate')}</option>
                      <option value={1}>{t('forecast-dialog.fill-options.zeros')}</option>
                    </select>
                  </div>

                  <div class="row">
                    <div>{t("forecast-dialog.parameters.aggregate-multiple")}</div>
                    <select class="select" value={props.data.aggregation} onchange={
                        e => props.setData({ aggregation: (Number(e.currentTarget.value) || 0) as typeof props.data.aggregation})
                      }>
                      <option value={0}>{t('forecast-dialog.aggregate-options.average')}</option>
                      <option value={1}>{t('forecast-dialog.aggregate-options.median')}</option>
                      <option value={2}>{t('forecast-dialog.aggregate-options.min')}</option>
                      <option value={3}>{t('forecast-dialog.aggregate-options.max')}</option>
                      <option value={4}>{t('forecast-dialog.aggregate-options.sum')}</option>
                      <option value={5}>{t('forecast-dialog.aggregate-options.count')}</option>
                    </select>
                  </div>

                  <div class="row">
                    <div>{t('forecast-dialog.parameters.project-forward-periods')}</div>
                    <input class="input" type="text" value={props.data.periods} onchange={
                      e => props.setData({periods: Number(e.currentTarget.value)})
                    }/>
                  </div>

                  <div class="row">
                    <div>{t("forecast-dialog.parameters.chart-type.label")}</div>
                    <select class="select" value={props.data.chart_type} onchange={
                          e => props.setData({chart_type: e.currentTarget.value as typeof props.data.chart_type})}>
                      <option value='line'>{t('forecast-dialog.parameters.chart-type-line-chart')}</option>
                      <option value='column'>{t('forecast-dialog.parameters.chart-type-column-chart')}</option>
                    </select>
                  </div>

                </div>
              </div>

            </div>
            <div class={style.chart} ref={chart_container}></div>
          </div>

        </section>

        <footer>
          <button onclick={() => Close(true)} class="button">{t('forecast-dialog.create-forecast-sheet')}</button>
          <button onclick={() => Close(false)} class="button">{t('standard-buttons.cancel.title')}</button>
        </footer>

      </InteractiveDialog>
    </>;

}
