
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
// import { sessionSignal, loggedInSignal } from '~/lib/auth';
import { session, loggedIn } from '~/lib/auth';

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
import { useInternalReferrer } from '../history-context';
import { A, useNavigate } from '@solidjs/router';

export interface Props {
  title: keyof I18N;
}

export function Toolbar(props: Props) {

  return <>
    <div classList={{
      [style.toolbar]: true,
      [style['account-toolbar']]: true,
      'tab-container': true,
    }}>
        
        <div class={style.logo}>
          <A class="display-contents" href='/'>
            <Logo/>
          </A>
        </div>
        
        <div class={style.separator} />

        <div class={style['page-title']}>
          {t(props.title)}
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
                <button class={style['menu-item']} onclick={event => goto('/documents')}>
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

    </div>
  </>;
};
