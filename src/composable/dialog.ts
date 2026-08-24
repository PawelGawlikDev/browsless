import emitter from '@/lib/mitt';
type DialogOptions = Record<string, unknown>;
export const useDialog = () => {
  const emitDialog = (type: string, options: DialogOptions = {}) => {
    emitter.emit('show-dialog', { type, options });
  };
  const confirm = (options: DialogOptions = {}) => {
    emitDialog('confirm', options);
  };
  const prompt = (options: DialogOptions = {}) => {
    emitDialog('prompt', options);
  };
  const custom = (type: string, options: DialogOptions = {}) => {
    emitDialog(type, { ...options, custom: true });
  };
  return {
    custom,
    prompt,
    confirm,
  };
};
