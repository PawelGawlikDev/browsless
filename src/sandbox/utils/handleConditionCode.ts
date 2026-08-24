type ConditionCodePayload = {
  id: string;
  refData: Record<string, unknown>;
  data: {
    code: string;
  };
};
const handleConditionCode = (data: ConditionCodePayload) => {
  const propertyName = `browsless${data.id}`;
  const script = document.createElement('script');
  script.textContent = `
    (async () => {
      function browslessRefData(keyword, path = '') {
        if (!keyword) return null;
        if (!path) return ${propertyName}.refData[keyword];

        return window.$getNestedProperties(${propertyName}.refData, keyword + '.' + path);
      }

      try {
        ${data.data.code}
      } catch (error) {
        return {
          $isError: true,
          message: error.message,
        }
      }
    })()
      .then((result) => {
        ${propertyName}.done(result);
      });
  `;
  window[propertyName] = {
    refData: data.refData,
    done: (result: unknown) => {
      script.remove();
      delete window[propertyName as keyof Window];
      window.top.postMessage(
        {
          result,
          id: data.id,
          type: 'sandbox',
        },
        '*'
      );
    },
  };
  (document.body || document.documentElement).appendChild(script);
};
export default handleConditionCode;
