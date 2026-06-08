
import style from '../sidebar.module.css';
import { Register } from '../registry';
import { t } from '~/i18n/i18n';
import { createMutable } from 'solid-js/store';
import { createEffect, createMemo, createSignal, For, Match, on, onCleanup, onMount, ParentProps, Show, Switch } from 'solid-js';

import FindWorker from './find-worker?worker';
import { type SidebarProps } from '../sidebar-main';
import { EmbeddedSheetEvent } from '@trebco/treb';
import { IsCellAddress, Area } from '@trebco/treb/treb-base-types';
import { bootstrap_icons } from 's5-icon-lib';
import { createSign } from 'node:crypto';
import { InteractiveSidebar } from '../interactive-sidebar';
import { Heuristics } from '@trebco/treb/treb-data-model';
import { NumberFormatCache } from '@trebco/treb/treb-format';
import { RenderGraph } from './util';
import { MCEmbeddedSheetEvent } from 'riskamp-web';
import { persistentData } from '~/lib/app-data';

export function Sidebar(props: SidebarProps) {

  let parameter_element: HTMLDivElement|undefined;
  let initial_value = props.sheet()?.GetSelection(true) || '';
  const [data, setData] = createSignal<number[]>([]);
  // let distribution_select: HTMLSelectElement|undefined;
  const [selectedIndex, setSelectedIndex] = createSignal(0);
  let chart_container: HTMLDivElement|undefined;

  let number_format = 'General';
  let subscription = 0;

  function Resize() {
    if (chart_container) {
      const rect = chart_container.getBoundingClientRect();
      setGraphSize({
        width: Math.floor(rect.width),
        height: Math.floor(rect.height),
      });
    }
  }

  onMount(() => {
    requestAnimationFrame(() => {
      parameter_element?.focus();
      // RedrawInternal();
    });

    const sheet = props.sheet();
    if (sheet) {
      if (subscription) {
        sheet.Cancel(subscription);
      }
      subscription = sheet.Subscribe((event: EmbeddedSheetEvent|MCEmbeddedSheetEvent) => {
        switch (event.type) {
          case 'simulation-complete':
            TollUpdate();
            break;
        }
      });
    }

    window.addEventListener('resize', Resize);
    requestAnimationFrame(() => {
      TollUpdate();
      Resize();
    });

  });

  onCleanup(() => {
    window.removeEventListener('resize', Resize);
    const sheet = props.sheet();
    if (sheet && subscription) {
      sheet.Cancel(subscription);
      subscription = 0;
    }
  });

  function FocusOut(event: FocusEvent) {
    // placeholder
  }

  function FocusIn(event: FocusEvent) {
    // placeholder
  }

  createEffect(on(props.split, value => {
    if (value < 90) {
      Resize();
    }
  }));


  function KeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.stopPropagation();
      event.preventDefault();
      props.sheet()?.Focus();
    }
  }

  const fitResults = createMemo(() => {
    const _data = data();
    const sheet = props.sheet();
    if (!sheet || _data.length <= 2) {
      return [];
    }
    const fr = sheet.Fit(data(), "Value");
    // console.info({data, fr});
    return fr;
  });

  const results = createMemo(on([fitResults, selectedIndex], values => {
    const index = selectedIndex();
    const results = fitResults()[index];
    return results || undefined;
  }));

  const errorTable = createMemo(() => {
    const error_table: string[][] = [
        [t('fit-data-panel.statistics.mean_square_error')],
        [t('fit-data-panel.statistics.aggregate_error')],
        [t('fit-data-panel.statistics.max_error')],
        [t('fit-data-panel.statistics.mean_error')],
      ];
    const selected = results();
    const sheet = props.sheet();
    if (selected && sheet) {
      error_table[0][1] = sheet?.FormatNumber(selected.error.mean_square, 'General') || '';
      error_table[1][1] = sheet?.FormatNumber(selected.error.aggregate, 'General') || '';
      error_table[2][1] = sheet?.FormatNumber(selected.error.max, 'General') || '';
      error_table[3][1] = sheet?.FormatNumber(selected.error.mean, 'General') || '';
    }
    return error_table;
  });

  const spreadsheetFunction = createMemo(() => {
    const selected = results();
    const sheet = props.sheet();
    if (selected && sheet) {
      const argument_separator = sheet?.parser.argument_separator || ',';
      const decimal_mark = sheet?.parser.decimal_mark || '.';

      const params = Object.entries(selected.parameters).map(([key, value]) => {
        return sheet?.FormatNumber(value, number_format) || '';
      }).join(argument_separator + ' ');

      return `=${selected.distribution.replace(/\W+/g, '')}Value(${params})`;

    }
    return '';
  });

  const parametersTable = createMemo(() => {
    const table: string[][] = [];
    const selected = results();
    const sheet = props.sheet();
    if (selected && sheet) {
      for (const [key, value] of Object.entries(selected.parameters)) {
        table.push([
          key, 
          sheet.FormatNumber(value, number_format) || '',
        ]);
      }
    }
    return table;
  });

  const graphData = createMemo(() => {

    let sample_path = '';
    let data_points = '';

    const sample = results();


    if (sample) {

    // console.info("R", result);

    let theoretical_min = 0;
    let theoretical_max = 0;

    let points = data().slice(0);

    let data_max = Math.max(...points);
    let data_min = Math.min(...points);

    switch (sample.distribution) {
      case 'Beta':
        theoretical_min = 0;
        theoretical_max = 1;
        data_min = 0;
        data_max = 1;
        break;

      case 'Normal':
        theoretical_min = -3.5;
        theoretical_max =  3.5;

        data_min = -3.5 * sample.parameters.stdev + sample.parameters.mean;
        data_max =  3.5 * sample.parameters.stdev + sample.parameters.mean;

        break;

      case 'Half-normal':
        data_min = theoretical_min = 0; // atm we're not rendering at all for negative data
        data_max = theoretical_max = Math.max(sample.stats.max, 3.5 * sample.parameters.stdev);

        // console.info("HN", theoretical_min, theoretical_max, result.sample);

        break;

      case 'Log-normal':
        theoretical_min = -3.5;
        theoretical_max =  3.5;
        
        {
          points = points.map(point => Math.log(point));
          // data_max = Math.max(...points);
          // data_min = Math.min(...points);

          // const stats = CalculateStats(points);
          data_min = -3.5 * sample.parameters.stdev + sample.parameters.mean;
          data_max =  3.5 * sample.parameters.stdev + sample.parameters.mean;


        }

        break;

      case 'Uniform':
        theoretical_min = -0.0;
        theoretical_max =  1.0;
        break;

      case 'PERT':
      case 'Triangular':
        theoretical_min = -0.0;
        theoretical_max =  1.0;
        break;

      case 'Weibull':
        data_min = theoretical_min = Math.min(data_min, ...sample.sample);
        data_max = theoretical_max = Math.max(data_max, ...sample.sample);
        break;

    }

    sample_path = RenderGraph(graphSize(),sample.sample, theoretical_min, theoretical_max, 'line');
    data_points = RenderGraph(graphSize(), points, data_min, data_max, 'points');

  }

  return { sample_path, data_points };

});


  /*
  const samplePath = createMemo(() => {
    return '';
  });

  const dataPoints = createMemo(() => {
    return '';
  });
  */

  const [graphSize, setGraphSize] = createSignal({ height: 100, width: 100 });

  function TollUpdate() {

    const text = parameter_element?.textContent || '';
    const sheet = props.sheet();

    setData([]);

    if (text && sheet) {
      let resolved = sheet.Resolve(text);
      if (!resolved) {
        return;
      }
      if (IsCellAddress(resolved)) {
        return;
      }

      let area = new Area(resolved.start, resolved.end);
      const target = sheet.grid.model.sheets.Find(resolved.start.sheet_id || 0);
      if (target) {

        if (area.start.row === Infinity
            || area.start.column === Infinity
            || area.end.row === Infinity
            || area.end.column === Infinity ) {
            area = target.RealArea(area as any) as any as Area;
        }

        const values = sheet.Evaluate(sheet.Unresolve(area));
        if (Array.isArray(values)) {

          const temp: number[] = [];

          for (const row of values) {
            for (const element of row) {
              switch (typeof element) {
                case 'number':
                  temp.push(element);
                  break;

                case 'undefined':
                  if (!persistentData.fit_ignore_blanks) {
                    temp.push(0);
                  } 
                  break;
                  
                case 'boolean':
                  if (!persistentData.fit_ignore_boolean) {
                    temp.push(element ? 1 : 0);
                  }
                  break;

                case 'string':
                  if (!persistentData.fit_ignore_strings) {
                    if (element === '') {
                      temp.push(0);
                    }
                    else {
                      temp.push(1);
                    }
                  }
                  break;
              }

            }
          }

          /*
          const temp = values.map(row => {
            return row.map(element => {
              switch (typeof element) {
                case 'undefined':
                  return 0;
                case 'number':
                  return element;
                case 'boolean':
                  return element ? 1 : 0;
                case 'string':
                  if (element === '') {
                    return 0;
                  }
                  return 1;
              }
              return 0;
            });
          });
          setData(temp.flat());
          */

          setData(temp);
        }
      }
    }
  }

  let copy_error = false;

  let [copiedData, setCopiedData] = createSignal('');

  async function CopyData(text?: string) {

    if (!text) {
      return;
    }
    
    try {
      await navigator.clipboard.writeText(text);
      copy_error = false;
      setCopiedData(text);
      setTimeout(() => setCopiedData(''), 3000);
    }
    catch (err) {
      setCopiedData('');
      copy_error = true;
      console.error(err);
    }
  }
  
  function CopyHeader(props: ParentProps<{ data: string }>) {
    return <h1 class={style['copy-header']}>
      <span>{props.children}</span>
      <button disabled={!results()}
              title={
                copiedData() === props.data ?
                  t('ui-interaction.copy-to-clipboard.copied') :
                  t('ui-interaction.copy-to-clipboard')
                }
              onclick={() => CopyData(props.data)}
              innerHTML={
                copiedData() === props.data ?
                bootstrap_icons.check :
                bootstrap_icons.copy} />
    </h1>
  }

  function FormatCopyData(table: string[][]) {
    return table.map(row => row.join('\t')).join('\n');
  }

  return <InteractiveSidebar {...props}>
    <div class={style['fit-data-layout']}>

      <div class="section flex-column">
      <div class="flex-row">
          <div class="reference-editor tc contenteditable-placeholder flex-grow" 
                data-selection-target 
                tabindex="0"
                role="textbox" 
                spellcheck="false"
                contenteditable="true"
                onfocusout={FocusOut}
                onfocusin={FocusIn}
                onkeydown={KeyDown}
                data-placeholder={t('fit-data-panel.select-range')}
                oninput={e => TollUpdate()}
                onchange={e => TollUpdate()}
                ref={parameter_element}>{initial_value}</div>
        </div>
      <hr />
    </div>

    <div class="section flex-column">
      <h1>
        <span>{t('fit-data-panel.candidate-distributions')}</span>
        <select class="select" onchange={e => setSelectedIndex(Number(e.currentTarget.value) || 0)}>
          <For each={fitResults()}>
            {(result, index) => <option value={index()}>{result.distribution}</option>}
          </For>
        </select>
      </h1>
      <p>
        <span>{t('fit-data-panel.candidate-distributions.description')}</span>
      </p>
    </div>

    <div class="section flex-column">
      <CopyHeader data={FormatCopyData(parametersTable())}>
        <span>{t('fit-data-panel.distribution-parameters')}</span>
      </CopyHeader>
      <div class={style.boxed}>
        <For each={parametersTable()}>
          {row => <div class={style.row}>
              <div>{row[0]}</div>
              <div>{row[1]}</div>
              <div class="flex-grow" />
            </div>}
        </For>
      </div>
    </div>

    <div class={style["graph-container"]} ref={chart_container}>
      <svg xmlns="http://www.w3.org/2000/svg" 
          preserveAspectRatio="none"
          vector-effect="non-scaling-stroke"
          viewBox={`0 0 ${graphSize().width} ${graphSize().height}`}
          class="graph" >
        <Show when={graphData()}>
          <path d={graphData().data_points} class={style['fit-data']}></path>
          <path d={graphData().sample_path} class={style['fit-theoretical']}></path>
        </Show>
      </svg>   
    </div>

    <div class="section flex-column">
      <CopyHeader data={spreadsheetFunction() || ''}>
        <span>{t('fit-data-panel.spreadsheet-function')}</span>
      </CopyHeader>
      <input type="text" class="input" disabled value={spreadsheetFunction()} />
    </div>


    <div class="section flex-column">
      <CopyHeader data={FormatCopyData(errorTable())}>
        <span>{t('fit-data-panel.statistics.error')}</span>
      </CopyHeader>
      <div class={style.boxed}>
        <For each={errorTable()}>
          {row => <div class={style.row}>
              <div>{row[0]}</div>
              <div>{row[1]}</div>
              <div class="flex-grow" />
            </div>}
        </For>
      </div>
    </div>

  </div>
  </InteractiveSidebar>;

}

Register('fit-data', Sidebar);

