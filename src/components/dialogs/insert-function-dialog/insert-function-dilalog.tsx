
import { t } from '~/i18n/i18n';
import { InteractiveDialog, type Props as DialogProps } from '../interactive-dialog/interactive-dialog';
import { Accessor, createEffect, createSignal, For, Match, on, onMount, Setter, Switch } from 'solid-js';
import { CheckFunctionData } from './check-function';
import SearchWorker from 'raw-tools/src/insert-function/function-search-worker.ts?worker';
import { type FunctionData, CreateFunctionLib, type MessageType, type SearchResults } from 'raw-tools';
import { createMutable } from 'solid-js/store';

import style from './insert-function-dialog.module.css';

export interface SearchState {
  results: FunctionData[];
  selected_index: number;
  selected_entry: string;
  query: string;
}

export type Props = DialogProps & {
  setData: Setter<CheckFunctionData|undefined>;
  data: Accessor<CheckFunctionData|undefined>;
}

export function InsertFunctionDialog(props: Props) {

  let [state, setState] = createSignal<'arguments'|'functions'>('functions');
  let worker: Worker|undefined;
  let query_input: HTMLInputElement|undefined;

  const search_state = createMutable<SearchState>({
    results: [],
    selected_index: -1,
    selected_entry: '',
    query: '',
  });
  
  const ExecSearch = () => {
    if (!search_state.query?.trim()) {
      search_state.results = [];
      return;
    }
    worker?.postMessage({
      type: 'search',
      text: search_state.query.trim(),
    });
  };

  const ResetSearch = () => {
    search_state.query = '';
    search_state.results = [];
    search_state.selected_entry = '';
    search_state.selected_index = -1;
    query_input?.focus();
  };

  function HandleWorkerResponse(event: MessageEvent<SearchResults|undefined>) {
    if (event.data?.type === 'results') {

      // console.info({results: event.data.results});

      search_state.results = event.data.results;

      if (search_state.selected_entry) {
        let found = false;
        for (const [index, entry] of search_state.results.entries()) {
          if (entry.canonical_name === search_state.selected_entry) {
            search_state.selected_index = index;
            found = true;
            break;
          }
        }
        if (!found) {
          search_state.selected_entry = '';
          search_state.selected_index = -1;
        }
        else {
          // refresh_selected_entry = true;
        }
      }
    }
  }

  //////////

  createEffect(on(props.open, open => {
    if (open) {
      
      if (!worker) {
        worker = new SearchWorker();
        worker.onmessage = HandleWorkerResponse;
      }

      const sheet = props.sheet();
      if (sheet) {
        const function_data_lib = CreateFunctionLib(sheet);
        const message: MessageType = {
          type: 'config',
          lib: function_data_lib,
        };
        worker.postMessage(message);
        ResetSearch();
      }

      const data = props.data();
      if (data) {
        setState(data.target ? 'arguments' : 'functions');
      }
    }
    else {
      // ...
    }
  }));

  function UpdateQuery(event: Event) {
    if (event.target instanceof HTMLInputElement) {
      search_state.query = (event.target.value || '').trim();
    }
    ExecSearch();
  }

  function Cancel() {
    props.setData(undefined);
    props.setOpen(false);
  }

  function SelectFunction() {

    let query: HTMLInputElement|undefined;

    onMount(() => {

    });

    function HandleKeyDown(event: KeyboardEvent) {
      // ...
    }

    return <div class={style['search-layout']}>
        <input type="text" 
              class="input" 
              ref={query}
              oninput={UpdateQuery}
              placeholder={t('insert-function.search-for-function')}/>
        <ul classList={{"function-list": true, [style.results]: true }} tabindex="0" onkeydown={HandleKeyDown} role="listbox">
          <For each={search_state.results}>
            {(result, index) => <>
                <li role="option"
                    aria-selected={index() === search_state.selected_index}
                    classList={{ [style.selected]: index() === search_state.selected_index }} >
                  <div class={style.name}>
                    {result.local_name}
                  </div>
                  <div class={style.description}>
                    {result.description}
                  </div>
                </li>
              </>}
          </For>
        </ul>
      </div>;
  }

  return <InteractiveDialog {...props} escape moveable resizeable >
      <header>
        {t('insert-function.insert-function')}
      </header>
      <section>
        <Switch>
          <Match when={state() === 'arguments'}>
            zap
          </Match>
          <Match when={true}>
            <SelectFunction />
          </Match>
        </Switch>
      </section>
      <footer>
        <div class={style.buttons}>
          <button class="button">{t('standard-buttons.accept.title')}</button>
          <button onclick={() => Cancel} class="button">{t('standard-buttons.cancel.title')}</button>
        </div>
      </footer>
    </InteractiveDialog>;

}
