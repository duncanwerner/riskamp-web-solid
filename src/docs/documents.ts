
import { createSignal } from 'solid-js';
import * as auth from '~/lib/auth';

export interface DocumentsRow {
  id: number;
  userid: number;
  name: string;
  // storagekey: string;
  path: string;
  status: number;
  access: number;
  created: number;
  modified: number;
  version: number;
}

export interface HistoryEntry {
  modified: number;
  version: number;
}

/**
 * FIXME: this should maybe be a store (or mutable)
 * 
 * this is set up as undefined or a documents array. the
 * intent is that you check it, and if it's undefined, you
 * send the request.
 * 
 * perhaps we should wrap up that behavior in here? (...) TODO/FIXME
 * 
 */
const [documentsList, setDocumentsList] = createSignal<(Partial<DocumentsRow>[])|undefined>(undefined);
export { documentsList };

function StoreDocumentsList(list: Partial<DocumentsRow>[], remove = false) {

  setDocumentsList(list);
  const userid = auth.session().id || false;

  if (userid === false) {
    throw new Error('invalid user id');
  }

  sessionStorage.setItem('documents-list', JSON.stringify({
    list,
    id: userid,
  }));

};

export async function ListDocuments(session_first = true) {

  if (session_first) {
    const text = sessionStorage.getItem('documents-list');
    if (text) {
      try {
        const json = JSON.parse(text);
        if (auth.session().id === json.id) {
          StoreDocumentsList(json.list || []);
          return true;
        }
      }
      catch {
        console.error('parse failed');
      }
    }
  }

  const result = await auth.AccessResource('/api/list-documents');
  if (result.ok) {
    const json = await result.json();
    // console.info(json);
    StoreDocumentsList(json.list || []);
    return true;
  }
  return false;
};


