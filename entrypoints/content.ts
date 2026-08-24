export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_start',
  matchAboutBlank: true,
  allFrames: true,
  main() {
    void import('../src/content/index.ts');
  },
});
