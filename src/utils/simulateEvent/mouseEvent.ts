type MouseCommandParams = {
  type?: 'mousePressed' | 'mouseReleased' | 'mouseMoved';
  clickCount?: number;
  x?: number;
  y?: number;
  [key: string]: unknown;
};
type MouseEventHandlerOptions = {
  sendCommand: (command: string, params: MouseCommandParams) => Promise<unknown>;
  commandParams: MouseCommandParams;
};
export default function ({ sendCommand, commandParams }: MouseEventHandlerOptions) {
  const mousedown = async () => {
    commandParams.type = 'mousePressed';
    await sendCommand('Input.dispatchMouseEvent', commandParams);
  };
  const mouseup = async () => {
    commandParams.type = 'mouseReleased';
    await sendCommand('Input.dispatchMouseEvent', commandParams);
  };
  const click = async () => {
    if (!commandParams.clickCount) commandParams.clickCount = 1;
    await mousedown();
    await mouseup();
  };
  const dblclick = async () => {
    commandParams.clickCount = 2;
    await click();
  };
  const mousemove = async () => {
    commandParams.type = 'mouseMoved';
    await sendCommand('Input.dispatchMouseEvent', commandParams);
  };
  const mouseenter = async () => {
    await mousemove();
  };
  const mouseleave = async () => {
    await mousemove();
    commandParams.x = -100;
    commandParams.y = -100;
    await mousemove();
  };
  return {
    mousedown,
    mouseup,
    click,
    dblclick,
    mousemove,
    mouseenter,
    mouseleave,
  };
}
