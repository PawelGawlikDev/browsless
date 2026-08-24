import { sleep } from '@/utils/helper';
import { sendMessage } from '@/utils/message';
import handleSelector from '../handleSelector';
type ScreenshotOptions = {
  format?: string;
  quality?: number;
} & Record<string, unknown>;
type FrameRect = {
  windowWidth: number;
  windowHeight: number;
  x: number;
  y: number;
};
const findScrollableElement = (
  element: HTMLElement = document.documentElement,
  maxDepth = 5
) => {
  if (maxDepth === 0) return null;
  const excludeTags = ['SCRIPT', 'STYLE', 'SVG', 'HEAD'];
  const isScrollable = element.scrollHeight > window.innerHeight;
  if (isScrollable) return element;
  for (let index = 0; index < element.childElementCount; index += 1) {
    const currentChild = element.children.item(index) as HTMLElement | null;
    if (!currentChild) continue;
    const isExcluded =
      currentChild.tagName.includes('-') || excludeTags.includes(currentChild.tagName);
    if (!isExcluded) {
      const scrollableElement = findScrollableElement(currentChild, maxDepth - 1);
      if (scrollableElement) return scrollableElement;
    }
  }
  return null;
};
const injectStyle = () => {
  const style = document.createElement('style');
  style.innerText =
    'html::-webkit-scrollbar, body::-webkit-scrollbar, .browsless-scrollable-el::-webkit-scrollbar{ width: 0 !important; height: 0 !important } body.is-screenshotting [is-sticky] { position: relative !important; } .hide-fixed [is-fixed] {visibility: hidden !important; opacity: 0 !important;}';
  style.id = 'browsless-css-scroll';
  document.body.appendChild(style);
  return style;
};
const canvasToBase64 = (
  canvas: HTMLCanvasElement,
  { format, quality }: ScreenshotOptions
) => {
  return canvas.toDataURL(`image/${format}`, (quality ?? 100) / 100);
};
const loadAsyncImg = (src: string) => {
  return new Promise<HTMLImageElement>((resolve) => {
    const image = new Image();
    image.onload = () => {
      resolve(image);
    };
    image.src = src;
  });
};
const takeScreenshot = async (tabId: number, options: ScreenshotOptions) => {
  await sendMessage('set:active-tab', tabId, 'background');
  const imageUrl = await sendMessage('get:tab-screenshot', options, 'background');
  return imageUrl as string;
};
const captureElement = async ({
  selector,
  tabId,
  options,
  $frameRect,
}: {
  selector: string;
  tabId: number;
  options: ScreenshotOptions;
  $frameRect?: FrameRect;
}) => {
  const element = (await handleSelector(
    // ? not support frameSelector ?
    { data: { selector } },
    { returnElement: true }
  )) as HTMLElement | null;
  if (!element) {
    throw new Error('element-not-found');
  }
  element.scrollIntoView({
    block: 'center',
    inline: 'center',
  });
  await sleep(500);
  const imageUrl = await takeScreenshot(tabId, options);
  const image = await loadAsyncImg(imageUrl);
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d')!;
  const { height, width, x, y } = element.getBoundingClientRect();
  let windowWidth = window.innerWidth;
  let windowHeight = window.innerHeight;
  if ($frameRect) {
    windowWidth = $frameRect.windowWidth;
    windowHeight = $frameRect.windowHeight;
  }
  const diffWidth = image.width / windowWidth;
  const diffHeight = image.height / windowHeight;
  const newWidth = width * diffWidth;
  const newHeight = height * diffHeight;
  canvas.width = newWidth;
  canvas.height = newHeight;
  let xPos = x;
  let yPos = y;
  if ($frameRect) {
    yPos += $frameRect.y;
    xPos += $frameRect.x;
  }
  xPos *= diffWidth;
  yPos *= diffHeight;
  context.drawImage(image, xPos, yPos, newWidth, newHeight, 0, 0, newWidth, newHeight);
  return canvasToBase64(canvas, options);
};
export default async function ({
  tabId,
  options,
  data: { type, selector, $frameRect },
}: {
  tabId: number;
  options: ScreenshotOptions;
  data: {
    type?: string;
    selector?: string;
    $frameRect?: FrameRect;
  };
}) {
  if (type === 'element') {
    const imageUrl = await captureElement({
      tabId,
      options,
      selector: selector ?? '',
      $frameRect,
    });
    return imageUrl;
  }
  document.body.classList.add('is-screenshotting');
  const style = injectStyle();
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d')!;
  const maxCanvasSize = 65035;
  const scrollElement = document.querySelector<HTMLElement>('.browsless-scrollable-el');
  let scrollableElement: HTMLElement | Window | null =
    scrollElement || findScrollableElement();
  if (!scrollableElement) {
    const imageUrl = await takeScreenshot(tabId, options);
    return imageUrl;
  }
  const el = scrollableElement as HTMLElement;
  el.classList?.add('browsless-scrollable-el');
  const originalYPosition = window.scrollY;
  let originalScrollHeight = el.scrollHeight;
  canvas.height = el.scrollHeight > maxCanvasSize ? maxCanvasSize : el.scrollHeight;
  canvas.width = window.innerWidth;
  document.body.querySelectorAll('*:not([is-sticky], [is-fixed])').forEach((elItem) => {
    const { position } = getComputedStyle(elItem);
    if (position === 'sticky') elItem.setAttribute('is-sticky', '');
    else if (position === 'fixed') elItem.setAttribute('is-fixed', '');
  });
  el.scrollTo(0, 0);
  let scaleDiff = 1;
  let scrollPosition = 0;
  let canvasAdjusted = false;
  if ((scrollableElement as HTMLElement).tagName === 'HTML') scrollableElement = window;
  const scrollTo = (posX: number, posY: number) => {
    if (scrollableElement === window) {
      window.scrollTo(posX, posY);
    } else {
      (scrollableElement as HTMLElement).scrollTo(posX, posY);
    }
  };
  while (scrollPosition <= originalScrollHeight) {
    const imageUrl = await takeScreenshot(tabId, options);
    if (scrollPosition > 0 && !document.body.classList.contains('hide-fixed')) {
      document.body.classList.add('hide-fixed');
    }
    const image = await loadAsyncImg(imageUrl);
    const newScrollPos = scrollPosition + window.innerHeight;
    if (!canvasAdjusted) {
      if (canvas.width !== image.width) {
        scaleDiff = image.width / window.innerWidth;
        canvas.width *= scaleDiff;
        canvas.height *= scaleDiff;
        originalScrollHeight *= scaleDiff;
        if (canvas.height > maxCanvasSize) canvas.height = maxCanvasSize;
      }
      canvasAdjusted = true;
    }
    const newWidth = image.width * scaleDiff;
    const newHeight = image.height * scaleDiff;
    const sourceYPos =
      (scrollPosition + window.innerHeight) * scaleDiff - originalScrollHeight;
    context.drawImage(
      image,
      0,
      sourceYPos > 0 ? sourceYPos : 0,
      newWidth,
      newHeight,
      0,
      scrollPosition * scaleDiff,
      newWidth,
      newHeight
    );
    scrollPosition = newScrollPos;
    scrollTo(0, newScrollPos);
    await sleep(1000);
  }
  style.remove();
  document.body.classList.remove('hide-fixed');
  document.body.classList.remove('is-screenshotting');
  scrollTo(0, originalYPosition);
  return canvasToBase64(canvas, options);
}
