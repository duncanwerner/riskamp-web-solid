
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

/** cache history entries. need to flush on document change (or we could push) */
const history_cache: Map<string, HistoryEntry[]> = new Map();

let internal: Partial<DocumentsRow>[] = [];
let userid = '';

//
// when doing dev w/ live reload, this gets called more than once. maybe
// we could avoid that by having someone call it in an onmount handler? 
// seems like only a dev issue though.
//

if (typeof sessionStorage !== 'undefined') {

  const json = sessionStorage.getItem('list');

  if (json) {
    try {
      const data = JSON.parse(json);
      internal = data.list;
      userid = data.id;

      // console.info("have data for user", userid, internal);

    }
    catch (err) {
      console.error(err);
    }
  }

  // flush document list on logout

  auth.logged_in.subscribe(logged_in => {
    if (!logged_in && userid) {
      userid = '';
      console.info("log out");
      requestAnimationFrame(() => FlushDocumentList());
    }
  });

  // retrieve document list on sign in?
  // NOTE: this is getting called when auth resets (jwt expires and 
  // we use the refresh token). in that instance, it does not need
  // to get updated.

  // actually that should be handled with the userid, not? what's 
  // the deal here?

  auth.session.subscribe(data => {

    // console.info("sign in?");

    const id = data?.id || 0;

    if (id && id !== userid) {

      // console.info("sign in (for LD)?", id, userid, data.username);

      userid = id;
      requestAnimationFrame(() => ListDocuments());
    }
  });

}

export const list: Writable<Partial<DocumentsRow>[]> = writable(internal);

const UpdateAndStore = (values: Partial<DocumentsRow>[], remove = false) => {
  internal = values;
  list.set(internal);

  if (remove) {
    sessionStorage.removeItem('list');
  }
  else {
    sessionStorage.setItem('list', JSON.stringify({
      list: internal,
      id: userid,
    }));
  }
};

export const GetHistoryVersion = async (path: string, modified: number) => {
  const result = await auth.AccessResource('/api/document-history-entry', {
    path, modified,
  });

  if (result.ok) {
    const json = await result.json();
    return json;
  }
  else {
    console.info("failed?", result);
  }

  return undefined;

};

export const DocumentHistory = async (path: string) => {

  const cached = history_cache.get(path.toLowerCase());
  if (cached) {
    return cached;
  }
  
  const result = await auth.AccessResource('/api/document-history', {
    path,
  });

  if (result.ok) {
    const json = await result.json();
    if (Array.isArray(json)) {
      history_cache.set(path.toLowerCase(), json);      
    }
    return json as HistoryEntry[];
  }
  else {
    history_cache.set(path.toLowerCase(), []);      
  }

  return [];
};

export const ListDocuments = async () => {
  const result = await auth.AccessResource('/api/list-documents');
  if (result.ok) {
    const json = await result.json();
    // console.info(json);
    UpdateAndStore(json.list || []);
  }
};

export const SetAccess = async (ids: number[], access: number): Promise<boolean> => {
  try {
    const result = await auth.AccessResource('/api/set-access', { ids, access });
    if (result.ok) {
      UpdateAndStore(internal.map(entry => {
        if (entry.id && ids.includes(entry.id)) {
          entry.access = access;
        }
        return entry;
      }));
    }
    return result.ok;
  }
  catch (err) {
    return false;
  }
};

export const DeleteDocuments = async (ids: number[]): Promise<boolean> => {
  try {
    const result = await auth.AccessResource('/api/delete-documents', { ids });
    if (result.ok) {
      UpdateAndStore(internal.filter(test => {
        return test.id && !ids.includes(test.id)
      }));
    }
    return result.ok;
  }
  catch (err) {
    return false;
  }
};

export const FlushDocumentList = () => {
  UpdateAndStore([], true);
  history_cache.clear();
};

export const UpdateDocument = async (pathname: string, name?: string, document?: string, access_public?: boolean) => {

  const access = (typeof access_public === 'boolean') ? (access_public ? 1 : 0) : undefined;

  if (pathname.endsWith('/')) {
    pathname = pathname.substring(0, pathname.length - 1)
  }

  const result = await auth.AccessResource('/api/update-document', {
    pathname,
    name,
    document,
    access,
  });

  if (result.ok) {
    const json = (await result.json()) as Partial<DocumentsRow>;
    const lc = (decodeURIComponent(json.path || '')).toLowerCase();

    internal = internal.map(entry => {

      if (entry.path?.toLowerCase() === lc) {

        console.info(json, entry);

        if (json.modified) {
          entry.modified = json.modified;
        }
        if (typeof json.access !== 'undefined') {
          entry.access = json.access;
        }
        if (typeof json.name !== 'undefined') {
          entry.name = json.name;
        }
        if (typeof json.version === 'number') {
          entry.version = json.version;
        }
      } 
      return entry;
    });

    history_cache.delete(lc);
    sessionStorage.removeItem('history-view');

    UpdateAndStore(internal);
    return json;

  }

  return false;

};

export const StoreDocument = async (pathname: string, name: string, document: string, access_public: boolean) => {

  if (pathname.endsWith('/')) {
    pathname = pathname.substring(0, pathname.length - 1)
  }

  if (name) { // why name and not pathname?
    
    const result = await auth.AccessResource('/api/store-document', {
      pathname,
      name,
      document,
      access: access_public ? 1 : 0,
    });

    if (result.ok) {
      const json = (await result.json()) as Partial<DocumentsRow>;
      // console.info(json);

      let found = false;
      const lc = (json.path || '').toLowerCase();

      internal = internal.map(entry => {
        if (entry.path?.toLowerCase() === lc) {
          found = true;
          return {...json, status: 0};
        }
        return entry;
      });

      if (!found) {

        // console.info("adding to list");

        internal.push({
          ...json, status: 0,
        });
      }

      UpdateAndStore(internal);
      return json;
      
    }

  }
  return false;
};