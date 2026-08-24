export const normalizeSelector = (sel: string): string => {
  const tokens: string[] = [];
  let match: RegExpExecArray | null;
  let unmatched = '';
  let regex: RegExp;
  const state = [0];
  let nextMatchIdx = 0;
  let prevMatchIdx = 0;
  const notEscapedPattern = /(?:[^\\]|(?:^|[^\\])(?:\\\\)+)$/;
  const whitespacePattern = /^\s+$/;
  const statePatterns: Array<RegExp | null> = [
    /\s+|\/\*|["'>~+[(]/g,
    /\s+|\/\*|["'[\]()]/g,
    /\s+|\/\*|["'[\]()]/g,
    null,
    /\*\//g,
  ];
  const saveUnmatched = () => {
    if (!unmatched) return;
    if (tokens.length > 0 && /^[~+>]$/.test(tokens[tokens.length - 1])) {
      tokens.push(' ');
    }
    tokens.push(unmatched);
  };
  sel = sel.trim();
  while (true) {
    unmatched = '';
    regex = statePatterns[state[state.length - 1]] as RegExp;
    regex.lastIndex = nextMatchIdx;
    match = regex.exec(sel);
    if (!match) {
      unmatched = sel.slice(nextMatchIdx);
      saveUnmatched();
      break;
    }
    prevMatchIdx = nextMatchIdx;
    nextMatchIdx = regex.lastIndex;
    if (prevMatchIdx < nextMatchIdx - match[0].length) {
      unmatched = sel.substring(prevMatchIdx, nextMatchIdx - match[0].length);
    }
    if (state[state.length - 1] < 3) {
      saveUnmatched();
      if (match[0] === '[') {
        state.push(1);
      } else if (match[0] === '(') {
        state.push(2);
      } else if (/^["']$/.test(match[0])) {
        state.push(3);
        statePatterns[3] = new RegExp(match[0], 'g');
      } else if (match[0] === '/*') {
        state.push(4);
      } else if (/^[\])]$/.test(match[0]) && state.length > 0) {
        state.pop();
      } else if (/^(?:\s+|[~+>])$/.test(match[0])) {
        if (
          tokens.length > 0 &&
          !whitespacePattern.test(tokens[tokens.length - 1]) &&
          state[state.length - 1] === 0
        ) {
          tokens.push(' ');
        }
        if (
          state[state.length - 1] === 1 &&
          tokens.length === 5 &&
          tokens[2].charAt(tokens[2].length - 1) === '='
        ) {
          tokens[4] = ` ${tokens[4]}`;
        }
        if (whitespacePattern.test(match[0])) continue;
      }
      tokens.push(match[0]);
      continue;
    }
    tokens[tokens.length - 1] += unmatched;
    if (notEscapedPattern.test(tokens[tokens.length - 1])) {
      if (state[state.length - 1] === 4) {
        if (tokens.length < 2 || whitespacePattern.test(tokens[tokens.length - 2])) {
          tokens.pop();
        } else {
          tokens[tokens.length - 1] = ' ';
        }
        match[0] = '';
      }
      state.pop();
    }
    tokens[tokens.length - 1] += match[0];
  }
  return tokens.join('').trim();
};
