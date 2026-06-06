
import { JSX } from 'solid-js/h/jsx-runtime';

// import './ai-sidebar/ai-sidebar';
// import './search-sidebar';

import { Dynamic, Show } from 'solid-js/web';
import { Accessor, Signal, type Component } from 'solid-js';

import { registry } from './registry';
import type { SpreadsheetType } from '~/lib/spreadsheet-type';
import { ToolbarCommand, ToolbarCommands, type ToolbarCommandKey } from '../toolbar/toolbar-commands';

import style from './sidebar.module.css';
import { bootstrap_icons } from 's5-icon-lib';
import { t } from '~/i18n/i18n';

export interface SidebarProps {
  bind: Signal<string|undefined>;
  sheet: () => SpreadsheetType|undefined;
  oncommand: (command: ToolbarCommand & { key: ToolbarCommandKey}) => void|Promise<void>;
  split: Accessor<number>;
}

export function Sidebar(main_props: SidebarProps) {
  const [sidebar, setSidebar] = main_props.bind;

  function RenderComponent(props: {component?: Component<SidebarProps>}) {
    return <>
      <Show when={props.component}>
        <Dynamic component={props.component} {...main_props} />
      </Show>
    </>;
  }

  function RenderForKey(props: {key?: string}) {
    return <>
      <Show when={props.key}>
        <RenderComponent component={registry.get(props.key as ToolbarCommandKey)}></RenderComponent>
      </Show>
    </>;
  }

  return <nav>
    <header>
      <Show when={sidebar()}>
        <span>{t(ToolbarCommands[sidebar() as ToolbarCommandKey].title)}</span>
      </Show>
      <button class={style['close-sidebar']} 
              onclick={() => setSidebar()} 
              innerHTML={bootstrap_icons.x_lg} />
    </header>
    <div class={style.container}>
      <RenderForKey key={sidebar()} />
    </div>
  </nav>;

}

