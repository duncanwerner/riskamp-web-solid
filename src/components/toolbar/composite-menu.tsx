
import { ParentProps, Switch, Match, For, Show, onMount, onCleanup, createEffect, on, createSignal } from 'solid-js';
import style from './toolbar.module.css';
import { Logo } from '../logo';
import { DropMenu } from '~/components/drop-menu/drop-menu';
import { I18N, t, UpdateLanguage } from '~/i18n/i18n';

import '~/components/tabs.css';

import { toolbar_config as base_toolbar_config } from './toolbar-config';
import html from 'solid-js/html';
import { ButtonControl, Control, Icon as ToolbarIcon, TextButtonControl, CompositeMenuControl, MoreControl, ComboBoxControl, SplitButtonControl, ColorButtonControl } from './toolbar-utils';
import { ToolbarCommand, ToolbarCommandKey } from './toolbar-commands';

import { goto } from '~/lib/navigate';
import { persistentData, sessionData, setSessionData } from '~/lib/app-data';
import { createMutable, produce, unwrap } from 'solid-js/store';
import { bootstrap_icons } from 's5-icon-lib';
import { MenuButton } from '../menu-button/menu-button';
import { SpreadsheetType } from '~/lib/spreadsheet-type';
import { EmbeddedSheetEvent, MCEmbeddedSheetEvent } from 'riskamp-web';
import { ResolveColors, UpdateState } from './util';
import { NumberFormatCache } from '@trebco/treb/treb-format';
import { Color, ThemeColor } from '@trebco/treb';
import { Measurement } from '@trebco/treb/treb-utils';
import { ColorButton } from './toolbar-color-picker';

export function CompositeMenu(props: {
  item: CompositeMenuControl,
  HandleCommand: (event: Event, command: ToolbarCommand & { key: ToolbarCommandKey}) => void|Promise<void>,
}) {
  return <>
    <MenuButton>
      <MenuButton.Static>
        <div class="flex-row gap-0_5">
          <Show when={props.item.group_icon}>
            <div innerHTML={props.item.group_icon}></div> 
          </Show>
          <button class={
                    props.item.commands[props.item.active].icon ?
                      style['toolbar-button'] :
                      [style['text-button'], style['toolbar-button'], style['composite-label']].join(' ')
                  } 
                  title={props.item.commands[props.item.active].icon ? t(props.item.commands[props.item.active].title) : undefined }
                  onclick={e => props.HandleCommand(e, props.item.commands[props.item.active])}>
            <Switch>
              <Match when={props.item.commands[props.item.active].icon}>
                <span innerHTML={props.item.commands[props.item.active].icon || ''} />
              </Match>
              <Match when={true}>
                <span>{t(props.item.commands[props.item.active].title)}</span>
              </Match>
            </Switch>
          </button>
        </div>
      </MenuButton.Static>
      <MenuButton.Menu>
        <menu classList={{
                [style.horizontal]: props.item.horizontal,
              }}>
          <Switch>
            
            <Match when={props.item.icons && props.item.text}>
              <menu classList={{ [style.text]: true, [style.overflow]: true }}>
                <For each={props.item.commands}>
                  {(subitem, index) => <li>
                    <button classList={{ [style['menu-item']]: true, [style['composite']]: true }} 
                            onclick={e => {
                              props.item.active = index();
                              props.HandleCommand(e, subitem);
                            }}>
                      <div innerHTML={subitem.icon || ''} />
                      <div>{t(subitem.title)}</div>
                    </button>
                  </li>}
                </For>
              </menu>
            </Match>

            <Match when={props.item.text}>
              <menu classList={{ [style.text]: true, [style.overflow]: true }}>
                <For each={props.item.commands}>
                  {(subitem, index) => <li>
                    <button class={style['menu-item']} 
                            onclick={e => {
                              props.item.active = index();
                              props.HandleCommand(e, subitem);
                            }}>
                      {t(subitem.title)}
                    </button>
                  </li>}
                </For>
              </menu>
            </Match>

            <Match when={props.item.icons}>
              <For each={props.item.commands}>
                {(subitem, index) => <li>
                  <button class={style['toolbar-button']} 
                          title={t(subitem.title)}
                          onclick={e => {
                            props.item.active = index();
                            props.HandleCommand(e, subitem);
                          }}
                          innerHTML={subitem.icon || ''} />
                </li>}
              </For>
            </Match>

          </Switch>
        </menu>
      </MenuButton.Menu>
    </MenuButton>
  </>;
}
