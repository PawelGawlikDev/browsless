import { createApp } from 'vue';
import type { Plugin } from 'vue';
import { createHead } from '@vueuse/head';
import App from './App.vue';
import router from './router';
import pinia from '../lib/pinia';
import compsUi from '../lib/compsUi';
import vueI18n from '../lib/vueI18n';
import vRemixicon, { icons } from '../lib/vRemixicon';
import vueToastification from '../lib/vue-toastification';
import '../assets/css/tailwind.css';
import '../assets/css/fonts.css';
import '../assets/css/style.css';
import '../assets/css/flow.css';

const head = createHead();
const app = createApp(App);
const remixiconPlugin = vRemixicon as Plugin<[typeof icons]>;

app.use(head);
app.use(router);
app.use(compsUi);
app.use(pinia);
app.use(vueI18n);
app.use(vueToastification);
app.use(remixiconPlugin, icons);
app.mount('#app');
