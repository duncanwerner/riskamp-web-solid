

/*
 * client side of auth operations against remote (cloud) db.
 * adding a svelte store for session data so we can watch it.
 * 
 * NOTE we're mixing auth and resource access/caching... maybe 
 * we should split? there are too many things going on here
 */

/**
 * so there are two caches now, this one and the one in local-cache.
 * _this_ one only caches files you look up by path, e.g.
 * 
 * /@riskamp/example-file
 * 
 * files are only cached for the session, because on load we flush this 
 * cache. that means you can update by refreshing the browser.
 * 
 * so what's the value of this cache? it's used if you navigate away
 * from a spreadsheet page and then back, for example to the account or
 * documents page. 
 * 
 * so I think it's useful. we could move it to OPFS but it's probably
 * not a big deal either way, and this is legit caching network requests.
 * 
 */

import * as jose from 'jose';

import { createSignal  } from 'solid-js';
import { goto } from '~/lib/navigate';

const DOCUMENT_CACHE = 'documents';
const AUTH_KEY = 'auth';

// exporting this so we can expose it for dev

// export const BACKEND = 'http://localhost:8787'; 
export const BACKEND = 'https://auth.riskamp.com';

export interface Claims {
  username: string;
  email: string;
  exp: number;
  id: string;
}

let cache_: Cache|undefined;
let cache_initialized = false;
let refresh_token = 0;

// export const [session, setSession] = createSignal<Partial<Claims>>(GetInitialSession());
export const [session, setSession] = createSignal<Partial<Claims>>({});
export const loggedIn = () => !!session().username;
export const enable_auth = true;

const EnsureCache = async () => {
  if (cache_initialized) {
    return cache_;
  }
  if (typeof caches !== 'undefined') {
    cache_initialized = true;
    cache_ = await caches.open(DOCUMENT_CACHE);
    const keys = await cache_.keys();
    for (const key of keys) {
      await cache_.delete(key);
    }
    return cache_;
  }
  return undefined;
};

const Delay = (seconds = 1) => {
  return new Promise<void>(resolve => {
    window.setTimeout(() => resolve(), seconds * 1000);
  });
};

/**
 * utility method (FIXME: move?)
 */
export const FormatTime = (seconds: number, precision = 2) => {

  let minutes = Math.floor(seconds/60);
  seconds = seconds % 60;

  const seconds_text = ((seconds < 10) ? '0' : '') + seconds.toFixed(precision);

  let hours = Math.floor(minutes / 60);
  minutes = minutes % 60;

  const minutes_text = ((minutes < 10) ? '0' : '') + minutes;

  return hours + ':' + minutes_text + ':' + seconds_text;
  
};

/**
 * breaking up the old "update session data" routine, which did a lot 
 * of different things. all this one does is check valid/expired token.
 * 
 * the old method did two additional things:
 * 
 * (1) if token was expired, it set a refresh to try and log in again
 *     based on the refresh cookie (using the side effect of an API call)
 * 
 * (2) if the token was valid, it sets a timeout to do a refresh _or_ 
 *     log out at token expiration time. 
 * 
 * so those things should still happen in a calling method, but this 
 * method will handle parsing/validating the token.
 * 
 * @param token 
 * @returns 
 */
function SessionDataFromToken(token: string): { session: Partial<Claims>, expired?: boolean } {
  if (token) {
    try {
      const payload = jose.decodeJwt(token);
      const time = new Date().getTime() / 1000;

      if (payload.exp && payload.exp < time) {
        return { session: {}, expired: true };
      }

      return {session: payload};


    }
    catch (err) {
      console.error(err);
    }
  } 
  return { session: {}}; 
}

/** 
 * this method handles the "try re-auth on expiration" routine, which
 * is just a deferred call to an API method
 */
function TryReauth() {

  console.info("Try reauth");

  requestAnimationFrame(() => {

    // we're relying on side-effects of the access method
    // to store updated credentials (if they are provided)

    AccessResource('/api/status', {}).then((result) => {
      // console.info("X");
    });

  });
  
}

