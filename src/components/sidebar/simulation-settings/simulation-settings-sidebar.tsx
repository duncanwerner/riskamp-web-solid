
import style from '../sidebar.module.css';
import { Register } from '../registry';
import { t } from '~/i18n/i18n';
import { createMutable } from 'solid-js/store';
import { createEffect, createMemo, createSignal, For, Match, on, onCleanup, onMount, Switch } from 'solid-js';

import { type SidebarProps } from '../sidebar-main';
import { EmbeddedSheetEvent } from '@trebco/treb';
import { Area } from '@trebco/treb/treb-base-types';
import { bootstrap_icons } from 's5-icon-lib';
import { persistentData, setPersistentData } from '~/lib/app-data';

export function Sidebar(props: SidebarProps) {

  let seed_input: HTMLInputElement|undefined;

  function UpdateSeedValue(event: Event, override?: number) {
    const sheet = props.sheet();
    if (sheet) {

      const user_data = sheet.user_data || {};
      let value = 0;

      if (typeof override === 'number') {
        if (override >= 0 && !isNaN(override) && override !== Infinity) {
          value = override;
        }
        else {
          value = user_data.simulation?.seed || 0;
        }
      }
      else if (event.target instanceof HTMLInputElement) {
        const parsed = sheet.ParseNumber(event.target.value || '');
        if (typeof parsed === 'number' && parsed >= 0 && !isNaN(parsed) && parsed !== Infinity) {
          value = parsed;
        }
        else {
          value = user_data.simulation?.seed || 0;
        }
      }

      if (!user_data?.simulation) {
        user_data.simulation = {};
      }
      user_data.simulation.seed = value;
      sheet.user_data = user_data;

      if (seed_input) {
        seed_input.value = value.toString();
      }

    }
  }

  return  <div class={style['simulation-settings-layout']}>
            <section>
              <h1>{t('sidebar.simulation_settings.random-sampling.section-header')}</h1>
              <div class={style.table}>
                <label>
                  <input type='radio' 
                         name='random-sampling' 
                         checked={!!persistentData.lhs}
                         onchange={e => { if(e.currentTarget.checked) setPersistentData({ lhs: true })}}
                         />
                  <span>{t('sidebar.simulation_settings.latin-hypercube-sampling')}</span>
                </label>
                <label>
                  <input type='radio' 
                         name='random-sampling' 
                         checked={!persistentData.lhs}
                         onchange={e => { if(e.currentTarget.checked) setPersistentData({ lhs: false })}}
                         />
                  <span>{t('sidebar.simulation_settings.standard-random-sampling')}</span>
                </label>
              </div>
            </section>

            <section>
              <h1>{t('sidebar.simulation_settings.random-seed')}</h1>
              <div class={style.explainer} innerHTML={t('sidebar.simulation_settings.random-seed.explanatory-text').split(/\n/g).map(para => `<p>${para}</p>`).join('\n')} />
              <div class={style.table}>
                <div class="flex-row gap-1">
                  <span>
                    {t('sidebar.simulation_settings.random-seed.seed-value')}
                  </span>
                  <input type="text" 
                        style="width: 10em;"
                        class="input"
                        ref={seed_input}
                        value={props.sheet()?.user_data?.simulation?.seed || '0'}
                        onchange={UpdateSeedValue}
                        placeholder={t('sidebar.simulation_settings.random-seed.enter-seed-value')} />
                </div>
                <div class={style.links}>
                  <button class="control-button flex-row gap-1" onclick={e => UpdateSeedValue(e, new Date().getTime())}>
                    <span innerHTML={bootstrap_icons.clock} />
                    <span>
                      {t('sidebar.simulation_settings.random-seed.time-based-seed')}
                    </span>
                  </button>
                  <button class="control-button flex-row gap-1" onclick={e => UpdateSeedValue(e, 0)}>
                    <span innerHTML={bootstrap_icons.lightning} />
                    <span>
                      {t('sidebar.simulation_settings.random-seed.reset-seed-value')}
                    </span>
                  </button>
                </div>
              </div>
            </section>
          </div>;
}

Register('simulation-settings', Sidebar);


