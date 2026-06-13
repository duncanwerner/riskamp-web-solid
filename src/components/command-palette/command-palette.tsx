
import { Accessor, createEffect, createSignal, For, on, onCleanup, onMount } from 'solid-js';
import { SpreadsheetType } from '~/lib/spreadsheet-type';
import { type ToolbarCommand, type ToolbarCommandKey } from '../toolbar/toolbar-commands';
import style from './command-palette.module.css';
import { t } from '~/i18n/i18n';
import { UA } from '~/lib/UA';
import fuzzysort from 'fuzzysort';
import { commands, type PaletteCommand } from './command-list';

export interface Props {
  sheet: Accessor<SpreadsheetType|undefined>;
  oncommand: (command: ToolbarCommand & { key: ToolbarCommandKey}) => void|Promise<void>;
}

export function CommandPalette(props: Props) {

  let popover: HTMLDivElement|undefined;
  let input: HTMLDivElement|undefined;
  let container: HTMLDivElement|undefined;

  const [open, setOpen] = createSignal(false);
  const ua = UA();

  function Focus(event: KeyboardEvent) {
    if (event.key === '.') {
      input?.focus();
    };
  }

  const popover_id = crypto.randomUUID();
  const container_id = crypto.randomUUID();

  //
  // style is inlined so it will work with the polyfill (required for firefox)
  // Q: is that still true in 2026? FIXME: check
  //
  const inline_style = [
    `min-width: anchor-size(--${container_id});`,
    `position-anchor: --${container_id};`,
    `top: anchor(--${container_id} bottom);`,
    `left: anchor(--${container_id} left);`,
  ].join(' ');

  onMount(() => {
    window.addEventListener('keydown', Focus);
  });

  onCleanup(() => {
    window.removeEventListener('keydown', Focus);
  });

  function HandleKeyDown(event: KeyboardEvent) {
    switch (event.key) {
      case 'Escape':
        props.sheet()?.Focus();
        break;
    }
  }

  const [query, setQuery] = createSignal('');

  function HandleInput(event: Event) {
    if (event.target instanceof HTMLElement) {
      setQuery((event.target.textContent || '').trim());
    }
  }

  const [results, setResults] = createSignal<PaletteCommand[]>([]);

  createEffect(on(query, query => {
    if (query) {
      const fs_results = fuzzysort.go(query, commands, {
        all: false,
        keys: ['label', 'alt'],
        threshold: .35,
      });
      setResults(fs_results.map(result => result.obj));
      // selected_index = 0;
    }
    else {
      setResults([]);
      // selected_index = -1;
    }
  }));

  function FocusIn(event: Event) {
    setOpen(true);
  }

  function FocusOut(event: FocusEvent) {
    if (event.relatedTarget instanceof HTMLElement && container?.contains(event.relatedTarget)) {
      return;
    }

    if (!event.relatedTarget) {

    }

    setOpen(false);
  }

  createEffect(on(open, open => {
    if (open) {
      popover?.showPopover();
    }
    else {
      popover?.hidePopover();
    }
  }));

  const [prompt, setPrompt] = createSignal('>');

  return <>
      <div class={style.container}
          ref={container}
          style={`anchor-name: --${container_id}`}
          onfocusin={FocusIn}
          onfocusout={FocusOut}
          onkeydown={HandleKeyDown}
          id={container_id} >

        <div contenteditable
             ref={input}
             onkeydown={HandleKeyDown}
             oninput={HandleInput}
             data-prompt={prompt()}
          />

        <div class={style.menu} 
            ref={popover}
            popover="manual" 
            id={popover_id} 
            tabindex={0}
            data-anchor={`--${container_id}`} style={inline_style}>
          <div>
            <div>{t('command-palette-ui.start-typing')}</div>
            <menu class={style.results}>
              <For each={results()}>{result => 
                <li>{result.label}</li>  
              }</For>
            </menu>
          </div>
        </div>
      </div>

    </>;

}