/**
 * this method handles scheduling a session refresh. it should be 
 * called when there's a valid session. upon expiration time, it will 
 * try to refresh the session, and if that fails, log out.
 */
function ScheduleSessionUpdate(data: Partial<Claims>) {

  const time = new Date().getTime() / 1000;

  if (!data.exp) {
    throw new Error('invalid session data');
  }

  const delta = ((data.exp - time) + 5) * 1000;

  console.info("Schedule session update", FormatTime(delta/1000));

  if (refresh_token) {
    window.clearTimeout(refresh_token);
  }

  refresh_token = window.setTimeout(() => {
    AccessResource('/api/status', {}).then((result) => {
      let success = false;
      try {

        const check_token = localStorage.getItem(AUTH_KEY) || '';
        if (check_token) {

          const payload = jose.decodeJwt(check_token);
          const time = new Date().getTime() / 1000;

          if (payload.exp && payload.exp > time) {

            // re-auth successful. set a new timeout.
            ScheduleSessionUpdate(payload);
            return;

          }

        }
      }
      catch {
        // ...
      }

      // if we get here, then the re-auth failed, so ensure
      // we're not pointing at a sensitive resource.

      console.info("session update failed, logging out");

      ClearTokens();
      goto('/');

    });
  }, Math.ceil(delta));

}

export function GetInitialSession(): Partial<Claims> {
  if (typeof localStorage !== 'undefined' && localStorage.getItem) {
    const data = localStorage.getItem(AUTH_KEY) || '';
    if (data) {
      const parsed = SessionDataFromToken(data);
      if (parsed.expired) {
        TryReauth();
      }
      else if (parsed.session.username ) {
        // requestAnimationFrame(() => {
          ScheduleSessionUpdate(parsed.session);
        // });
        return parsed.session;
      }
    }
  }
  return {};
}

/**
 * this can't be inlined because it needs to run after reactivity
 * has "started" or whatever solid is doing
 */
export function Init() {

  console.info("OLD INIT METHOD");

  /*
  if (typeof localStorage !== 'undefined' && localStorage.getItem) {
    const data = localStorage.getItem(AUTH_KEY) || '';
    UpdateSessionData(data);
  }
    */

}

/**
 * if we're using cache, we need a method to flush one request. seems to work.
 * UPDATE: call with no URI and we'll flush everything
 */
export const FlushCache = async (uri?: string) => {

  const cache = await EnsureCache();
  if (cache) {
    if (uri) {
      const result = await cache.delete( new Request(BACKEND + uri, { method: 'GET' }));
    }
    else {
      // console.info('flushing everything');
      const keys = await cache.keys();
      for (const key of keys) {
        await cache.delete(key);
      }
    }
  }

};

/**
 * FIXME: make this private, add some save/save-as routines (do they 
 * need to be different? only for parameters)
 */
export const PushInNetworkCache = async (url: string, data: any) => {
  const request = new Request(BACKEND + url, {
    method: 'GET'
  });
  const response = new Response(JSON.stringify(data));
  const cache = await EnsureCache();
  if (cache) {
    await cache.put(request, response);
  }
};

/** 
 * fetch, but including authentication 
 * 
 * we now have a cache we're using for documents -- it's a browser 
 * "cache" object which caches requests. in order to provide an out from
 * the cache, we flush it on page load so a hard refresh will wipe it.
 * 
 */
