

// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { bootstrap_icons as bs, fa_light, fa_regular, fa_solid, fa_sharp_regular, fa_sharp_light, bootstrap_icons } from 's5-icon-lib';
import type { I18N } from '~/i18n/i18n';
import type { Color } from 'riskamp-web';

import { phosphor_light as phosphor } from 's5-icon-lib';
import { lucide } from 's5-icon-lib';

export interface BaseToolbarCommand {
  title?: keyof I18N;
  icon?: string;
  text?: string;
  value?: string|boolean;
  state_key?: string;

  /** show icon in menus, should be used sparingly */
  menuicon?: boolean;
  additional_data?: unknown; // yuck
}

export interface ToggleCommand extends BaseToolbarCommand {
  type: 'toggle',
  active?: {
    title?: keyof I18N;
    icon?: string;
  }
}

export interface Command extends BaseToolbarCommand {
  type?: never, // 'base',
}

export interface ColorCommand extends BaseToolbarCommand {
  type: 'color';
  default_color_text?: keyof I18N;
  default_color: Color;
  active_color?: Color;
}

export type ToolbarCommand = Command | ColorCommand | ToggleCommand;

export const ToolbarCommands = {

  'sign-out': {
    title: 'toolbar.menu-commands.sign-out',
    icon: bootstrap_icons.box_arrow_right,
    menuicon: true,
  },
  'account-page': {
    title: 'toolbar.menu-commands.account-page',
  },
  'documents': {
    title: 'toolbar.menu-commands.documents',
  },

  'fullscreen': {
    title: 'toolbar.button.toggle-fullscreen',
    icon: phosphor.corners_out,
    // state_key: 'fullscreen',

  },

  'test': {
    title: 'test.title',
  },

  'new': {
    title: 'toolbar.button.new-spreadsheet',
    icon: bs.file_earmark,
    // icon: phosphor.file,
    // icon: fa_sharp_regular.file,
    menuicon: true,
  },

  'import': {
    title: 'toolbar.button.import-file',
    icon: bs.upload,
  },

  'open': {
    title: 'toolbar.button.open-file',
  },

  'revert': {
    title: 'toolbar.button.revert-file',
    menuicon: true,
    // icon: phosphor.clock_counter_clockwise,
    icon: fa_light.clock_rotate_left,
  },

  'save': {
    title: 'toolbar.button.save-file',
  },

  'save-to-desktop': {
    title: 'toolbar.button.save-to-desktop',
    icon: bs.download,
  },

  'export-xlsx': {
    title: 'toolbar.button.export-xlsx',
    // icon: bs.file_earmark_excel,
    icon: phosphor.file_xls,

  },

  'export-csv': {
    title: 'toolbar.button.export-csv',
  },

  'ai': {
    title: 'llm-chat.panel.title',
    // icon: bs.chat_dots,
    // icon: phosphor.chat_circle_dots,
    icon: lucide.message_circle_more,
  },

  'developer': {
    title: 'developer-panel.title',
    // icon: bs.braces,
    icon: phosphor.brackets_curly,
  },

  'update-language': {
    title: 'update-language.title',
  },
  
  'notes': {
    title: 'toolbar.button.notes.label',
    // icon: bs.journal_text,
    // icon: phosphor.notebook,
    // icon: lucide.notebook_text,
    icon: fa_sharp_regular.note,
  },

  'text-color': {
    type: 'color',
    title: 'toolbar.button.text-color.label',
    default_color_text: 'color-picker.default_text_color',
    // icon: fa_regular.a,
    // icon: phosphor.text_aa,
    icon: bs.type,
    default_color: { type: 'theme', theme: 1 },
  },

  'fill-color': {
    type: 'color',
    title: 'toolbar.button.background-color.label',
    //icon: bs.paint_bucket,
    // icon: phosphor.paint_bucket,
    // icon: fa_sharp_regular.fill_drip,
    icon: bs.paint_bucket,
    default_color_text: 'color-picker.no_fill',
    default_color: { type: 'theme', theme: 0 },
  },

  'border-top': {
    title: 'toolbar.button.border-top.title',
    icon: bs.border_top,
  },
  'border-bottom': {
    title: 'toolbar.button.border-bottom.title',
    icon: bs.border_bottom,
  },
  'border-left': {
    title: 'toolbar.button.border-left.title',
    icon: bs.border_left,
  },
  'border-right': {
    title: 'toolbar.button.border-right.title',
    icon: bs.border_right,
  },
  'border-all': {
    title: 'toolbar.button.border-all.title',
    icon: bs.border_all,
  },
  'border-none': {
    title: 'toolbar.button.border-none.title',
    icon: bs.border,
  },
  'border-outside': {
    title: 'toolbar.button.border-outside.title',
    icon: bs.border_outer,
  },
  'border-double-bottom': {
    title: 'toolbar.button.border-double-bottom.title',
    icon: bs.border_bottom,
  },


  'border-color': {
    type: 'color',
    default_color_text: 'color-picker.default_border_color',
    title: 'toolbar.button.border-color.label',
    icon: bs.palette2,
    // icon: phosphor.palette,
    default_color: { type: 'theme', theme: 1 },
  },

  'font-scale': {
    
    title: 'toolbar.combobox.font-scale.label',
    icon: fa_regular.text_size,
    state_key: 'font_scale',
  },

  'number-format': {
    
    title: 'toolbar.combobox.number-format.label',
    //icon: bs.hash,
    icon: phosphor.hash,
    state_key: 'number_format',
  },

  'increase-precision': {
    
    title: 'toolbar.button.increase-decimal-precision.label',
    text: '0.00',
  },

  'decrease-precision': {
    
    title: 'toolbar.button.decrease-decimal-precision.label',
    text: '0.0',
  },

  'toggle-grouping': {
    
    icon: fa_regular.comma,
    title: 'toolbar.button.toggle-integer-grouping.label',
  },

  'insert-table': {
    title: 'toolbar.button.insert.table',
    // icon: phosphor.grid_nine,
    // icon: lucide.grid_3x3,
    icon: fa_sharp_regular.table_cells_header,
  },

  'insert-comment': {
    title: 'toolbar.button.insert.comment',
    //icon: // fa_regular.comment
    //  bs.chat_left
    // icon: phosphor.chat,
    // icon: lucide.message_square,
    icon: fa_sharp_regular.comment,
  },

  'insert-bar-chart': {
    title: 'toolbar.button.insert.bar-chart',
    // icon: fa_light.chart_bar,
    // icon: phosphor.chart_bar_horizontal,
    // icon: lucide.chart_bar_big,
    icon: fa_sharp_regular.chart_bar,
  },
  'insert-column-chart': {
    title: 'toolbar.button.insert.column-chart',
    // icon: fa.chart_column,
    // icon: phosphor.chart_bar,
    // icon: lucide.chart_column_big,
    icon: fa_sharp_regular.chart_column,
  },
  'insert-donut-chart': {
    title: 'toolbar.button.insert.donut-chart',
    // icon: fa.chart_pie,
    // icon: phosphor.chart_donut,
    icon: fa_sharp_regular.chart_pie,
  },
  'insert-area-chart': {
    title: 'toolbar.button.insert.area-chart',
    // icon: fa.chart_area,
    icon: fa_sharp_regular.chart_area,

  },
  'insert-scatter-plot': {
    title: 'toolbar.button.insert.scatter-plot',
    // icon: fa.chart_scatter,
    // icon: phosphor.chart_scatter,
    // icon: lucide.chart_scatter,
    icon: fa_sharp_regular.chart_scatter,

  },
  'insert-line-chart': {
    title: 'toolbar.button.insert.line-chart',
    // icon: fa.chart_line,
    // icon: phosphor.chart_line,
    // icon: lucide.chart_line,
    icon: fa_sharp_regular.chart_line,

  },
  'insert-image': {
    title: 'toolbar.button.insert.image',
    // icon: fa.image,
    // icon: phosphor.image,
    // icon: lucide.image,
    icon: fa_sharp_regular.image,
  },

  'insert-row': {
    title: 'toolbar.button.insert-row.label',
  },
  'insert-column': {
    
    title: 'toolbar.button.insert-column.label',
  },
  'delete-row': {
    
    title: 'toolbar.button.delete-row.label',
  },
  'delete-column': {
    
    title: 'toolbar.button.delete-column.label',
  },

  'wrap': {
    
    title: 'toolbar.button.wrap-text.label',
    icon: bs.text_wrap,
    state_key: 'wrap',
  },

  'bold': {
    
    title: 'toolbar.button.bold.label',
    icon: bs.type_bold,
    // icon: phosphor.text_b,
    state_key: 'bold',
    // icon: fa_sharp_regular.bold,
    
  },
  'italic': {
    title: 'toolbar.button.italic.label',
    state_key: 'italic',
    icon: bs.type_italic,
  },
  'underline': {
    
    title: 'toolbar.button.underline.label',
    icon: bs.type_underline,
    state_key: 'underline',
  },

  'strike': {
    title: 'toolbar.button.strikethrough.label',
    icon: bs.type_strikethrough,
    state_key: 'strike',
  },

  'about-riskamp': {
    title: 'toolbar.menu.about-riskamp',
  },
  'walkthrough': {
    title: 'toolbar.menu.walkthrough',
  },
  'function-docs': {
    title: 'toolbar.menu.function-documentation',
  },

  /*
  'sparkline-column': {
    title: 'toolbar.button.sparkline-column',
  },
  
  'sparkline-line': {
    title: 'toolbar.button.sparkline-line',
  },
  */
  'sparkline': {
    title: 'toolbar.button.sparkline',
    icon: fa_sharp_light.square_poll_vertical,
  },

  'forecast': {
    title: 'toolbar.button.forecast',
  },

  'merge-cells': {
    type: 'toggle',
    icon: bs.fullscreen_exit,
    title: 'toolbar.button.merge-cells.label',
    state_key: 'merge',
    active: {
      title: 'toolbar.button.unmerge-cells.label',
      icon: bs.fullscreen,
    }
  },

  'lock-cells': {
    type: 'toggle',
    icon: bs.lock,
    title: 'toolbar.button.lock-cells.label',
    state_key: 'locked',
    active: {
      title: 'toolbar.button.unlock-cells.label',
      icon: bs.unlock,
    }
  },

  'align-left': {
   
    icon: bs.text_left,
    title: 'toolbar.button.align-left.label',
    state_key: 'horizontal_align-left',
  },

  'align-center': {
    
    icon: bs.text_center,
    title: 'toolbar.button.align-center.label',
    state_key: 'horizontal_align-center',
 },

  'align-right': {
    
    icon: bs.text_right,
    title: 'toolbar.button.align-right.label',
    state_key: 'horizontal_align-right',

  },

  'align-top': {
    
    icon: fa_light.arrow_up_to_line,
    title: 'toolbar.button.align-top.label',
    state_key: 'vertical_align-top',
  },
  'align-middle': {
    
    icon: fa_light.arrows_to_line,
    title: 'toolbar.button.align-middle.label',
    state_key: 'vertical_align-middle',
  },
  'align-bottom': {
    
    icon: fa_light.arrow_down_to_line,
    title: 'toolbar.button.align-bottom.label',
    state_key: 'vertical_align-bottom',
  },

  'indent': {
    
    title: 'toolbar.button.increase-indent.label',
    icon: bs.text_indent_left,

  },
  'outdent': {
    
    title: 'toolbar.button.decrease-indent.label',
    icon: bs.text_indent_right,
  },

  'fit-data': {
    
    title: 'toolbar.button.fit-data.label',
    // icon: bs.graph_up_arrow,
    // icon: phosphor.chart_line_up,
    icon: lucide.chart_no_axes_combined,
  },

  'names': {
    
    title: 'toolbar.button.defined-names.label',
    //icon: // bs.tag,
    //  fa.label
    // icon: phosphor.tag,
    icon: lucide.tag,
  },

  'find': {
    
    title: 'toolbar.button.search-cells.label',
    // icon: bs.search,
    // icon: phosphor.magnifying_glass,
    icon: lucide.search
  },

  'run-simulation': {
    title: 'toolbar.button.run-simulation.label',
    icon: bs.play_circle,
    menuicon: true,
  },

  'run-simulation-again': {
    title: 'toolbar.button.run-simulation-again.label',
    icon: bs.fast_forward,
    menuicon: true,
  },

  'las-vegas-simulation': {
    // icon: bs.suit_spade_fill,    
    // icon: phosphor.spade,
    title: 'toolbar.button.las-vegas-simulation.label',
    icon: lucide.spade,
    // menuicon: true,
  },

  'riskamp-documentation': {
    // icon: phosphor.question,
    title: 'toolbar-button.riskamp-documentation.label',
    icon: lucide.circle_question_mark,
  },

  'quick-view': {
    
    title: 'toolbar.button.quick-view.label',
    icon: fa_sharp_regular.square_poll_vertical,
  },

  'quick-view-correlation': {
    
    title: 'toolbar.button.quick-view-correlation.label',
    icon: fa_sharp_regular.square_poll_vertical,
  },

  'simulation-settings': {
    
    title: 'toolbar.button.simulation-settings.label',
    // icon: bs.gear,
    // icon: phosphor.gear,
    icon: lucide.settings_2,
  },

  'recalculate': {
    
    title: 'toolbar.button.recalculate.label',
    // icon: phosphor.arrows_clockwise,
    // icon: lucide.refresh_cw,
    icon: fa_sharp_regular.arrows_rotate,
  },

} as const satisfies Record<string, ToolbarCommand>; 

type KeysOfType<Map, Match> = {
  [K in keyof Map]: Map[K] extends Match ? K : never;
}[keyof Map];

export type ToolbarCommandKey = keyof typeof ToolbarCommands;
export type ToolbarColorCommandKeys = KeysOfType<typeof ToolbarCommands, ColorCommand>;
export type ToolbarToggleCommandKeys = KeysOfType<typeof ToolbarCommands, ToggleCommand>;

