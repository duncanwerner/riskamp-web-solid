
import style from '../sidebar.module.css';
import { Register } from '../registry';
import { t } from '~/i18n/i18n';
import { createMutable } from 'solid-js/store';
import { createEffect, createMemo, createSignal, For, Match, on, onCleanup, onMount, Switch } from 'solid-js';

import FindWorker from './find-worker?worker';
import type { FindResult, FindMessageType, FindType, QueryMessage } from './find-worker';
import { type SidebarProps } from '../sidebar-main';
import { EmbeddedSheetEvent } from '@trebco/treb';
import { Area } from '@trebco/treb/treb-base-types';
import { bootstrap_icons } from 's5-icon-lib';

interface Params {
  type: 'values'|'formulas';
  scope: 'current'|'all';
  wildcards: boolean;
}

let worker: Worker|undefined;
let transaction = 1;
let _params: Params|undefined;

function InitParams() {
  if (!_params) {
  _params = createMutable<Params>({
      type: 'values',
      scope: 'current',
      wildcards: false,
    });
  }
  return _params;
}

/**
 * we're making the explicit decision to not persist query/results 
 * between invocations of the sidebar. that may change.
 * 
 * @returns 
 */
export function Sidebar(props: SidebarProps) {

  const params = InitParams(); // use persistent instance
  
  let search: HTMLInputElement|undefined;

  let [normalized, setNormalized] = createSignal('');

  function Search() {
    const query = normalized();    
    if (query) {
      const message: QueryMessage = {
        type: 'query',
        find: params.type,
        query,
        transaction,
        wildcards: params.wildcards,
      };
      worker?.postMessage(message);
    }
    else {
      setResults([]);
    }
  };

  function HandleInput(event: InputEvent) {
    if (event.target instanceof HTMLInputElement) {
      setNormalized(event.target.value.trim().toLocaleLowerCase());
    }
  }

  createEffect(on([normalized, () => JSON.stringify(params)], values => {
    Search();
  }));

  if (!worker) {
    worker = new FindWorker();
  }

  let [results, setResults] = createSignal<FindResult[]>([]);
  const [activeSheet, setActiveSheet] = createSignal(0);
  let subscription = 0;

  worker.onmessage = (event: MessageEvent<FindMessageType>) => {
    switch (event.data?.type) {
      case 'results':
        setResults(event.data.results || []);
        break;
    }
  }

  const filtered = createMemo(() => {
    if (params.scope === 'all') {
      return results();
    }
    return results().filter(test => test.address.sheet_id === activeSheet());
  });  

  function SendInitMessage() {
    if (props.sheet) {
      console.info("sending init");
      const data = props.sheet()?.SerializeDocument({ rendered_values: true, preserve_simulation_data: false });
      worker?.postMessage({
        type: 'init',
        data,
      });
    }
  }

  onMount(() => {
    queueMicrotask(() => search?.focus());
    const sheet = props.sheet();
    if (sheet) {
      setActiveSheet(sheet.grid.active_sheet.id);
      SendInitMessage();
      subscription = sheet.Subscribe((event: EmbeddedSheetEvent) => {
        switch (event.type) {
          case 'document-change':
          case 'language-change':
          case 'load':
          case 'reset':
            setActiveSheet(sheet.grid.active_sheet.id || 0);
            SendInitMessage();
            Search();
            break;
          
          case 'selection':
            setActiveSheet(sheet.grid.active_sheet.id || 0);
            break;
        }
      });
    }
  });

  onCleanup(() => {
    if (subscription) {
      props.sheet()?.Cancel(subscription);
    }
    if (worker) {
      worker.onmessage = null;
    }
  });

  function SelectTarget(event: Event, result: FindResult) {
    event.stopPropagation();
    event.preventDefault();

    const sheet = props.sheet();
    if (sheet) {
      sheet.Select(result.address);
      sheet.ScrollIntoView(result.address, true);
    }
  }

  return <>
    <div classList={{
        [style['find-layout']]: true,
    }}>
      <div class="flex-column gap-1">
          <input type="text" 
                class="input flex-grow" 
                style="min-height: 34px;"
                oninput={HandleInput}
                autocomplete="off"
                ref={search} 
                placeholder={t('search-panel.search-text.placeholder')}/>

        <div class="flex-row gap-0_5 nowrap">
          <label>
            {t('search-panel.search-in.text')}
          </label>
          <select class="select" value={params.type} onchange={e => params.type = e.currentTarget.value as Params['type']}>
            <option value='values'>{t('search-panel.search-type.cell-values')}</option>
            <option value='formulas'>{t('search-panel.search-type.cell-formulas')}</option>
          </select>
          <select class="select" value={params.scope} onchange={e => params.scope = e.currentTarget.value as Params['scope']}>
            <option value='current'>{t('search-panel.search-scope.current-sheet')}</option>
            <option value='all'>{t('search-panel.search-scope.all-sheets')}</option>
          </select>
          <label class="flex-row gap-0_5">
            <input type="checkbox" checked={params.wildcards} onchange={e => params.wildcards = e.currentTarget.checked}/>
            <span>{t('search-panel.search-type.wildcards')}</span>
          </label>
        </div>
      </div>
      <div classList={{
          'grid-table flex-grow overflow-hidden': true,
          [style['find-grid-table']]: true,
        }}>
        
        <div class="grid-table-header">
          <div style="grid-column: 1/3;">{t('search-panel.search-results.header.address')}</div>
          <div>{params.type === 'formulas' ? t('search-panel.search-results.header.formula') : t('search-panel.search-results.header.value')}</div>
        </div>
        
        <div class="grid-table-body">
          <For each={filtered()}>
            {result => <div class="grid-table-row cursor-pointer" onclick={e => SelectTarget(e, result)} >
              <div>
                {result.sheet_name}
              </div>
              <div>
                {Area.CellAddressToLabel(result.address)}
              </div>
              <div class="limit">
                {params.type === 'formulas' ? result.formula : result.value}
              </div>
            </div>}
          </For>
        </div>

        <div class="grid-table-footer">
            <div class="all-columns">
              <Switch>
                <Match when={normalized() === ''}>
                  {t('search-panel.search-results.information.enter-text')}
                </Match>
                <Match when={filtered().length === 1}>
                  <span>
                    {filtered().length} {t('search-panel.search-results.information.result')}
                  </span>
                </Match>
                <Match when={true}>
                  <span>
                    {filtered().length} {t('search-panel.search-results.information.results')}
                  </span>
                </Match>
              </Switch>
            </div>
        </div>
      </div>
    </div>
  </>;
}

Register('find', Sidebar);

