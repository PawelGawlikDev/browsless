import { tasks } from '@/utils/shared';
import type { ContentBlockDefinition } from '@/types/content';
type ExecutedBlockData = {
  label?: string;
};
const generateElement = (block: ContentBlockDefinition) => {
  return `
    <div style="display: flex; align-items: center">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        id="spinner"
        fill="transparent"
        width="24"
        height="24"
        viewBox="0 0 24 24"
      >
        <circle
          class="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          stroke-width="4"
        ></circle>
        <path
          class="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        ></path>
      </svg>
      <p id="block-name">${block.name}</p>
    </div>
  `;
};
export default function (data: ExecutedBlockData, enable: boolean) {
  if (!enable) {
    return () => {};
  }
  const block = data.label
    ? (tasks[data.label] as ContentBlockDefinition | undefined)
    : undefined;
  if (!block) return () => {};
  let container = document.querySelector<HTMLElement>('.browsless-executed-block');
  if (!container) {
    container = document.createElement('div');
    container.classList.add('browsless-executed-block');
    document.body.appendChild(container);
    const style = document.createElement('style');
    style.classList.add('browsless-executed-block');
    style.innerHTML = `
      @keyframes spin {
        from {
          transform: rotate(0deg);
        }
        to {
          transform: rotate(360deg);
        }
      }

      .browsless-executed-block .opacity-25 {
        opacity: 0.25;
      }
      .browsless-executed-block .opacity-75 {
        opacity: 0.75;
      }
      .browsless-executed-block {
        color: #18181b;
        width: 250px;
        position: fixed;
        border-radius: 12px;
        bottom: 12px;
        right: 12px;
        padding: 14px;
        background-color: white;
        font-size: 16px;
        font-family: sans-serif;
        box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
        z-index: 99999;
      }
      .browsless-executed-block #spinner {
        color: currentColor;
        display: inline-block;
        animation: spin 1s linear infinite;
      }
      .browsless-executed-block p {
        margin: 0;
        padding: 0;
        margin-left: 8px;
      }
    `;
    document.body.appendChild(style);
  }
  container.innerHTML = generateElement(block);
  return () => {
    const elements = document.querySelectorAll('.browsless-executed-block');
    elements.forEach((el) => {
      el.remove();
    });
  };
}
