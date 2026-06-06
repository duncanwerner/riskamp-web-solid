
import { bootstrap_icons, fa_regular, fa_sharp_light, lucide } from 's5-icon-lib';
import type { ToolbarCommandKey } from './toolbar-commands';
import type { ToolbarConfig, ToolbarMenu } from './toolbar-utils';
import { iconmenu, button, more, textbutton, textmenu, colorbutton, splitbutton, spacer, separator, WrapCommand } from './toolbar-utils';

export function menuitems(...commands: (ToolbarCommandKey|'separator')[]): ToolbarMenu['items'] {
  return commands.map(command => {
    if (command === 'separator') {
      return command;
    }
    return WrapCommand(command);
  });
}

export const toolbar_config: ToolbarConfig = {

  menus: [
    {
      label: 'toolbar.menus.file',
      items: menuitems(
        'new',
        'separator',
        'revert',
        'import',
        'save-to-desktop',
        'separator',
        'export-xlsx',
        'export-csv',
      ),
    },
    {
      label: 'toolbar.menus.monte-carlo',
      items: menuitems(
        'run-simulation',
        'run-simulation-again',
        'separator',
        'las-vegas-simulation',
        'separator',
        'simulation-settings',
      ),
    },
    {
      label: 'toolbar.menus.tools-and-analysis',
      items: menuitems(
        'notes',
        'find',
        'names',
        'fit-data',
        'separator',
        'ai',
        'quick-view',
        // 'quick-view-correlation',
        'separator',
        'forecast',
      )
    },
    {
      label: 'toolbar.menus.help',
      items: menuitems(
        'about-riskamp',
        'function-docs',
        'separator',
        'walkthrough',
      ),
    }
  ],

  tabs: [

    /*
    {
      label: 'toolbar.tabs.home',
    },
    */

    {
      label: 'toolbar.tabs.format',

      groups: [
        [
          iconmenu([
            'align-left',
            'align-center',
            'align-right',
          ], 0, true),
        ],
        /*
        [
          button('align-left'),
          button('align-center'),
          button('align-right'),
        ],
        */

        [
          iconmenu([
            'align-top',
            'align-middle',
            'align-bottom',
          ], 0, true),
        ],

        /*
        [
          button('align-top'),
          button('align-middle'),
          button('align-bottom'),
        ],
        */
        [
          button('indent'),
          button('outdent'),
          more([
            button('wrap'),
            button('merge-cells'),
            button('lock-cells'),
          ]),

          /*
          button('wrap'),
          button('merge-cells'),
          button('lock-cells'),
          */
        ],
        [
          button('bold'),
          button('italic'),
          button('underline'),
          button('strike'),
        ],
        [
          colorbutton('text-color'),
          // spacer(),
          colorbutton('fill-color'),
        ],
        [
          {...iconmenu([
            'border-top',
            'border-left',
            'border-right',
            'border-bottom',
            'border-all',
            'border-outside',
            'border-none',
            'border-double-bottom',
          ], 3), text: true },
          colorbutton('border-color'),
        ],
        [
          {
            type: 'combo-box',
            command: WrapCommand('number-format'),
          },
          button('toggle-grouping'),
          splitbutton('decrease-precision', 'increase-precision'),
        ],
        [
          {
            type: 'combo-box',
            command: WrapCommand('font-scale'),
            width: 'narrow',
          },

        ],
      ],


    },

 {
      label: 'toolbar.tabs.insert',

      groups: [
            [
              textbutton('insert-comment'),
              // textbutton('notes'),
            ],
            [
              textbutton('insert-table'),
            ],
            [
              textbutton('insert-image'),
            ],
            [
              button('insert-bar-chart'),
              button('insert-column-chart'),
              button('insert-donut-chart'),
              button('insert-line-chart'),
              button('insert-scatter-plot'),
              
              /*
              textbutton('insert-image'),
              textmenu([
                'insert-bar-chart',
                'insert-column-chart',
                'insert-donut-chart',
                'insert-line-chart',
                'insert-scatter-plot',
              ], 1, true),
              */
            ],
            [
              textbutton('sparkline'),
            ],
            [
              // label('toolbar.label.spreadsheet-cells'),

              /*
              {
                type: 'icon',
                // icon: lucide.pencil_ruler,
                icon: bootstrap_icons.rulers,
                // icon: bootstrap_icons.columns,
                // icon: fa_regular.ruler_triangle,
              },
              */

              { ...textmenu([
                'insert-row',
                'insert-column',
                'delete-row',
                'delete-column',
              ]), group_icon: bootstrap_icons.rulers },
            ],
      ],

    },
    
  ],

  trailer: [
    // button('quick-view'),
    button('run-simulation'),
    button('run-simulation-again'),
    button('recalculate'),
  ]

};

