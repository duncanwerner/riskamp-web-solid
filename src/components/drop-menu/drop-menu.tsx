/**
 * DropMenu is the menu-bar menu control. Menus always drop down, are aligned
 * to the bottom left of the button. The button has a caret on the right.
 */

import { ParentProps } from 'solid-js';
import style from './drop-menu.module.css';

export interface Props {
  label: string;
}

export function DropMenu(props: ParentProps<Props>) {

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


  return <div class={style["drop-menu"]} id={container_id} style={`anchor-name: --${container_id}`}>

    <button class={style.label} popovertarget={popover_id} >
      <span>
        {props.label}
      </span>
      <svg fill="currentColor" width="1em" height="1em"  xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640">
        <path d="M144 256L320 456L496 256L144 256z"/></svg>
    </button>

    <div class={style.menu} popover id={popover_id} data-anchor={`--${container_id}`} style={inline_style}>
      {props.children}
    </div>
    
  </div>;

}
