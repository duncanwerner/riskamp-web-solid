
import style from '../sidebar.module.css';
import { Register } from '../registry';
import { t } from '~/i18n/i18n';
import { createMutable } from 'solid-js/store';
import { createEffect, createMemo, createSignal, For, Match, on, onCleanup, onMount, Switch } from 'solid-js';

import FindWorker from './find-worker?worker';
import { type SidebarProps } from '../sidebar-main';
import { EmbeddedSheetEvent } from '@trebco/treb';
import { Area } from '@trebco/treb/treb-base-types';
import { bootstrap_icons } from 's5-icon-lib';

export function Sidebar() {
  return <div class={style['fit-data-layout']}>
    
  </div>;

}

Register('fit-data', Sidebar);

