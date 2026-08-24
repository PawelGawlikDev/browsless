import { onMounted, shallowRef, watch } from 'vue';
import type { WatchSource } from 'vue';
import blocksValidation from '@/dashboard/utils/blocksValidation';
type BlockValidation = {
  once?: boolean;
  func: (data: unknown) => Promise<string[]>;
};
export const useBlockValidation = (
  blockId: string,
  data: WatchSource<unknown> | object
) => {
  const errors = shallowRef('');
  onMounted(() => {
    const blockValidation = (
      blocksValidation as Record<string, BlockValidation | undefined>
    )[blockId];
    if (!blockValidation) return;
    const unwatch = watch(
      data,
      (newData) => {
        blockValidation
          .func(newData)
          .then((blockErrors) => {
            let errorsStr = '';
            blockErrors.forEach((error: string) => {
              errorsStr += `<li>${error}</li>\n`;
            });
            errors.value =
              errorsStr.trim() &&
              `Issues: <ol class='list-disc list-inside'>${errorsStr}</ol>`;
          })
          .catch((error) => {
            console.error(error);
          })
          .finally(() => {
            if (blockValidation.once) {
              unwatch();
            }
          });
      },
      { deep: true, immediate: true }
    );
  });
  return { errors };
};
