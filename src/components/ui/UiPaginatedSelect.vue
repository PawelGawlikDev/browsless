<template>
  <div
    ref="root"
    class="ui-paginated-select relative"
    :class="{ 'pointer-events-none opacity-75': disabled }"
  >
    <label
      v-if="label"
      :for="componentId"
      class="ml-1 text-sm text-gray-600 dark:text-gray-200"
      @click="toggleDropdown"
    >
      {{ label }}
    </label>
    <div class="ui-select__content relative flex w-full items-center">
      <button
        :id="componentId"
        type="button"
        class="bg-input text-left z-10 h-full w-full appearance-none rounded-lg bg-transparent px-4 py-2 pr-10 transition"
        :class="{ 'text-gray-500': !selectedOptionLabel }"
        :disabled="disabled"
        @click="toggleDropdown"
      >
        {{ selectedOptionLabel || placeholder }}
      </button>
      <v-remixicon
        name="riArrowDropDownLine"
        size="28"
        class="pointer-events-none absolute right-0 mr-2 text-gray-600 transition-transform dark:text-gray-200"
        :class="{ 'rotate-180': isOpen }"
      />
    </div>

    <div
      v-if="isOpen"
      class="absolute top-full z-50 mt-1 w-full rounded-lg bg-white shadow-xl dark:bg-gray-800"
    >
      <div class="p-2">
        <ui-input
          v-model="searchKeyword"
          :placeholder="searchPlaceholder"
          prepend-icon="riSearch2Line"
          autofocus
        />
      </div>
      <ul ref="optionsListEl" class="max-h-60 overflow-y-auto p-2" @scroll="handleScroll">
        <li
          v-for="option in options"
          :key="optionKey(option)"
          class="cursor-pointer rounded-lg px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700"
          :class="{
            'bg-gray-100 font-semibold dark:bg-gray-700':
              modelValue === option[optionValueKey],
          }"
          @click="selectOption(option)"
        >
          {{ option[optionLabelKey] }}
        </li>
        <li v-if="isLoading" class="px-4 py-2 text-center text-gray-500">Loading...</li>
        <li
          v-if="!haveMore && !isLoading && options.length > 0"
          class="px-4 py-2 text-center text-sm text-gray-500"
        >
          No more results
        </li>
        <li
          v-if="!isLoading && options.length === 0"
          class="px-4 py-2 text-center text-gray-500"
        >
          No results found
        </li>
      </ul>
      <div v-if="$slots.extra" class="border-t border-gray-200 dark:border-gray-700">
        <slot name="extra"></slot>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useComponentId } from '@/composable/componentId';
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';

type SelectOption = Record<string, unknown>;

interface LoadOptionsResult {
  data: SelectOption[];
  hasMore: boolean;
}

const props = withDefaults(
  defineProps<{
    modelValue?: string | number | null;
    label?: string;
    placeholder?: string;
    searchPlaceholder?: string;
    disabled?: boolean;
    loadOptions: (params: { query: string; page: number }) => Promise<LoadOptionsResult>;
    optionValueKey: string;
    optionLabelKey: string;
    initialLabel?: string;
  }>(),
  {
    modelValue: null,
    label: '',
    placeholder: 'Select an option',
    searchPlaceholder: 'Search...',
    initialLabel: '',
  }
);
const emit = defineEmits<{
  'update:modelValue': [value: string | number];
  change: [value: string | number, label: unknown];
}>();
const componentId = useComponentId('paginated-select');
const root = ref<HTMLElement | null>(null);
const isOpen = ref(false);
const options = ref<SelectOption[]>([]);
const searchKeyword = ref('');
const isLoading = ref(false);
const page = ref(1);
const haveMore = ref(true);
const optionsListEl = ref<HTMLElement | null>(null);
const localInitialLabel = ref('');
const fetchRequestToken = ref(0);
const selectedOption = computed(() =>
  options.value.find((opt) => opt[props.optionValueKey] === props.modelValue)
);
const selectedOptionLabel = computed(
  () => selectedOption.value?.[props.optionLabelKey] || localInitialLabel.value
);
const optionKey = (option: SelectOption): string | number | undefined => {
  const value = option[props.optionValueKey];
  return typeof value === 'string' || typeof value === 'number' ? value : undefined;
};
const debounce = <TArgs extends unknown[]>(
  func: (...args: TArgs) => void,
  wait: number
) => {
  let timeout: ReturnType<typeof setTimeout>;
  return function executedFunction(...args: TArgs) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};
const fetchOptions = async (isNewSearch: boolean) => {
  // Prevent concurrent scroll requests, but allow new searches to override.
  if (isLoading.value && !isNewSearch) return;
  isLoading.value = true;
  if (isNewSearch) {
    page.value = 1;
    options.value = [];
    haveMore.value = true;
    // Each new search gets a unique token.
    // This invalidates ongoing requests from previous searches.
    fetchRequestToken.value += 1;
  }
  const currentRequestToken = fetchRequestToken.value;
  // Do not fetch if we know there are no more results
  if (!haveMore.value) {
    isLoading.value = false;
    return;
  }
  try {
    const { data, hasMore } = await props.loadOptions({
      query: searchKeyword.value,
      page: page.value,
    });
    // If the token has changed, a new search was initiated.
    // We must ignore the results of this outdated request.
    if (currentRequestToken !== fetchRequestToken.value) {
      return;
    }
    options.value.push(...data);
    haveMore.value = hasMore;
    if (haveMore.value) {
      page.value += 1;
    }
  } catch (error) {
    console.error('Failed to load options:', error);
    if (currentRequestToken === fetchRequestToken.value) {
      haveMore.value = false;
    }
  } finally {
    if (currentRequestToken === fetchRequestToken.value) {
      // Only stop the loading indicator if this is the currently active search.
      isLoading.value = false;
    }
  }
};
const debouncedFetch = debounce(() => fetchOptions(true), 300);
watch(searchKeyword, () => {
  debouncedFetch();
});
const toggleDropdown = () => {
  if (props.disabled) return;
  isOpen.value = !isOpen.value;
};
const closeDropdown = () => {
  isOpen.value = false;
};
const selectOption = (option: SelectOption) => {
  const value = optionKey(option);
  if (value === undefined) return;
  const label = option[props.optionLabelKey];
  localInitialLabel.value = String(label ?? '');
  emit('update:modelValue', value);
  emit('change', value, label);
  closeDropdown();
};
const handleScroll = (event: Event) => {
  const el = event.target;
  if (!(el instanceof HTMLElement)) return;
  const threshold = 50;
  if (el.scrollTop + el.clientHeight >= el.scrollHeight - threshold) {
    fetchOptions(false);
  }
};
const handleClickOutside = (event: MouseEvent) => {
  if (root.value && event.target instanceof Node && !root.value.contains(event.target)) {
    closeDropdown();
  }
};
onMounted(() => {
  document.addEventListener('click', handleClickOutside, true);
  if (props.modelValue && props.initialLabel) {
    localInitialLabel.value = props.initialLabel;
  }
  fetchOptions(true);
});
onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside, true);
});
</script>
