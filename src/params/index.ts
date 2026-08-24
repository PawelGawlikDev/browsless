import { createApp } from 'vue';
import type { Plugin } from 'vue';
import App from './App.vue';
import compsUi from '../lib/compsUi';
import vRemixicon, { icons } from '../lib/vRemixicon';
import '../assets/css/tailwind.css';
import '../assets/css/fonts.css';
import '../assets/css/flow.css';

const app = createApp(App);
const remixiconPlugin = vRemixicon as Plugin<[typeof icons]>;

app.use(compsUi);
app.use(remixiconPlugin, icons);
app.mount('#app');
