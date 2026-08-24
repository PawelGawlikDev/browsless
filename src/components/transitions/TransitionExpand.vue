<script>
import { h, Transition, TransitionGroup } from 'vue';
/* eslint-disable */
export default {
  props: {
    group: Boolean,
  },
  setup(props, { slots, attrs }) {
    const enter = (element) => {
      const { width } = getComputedStyle(element);
      element.style.width = width;
      element.style.position = 'absolute';
      element.style.visibility = 'hidden';
      element.style.height = 'auto';
      const { height } = getComputedStyle(element);
      element.style.width = null;
      element.style.position = null;
      element.style.visibility = null;
      element.style.height = 0;
      getComputedStyle(element).height;
      requestAnimationFrame(() => {
        element.style.height = height;
      });
    };
    const afterEnter = (element) => {
      element.style.height = 'auto';
    };
    const leave = (element) => {
      const { height } = getComputedStyle(element);
      element.style.height = height;
      getComputedStyle(element).height;
      requestAnimationFrame(() => {
        element.style.height = 0;
      });
    };
    return () =>
      h(
        props.group ? TransitionGroup : Transition,
        {
          ...attrs,
          name: 'expand',
          onEnter: enter,
          onAfterEnter: afterEnter,
          onLeave: leave,
        },
        slots.default
      );
  },
};
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
