import { createApp } from 'vue';
import type { Plugin } from 'vue';
import App from './App.vue';
import router from './router';
import pinia from '../lib/pinia';
import compsUi from '../lib/compsUi';
import vueI18n from '../lib/vueI18n';
import vRemixicon, { icons } from '../lib/vRemixicon';
import '../assets/css/tailwind.css';
import '../assets/css/fonts.css';
import '../assets/css/flow.css';

const app = createApp(App);
const remixiconPlugin = vRemixicon as Plugin<[typeof icons]>;

app.use(router);
app.use(compsUi);
app.use(vueI18n);
app.use(pinia);
app.use(remixiconPlugin, icons);
app.mount('#app');
