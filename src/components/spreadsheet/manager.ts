
import { SpreadsheetType } from '~/lib/spreadsheet-type';
import { goto } from '~/lib/navigate';
import { spinner } from '~/components/spinner/spinner-control';

import * as cache from '~/docs/local-cache';
import * as documents2 from '~/docs/documents2';

/** check if the path is valid for load/save operations */
export function IsValidPath(path = '') {
  return !path || /^@[^/]+\/.+$/.test(path);
}

export async function RevertDocument(sheet?: SpreadsheetType, path = '') {

  // we should only be called if there's a path, but we might as well check
  if (path) {

    // window.dispatchEvent(new CustomEvent('show-spinner'));
    spinner.show();

    // flush local cache
    await cache.Delete(path);

    /*
    if (historical_version) {
      await cache.Delete(path + '//' + historical_version);
      historical_version = undefined;
    }
    */

    // flush network cache? (...)
    const refresh_cache = false;

    // there's a possibility this will fail...
    try {
      const data = await documents2.GetDocument(path, true, refresh_cache);
      sheet?.LoadDocument(data);
      // network_version.set(path, sheet.state);
      // canonical_version = sheet.state;
      // historical_version = undefined;

      // console.info("NVSx2", page_pathname, sheet.state);
    }
    catch (err) {
      // ? FIXME: what to do in this case
      console.error(err);
      goto('/');
    }

    // window.dispatchEvent(new CustomEvent('hide-spinner'));
    spinner.hide();
    
  }

};

export async function TryLoadPath(sheet?: SpreadsheetType, path = '') {

  if (!sheet) {
    console.warn("mising sheet");
    goto('/');
    return false;
  }

  if (path.startsWith('@')) {

    const match = path.match(/^(@[^/]+)\/(.+)$/);

    if (!match) {
      console.warn("invalid path");
      goto('/');
      return false;
    }

    const [_, user, file] = match;
    // console.info({user, file});

    spinner.show();

    let data = await cache.Get(path);
    if (data?.data) {
      sheet.LoadDocument(data.data);
      spinner.hide();
      return true;
    }

    try {
      data = await documents2.GetDocument(path, true);
      sheet.LoadDocument(data);
      spinner.hide();
      return true;
    }
    catch (err) {
      console.error(err);
      goto('/');
      spinner.hide();
      return false;
    }

  }
  else {
    spinner.show();

    const data = await cache.Get('');
    if (data?.data) {
      try {
        sheet.LoadDocument(data.data);
      }
      catch (err) {
        console.error(err);
        sheet.Reset();
      }
    }
    else {
      sheet.Reset();
    }

    spinner.hide();

  }

  return true;

}