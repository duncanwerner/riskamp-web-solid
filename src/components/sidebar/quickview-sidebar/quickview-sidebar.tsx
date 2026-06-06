
import style from '../sidebar.module.css';
import { Register } from '../registry';
import { I18N, t } from '~/i18n/i18n';
import { createMutable } from 'solid-js/store';
import { createEffect, createMemo, createSignal, For, Match, on, onCleanup, onMount, Show, Switch } from 'solid-js';

import FindWorker from './find-worker?worker';
import { type SidebarProps } from '../sidebar-main';
import { EmbeddedSheetEvent } from '@trebco/treb';
import { Area, IsArea, IsCellAddress } from '@trebco/treb/treb-base-types';
import { bootstrap_icons } from 's5-icon-lib';

import { CreateParameters,  
         Parameter,
         type ParameterType as BaseParameterType } from '~/components/interactive-dialog/interactive-dialog';
import { HandleInput, HandleFocusIn, HandleKeyDown, Init, UpdateNodes, UpdateDependencies } from '~/lib/interactive-components';

import { InteractiveSidebar } from '../interactive-sidebar';
import { PersistentData, persistentData, setPersistentData } from '~/lib/app-data';

import { QuickSort } from  '@trebco/treb/treb-charts/src/quicksort';
import { MCChart } from 'riskamp-web/mc-charts';
import * as ChartUtils from '@trebco/treb/treb-charts/src/chart-utils';
import { NumberFormatCache } from '@trebco/treb/treb-format';

import './quickview-charts.css';
import { ToolbarCommands } from '~/components/toolbar/toolbar-commands';
import { MCEmbeddedSheetEvent } from 'riskamp-web';

function Variance(data: number[], sample = false) {
  const len = data.length;
 
  let m = 0;
  let v = 0;

  for (let i = 0; i < len; i++) m += data[i];

  m /= len;

  for (let i = 0; i < len; i++) {
    const d = data[i] - m;
    v += (d * d);
  }

  return sample ? (v / (len-1)) : (v/len);
}

