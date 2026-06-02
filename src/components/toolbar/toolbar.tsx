
import { ParentProps, Switch, Match, For, Show, onMount, onCleanup, createEffect, on, createSignal } from 'solid-js';
import style from './toolbar.module.css';
import { Logo } from '../logo';
import { DropMenu } from '~/components/drop-menu/drop-menu';
import { I18N, t, UpdateLanguage } from '~/i18n/i18n';

import '~/components/tabs.css';

import { toolbar_config as base_toolbar_config } from './toolbar-config';
import html from 'solid-js/html';
import { ButtonControl, Control, Icon as ToolbarIcon, TextButtonControl, CompositeMenuControl, MoreControl } from './toolbar-utils';
import { ToolbarCommand, ToolbarCommandKey } from './toolbar-commands';
import { sessionSignal, loggedInSignal } from '~/lib/auth';
import { goto } from '~/lib/navigate';
import { persistentData, sessionData, setSessionData } from '~/lib/app-data';
import { createMutable, produce } from 'solid-js/store';
import { bootstrap_icons } from 's5-icon-lib';
import { MenuButton } from '../menu-button/menu-button';
import { SpreadsheetType } from '~/lib/spreadsheet-type';
import { EmbeddedSheetEvent, MCEmbeddedSheetEvent } from 'riskamp-web';
import { ResolveColors, UpdateState } from './util';

interface Props {
  oncommand: (command: ToolbarCommand & { key: ToolbarCommandKey}) => void|Promise<void>;
  sidebar: () => string|undefined;
  sheet: () => SpreadsheetType|undefined;
};

const tab_group_name = crypto.randomUUID();

function Literal(text: string) {
  // const literalHtml = "<p>This is <strong>bold</strong> text.</p>";

  return (
    <div ref={(el) => (el.innerHTML = text)} />
  );
}

function RenderButton(control: ButtonControl) {
  return <>
    <button class={style['toolbar-button']} ref={(el) => (el.innerHTML = control.command.icon || '')} />
  </>;
}


function RenderTextButton(control: TextButtonControl) {
  return <>
    <button class={style['toolbar-button']} >
      <div ref={(el) => (el.innerHTML = control.command.icon || '')} />
      <div>{t(control.command.title)}</div>
    </button>
  </>;
}

