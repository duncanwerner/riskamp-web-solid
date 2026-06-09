
import { t } from '~/i18n/i18n';
import { CreateParameters, InteractiveDialog, Parameter, type ParameterType, type Props as DialogProps, InteractiveDialogRef } from '../interactive-dialog/interactive-dialog';
import { Accessor, createEffect, createRoot, createSignal, For, Match, on, onMount, Setter, Show, Switch } from 'solid-js';
import { CheckFunctionData } from './check-function';
import SearchWorker from 'raw-tools/src/insert-function/function-search-worker.ts?worker';
import { type FunctionData, CreateFunctionLib, type MessageType, type SearchResults } from 'raw-tools';
import { createMutable } from 'solid-js/store';

import style from './insert-function-dialog.module.css';
import { Size } from '../dialog-base/dialog';
import { ApplyArgs, FunctionArg, TranslateDescriptor } from './function-utils';
import { ExtendedFunctionDescriptor } from '@trebco/treb/treb-calculator';
import { FunctionLibrary } from '@trebco/treb/treb-calculator/src/function-library';
import { bootstrap_icons } from 's5-icon-lib';

export interface SearchState {
  results: FunctionData[];
  selected_index: number;
  selected_entry: string;
  query: string;
}

export type Props = DialogProps & {
  setFunctionResult: Setter<string|undefined>;
  data: Accessor<CheckFunctionData|undefined>;
}

interface CompositeData {
  data: (ExtendedFunctionDescriptor & { name: string });
  args: FunctionArg[];
}

