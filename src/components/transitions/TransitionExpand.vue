<script lang="ts">
import { defineComponent, h, Transition, TransitionGroup } from 'vue';

export default defineComponent({
  props: {
    group: Boolean,
  },
  setup(props, { slots, attrs }) {
    const enter = (el: Element) => {
      const element = el as HTMLElement;
      const { width } = getComputedStyle(element);
      element.style.width = width;
      element.style.position = 'absolute';
      element.style.visibility = 'hidden';
      element.style.height = 'auto';
      const { height } = getComputedStyle(element);
      element.style.width = '';
      element.style.position = '';
      element.style.visibility = '';
      element.style.height = '0';
      getComputedStyle(element).height;
      requestAnimationFrame(() => {
        element.style.height = height;
      });
    };
    const afterEnter = (el: Element) => {
      (el as HTMLElement).style.height = 'auto';
    };
    const leave = (el: Element) => {
      const element = el as HTMLElement;
      const { height } = getComputedStyle(element);
      element.style.height = height;
      getComputedStyle(element).height;
      requestAnimationFrame(() => {
        element.style.height = '0';
      });
    };
    return () =>
      h(
        (props.group ? TransitionGroup : Transition) as typeof Transition,
        {
          ...attrs,
          name: 'expand',
          onEnter: enter,
          onAfterEnter: afterEnter,
          onLeave: leave,
        } as Record<string, unknown>,
        slots.default
      );
  },
});
</script>
<style>
.expand-enter-active,
.expand-leave-active {
  transition: height 0.2s ease-in-out;
  overflow: hidden;
}

.expand-enter,
.expand-leave-to {
  height: 0;
}
</style>