export function Sidebar(props: SidebarProps) {


  /*
  const parameters: BaseParameterType[] = CreateParameters([{}]);
  let root_node: HTMLDivElement|undefined;

  onMount(() => {
    if (props.sheet && root_node) {
      Init(root_node, props.sheet, false);
    }
  });

  onCleanup(() => {
    props.sheet?.ExternalEditor(); // flush
  });

  let original_selection = '';

  function FocusIn(event: FocusEvent) {
    const sheet = props.sheet;
    if (sheet) {
      original_selection = sheet.GetSelection(true) || '';
      sheet.Select();
    }
    HandleFocusIn(event);
  }

  function FocusOut(event: FocusEvent) {
    // restore selection
    if (original_selection) {
      props.sheet?.Select(original_selection);
    }
  }

  return <div class={style['quick-view-layout']}>
    <div ref={root_node}
         oninput={e => HandleInput(e, root_node as HTMLElement, props.sheet, / * props.update * /)} 
         onfocusin={FocusIn} 
         onfocusout={FocusOut}
         onkeydown={e => HandleKeyDown(e, root_node as HTMLElement)} 
         class="display-contents">
      <Parameter parameter={parameters[0]} />
    </div>
    <div>mid</div>
    <div>not</div>
  </div>;

  */

  const charts = {
    histogram: new MCChart(),
    boxplot: new MCChart(),
  };

  function Resize() {
    charts.histogram.Update();
    charts.boxplot.Update();
  }

  let parameter_element: HTMLDivElement|undefined;
  let initial_value = props.sheet()?.GetSelection(true) || '';
  let chart_containers: HTMLDivElement[] = [];
  let subscription = 0;

  onMount(() => {
    requestAnimationFrame(() => {
      parameter_element?.focus();
      charts.histogram.Initialize(chart_containers[0]);
      charts.boxplot.Initialize(chart_containers[1]);
      RedrawInternal();
    });

    window.addEventListener('resize', Resize);
    subscription = props.sheet()?.Subscribe((event: MCEmbeddedSheetEvent|EmbeddedSheetEvent) => {
      switch (event.type) {
        case 'simulation-progress':
        case 'simulation-complete':
          RedrawInternal();
          break;
      }
    }) || 0;


  });

  onCleanup(() => {
    window.removeEventListener('resize', Resize);
    if (subscription) {
      props.sheet()?.Cancel(subscription);
    }
  });

  /////////

  let number_format = 'General';
  let number_format_general = false;

  // let no_data = false;

  const [noData, setNoData] = createSignal(false); 

  interface BoxStatsRow {
    label: keyof I18N;
    value: string;
  }

  const [boxStatsTable, setBoxStatsTable] = createSignal<(BoxStatsRow|'separator')[]>([]);
  
function RedrawInternal() {

  const sheet = props.sheet();
  
  const selected_cell = parameter_element?.textContent || '';

  // console.info({selected_cell, sheet});

  if (!sheet || !selected_cell) {
    return;
  }

  // get style

  let style = sheet.GetStyle(selected_cell);
  if (Array.isArray(style)) {
    style = style[0][0];
  }
  number_format = style?.number_format || 'General';

  number_format_general = (number_format === 'General');
  const format = NumberFormatCache.Get(number_format);

  // FIXME: there's a difference between drawing and redrawing, right?
  // much of this is probably wasteful. we only need to _draw_ when 
  // the cell changes or the simulation changes. _redraw_ doesn't need
  // to recalculate stats.

  setNoData(true);
  // cell_empty = true;
  // box_stats_table = [];
  setBoxStatsTable([]);

  // also we can short-circuit the "no data" state

  const data = sheet.SimulationData(selected_cell);
  if (!data || !data.length) {

    charts.boxplot.Clear();
    charts.boxplot.Update();

    charts.histogram.Clear();
    charts.histogram.Update();
    return;

  }

  setNoData(false);
  // cell_empty = false;

  const sorted = Array.from(data);
  QuickSort(sorted);
  const box_stats = ChartUtils.BoxStats(sorted);
  const variance = Variance(sorted);

  setBoxStatsTable([

    { label: 'quick-view-dialog.stats-label.max', value: format.Format(box_stats.max)},

    { label: 'quick-view-dialog.stats-label.third_quartile', value: format.Format(box_stats.quartiles[2])},
    { label: 'quick-view-dialog.stats-label.median', value: format.Format(box_stats.quartiles[1])},
    { label: 'quick-view-dialog.stats-label.first_quartile', value: format.Format(box_stats.quartiles[0])},

    { label: 'quick-view-dialog.stats-label.min', value: format.Format(box_stats.min)},

    'separator',
    { label: 'quick-view-dialog.stats-label.interquartile-range', value: format.Format(box_stats.iqr)},
    { label: 'quick-view-dialog.stats-label.mean', value: format.Format(box_stats.mean)},
    { label: 'quick-view-dialog.stats-label.variance', value: format.Format(variance)},
    { label: 'quick-view-dialog.stats-label.standard-deviation', value: format.Format(Math.sqrt(variance))},
    'separator',
    { label: 'quick-view-dialog.stats-label.number-of-samples', value: sheet.FormatNumber(data.length, '#,##0') },

  ]);

  switch (persistentData.quickview_tab) {
    case 1:
      charts.boxplot.CreateBoxPlot(data, persistentData.quickview_minmax === 'minmax');
      charts.boxplot.Update();
      break;

    case 0:
      {
        // console.info(persistentData.quickview_bin_algorithm || 'auto');
        const histogram_data = sheet.Evaluate(`=MC.Histogram(${selected_cell},,,"${persistentData.quickview_bin_algorithm || 'auto'}")`, { argument_separator: ','});

        if (Array.isArray(histogram_data)) {

          // this is reflected parameters, with the first parameter
          // switched for metadata

          const metadata = histogram_data[0] as unknown as { type: number, value: { simulation_data?: number[]|Float32Array|Float64Array }, key: string };

          if (metadata?.value?.simulation_data?.length) {
            charts.histogram.CreateHistogram(histogram_data as any);
            charts.histogram.Update();
          }

        }
        else {
          console.info("Narray", histogram_data);
        }
      }
      break;
  }


}

  /////////

  function FocusIn(event: FocusEvent) {
    const address = parameter_element?.textContent || '';
    const sheet = props.sheet();
    if (address && sheet) {
      let resolved = sheet.Resolve(address);
      if (IsArea(resolved)) {
        resolved = resolved.start;
      }
      if (IsCellAddress(resolved)) {
        if (resolved.sheet_id && resolved.sheet_id !== sheet.grid.active_sheet.id) {
          sheet.grid.ActivateSheetID(resolved.sheet_id);
        }
        sheet.ScrollIntoView(resolved, true);
      }
    }
  }

  function FocusOut(Event: FocusEvent) {
    requestAnimationFrame(() => {
      if (parameter_element) {
        props.sheet()?.Select(parameter_element.textContent || '');
      }
    });
  }

  const tab_group_name = crypto.randomUUID();

  let timeout = 0;
  function TollRedraw() {
    if (!timeout) {
      timeout = window.setTimeout(() => {
        RedrawInternal();
        timeout = 0;
      }, 100);
    }
  }

  createEffect(on(props.split, value => {
    if (value < 90) {
      Resize();
    }
  }));

  createEffect(on([
      () => persistentData.quickview_tab, 
      () => persistentData.quickview_minmax, 
      () => persistentData.quickview_bin_algorithm ], values => {
        RedrawInternal();
  }));

  function RunSimulation() {
    
    // props.sheet?.RunSimulation(1000);
    props.oncommand({ 
      ...ToolbarCommands['run-simulation-again'], 
      key: 'run-simulation-again',
      additional_data: [
        parameter_element?.textContent || '',
      ]
    });
  }

  return <InteractiveSidebar {...props}>
    <div classList={{
        [style['quick-view-layout']]: true,
        'quick-view': true,
      }}>
      <div class="flex-row">
        <div class="reference-editor tc flex-grow" 
              data-selection-target 
              tabindex="0"
              role="textbox" 
              spellcheck="false"
              contenteditable="true"
              onfocusout={FocusOut}
              onfocusin={FocusIn}
              oninput={e => TollRedraw()}
              onchange={e => TollRedraw()}
              ref={parameter_element}>{initial_value}</div>
      </div>

        <div class="tab-container">
          <div class="tab-pane">
            <label class="tab">
              <input type="radio" 
                     data-label={t('quick-view-dialog.tab-histogram')} 
                     name={tab_group_name} 
                     checked={persistentData.quickview_tab === 0} 
                     onchange={e => {if (e.currentTarget.checked){ 
                        setPersistentData({ quickview_tab: 0 })}}} />
            </label>
            <div class="tab-content">
              <div classList={{[style['chart-container']]: true }}
                   ref={chart_containers[0]} />
            </div>
          </div>
          <div class="tab-pane">
            <label class="tab">
              <input type="radio" 
                     data-label={t('quick-view-dialog.tab-box-plot')} 
                     name={tab_group_name} 
                     checked={persistentData.quickview_tab === 1} 
                     onchange={e => {if (e.currentTarget.checked){ 
                        setPersistentData({ quickview_tab: 1 })}}} />
            </label>
            <div class="tab-content">
              <div classList={{[style['chart-container']]: true }}
                   ref={chart_containers[1]} />
            </div>
          </div>
          <div class={style.trailer}>
            <Switch>
              <Match when={persistentData.quickview_tab === 0}>
                <select class="select" 
                        value={persistentData.quickview_bin_algorithm}
                        onchange={
                          e => setPersistentData({
                            quickview_bin_algorithm: e.currentTarget.value as PersistentData['quickview_bin_algorithm'] 
                          })}>
                  <option value='fd'>FD</option>
                  <option value='sturges'>Sturges</option>
                  <option value='ss'>SS</option>
                  <option value='auto'>{t('quick-view-dialog.bin-algorithm-automatic')}</option>
                </select>
              </Match>
              <Match when={persistentData.quickview_tab === 1}>
                <select class="select" 
                        onchange={
                          e => setPersistentData({
                            quickview_minmax: e.currentTarget.value as PersistentData['quickview_minmax']
                          })}
                        value={persistentData.quickview_minmax}>
                  <option value="minmax">{t('quick-view-dialog.box-plot-whisker-type-minmax')}</option>
                  <option value="iqr">
                    {props.sheet()?.FormatNumber(1.5, '0.0')}x {t('quick-view-dialog.box-plot-whisker-type-interquartile-range')}
                  </option>
                </select>
              </Match>
            </Switch>
          </div>

          <div classList={{ [style.visible]: noData(), [style['no-data']]: true }}>
            <div innerHTML={
              t('quick-view-dialog.no-data').split(/\n/g).map(para => `<p>${para}</p>`).join('\n')
            } />
            <button onclick={() => RunSimulation()}>
              <span innerHTML={ToolbarCommands['run-simulation'].icon} />
              <span>{t(ToolbarCommands['run-simulation'].title)}</span>
            </button>
          </div>

        </div>

          <div class={style['box-stats-table']}>
            <For each={boxStatsTable()}>
              {row => <>
                <Switch>
                  <Match when={row === 'separator'}>
                    <div class={style.separator} />
                  </Match>
                  <Match when={true}>
                    <div class={style.row}>
                      <div>{t((row as BoxStatsRow).label)}</div>
                      <div>{(row as BoxStatsRow).value}</div>
                    </div>
                  </Match>
                </Switch>
              </>}
            </For>
          </div>

    </div>
  </InteractiveSidebar>;

}

Register('quick-view', Sidebar);
