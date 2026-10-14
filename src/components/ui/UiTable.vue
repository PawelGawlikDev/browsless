<template>
  <div class="ui-table">
    <table class="custom-table h-full w-full">
      <thead>
        <tr>
          <th
            v-for="header in table.headers"
            :key="header.value"
            :align="header.align"
            class="relative"
            v-bind="header.attrs"
          >
            <span
              :class="{ 'cursor-pointer': header.sortable }"
              class="inline-block"
              @click="updateSort(header)"
            >
              {{ header.text }}
            </span>
            <span
              v-if="header.sortable"
              class="sort-icon ml-1 cursor-pointer"
              @click="updateSort(header)"
            >
              <v-remixicon
                v-if="sortState.id === header.value"
                :rotate="sortState.order === 'asc' ? 90 : -90"
                class="transition-transform"
                size="20"
                name="riArrowLeftLine"
              />
              <v-remixicon v-else name="riArrowUpDownLine" size="20" />
            </span>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in filteredItems" :key="itemRowKey(item)">
          <slot name="item-prepend" :item="item" />
          <td
            v-for="header in table.headers"
            v-bind="header.rowAttrs"
            :key="header.value"
            :align="header.align"
            v-on="header.rowEvents || {}"
          >
            <slot :name="`item-${header.value}`" :item="item">
              {{ item[header.value] }}
            </slot>
          </td>
          <slot name="item-append" :item="item" />
        </tr>
      </tbody>
    </table>
    <div
      v-if="withPagination && filteredItems && filteredItems.length >= 10"
      class="mt-4 flex items-center justify-between"
    >
      <div>
        {{ t('components.pagination.text1') }}
        <select v-model="pagination.perPage" class="bg-input rounded-md p-1">
          <option v-for="num in [10, 15, 25, 50, 100, 150]" :key="num" :value="num">
            {{ num }}
          </option>
        </select>
        {{
          t('components.pagination.text2', {
            count: filteredItems.length,
          })
        }}
      </div>
      <ui-pagination
        v-model="pagination.currentPage"
        :per-page="pagination.perPage"
        :records="items.length"
      />
    </div>
  </div>
</template>
<script setup lang="ts">
import { reactive, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { isObject, arraySorter } from '@/utils/helper';

type TableItem = Record<string, unknown>;
type TableCellAlign = 'left' | 'center' | 'right' | 'justify' | 'char';

interface TableHeaderInput {
  text?: string;
  value: string;
  align?: TableCellAlign;
  sortable?: boolean;
  filterable?: boolean;
  attrs?: Record<string, unknown>;
  rowAttrs?: Record<string, unknown>;
  rowEvents?: Record<string, unknown>;
}

interface TableHeader extends TableHeaderInput {
  attrs: Record<string, unknown>;
  rowAttrs: Record<string, unknown>;
  align: TableCellAlign;
  text: string;
  value: string;
  sortable: boolean;
  filterable: boolean;
}

const props = withDefaults(
  defineProps<{
    headers?: (string | TableHeaderInput)[];
    items?: TableItem[];
    itemKey: string;
    search?: string;
    customFilter?: ((search: string, item: TableItem, index: number) => boolean) | null;
    withPagination?: boolean;
  }>(),
  {
    headers: () => [],
    items: () => [],
    itemKey: '',
    search: '',
    customFilter: null,
    withPagination: false,
  }
);
const { t } = useI18n();
const table = reactive<{ headers: TableHeader[]; filterKeys: string[] }>({
  headers: [],
  filterKeys: [],
});
const sortState = reactive<{ id: string; order: 'asc' | 'desc' }>({
  id: '',
  order: 'asc',
});
const pagination = reactive({
  perPage: 10,
  currentPage: 1,
});
const itemRowKey = (item: TableItem) => item[props.itemKey] as string | number;
const sortedItems = computed(() => {
  const sortedRows = sortState.id
    ? arraySorter({
        data: props.items,
        key: sortState.id,
        order: sortState.order,
      })
    : props.items;
  if (!props.withPagination) return sortedRows;
  return sortedRows.slice(
    (pagination.currentPage - 1) * pagination.perPage,
    pagination.currentPage * pagination.perPage
  );
});
const filteredItems = computed(() => {
  if (!props.search) return sortedItems.value;
  const filterFunc =
    props.customFilter ||
    ((search: string, item: TableItem) => {
      return table.filterKeys.some((key) => {
        const value = item[key];
        if (typeof value === 'string') return value.toLocaleLowerCase().includes(search);
        return value === search;
      });
    });
  const search = props.search.toLocaleLowerCase();
  return sortedItems.value.filter((item, index) => filterFunc(search, item, index));
});
const updateSort = ({ sortable, value }: Pick<TableHeader, 'sortable' | 'value'>) => {
  if (!sortable) return;
  if (sortState.id !== value) {
    sortState.id = value;
    sortState.order = 'asc';
    return;
  }
  if (sortState.order === 'asc') {
    sortState.order = 'desc';
  } else {
    sortState.id = '';
  }
};
watch(
  () => props.headers,
  (newHeaders) => {
    const filterKeys = new Set<string>();
    table.headers = newHeaders.map((header) => {
      const headerObj: TableHeader = {
        attrs: {},
        rowAttrs: {},
        align: 'left',
        text: typeof header === 'string' ? header : (header.text ?? header.value),
        value: typeof header === 'string' ? header : header.value,
        sortable: true,
        filterable: false,
      };
      if (isObject<TableHeaderInput>(header)) Object.assign(headerObj, header);
      if (headerObj.filterable) filterKeys.add(headerObj.value);
      return headerObj;
    });
    table.filterKeys = Array.from(filterKeys);
  },
  { immediate: true }
);
</script>
<style>
.sort-icon svg {
  color: rgb(75 85 99);
  display: inline-block;
}

.dark .sort-icon svg {
  color: rgb(209 213 219);
}
</style>
