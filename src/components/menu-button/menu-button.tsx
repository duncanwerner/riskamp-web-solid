/**
 * MenuButton is the control for the toolbar that has a regular button
 * (or a textbox -- TODO) and a separate button with a caret to open the 
 * menu. the anchor encompasses the whole control, to aligh menus.
 */

import { createContext, useContext } from "solid-js";
import { ParentProps } from 'solid-js';
import style from './menu-button.module.css';

const Context = createContext<{
  popover_id: string;
  container_id: string;
  inline_style: unknown;
}>();

export function MenuButton(props: ParentProps<{}>) {

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

  return <Context.Provider value={{ popover_id, container_id, inline_style }}>
      <div class={style.container} 
          id={container_id} 
          style={`anchor-name: --${container_id}`}>{props.children}</div>
    </Context.Provider> ;

}

MenuButton.Static = (props: ParentProps<{}>) => {
  const ctx = useContext(Context);
  return <>
      <div class={style.composite}>
        <div class={style['static-content']}>{props.children}</div>
        <button class={style['caret-button']} popovertarget={ctx?.popover_id}>
          <svg fill="currentColor" width="1em" height="1em"  xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640">
            <path d="M144 256L320 456L496 256L144 256z"/></svg>
        </button>
      </div>
    </>;
};

MenuButton.Menu = (props: ParentProps<{}>) => {
  const ctx = useContext(Context);
  return <>
      <div class={style.menu} popover id={ctx?.popover_id} data-anchor={`--${ctx?.container_id}`} style={ctx?.inline_style || {}}>
        {props.children}
      </div>
    </>;
};

