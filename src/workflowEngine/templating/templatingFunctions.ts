import jsonpath from 'jsonpath';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
dayjs.extend(relativeTime);
type TemplateFunctionValue = unknown;
type JsonLike = Record<string, unknown> | unknown[];
const isAllNums = (...args: unknown[]) => args.every((arg) => !Number.isNaN(+arg));
const isObject = (obj: unknown): obj is Record<string, unknown> =>
  typeof obj === 'object' && obj !== null && !Array.isArray(obj);
const parseJSON = <T>(data: string, def: T): unknown | T => {
  try {
    return JSON.parse(data);
  } catch {
    return def;
  }
};
const templatingFunctions = {
  date(...args: string[]) {
    let date = new Date();
    let dateFormat = 'DD-MM-YYYY';
    if (args.length === 1) {
      dateFormat = args[0];
    } else if (args.length >= 2) {
      date = new Date(args[0]);
      dateFormat = args[1];
    }
    const isValidDate = date instanceof Date && !Number.isNaN(date.getTime());
    const dayjsDate = dayjs(isValidDate ? date : Date.now());
    if (dateFormat === 'relative') return dayjsDate.fromNow();
    if (dateFormat === 'timestamp') return dayjsDate.valueOf();
    return dayjsDate.format(dateFormat);
  },
  randint(min: TemplateFunctionValue = 0, max: TemplateFunctionValue = 100) {
    return Math.round(Math.random() * (+max - +min) + +min);
  },
  getLength(str: string) {
    const value = parseJSON(str, str) as
      | {
          length?: number;
        }
      | string;
    return value.length ?? value;
  },
  slice(
    value: TemplateFunctionValue,
    start: TemplateFunctionValue,
    end: TemplateFunctionValue
  ) {
    if (
      !value ||
      typeof (
        value as {
          slice?: unknown;
        }
      ).slice !== 'function'
    )
      return value;
    const startIndex = Number.isNaN(+start) ? 0 : +start;
    const endIndex = Number.isNaN(+end)
      ? (
          value as {
            length: number;
          }
        ).length
      : +end;
    return (
      value as {
        slice: (from: number, to?: number) => unknown;
      }
    ).slice(startIndex, endIndex);
  },
  multiply(value: TemplateFunctionValue, multiplyBy: TemplateFunctionValue) {
    if (!isAllNums(value, multiplyBy)) return value;
    return +value * +multiplyBy;
  },
  increment(value: TemplateFunctionValue, incrementBy: TemplateFunctionValue) {
    if (!isAllNums(value, incrementBy)) return value;
    return +value + +incrementBy;
  },
  divide(value: TemplateFunctionValue, divideBy: TemplateFunctionValue) {
    if (!isAllNums(value, divideBy)) return value;
    return +value / +divideBy;
  },
  subtract(value: TemplateFunctionValue, subtractBy: TemplateFunctionValue) {
    if (!isAllNums(value, subtractBy)) return value;
    return +value - +subtractBy;
  },
  randData(str: TemplateFunctionValue) {
    if (Array.isArray(str)) {
      const index = Math.floor(Math.random() * str.length);
      return str[index];
    }
    const getRand = (data: string | number[]) =>
      data[Math.floor(Math.random() * data.length)];
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const digits = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
    const symbols = `!@#$%^&*()-_+={}[]|\\;:'\"<>,./?"`;
    const mapSamples = {
      l: () => getRand(lowercase),
      u: () => getRand(uppercase),
      d: () => getRand(digits),
      s: () => getRand(symbols),
      f() {
        return this.l() + this.u();
      },
      n() {
        return this.l() + this.d();
      },
      m() {
        return this.u() + this.d();
      },
      i() {
        return this.l() + this.u() + this.d();
      },
      a() {
        return getRand(lowercase + uppercase + digits.join('') + symbols);
      },
    };
    return `${str}`.replace(
      /\?[a-zA-Z]/g,
      (char) => mapSamples[char.at(-1) as keyof typeof mapSamples]?.() ?? char
    );
  },
  filter(data: JsonLike | TemplateFunctionValue, exps: string) {
    if (!isObject(data) && !Array.isArray(data)) return data;
    return jsonpath.query(data, exps);
  },
  replace(value: TemplateFunctionValue, search: string | RegExp, replace: string) {
    if (typeof value !== 'string') return value;
    return value.replace(search, replace);
  },
  replaceAll(value: TemplateFunctionValue, search: string | RegExp, replace: string) {
    if (typeof value !== 'string') return value;
    return value.replaceAll(search, replace);
  },
  toLowerCase(value: TemplateFunctionValue) {
    if (typeof value !== 'string') return value;
    return value.toLowerCase();
  },
  toUpperCase(value: TemplateFunctionValue) {
    if (typeof value !== 'string') return value;
    return value.toUpperCase();
  },
  modulo(value: TemplateFunctionValue, divisor: TemplateFunctionValue) {
    return +value % +divisor;
  },
  stringify(value: TemplateFunctionValue) {
    return JSON.stringify(value);
  },
};
export default templatingFunctions;
