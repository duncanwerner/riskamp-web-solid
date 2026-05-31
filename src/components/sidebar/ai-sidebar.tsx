

import { Register } from './registry';
import { t } from '~/i18n/i18n';

import '~/components/tabs.css';
import style from './ai-sidebar.module.css';
import { Splitter } from '../splitter/splitter';
import { appData, setAppData } from '~/lib/app-data';
import { createEffect, createSignal, on, onMount } from 'solid-js';
import { produce } from 'solid-js/store';

export function Sidebar() {

  const tab_group = crypto.randomUUID();
  const [split, setSplit] = createSignal(appData.ephemeral.llm_tab_split);

  createEffect(on(split, value => {
    setAppData(produce(s => s.ephemeral.llm_tab_split = value));
  }));
  
  return <>
    <div classList={{
      "tab-container": true,
      "height-100": true,
      [style['tab-container']]: true,
    }}>
      <div classList={{
        "tab-pane": true,
        [style['tab-pane']]: true,
      }}>
        <label class="tab">
          <input type="radio" 
                 data-label={t('llm-chat.chat-tab.title')} 
                 name={tab_group} checked ></input>
        </label>
        <div class="tab-content">
          <Splitter vertical bind={[split, setSplit]} splitter-width={17} min={25} max={75}>
            <div data-top classList={{
              "flex-grow": true, 
              "overflow-y-scroll": true,
              [style.messages]: true,
            }}>
              top
            </div>
            <div data-bottom class={style.controls}>
              <textarea></textarea>
              <div class={style.buttons}>
                <button class="control-button">{t('llm-chat.buttons.clear-conversation')}</button>
                <button class="control-button">{t('llm-chat.buttons.send-message')}</button>
              </div>
            </div>
          </Splitter>
        </div>
      </div>
      <div classList={{
        "tab-pane": true,
        [style['tab-pane']]: true,
      }}>
        <label class="tab">
          <input type="radio" 
                 data-label={t('llm-chat.settings-tab.title')} 
                 name={tab_group} ></input>
        </label>
        <div class="tab-content">

        </div>
      </div>
    </div>
  </>;
}

Register('ai', Sidebar);


