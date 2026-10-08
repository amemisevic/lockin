import { h } from '../dom.js';

export const renderToday = app => h('section', null, h('h1', { class: 'large-title' }, 'Today'));
