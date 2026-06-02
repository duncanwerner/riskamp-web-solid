

import { Register } from '../registry';
import { t } from '~/i18n/i18n';

import '~/components/tabs.css';
import style from './ai-sidebar.module.css';
import { Splitter } from '../../splitter/splitter';
import { persistentData, sessionData, setPersistentData, setSessionData } from '~/lib/app-data';
import { createEffect, createSignal, For, on, onMount, Show } from 'solid-js';
import { produce } from 'solid-js/store';
import { Models, provider_list, TypedChatMessages } from '~/lib/raw-llm-support';
import { messages, SendMessage } from './util';
import { ChatMessages } from './chat-messages';
import type { SidebarProps } from '../sidebar-main';

type ChatMessage = TypedChatMessages['messages'][number];

export function Sidebar(props: SidebarProps) {

  const tab_group = crypto.randomUUID();
  const [split, setSplit] = createSignal(sessionData.llm_tab_split);

  createEffect(on(split, value => {
    setSessionData(produce(s => s.llm_tab_split = value));
  }));
  
  const [selectedModel, setSelectedModel] = createSignal(persistentData.llm_model?.name || '');
  function SelectModel(event: Event) {
    if (event.target instanceof HTMLSelectElement) {
      for (const model of Models) {
        if (model.name === event.target.value) {
          setPersistentData(produce(s => s.llm_model = model));
          setSelectedModel(model.name);
          setApiKey(persistentData.llm_api_keys[model.provider.name] || '');
          break;
        }
      }
    }
  }

  const [apiKey, setApiKey] = createSignal('');

  if (persistentData.llm_model) {
    setApiKey(persistentData.llm_api_keys[persistentData.llm_model.provider.name] || '');
  }

  createEffect(on(apiKey, value => {
    if (persistentData.llm_model) {
      setPersistentData(produce(s => s.llm_api_keys[persistentData.llm_model?.provider.name || ''] = value));
    }
  }, { defer: true }));

  let textarea: HTMLTextAreaElement|undefined;

  function LocalSendMessage(event: Event) {
    if (textarea) {
      SendMessage(textarea.value||'');
      textarea.value = '';
    }
  }

  function HandleKey(event: KeyboardEvent) {
    if (event.target instanceof HTMLTextAreaElement) {
      if (event.key === 'Enter') {
        if (event.shiftKey) {
          return;
        }

        event.stopPropagation();
        event.preventDefault();
        SendMessage(event.target.value||'');
        event.target.value = '';
      }
    }
  }

  const show_settings = !(persistentData.llm_model && persistentData.llm_api_keys[persistentData.llm_model.provider.name || '']);
  const [tab, setTab] = createSignal(show_settings ? 1 : 0);

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
                 name={tab_group} 
                 checked={tab() === 0}
                 onchange={e => { if(e.currentTarget.checked) setTab(0); }}
                 ></input>
        </label>
        <div class="tab-content overflow-hidden">
          <Splitter vertical split={split} setSplit={setSplit} splitter-width={17} min={25} max={75}>
            <div data-top classList={{
              "flex-grow": true, 
              "overflow-y-scroll": true,
              [style.messages]: true,
            }}>
              
              <ChatMessages sheet={props.sheet}/>

            </div>
            <div data-bottom class={style.controls}>
              <textarea ref={textarea} wrap="soft" onkeydown={HandleKey}></textarea>
              <div class={style.buttons}>
                <button class="control-button"
                        onclick={() => messages.messages = []}>{t('llm-chat.buttons.clear-conversation')}</button>
                <button class="control-button"
                        onclick={LocalSendMessage}>{t('llm-chat.buttons.send-message')}</button>
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
                 name={tab_group} 
                 checked={tab() === 1} 
                 onchange={e => { if(e.currentTarget.checked) setTab(1); }}
                 ></input>
        </label>
        <div class="tab-content">

          <div class={style['settings-layout']}>
            <fieldset>
              <legend>{t('llm-chat.label.header.important')}</legend>
              {t('llm-chat.label.disclaimer').split(/\n/).map(paragraph => <p>{paragraph}</p>)}
            </fieldset>
            <section>
              <span>{t('llm-chat.label.model')}</span>
              <select class="select" 
                      value={selectedModel()}
                      onchange={SelectModel}>
                <option value=''>{t('llm-chat.label.choose-a-model')}</option>
                {provider_list.map(provider => {
                  return <optgroup label={provider.provider.name}>
                    {provider.models.map(model => <option value={model.name}>{model.label}</option>)};
                    </optgroup>;
                })}
              </select>
            </section>
            <section>
              <span>
                <Show when={persistentData.llm_model}><span>{persistentData.llm_model?.provider.name} </span></Show>
                {t('llm-chat.label.api-key')}
              </span>
              <input type="text" 
                     class="input width-100 ellipsis" 
                     value={apiKey()}
                     onchange={e => setApiKey(e.currentTarget.value || '')}
                     placeholder={t(persistentData.llm_model ? 'llm-chat.label.api-key' : 'llm-chat.label.choose-a-model')}></input>
            </section>
          </div>

        </div>
      </div>

      <div class={style.trailer}>
        <Show when={persistentData.llm_model && tab() === 0}>
          <span>{persistentData.llm_model?.label || ''}</span>
        </Show>
      </div>

    </div>
  </>;
}

Register('ai', Sidebar);


