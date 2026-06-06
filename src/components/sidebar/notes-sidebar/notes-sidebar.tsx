
import style from '../sidebar.module.css';
import { Register } from '../registry';
import { t } from '~/i18n/i18n';
import { createMutable } from 'solid-js/store';
import { createEffect, createMemo, createSignal, For, Match, on, onCleanup, onMount, Switch } from 'solid-js';

import FindWorker from './find-worker?worker';
import { type SidebarProps } from '../sidebar-main';
import { EmbeddedSheetEvent } from '@trebco/treb';
import { Area, IsArea, IsCellAddress } from '@trebco/treb/treb-base-types';
import { bootstrap_icons } from 's5-icon-lib';
import { sessionData, setSessionData } from '~/lib/app-data';

// TEMP

import { Format } from 'treb-llm-support';

let group = crypto.randomUUID();

export function NotesSidebar(props: SidebarProps) {

  const [notes, setNotes] = createSignal('');
  const formatted = createMemo(() => Format(notes()));

  let markdown: HTMLDivElement|undefined;
  let textarea: HTMLTextAreaElement|undefined;

  onMount(() => {
    const sheet = props.sheet();
    if (sheet) {
      const data = sheet.user_data as { note: string } | undefined;
      setNotes(data?.note || '');
    }

    requestAnimationFrame(() => {
      let scroll = sessionData.notes?.view_scroll || 0;
      if (scroll && markdown) {
        markdown.scrollTop = scroll;
      }
      scroll = sessionData.notes?.edit_scroll || 0;
      if (scroll && textarea) {
        textarea.scrollTop = scroll;
      }
    });

  });

  if (!sessionData.notes) {
    setSessionData({ notes: {
      view_scroll: 0,
      edit_scroll: 0,
      tab: 0,
    }});
  }

  function SaveScrollPosition(event: Event, key: 'view'|'edit') {
    if (event.target instanceof HTMLElement) {
      const top = event.target.scrollTop;
      switch (key) {
        case 'view':
          setSessionData('notes', 'view_scroll', top);
          break;
        case 'edit':
          setSessionData('notes', 'edit_scroll', top);
          break;
      }
    }
  }

  function HandleClick(event: MouseEvent) {
    if (event.target instanceof HTMLAnchorElement) {
      const href = event.target.href || '';
      if (/^ref:\/\//i.test(href)) {

        event.stopPropagation();
        event.preventDefault();

        const sheet = props.sheet();
        if (sheet) {

          let unencoded = decodeURIComponent(href.substring(6));
          const resolved = sheet.Resolve(unencoded);

          if (resolved) {
            sheet.Select(resolved);
            if (IsCellAddress(resolved)) {
              sheet.grid.ActivateSheetID(resolved.sheet_id || 0);
              sheet.ScrollIntoView(resolved, true);
            }
            if (IsArea(resolved)) {
              sheet.grid.ActivateSheetID(resolved.start.sheet_id || 0);
              sheet.ScrollIntoView(resolved.start, true);
            }
          }
          else {
            if (/^'.*'$/.test(unencoded)) {
              unencoded = unencoded.substring(1, unencoded.length -1);
            }
            const target = sheet.grid.model.sheets.Find(unencoded);
            if (target) {
              sheet.grid.ActivateSheetID(target.id);
              sheet.Select();
            }
          }

        }
      }
    }
  }

  function UpdateNotes(event: Event) {
    const sheet = props.sheet();
    if (sheet && event.target instanceof HTMLTextAreaElement) {
      const note = event.target.value || '';
      const user_data = {...((sheet.user_data || {}) as any), note }
      sheet.user_data = user_data;
      setNotes(note);
    }
  }

  //
  // FIXME: instead of saving separate scroll positions, might
  // be interesting to try and sync position in the two renderings.
  // probably best approach is to do that via % of height? 
  //

  return <div class={style['notes-layout']}>
    <div class={style['tab-layout']}>
      <div class={style.tab}>
        <input data-label="View" 
               type="radio" 
               name={group} 
               onclick={e => { if (e.currentTarget.checked) { setSessionData('notes', 'tab', 0)} }}
               checked={sessionData.notes?.tab === 0} />
        <div class={style.markdown} 
             ref={markdown}
             onclick={HandleClick}
             onscroll={e => SaveScrollPosition(e, 'view')}
             innerHTML={formatted()} />
      </div>
      <div class={style.tab}>
        <input data-label="Edit Markdown" 
               type="radio" 
               name={group} 
               onclick={e => { if (e.currentTarget.checked) { setSessionData('notes', 'tab', 1)} }}
               checked={sessionData.notes?.tab === 1} />
        <textarea ref={textarea}
                  onchange={e => UpdateNotes(e)}
                  onscroll={e => SaveScrollPosition(e, 'edit')}>{notes()}</textarea>
      </div>
    </div>
    {/*
    <div class={style.controls}>
      controls {sessionData.notes?.view_scroll}, {sessionData.notes?.edit_scroll}
    </div>
    */}
  </div>;
}

Register('notes', NotesSidebar);