export function InsertFunctionDialog(props: Props) {

  const [state, setState] = createSignal<'arguments'|'functions'>('functions');
  let worker: Worker|undefined;
  let query_input: HTMLInputElement|undefined;
  const [numberFormat, setNumberFormat] = createSignal('General');
  const [functionData, setFunctionData] = createSignal<CompositeData|undefined>();
  const bindsize = createSignal<Size|undefined>({width: 400, height: 500});
  const [backButton, setBackButton] = createSignal(false);

  let interactiveDialogRef: InteractiveDialogRef|undefined;

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
      
      setBackButton(false);

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
        if (data.target && sheet) {
          const lib = (sheet.calculator as any).library as FunctionLibrary;
          const fd = TranslateDescriptor(lib.Get(data.target.name || ''), sheet.model.language_model);
          setFunctionData({
            data: fd,
            args: ApplyArgs(sheet, fd, data.target.args || [], numberFormat()),
          });
        }
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
    props.setOpen(false);
  }

  function SelectEntry(event: Event, result: FunctionData, index: number) {
    event.stopPropagation();
    event.preventDefault();

    search_state.selected_index = index;
    search_state.selected_entry = result.canonical_name;
  }

  function SelectFunction(event?: Event, result?: FunctionData, index = -1) {
    const sheet = props.sheet();
    let canonical_name = '';

    if (!result) {
      if (index < 0) {
        index = search_state.selected_index;
        if (index < 0) {
          index = 0;
        }
      }
      result = search_state.results[index];
    }
    
    if (result && sheet) {
      console.info(result);

      const lib = (sheet.calculator as any).library as FunctionLibrary;
      const fd = TranslateDescriptor(lib.Get(result.canonical_name));
      setFunctionData({
        data: fd,
        args: ApplyArgs(sheet, fd, [], numberFormat()),
      });

      setBackButton(true);
      setState('arguments');

    }
  }

  function HandleParameterUpdate(parameter: ParameterType) {

    // check if this is the last argument, and if it 
    // repeats

    const resolved = parameters();
    if (repeat && resolved.length) {
      const last = resolved[resolved.length - 1];
      if (last === parameter && parameter.value()) {
        setParameters([...parameters(), ...CreateParameters([{}])])
        interactiveDialogRef?.Update();
      }
    }

  }

  function FindFunction() {

    let query: HTMLInputElement|undefined;
    let results_list: HTMLUListElement|undefined;

    onMount(() => {
      query?.focus();
    });

    createEffect(on(() => search_state.selected_index, value => {
      const children = results_list?.children;
      if (children) {
        const child = children[value];
        if (child) {
          child.scrollIntoView({
            block: 'nearest',
            inline: 'nearest',
          });
        }
      }
    }));

    function HandleKeyDown(event: KeyboardEvent) {
      let delta = 0;
      switch (event.key) {
        case 'ArrowUp':
          delta = -1;
          break;

        case 'ArrowDown':
          delta = 1;
          break;

        case 'Enter':
          SelectFunction();
          break;

        /*
        case 'Enter':
          if (search_state.selected_entry) {
            resolved_function = search_state.selected_entry;
          }
          else if (search_state.results.length) {
            resolved_function = search_state.results[0].canonical_name;
          }
          break;
        */

        default:
          return;
      }
      
      event.stopPropagation();
      event.preventDefault();

      if (delta) {
        let target = Math.min(Math.max(0, search_state.selected_index + delta), search_state.results.length - 1);
        if (target !== search_state.selected_index) {
          search_state.selected_index = target;
          search_state.selected_entry = search_state.results[target].canonical_name;
        }
        results_list?.focus();
      }

    }
    
    return <div class={style['search-layout']}>
        <input type="text" 
              class="input" 
              ref={query}
              value={search_state.query}
              oninput={UpdateQuery}
              onkeydown={HandleKeyDown}
              placeholder={t('insert-function.search-for-function')}/>
        <ul classList={{"function-list": true, [style.results]: true }} 
            tabindex="0" 
            onkeydown={HandleKeyDown} 
            ref={results_list}
            role="listbox">
          <For each={search_state.results}>
            {(result, index) => <>
                <li role="option"
                    aria-selected={index() === search_state.selected_index}
                    onclick={e => SelectEntry(e, result, index())} 
                    ondblclick={e => SelectFunction(e, result, index())}
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

  const [parameters, setParameters] = createSignal<ParameterType[]>([]);
  let repeat = false;

  function RenderFunction() {
    const name = functionData()?.data.name;
    const sheet = props.sheet();
    if (name && sheet) {
      const args = parameters().map(parameter => {
        return parameter.value() || '';
      });
      while (args.length && args[args.length - 1] === '') {
        args.splice(args.length - 1, 1);
      }
      return `${name}(${args.join(sheet.parser.argument_separator + ' ')})`;
    }
    return undefined;
  }

  function FunctionArguments(local: {composite: Accessor<CompositeData>}) {

    const [link, setLink] = createSignal('');
    const [info, setInfo] = createSignal('');

    /**
     * in this effect, we create "parameters" from function arguments.
     * we have two sources of truth: the descriptor, which lists arguments,
     * and the actual function, which might have more.
     * 
     * we want to handle the case where there's a repeated argument at 
     * the end of the list. in that case, we'll add blanks when the last
     * argument is populated.
     */
    createEffect(on([local.composite, props.data], ([composite, data]) => {

      const composite_args_length = composite.args.length;
      const data_target_args_length = data?.target?.args?.length || 0;

      repeat = !!(composite_args_length && composite.args[composite_args_length - 1].repeat);

      let count = Math.max(composite_args_length, data_target_args_length);

      const initial_parameters = CreateParameters(
        (new Array(count).fill(0)).map(_ => ({})));

      for (const [index, parameter] of initial_parameters.entries()) {
        const populated = local.composite().args[index];
        if (populated?.value) {
          parameter.setInitialValue(populated.value.toString());
        }
      }

      setParameters(initial_parameters);
      requestAnimationFrame(() => interactiveDialogRef?.Update());
      setLink(`https://docs.riskamp.com/help/${local.composite().data.canonical_name.toLowerCase()}/`);

    }));


    function ArgumentName(index: number) {
      const composite = local.composite();
      const arg = composite.data.arguments?.[index];
      return arg?.name || '';
    }

    function UpdateInfo(index: number) {
      const composite = local.composite();
      index = Math.min(Math.max(0, index), (composite.data.arguments?.length || 0) - 1);
      const arg = composite.data.arguments?.[index];
      if (arg) {
        setInfo(arg.description || '');
      }
      else {
        setInfo('');
      }
    }
    
    function FocusOut(event?: Event) {
      const selection = window.getSelection();
      selection?.removeAllRanges();
      setInfo('');
    }

    function FocusIn(event?: FocusEvent, index = 0) {
      if (event?.target instanceof HTMLDivElement) {
        const target = event.target;
        if (target.textContent) {
          requestAnimationFrame(() => {
            const range = document.createRange();
            range.selectNodeContents(target);
            const selection = window.getSelection();
            selection?.removeAllRanges();
            selection?.addRange(range);
          });
        }
      }
      UpdateInfo(index);
    }

    return <div class={style['arguments-layout']}>
      <div class={style.description}>
        <h1>
          <span>{local.composite().data.name}</span>
          <Show when={local.composite().data.extension}>
            <a href={link()} 
               target='_blank'
               class={style.help} 
               innerHTML={bootstrap_icons.question_circle} />
          </Show>
        </h1>
        <div>{local.composite().data.description}</div>
      </div>
      <div class={style.arguments}>
        <div class={style.table}>
          <For each={parameters()}>
            {(parameter, index) => <div class="display-contents">
              <div>{ArgumentName(index())}</div>
              <div >
                <Parameter focusin={e => FocusIn(e, index())}
                           focusout={e => FocusOut(e)}
                           parameter={parameters()[index()]} />
              </div>
              <div>...</div>
            </div>}
          </For>
        </div>
      </div>
      <div class={style['function-result']}>
        <span>{t('insert-function.function-result')}</span>
      </div>
      <div class={style.information}>{info()}</div>
    </div>
  }

  function AcceptButton() {
    if (state() === 'functions') {
      SelectFunction();
    }
    else {
      props.setFunctionResult(RenderFunction());
      props.setOpen(false);

    }
  }

  return <InteractiveDialog escape 
                            moveable 
                            resizeable 
                            closebox
                            bindsize={bindsize}
                            update-parameter={HandleParameterUpdate}
                            ref={ref => interactiveDialogRef = ref}
                            {...props}>
      <header>
        {t('insert-function.insert-function')}
      </header>
      <section>
        <Switch>
          <Match when={state() === 'arguments'}>
            <Show when={functionData()}>
              <FunctionArguments composite={functionData as Accessor<CompositeData>} />
            </Show>
          </Match>
          <Match when={true}>
            <FindFunction />
          </Match>
        </Switch>
      </section>
      <footer>
        <div class={style.buttons}>
          <Show when={backButton() && state() === 'arguments'}>
            <button class="button"
                    onclick={e => setState('functions')}>{t('standard-buttons.back.title')}</button>
          </Show>
          <div class="flex-grow"></div>
          <button class="button"
                  disabled={state() === 'functions' && search_state.results.length <= 0}
                  onclick={AcceptButton}>{t('standard-buttons.accept.title')}</button>
          <button onclick={() => Cancel()} class="button">{t('standard-buttons.cancel.title')}</button>
        </div>
      </footer>
    </InteractiveDialog>;

}