export const AccessResource = async (
      uri: string, 
      payload?: any, 
      delay = 0, 
      use_cache = false, 
      refresh_cache = false ): Promise<any> => {

  const auth_token = typeof localStorage === 'undefined' ? undefined : localStorage.getItem(AUTH_KEY);

  const headers = auth_token ? {
    Authorization: `Bearer ${auth_token}`,
  } : undefined;

  let pending = delay ? Delay(delay) : Promise.resolve();
  
  // console.info("fetching", uri, headers);

  const request = new Request(BACKEND + uri, {
    credentials: 'include',
    method: payload ? 'POST' : 'GET',
    body: payload ? JSON.stringify(payload) : undefined,
    headers,
  });

  // let cache: Cache|undefined;
  
  const cache = await EnsureCache();

  if (use_cache && cache && !refresh_cache) {

    const result = await cache.match(request);
    if (result) {

      // console.info("fetched from cache:", uri);

      return result; // no auth stuff
    }
  }

  let result = await fetch(request);

  if (use_cache && cache) {

    await cache.put(request, result);
    const temp = await cache.match(request);
    
    if (temp) {
      result = temp;
    }
    else {
      throw new Error('cache store failed');
    }

  }

  await pending;

  // if we refreshed out-of-band, update token

  UpdateAuth(result);
  return result;

};

export const ClearTokens = () => {
  // UpdateSessionData('');
  localStorage.removeItem(AUTH_KEY); // cookie?

  // clear session
  setSession({});

  // clear refresh, if it's set
  if (refresh_token) {
    window.clearTimeout(refresh_token);
    refresh_token = 0;
  }

};

export const Logout = async () => {

  // FIXME: call back end to flush refresh token

  await AccessResource('/api/logout');
  ClearTokens();
  
};

export const TestState = async () => {
  const response = await AccessResource('/api/test-state');
  if (response.ok) {
    const json = await response.json();
    // console.info({json});
  }
};

export const Contact = async(message: string) => {

  const delay = Math.random() * .5;
  const result = await AccessResource('/api/contact', {
    message
  }, delay);

  if (result.ok) {
    return true; // await result.json();
  }

  return false;

};

export const CheckAvailability = async ({ email, username }: { email?: string, username?: string }) => {

  if (username && username.length < 5) {
    return false;    
  }

  const delay = Math.random() * .5;
  const result = await AccessResource('/api/username-exists', {
    email, username
  }, delay);

  if (result.ok) {
    return await result.json();
  }

  return false;

};

export const RecoverAccount = async ({ email }: {email: string}) => {

  if (email) {
    const delay = 1.7 + Math.random() * 2;

    const result = await AccessResource('/api/recover-account', {
      email,
    }, delay);

    return result.ok;

  }

  return false;

};

export const CreateAccount = async ({username, email}: { username: string, email: string }) => {

  if (username && email) {
    const delay = 1.7 + Math.random() * 2;

    const result = await AccessResource('/api/create-account', {
      username,
      email,
    }, delay);

    return result.ok;
  }

};

export const ResetPassword = async ({username, password, token}: {username: string, password: string, token: string}) => {

  if (username && password && token) {

    const delay = 1.7 + Math.random() * 2;

    const result = await AccessResource('/api/recover', {
      username,
      password,
      token,
    }, delay);

    return result.ok;

  }

  return false;

};

/**
 * we're sending auth tokens out-of-band as headers, so any request
 * should check if there's an update. if you don't care about the 
 * result of this function you can just ignore it.
 */
export const UpdateAuth = (response: Response) => {
  const auth = response.headers.get('Authorization');

  // console.info("update auth...");

  if (auth) {

    const parts = auth.split(/\s+/);
    if (parts[1] && parts[0] === 'Bearer') {

      // console.info("Updating auth token", parts[1]);

      StoreToken(parts[1]);
      return true;
    }
  }
  else {
    // console.info("no auth header");

  }

  return false;
};

export const Login = async (username: string, password: string): Promise<boolean> => {

  ClearTokens();

  if (username && password) {
    const delay = undefined; // 1.7 + Math.random() * 2;
    const result = await AccessResource('/api/login', {
      username,
      password,
    }, delay);

    return result.ok;
  
  }

  return false;

};

export const StoreToken = (jwt: string) => {

  // try to parse it
  const parsed = SessionDataFromToken(jwt);
  if (parsed.expired) {
    TryReauth();
  }
  else if (parsed.session.username ) {

    // store token in local storage
    localStorage.setItem(AUTH_KEY, jwt);

    setSession(parsed.session);
    ScheduleSessionUpdate(parsed.session);
  }

};


