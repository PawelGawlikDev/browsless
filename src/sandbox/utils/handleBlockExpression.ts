import tmpl from '@/lib/tmpl';
import functions from '@/workflowEngine/templating/templatingFunctions';
type BlockExpressionPayload = {
  str: string;
  data: Record<string, unknown>;
};
type BlockExpressionResponse = {
  list: Record<string, string>;
  value: string;
};
const templatingFunctions = Object.keys(functions).reduce<Record<string, unknown>>(
  (acc, funcName) => {
    acc[`$${funcName}`] = functions[funcName as keyof typeof functions];
    return acc;
  },
  {}
);
const handleBlockExpression = (
  { str, data }: BlockExpressionPayload,
  sendResponse: (payload: BlockExpressionResponse) => void
) => {
  const value = String(tmpl.tmpl(str, { ...data, ...templatingFunctions }));
  sendResponse({
    list: {},
    value: value.slice(2),
  });
};
export default handleBlockExpression;
