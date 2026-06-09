
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
import { sessionSignal, loggedInSignal } from '~/lib/auth';
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
import { CompositeMenu } from './composite-menu';

//////////////

////////////

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
          case 'load':
          case 'reset':
          case 'document-change':
            ResolveColors(sheet, toolbar_config);
            // fall through

          case 'selection':
          case 'annotation-selection':
          case 'focus-view':
          case 'view-change':
            UpdateState(sheet, toolbar_config);
            break;

        }
      });
    }

    if (sheet) {
      ResolveColors(sheet, toolbar_config);
      UpdateState(sheet, toolbar_config);
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

  function UpdateNumberFormat(event: Event, command: ToolbarCommand & {key: ToolbarCommandKey}, item?: {value: string, label: string}) {

    if (item) {
      command.text = item.label;
      command.value = item.value;
    }
    else if (event.target instanceof HTMLInputElement) {
      const value = 
        NumberFormatCache.SymbolicName(event.target.value || '');

      command.text = command.value = event.target.value || '';
    }

    HandleCommand(event, command);

  }

  function ComboBox(props: {control: ComboBoxControl}) {
    return <div class="flex-row gap-0_5">
        <Show when={props.control.command.icon}>
          <div class="icon" innerHTML={props.control.command.icon}></div>
        </Show>
        <MenuButton>
          <MenuButton.Static>
            <input type="text" 
                   class={["input", props.control.width || '' ].join(' ')} 
                   placeholder={t(props.control.command.title)} 
                   value={props.control.command.text || ''} 
                   onchange={e => UpdateNumberFormat(e, props.control.command)}
                   /> 
          </MenuButton.Static>
          <MenuButton.Menu>
            <menu classList={{ [style.text]: true, [style.overflow]: true }}>
              <For each={props.control.values || []}>
                {item => <Switch>
                  <Match when={item === 'separator'}>
                    <hr />
                  </Match>
                  <Match when={true}>
                    <li>
                      <button class={style['menu-item']} 
                          onclick={e => UpdateNumberFormat(e, props.control.command, item as { value: string, label: string })}>
                        {(item as { value: string, label: string }).label}
                      </button>
                    </li>
                  </Match>
                </Switch>}
              </For>
            </menu>
          </MenuButton.Menu>
        </MenuButton>
      </div>;
  }

  function More(props: {control: MoreControl}) {
    return <>
      <MenuButton single_button_style>
        <MenuButton.Static class={style['toolbar-button']}>
          <div class=""
            title={t('toolbar.more-commands-button.label')}
            innerHTML={bootstrap_icons.three_dots} />
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

  function SplitButton(props: {control: SplitButtonControl, sheet: () => SpreadsheetType|undefined}) {

    // we're formatting the numbers here which implies 
    // we know what this control is; it's not really 
    // generic. this might bite later. we could force it
    // into the config, but that might be overoptimizing.

    // ALSO: we're using localization, and hoping that passing in
    // the dummy text (which is translated) will make this update 
    // on a locale change

    function Reformat(text: string, dummy: string) {

      // not great reaching around for Localization here. a better
      // option might be to just format a number and read it.

      const mark = (props.sheet()?.Localization as any)?.decimal_separator;
      if (mark === ',') {
        return text.replace(/\./, mark);
      }
      else {
        return text;
      }

    }

    return <div class={style['toolbar-split-button']}>
        <button title={t(props.control.commands[0].title)}
                onclick={e => HandleCommand(e, props.control.commands[0])}>
          {Reformat(props.control.commands[0].text || '', t(props.control.commands[0].title))}
        </button>
        <button title={t(props.control.commands[1].title)}
                onclick={e => HandleCommand(e, props.control.commands[1])}>
          {Reformat(props.control.commands[1].text || '', t(props.control.commands[1].title))}
        </button>
      </div>;
     
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
          <For each={toolbar_config.menus||[]}>
            {menu => <>
              <DropMenu label={t(menu.label)}>
                <menu>
                  <For each={menu.items || []}>
                    {item => <li>
                      {item === 'separator' ? <hr/> :
                        <button class={style['menu-item']} onclick={event => HandleMenuItem(event, item)}>
                          <Switch>
                            <Match when={item.menuicon && item.icon}>
                              <div class='display-contents' innerHTML={item.icon || ''} />
                            </Match>
                            <Match when={props.sidebar?.() === item.key}>
                              <div class='display-contents' innerHTML={bootstrap_icons.check2 || ''} />
                            </Match>
                            <Match when={true}>
                              <div class={style['svg-placeholder']}></div>
                            </Match>
                          </Switch>
                          <span>{t(item.title)}</span>
                        </button>}
                    </li>}
                  </For>
                </menu>
              </DropMenu>
            </>}
          </For>
        </div>

        <div class={style.separator}></div>

          <For each={toolbar_config.tabs}>
            {(tab, index) => <div class="tab-pane">
              <label classList={{"tab": true, [style.tab]: true}}>
                <input type="radio" 
                      data-label={t(tab.label)} 
                      name={tab_group_name} 
                      checked={index() === sessionData.active_tab} 
                      onchange={e => { if (e.currentTarget.checked) { setSessionData(produce(s => s.active_tab = index())) }}}
                      />
              </label>
              <div classList={{
                  'tab-content': true,
                  [style['tab-content']]: true,
                  }}>
                    
                  <For each={tab.groups || []}>
                    {group => <>

                      <div class={style.group}>

                      <For each={group as Control[]}>{(item, index) =>
                        <Switch>
                          <Match when={item.type === 'composite-menu'}>
                            <CompositeMenu item={item as CompositeMenuControl} HandleCommand={HandleCommand}/>
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
                            <ColorButton HandleCommand={HandleCommand} control={item as ColorButtonControl} sheet={props.sheet}/>
                          </Match>
                          <Match when={item.type === 'icon'}>
                            <div class={style['toolbar-icon']} innerHTML={(item as ToolbarIcon).icon || ''} />
                          </Match>
                          <Match when={item.type === 'label'}>
                            <div>{`label`}</div>
                          </Match>
                          <Match when={item.type === 'combo-box'}>
                            <ComboBox control={item as ComboBoxControl} />
                          </Match>
                          <Match when={item.type === 'more'}>
                            <More control={item as MoreControl} />
                          </Match>
                          <Match when={item.type === 'split-button'}>
                            <SplitButton sheet={props.sheet} control={item as SplitButtonControl} />
                          </Match>
                          <Match when={true}>
                            <div>{item.type}</div>
                          </Match>
                        </Switch>
                      }</For>

                      </div>             

                    </>}
                  </For>

                </div>
            </div>}
          </For>


        <div class={style.separator}></div>

        <div class={style['command-palette-container']}>
          (command palette)
        </div>

        <div class={style.login}>
          <Switch>
            <Match when={loggedIn()}>
              <DropMenu label={session().email || ''}>
              <menu>
                <button disabled class={style['menu-item']} onclick={event => goto('/account')}>
                  <div class={style['svg-placeholder']}></div>
                  <span>{t('toolbar.menu-commands.account-page')}</span>
                </button>
                <button disabled class={style['menu-item']} onclick={event => goto('/documents')}>
                  <div class={style['svg-placeholder']}></div>
                  <span>{t('toolbar.menu-commands.documents')}</span>
                </button>

                <hr />
                <button class={style['menu-item']} onclick={event => goto('/sign-out')}>
                  <div class='display-contents' innerHTML={bootstrap_icons.box_arrow_right}></div>
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
          <For each={toolbar_config.trailer || []}>
            {item =><>
              <button class={style['toolbar-button']} 
                      onclick={e => HandleCommand(e, (item as ButtonControl).command)}
                      title={t((item as ButtonControl).command.title)}
                      ref={(el) => (el.innerHTML = (item as ButtonControl).command.icon || '')} />          
            </>}
          </For>
        </div>

    </div>
  </>;
};
