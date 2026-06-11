
import * as auth from '~/lib/auth/auth';
import { Page as ParentPage } from '~/components/protected-page';
import style from './documents.module.css';
import { createEffect, createMemo, createSignal, For, Match, on, onMount, Switch } from 'solid-js';
import { documentsList, type DocumentsRow, ListDocuments } from '~/docs/documents';
import { Show } from 'solid-js';
import { bootstrap_icons } from 's5-icon-lib';
import { I18N, t } from '~/i18n/i18n';
import { A, useNavigate } from '@solidjs/router';
import { persistentData, sessionData, setPersistentData, setSessionData } from '~/lib/app-data';
import { reconcile } from 'solid-js/store';

type ListState = 'none'|'loading'|'error';

export default function Page() {

  const [state, setState] = createSignal<ListState>('none');

  /*
  const selectionState = createMemo(() => {

    let all = true;
    let none = true;
    let some = false;

    for (const entry of sessionData.documents_selected || []) {
      if (entry) {
        none = false;
        some = true;
      }
      all = all && entry;
    }

    return {all, some, none};

  }); 
  */

  onMount(async () => {
    if (!documentsList()) {
      setState('loading');
      const result = await ListDocuments();
      if (result) {
        setState('none');
      }
      else {
        setState('error');
      }
    }
  });

  function FormatTime(time = 0) {
    const date = new Date(time);
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
    }) + ' ' + date.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function FormatPath(path = '') {
    return path.replace(/^@.*?\//, '');
  }

  function HeaderButton(props: { key?: keyof DocumentsRow, label: keyof I18N }) {

    const sort = () => (props.key === persistentData.documents_sort);

    function Click(event: Event) {
      if (sort()) {
        setPersistentData('documents_asc', !persistentData.documents_asc);
      }
      else {
        setPersistentData('documents_sort', props.key);
        setPersistentData('documents_asc', false);
      }
    }

    return <button onclick={Click}>
            <span>{t(props.label)}</span>
            <span classList={{ 
              [style['icon-placeholder']]: true,
              [style.active]: sort(),
              [style.rotate]: sort() && !!persistentData.documents_asc }} 
              innerHTML={bootstrap_icons.caret_down_fill}
              ></span>
          </button>
 
  }

  const sortedDocuments = createMemo(on([
      documentsList, 
      () => persistentData.documents_sort, 
      () => persistentData.documents_asc,
    ], 
    ([documents, key, asc]) => {
      let sorted: Partial<DocumentsRow>[] = [];
      if (documents) {
        sorted = [...documents];
        switch (key) {
          case 'path':
            sorted.sort((a, b) => 
              (a.path?.toLocaleLowerCase() || '').localeCompare(b.path?.toLocaleLowerCase() || ''));
            break;

          case 'modified':
            sorted.sort((b, a) => (a.modified || 0) - (b.modified || 0));
            break;

          case 'created':
            sorted.sort((b, a) => (a.created || 0) - (b.created || 0));
            break;

          case 'access':
            sorted.sort((b, a) => (a.access || 0) - (b.access || 0));
            break;
        }
        if (asc) {
          sorted.reverse();
        }
      }
      return sorted;
  }));
    
  const filteredDocuments = createMemo(on([
      sortedDocuments, () => persistentData.documents_filter], ([sorted, filter]) => {

    filter = (filter || '').trim();
    if (!filter) {
      return sorted;
    }

    const rex = new RegExp(filter, 'i');
    return sorted.filter(test => rex.test(test.path || ''));

  }));

  let header_checkbox: HTMLInputElement|undefined;

  const [selectionCount, setSelectionCount] = createSignal(0);

  createEffect(on([filteredDocuments, () => {
    return Object.keys(sessionData.selected_documents || {}).length
  }], ([filtered]) => {

    const selected_documents = sessionData.selected_documents || [];

    let selection_count = 0;
    let total_count = filtered.length;

    for (const doc of filtered) {
      if (selected_documents[doc.id || -1]) {
        selection_count++;
      }
    }

    setSelectionCount(selection_count);

    if (header_checkbox) {
      header_checkbox.indeterminate = false;
      header_checkbox.checked = false;

      if (selection_count) {
        if (selection_count === total_count) {
          header_checkbox.checked = true;
        }
        else {
          header_checkbox.indeterminate = true;
        }
      }
    }

  }));

  function ChangeCommonCheckbox(event: Event) {
    if (event.target instanceof HTMLInputElement) {
      if (event.target.checked) {
        const list: Record<number, boolean> = {};
        for (const doc of filteredDocuments()) {
          list[doc.id || -1] = true;
        }
        setSessionData('selected_documents', list);
      }
      else {
        setSessionData('selected_documents', reconcile({}));
      }
    }
  }

  function DocumentsTable(props: { documents: Partial<DocumentsRow>[]}) {

    const documents = props.documents || [];

    return <div class={style['table-container']}>
        <div class={style.table}>
          <div class={style.header}>
            <div class={style.center}>
              <input type="checkbox" 
                     ref={header_checkbox}
                     onchange={ChangeCommonCheckbox}
                     />
            </div>
            <div class={style.left}>
              <HeaderButton key='path' label='documents-table.document.label' />
            </div>
            <div>
              <HeaderButton key='modified' label='documents-table.updated-date.label' />
            </div>
            <div>
              <HeaderButton key='created' label='documents-table.created-date.label' />
            </div>
            <div class={style.center}>
              <HeaderButton key='access' label='documents-table.access.label' />
            </div>
          </div>
          <For each={props.documents}>
            {doc => 
              <div class={style.row}>

                <div class={style.center}>
                  <input type="checkbox" 
                         checked={sessionData.selected_documents?.[doc.id || -1]} 
                         onchange={e => setSessionData('selected_documents', doc.id || -1, e.currentTarget.checked)}
                         />
                </div>

                <div class={style.left}>
                  <A href={'/' + (doc.path || '')}
                     class={style['document-link']}
                    >{FormatPath(doc.path)}</A>
                </div>

                <div>{FormatTime(doc.modified)}</div>
                <div>{FormatTime(doc.created)}</div>

                <div class={style.center}>{
                  t(doc.access === 1 ? 'documents-table.access.type-public' : 'documents-table.access.type-private' )
                }</div>
              </div>
            }
          </For>
        </div>
      </div>;
  }

  function SetFilter(filter = '') {
    setPersistentData('documents_filter', filter);
  }

  function FilterKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      SetFilter('');
    }
  }

  return <ParentPage title='documents-page.title' class="fixed">
    <section class={style.layout}>
        <Switch>
          <Match when={state() === 'error'}>
            <div>
              ERROR
            </div>
          </Match>
          <Match when={state() === 'loading'}>
            <div>
              LOADING
            </div>
          </Match>
          <Match when={true}>
            <div class={style.controls}>
              <input type="text" 
                     onkeydown={FilterKeyDown}
                     classList={{input: true, [style.filter]: true}} 
                     value={persistentData.documents_filter}
                     oninput={e => SetFilter(e.currentTarget.value)}
                     placeholder={t('documents-table.filter-documents.label')}/>
              <button class={style.clear} 
                      onclick={() => SetFilter()}
                      innerHTML={bootstrap_icons.x_lg}/>

              <div class="flex-grow" />

              <button class="control-button" disabled={selectionCount() === 0}>
                {t('documents-table.controls.delete-selected')}
              </button>

              <button class="control-button" disabled={selectionCount() === 0}>
                {t('documents-table.controls.make-private')}
              </button>

              <button class="control-button" disabled={selectionCount() === 0}>
                {t('documents-table.controls.make-public')}
              </button>

            </div>
            <DocumentsTable documents={filteredDocuments()} />
          </Match>
        </Switch>
    </section>


  </ParentPage>
}
