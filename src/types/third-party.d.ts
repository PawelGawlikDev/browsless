declare module '@n8n_io/riot-tmpl' {
  const tmpl: {
    brackets: {
      set: (value: string) => void;
    };
    tmpl: (template: string, data: Record<string, unknown>) => unknown;
    [key: string]: unknown;
  };

  export = tmpl;
}
