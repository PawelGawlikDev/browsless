import type { App, Component } from 'vue';
import VTooltip from '../directives/VTooltip';
import VAutofocus from '../directives/VAutofocus';
import VClosePopover from '../directives/VClosePopover';
type ComponentModule = {
  default?: Component;
};
const uiComponents = import.meta.glob<ComponentModule>('../components/ui/*.vue', {
  eager: true,
});
const transitionComponents = import.meta.glob<ComponentModule>(
  '../components/transitions/*.vue',
  {
    eager: true,
  }
);
const componentsExtractor = (app: App, components: Record<string, ComponentModule>) => {
  Object.entries(components).forEach(([key, module]) => {
    const componentName = key
      .split('/')
      .at(-1)
      ?.replace(/\.vue$/g, '');
    const component = module?.default ?? {};
    if (componentName) {
      app.component(componentName, component);
    }
  });
};
const installUi = (app: App) => {
  app.directive('tooltip', VTooltip);
  app.directive('autofocus', VAutofocus);
  app.directive('close-popover', VClosePopover);
  componentsExtractor(app, uiComponents);
  componentsExtractor(app, transitionComponents);
};
export default installUi;
