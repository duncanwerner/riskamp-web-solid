
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

interface ColorType {
  color: Color;
  resolved: string;
};

const base_other_colors = ['Black', 'White', 'Gray', 'Red', 'Orange', 'Yellow', 'Green', 'Blue', 'Indigo', 'Violet'];

const color_map: Map<string, string> = new Map();
function MapColor(color: string) {
  color = color.toLowerCase();
  let mapped = color_map.get(color);
  if (mapped) { return mapped; }
  const clamped = Measurement.MeasureColor(color).slice(0, 3);
  mapped = '#' + Array.from(clamped).map((value: number) => {
    const s = value.toString(16);
    if (s.length === 1) { return '0' + s; }
    return s;
  }).join('').toUpperCase();
  color_map.set(color, mapped);
  return mapped;
};


function IsThemeColor(color: Color): color is ThemeColor {
  return !!color && (typeof (color as ThemeColor).theme !== 'undefined');
}

function ThemeColorTitle(sheet: SpreadsheetType|undefined, color: Color) {
  let text = '';

  if (IsThemeColor(color)) {
    switch (color.theme) {
      case 0:
      case 2:
        text = t('color-picker.theme.background');
        break;

      case 1:
      case 3:
        text = t('color-picker.theme.text');
        break;

      default:
        text = t('color-picker.theme.accent');
        break;
    }

    if (color.tint) {
      text += ` (${sheet?.FormatNumber(color.tint, '+0%;-0%')})`;
    }

  }
  return text;
}

export function ColorButton(props: { 
      control: ColorButtonControl, 
      sheet: () => SpreadsheetType|undefined,
      HandleCommand: (event: Event, command: ToolbarCommand & { key: ToolbarCommandKey}) => void,
    }) {

    const [themeColors, setThemeColors] = createSignal<ColorType[][]>([]);
    const [otherColors, setOtherColors] = createSignal<ColorType[]>([]);

    const [newColorSelected, setNewColorSelected] = createSignal<string|undefined>(undefined);

    /**
     * here we're updating colors every time you open the 
     * color chooser. that's because the theme may have changed.
     * but that's a rare event -- we can almost certainly do 
     * better. unfortunately I don't think there's a spreadsheet
     * event for theme changes (could be wrong, or also, FIXME 
     * on the TREB side)
     */
    function BeforeToggle(event: ToggleEvent) {
      
      if (event.newState !== 'open') {
        return;
      }

      setNewColorSelected(undefined);

      const sheet = props.sheet();
      if (sheet) {
        const colors: ColorType[][] = [];
        const source = (sheet?.document_styles.theme_colors || []) as ColorType[][];

        const columns = source.length;
        const rows = source[0]?.length || 0; 

        for (let i = 0; i < rows; i++) {
          const row: ColorType[] = [];
          for (let j = 0; j < columns; j++) {
            row.push(source[j][i]);
          }
          colors.push(row);
        }

        setThemeColors(colors);
        
        const mapped_colors = base_other_colors.map(MapColor);
        const additional_colors: string[] = sheet?.document_styles.colors.map((color: string) => MapColor(color)).filter((test: string) => {
          return !mapped_colors.includes(test);
        }) || [];

        setOtherColors([...mapped_colors, ...additional_colors].map(text => {
          return {
            resolved: text,
            color: { text },
          };
        }));

      }

    }

    let native_color_chooser: HTMLInputElement|undefined;

    return <>
        <MenuButton onbeforetoggle={BeforeToggle}>
          <MenuButton.Static>
            <button style={`--applied-color: ${props.control.command.value || '#fff'};`}
                    classList={{ 
                      [style['toolbar-button']]: true, 
                      [style['color-button']]: true,
                    }}
                    title={t(props.control.command.title)}
                    onclick={e => props.HandleCommand(e, props.control.command)}
                    innerHTML={props.control.command.icon || ''} 
            ></button>
                  
          </MenuButton.Static>
          <MenuButton.Menu>
            <div class={style['color-picker']}>
              <h1>{t(props.control.command.title)}</h1>

              <h2>{t('color-picker.theme_colors')}</h2>
              <div class={style.swatches} style={`grid-template-columns: repeat(${
                themeColors()[0]?.length || 0}, auto)`}>

                <For each={themeColors()}>
                  {row => <div class="display-contents">
                    <For each={row}>
                      {color => <button class={style.swatch} 
                                        onclick={e => {
                                          props.control.command.active_color = color.color;
                                          props.HandleCommand(e, props.control.command);
                                        }}
                                        title={ThemeColorTitle(props.sheet(), color.color)}
                                        style={`--swatch-color: ${color.resolved};`}
                                      />}
                    </For>
                  </div>}
                </For>

              </div>

              <Show when={props.control.command.default_color_text}>
                <h2>{t('color-picker.no_color')}</h2>
                <div class={style.swatches}>
                  <div class="flex-row gap-1">
                    <button class={style.swatch} 
                            onclick={e => {
                              props.control.command.active_color = undefined;
                              props.HandleCommand(e, props.control.command);
                            }}
                            innerHTML={bootstrap_icons.x_lg} />
                    <button onclick={e => {
                              props.control.command.active_color = undefined;
                              props.HandleCommand(e, props.control.command);
                            }} 
                            class={style['plaintext-button']}>{t(props.control.command.default_color_text)}</button>
                  </div>
                </div>
              </Show>

              <h2>{t('color-picker.other_colors')}</h2>
              <div class={style.swatches} style={`grid-template-columns: repeat(${
                themeColors()[0]?.length || 0}, auto)`}>

                  <For each={otherColors()}>
                    {color => <button class={style.swatch} 
                                      onclick={e => {
                                        props.control.command.active_color = color.color;
                                        props.HandleCommand(e, props.control.command);
                                      }}
                                      title={color.resolved}
                                      style={`--swatch-color: ${color.resolved};`}
                                    />}
                  </For>

              </div>

              <h2>{t('color-picker.new_color')}</h2>
                <div class={style.swatches}>
                  <div class="flex-row gap-1">
                    <input type="color"
                           ref={native_color_chooser} 
                           onchange={e => setNewColorSelected(e.currentTarget.value)} />
                    <button class={style['plaintext-button']}
                            onclick={() => native_color_chooser?.click()}>{t('color-picker.choose_color')}</button>
                    <div class="flex-grow"></div>
                    <button disabled={!newColorSelected()}
                            onclick={e => {
                              props.control.command.active_color = {
                                text: newColorSelected(),
                              };
                              props.HandleCommand(e, props.control.command);
                            }}
                            class={style.swatch} 
                            title={t('color-picker.use_selected_color')}
                            innerHTML={bootstrap_icons.check_lg} />
                  </div>
                </div>

            </div>
          </MenuButton.Menu>
        </MenuButton>
      </>    
  }
