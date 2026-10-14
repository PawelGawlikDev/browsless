<script lang="ts">
import { defineComponent, h, Transition, TransitionGroup, type PropType } from 'vue';

type Direction = 'top' | 'left' | 'right' | 'bottom';

const translateValues: Record<0 | 1, string> = {
  0: '-100%',
  1: '100%',
};
const directionsKey: Record<Direction, 0 | 1> = {
  top: 0,
  left: 0,
  right: 1,
  bottom: 1,
};

export default defineComponent({
  props: {
    group: Boolean,
    direction: {
      type: String as PropType<Direction>,
      default: 'left',
      validator: (value: Direction) => ['top', 'left', 'right', 'bottom'].includes(value),
    },
  },
  setup(props, { slots, attrs }) {
    const getTranslateStyle = (key: 0 | 1 = 0) => {
      const isHorizontal = props.direction === 'left' || props.direction === 'right';
      const value =
        translateValues[((directionsKey[props.direction] + key) % 2) as 0 | 1];
      if (isHorizontal) return `translateX(${value})`;
      return `translateY(${value})`;
    };
    const enter = (element: Element) => {
      (element as HTMLElement).style.transform = getTranslateStyle();
    };
    const leave = (element: Element) => {
      (element as HTMLElement).style.transform = getTranslateStyle(1);
    };
    const afterEnter = (element: Element) => {
      (element as HTMLElement).style.transform = 'translate(0, 0)';
    };
    return () =>
      h(
        (props.group ? TransitionGroup : Transition) as typeof Transition,
        {
          ...attrs,
          name: 'slide',
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
.slide-enter-active,
.slide-leave-active {
  transition: transform 0.25s ease-out;
}
</style>
