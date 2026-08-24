import { sleep } from '@/utils/helper';
import handleSelector from '../handleSelector';
import type { SelectorBlock, SelectorVerifyResult } from '@/types/migration-helpers';
const SLEEP_TIME = 1700;
const verifySelector = async (block: SelectorBlock): Promise<SelectorVerifyResult> => {
  let elements = await handleSelector(block);
  if (!elements) {
    await sleep(SLEEP_TIME);
    return { notFound: true };
  }
  const elementList = block.data.multiple
    ? Array.from(elements as Iterable<Element>)
    : [elements as Element];
  elementList[0].scrollIntoView({
    block: 'center',
    inline: 'center',
    behavior: 'smooth',
  });
  await sleep(200);
  const divEl = document.createElement('div');
  divEl.style.cssText =
    'height: 100%; width: 100%; top: 0; left: 0; background-color: rgb(0 0 0 / 0.3); pointer-events: none; position: fixed; z-index: 99999';
  const svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svgEl.style.cssText =
    'height: 100%; width: 100%; top: 0; left: 0; pointer-events: none; position: relative;';
  divEl.appendChild(svgEl);
  elementList.forEach((element) => {
    const { left, top, width, height } = element.getBoundingClientRect();
    const rectEl = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rectEl.setAttribute('y', String(top));
    rectEl.setAttribute('x', String(left));
    rectEl.setAttribute('width', String(width));
    rectEl.setAttribute('height', String(height));
    rectEl.setAttribute('stroke', '#2563EB');
    rectEl.setAttribute('stroke-width', '2');
    rectEl.setAttribute('fill', 'rgba(37, 99, 235, 0.4)');
    svgEl.appendChild(rectEl);
  });
  document.body.appendChild(divEl);
  await sleep(SLEEP_TIME);
  divEl.remove();
  return { notFound: false };
};
export default verifySelector;
