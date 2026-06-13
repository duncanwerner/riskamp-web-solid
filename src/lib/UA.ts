

export function UA() {

  const app_version = typeof navigator === 'undefined' ? '' : navigator.appVersion;
  const user_agent = typeof navigator === 'undefined' ? '' : navigator.userAgent;

  return {

    /** we need this for some edge-specific weirdness */
    is_edge: /Edge/.test(app_version),

    /** more testing. ios safari doesn't support grid+sticky (apparently) */
    is_ipad: /iPad|iPhone/.test(user_agent),

    /** for iphone so we can change font size to prevent auto-zoom */
    is_iphone: /iPhone/.test(user_agent),

    /** more testing. firefox android doesn't support grid+sticky (apparently) */
    is_android: /android|samsung/i.test(user_agent),

    /** mobile we want slightly different keyboard behavior */
    // is_mobile: this.is_ipad || this.is_android,
  
    /** more testing. firefox android doesn't support grid+sticky (apparently) */
    is_firefox: /firefox/i.test(user_agent),

    /** ... */
    is_safari: /safari/i.test(user_agent) && !/edg/i.test(user_agent),

    /** ... */
    is_mac: /macintosh/i.test(user_agent),

    /** ... */
    is_chrome: /Chrome/i.test(user_agent),

    /* * this is for events (IE11 does't support event constructor) * /
    public trident = ((typeof navigator !== 'undefined') &&
      user_agent && /trident/i.test(user_agent));
    */

    /** ... */
    is_windows: /win64|win32|windows\s+nt/i.test(user_agent),

  };

}
