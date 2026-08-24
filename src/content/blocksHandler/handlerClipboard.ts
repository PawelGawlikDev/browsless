const clipboard = () => {
  return new Promise<string>((resolve) => {
    const text = window.getSelection()?.toString() ?? '';
    resolve(text);
  });
};
export default clipboard;