export function Toolbar(props: ParentProps<Props>) {

  const [loggedIn] = loggedInSignal;
  const [session] = sessionSignal;

  const toolbar_config = createMutable(base_toolbar_config);
  
  let subscription = 0;

  const toolbar_props = props;

  /*
  onMount(() => {
    if (props.sheet) {



      const sheet = props.sheet;
      subscription = sheet.Subscribe((event: MCEmbeddedSheetEvent|EmbeddedSheetEvent) => {
        if (event.type === 'selection') {
          UpdateState(sheet, toolbar_config);
        }
      });
    }
    else {
      console.info("no sheet");
    }
  });
  */

  createEffect(on(props.sheet, sheet => {
    if (sheet && !subscription) {
      subscription = sheet.Subscribe((event: MCEmbeddedSheetEvent|EmbeddedSheetEvent) => {
        switch (event.type) {
          case 'theme-change':
            ResolveColors();
            // fall through

          case 'selection':
          case 'annotation-selection':
          case 'focus-view':
          case 'load':
          case 'reset':
          case 'view-change':
          case 'document-change':
            UpdateState(sheet, toolbar_config);
            break;

        }
      });
      ResolveColors();
    }
  }));

  onCleanup(() => {
    const sheet = props.sheet();
    if (sheet && subscription) {
      sheet.Cancel(subscription);
      subscription = 0;
    }
  });

  function HandleCommand(event: Event, command: ToolbarCommand & { key: ToolbarCommandKey}) {
    if (event?.target instanceof HTMLElement) {
      CloseContainingPopover(event.target);
    }
    props.oncommand?.(command);
  }

  function CloseContainingPopover(element: Element) {
    let parent = element.parentElement;
    for (;;) {
      if (!parent) { break; }
      if (parent.hasAttribute('popover')) {
        parent.hidePopover();
        break;
      }
      parent = parent.parentElement;
    }
  }

  function HandleMenuItem(event: Event, command: ToolbarCommand & { key: ToolbarCommandKey}) {
    if (event.target instanceof HTMLElement) {
      CloseContainingPopover(event.target);
    }
    props.oncommand?.(command);
  }

  function CompositeMenu(props: {item: CompositeMenuControl}) {
    return <>
      <MenuButton>
        <MenuButton.Static>
          <button class={style['toolbar-button']} >
            <Show when={props.item.commands[props.item.active].icon}>
              <span ref={(el) => (el.innerHTML = props.item.commands[props.item.active].icon || '')} />
            </Show>
          </button>
        </MenuButton.Static>
        <MenuButton.Menu>
          <menu classList={{
                  [style.horizontal]: props.item.horizontal,
                }}>
            <Switch>
              <Match when={props.item.icons && props.item.text}>
                <>both?</>
              </Match>
              <Match when={props.item.text}>
                <>
                  {props.item.commands.map(subitem => <li>
                    <button class={style['toolbar-button']}
                            onclick={e => HandleCommand(e, subitem)}>
                      {t(subitem.title)}
                    </button>
                  </li>)}
                </>
              </Match>
              <Match when={props.item.icons}>
                <>
                  {props.item.commands.map(subitem => <li>
                    <button class={style['toolbar-button']} 
                            onclick={e => HandleCommand(e, subitem)}
                            ref={(el) => (el.innerHTML = subitem.icon || '')} />
                  </li>)}
                </>
              </Match>
            </Switch>
          </menu>
        </MenuButton.Menu>
      </MenuButton>
    </>;
  }

  function More(props: {control: MoreControl}) {
    return <>
      <MenuButton single_button_style>
        <MenuButton.Static class={style['toolbar-button']}>
          <div class=""
            title={t('toolbar.more-commands-button.label')}
            ref={(el) => (el.innerHTML = bootstrap_icons.three_dots)} />
        </MenuButton.Static>
        <MenuButton.Menu>
          <menu class={style.horizontal}>
            <For each={props.control.controls}>
              {item => <li><RenderButton control={item as ButtonControl}/></li>}
            </For>
          </menu>          
        </MenuButton.Menu>
      </MenuButton>
    </>;
  }

  function RenderButton(props: {control: ButtonControl}) {

    /*
    let [icon, setIcon] = createSignal(props.control.command.icon);
    let [title, setTitle] = createSignal(props.control.command.title);

    // const active = false; // !!props.control.command.value;

    if (props.control.command.type === 'toggle') {
      if (props.control.command.value) {
        setIcon(props.control.command.active?.icon || icon);
        setTitle(props.control.command.active?.title || title);
      }
    }
    */

    function title() {
      let title = props.control.command.title;
      if (props.control.command.type === 'toggle' && props.control.command.value) {
        title = props.control.command.active?.title || title;
      } 
      return title;
    }

    function icon() {
      let icon = props.control.command.icon;
      if (props.control.command.type === 'toggle' && props.control.command.value) {
        icon = props.control.command.active?.icon || icon;
      } 
      return icon;
    }

    return  <Switch>
              <Match when={true}>
                <button classList={{ 
                          [style['toolbar-button']]: true,
                          [style.active]: !!props.control.command.value,
                        }} 
                        onclick={e => HandleCommand(e, props.control.command)}
                        title={t(title())}
                        ref={(el) => (el.innerHTML = icon() || '')} />
              </Match>
            </Switch>;

  }

  return <>
    <div classList={{
      [style.toolbar]: true,
      'tab-container': true,
    }}>
        
        <div class={style.logo}>
          <Logo/>
        </div>
        
        <div class={style.menubar}>

          {/* this is never going to change at runtime, so we can use a map -- I think? */}

          {toolbar_config.menus?.map(menu => <>
            <DropMenu label={t(menu.label)}>
              <menu>
                {menu.items?.map(item => <li>
                  {item === 'separator' ? <hr/> :
                    <button class={style['menu-item']} onclick={event => HandleMenuItem(event, item)}>
                      <Switch>
                        <Match when={item.menuicon && item.icon}>
                          <div class='display-contents'
                               ref={(el) => (el.innerHTML = item.icon || '')}/>
                        </Match>
                        <Match when={props.sidebar?.() === item.key}>
                          <div class='display-contents'
                               ref={(el) => (el.innerHTML = bootstrap_icons.check2 || '')}/>
                        </Match>
                        <Match when={true}>
                          <div class={style['svg-placeholder']}></div>
                        </Match>
                      </Switch>
                      <span>{t(item.title)}</span>
                    </button>}
                </li>)}
              </menu>
            </DropMenu>
          </>)}

        </div>

        <div class={style.separator}></div>

        {toolbar_config.tabs.map((tab, index) => <div class="tab-pane">
          <label classList={{"tab": true, [style.tab]: true}}>
            <input type="radio" 
                   data-label={t(tab.label)} 
                   name={tab_group_name} 
                   checked={index === sessionData.active_tab} 
                   onchange={e => { if (e.currentTarget.checked) { setSessionData(produce(s => s.active_tab = index)) }}}
                   />
          </label>
          <div classList={{
            'tab-content': true,
            [style['tab-content']]: true,
            }}>
              {tab.groups?.map(group => <>

                <Switch>
                  <Match when={Array.isArray(group)}>
                    <For each={group as Control[]}>{(item, index) =>
                      <Switch>
                        <Match when={item.type === 'composite-menu'}>
                          <CompositeMenu item={item as CompositeMenuControl}/>
                        </Match>
                        <Match when={item.type === 'button'}>
                          <RenderButton control={item as ButtonControl}/>
                        </Match>
                        <Match when={item.type === 'text-button'}>
                          <button classList={{[style['toolbar-button']]: true, [style['text-button']]: true }}
                                  onclick={e => HandleCommand(e, (item as TextButtonControl).command)}>
                            <span ref={(el) => (el.innerHTML = (item as TextButtonControl).command.icon || '')} />
                            <span>{t((item as TextButtonControl).command.title)}</span>
                          </button>
                        </Match>
                        <Match when={item.type === 'color-button'}>
                          <div>Color!</div>
                        </Match>
                        <Match when={item.type === 'icon'}>
                          <div class={style['toolbar-icon']} ref={(el) => (el.innerHTML = (item as ToolbarIcon).icon || '')} />
                        </Match>
                        <Match when={item.type === 'label'}>
                          <div>{`label`}</div>
                        </Match>
                        <Match when={item.type === 'more'}>
                          <More control={item as MoreControl} />
                        </Match>
                        <Match when={true}>
                          <div>{item.type}</div>
                        </Match>
                      </Switch>
                    }</For>
                  </Match>
                  <Match when={true}>
                    not array!
                  </Match>
                </Switch>

                {/* 
                {Array.isArray(group) ? group.map(control => <>{
                  control.type === 'button' ? RenderButton(control) : 
                  control.type === 'text-button' ? RenderTextButton(control) : <>OTHER</>
                }</>) : <>N</>}

                */}

              </>)}
          </div>
        </div>)}

        <div class={style.separator}></div>

        <div class={style['command-palette-container']}>
          (command palette)
        </div>

        <div class={style.login}>
          <Switch>
            <Match when={loggedIn()}>
              <DropMenu label={session().email || ''}>
              <menu>
                <button class={style['menu-item']} onclick={event => goto('/account')}>
                  <span>{t('toolbar.menu-commands.account-page')}</span>
                </button>
                <button class={style['menu-item']} onclick={event => goto('/documents')}>
                  <span>{t('toolbar.menu-commands.documents')}</span>
                </button>

                <hr />
                <button class={style['menu-item']} onclick={event => goto('/sign-out')}>
                  <span>{t('toolbar.menu-commands.sign-out')}</span>
                </button>
              </menu>
            </DropMenu>

            </Match>
            <Match when={true}>
              <a href='/sign-in'>Sign in</a>
            </Match>
          </Switch>
        </div>

        <div class={style.separator}></div>

        <div class={style.trailer}>
          {toolbar_config.trailer?.map(item => <>
            <button class={style['toolbar-button']} 
                    onclick={e => HandleCommand(e, (item as ButtonControl).command)}
                    title={t((item as ButtonControl).command.title)}
                    ref={(el) => (el.innerHTML = (item as ButtonControl).command.icon || '')} />          
          </>)}
        </div>

    </div>
  </>;
};
