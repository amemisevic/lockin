// Gym tab shell (gym plan G7): title and the empty-state line only. Home, picker and workout screens are G8 onward.
import { h } from '../dom.js';
import { eyebrow, screenTitle } from '../ui/chrome.js';

export const renderGym = app => [
  eyebrow('Lock In'),
  screenTitle('Gym'),
  app.gym.workouts.length === 0 && h('p', { class: 'tk-empty' }, 'No workouts yet'),
].filter(Boolean);
