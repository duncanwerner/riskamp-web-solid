import { createStore, reconcile } from 'solid-js/store';
import { createEffect, on } from 'solid-js';
import { type Model } from 'treb-llm-support';
import type { DocumentsRow } from '~/docs/documents';

/**
 * FIXME: we should change how this works, make it deeper 
 * and perhaps switch to a mutable? also we could be lazier
 * about the specific types
 */
interface SessionData {
  active_tab: number;
  last_split: number;
  llm_tab_split: number;
  
  // notes_tab: number;
  notes?: {
    tab?: number;
    view_scroll?: number;
    edit_scroll?: number;
  }

  /* moved to persistent 
  documents?: {
    sort?: keyof DocumentsRow;
    asc?: boolean;
    filter?: string;
  }
  */

  selected_documents?: Record<number, boolean>;

}

export interface PersistentData {
  lhs: boolean;
  stepped: boolean; 
  trials: number; // FIXME: should be per-sheet
  llm_model: Model|undefined;
  llm_api_keys: Record<string, string>;

  quickview_tab: number;
  quickview_minmax: "minmax"|"iqr";
  quickview_bin_algorithm: "ss"|"fd"|"sturges"|"auto";

  fit_ignore_blanks: boolean;
  fit_ignore_strings: boolean;
  fit_ignore_boolean: boolean;

  documents_sort?: keyof DocumentsRow;
  documents_asc?: boolean;
  documents_filter?: string;

}

interface AppData {
  persisted: PersistentData;
  session: SessionData;
}

export const [sessionData, setSessionData] = createStore<SessionData>({
  
  active_tab: 0,
  last_split: 70,
  llm_tab_split: 70,

  /*
  documents: {
    sort: 'modified',
    asc: false,
    filter: '',
  },
*/

  selected_documents: {},

});

export const [persistentData, setPersistentData] = createStore<PersistentData>({
  lhs: true,
  stepped: false,
  trials: 6781,
  
  llm_model: undefined,
  llm_api_keys: {},
  
  quickview_tab: 0,
  quickview_bin_algorithm: 'auto',
  quickview_minmax: "minmax",

  fit_ignore_blanks: true,
  fit_ignore_boolean: true,
  fit_ignore_strings: true,

  documents_asc: false,
  documents_sort: 'modified',
  documents_filter: '',

});

export function InitAppData() {

  if (localStorage) {
    const json = localStorage.getItem('app-data');
    if (json) {
      try {
        const data = JSON.parse(json) as Partial<PersistentData>;
        setPersistentData(data);
      }
      catch (err) {
        console.error(err);
      }
    }
  }

  createEffect(() => {
    const json = JSON.stringify(persistentData);
    localStorage.setItem('app-data', json);
  });

}
