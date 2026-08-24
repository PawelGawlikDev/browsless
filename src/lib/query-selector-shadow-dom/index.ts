/*
Forked from: https://github.com/webdriverio/query-selector-shadow-dom/
*/
import { normalizeSelector } from './normalize';
type QueryRoot = Document | DocumentFragment | Element;
type DeepQueryRoot = QueryRoot | ShadowRoot;
type ParentNodeLike = Node & ParentNode;
export const querySelectorAllDeep = (
  selector: string,
  root: QueryRoot = document,
  allElements: Element[] | null = null
): Element[] => {
  return _querySelectorDeep(selector, true, root, allElements) as Element[];
};
export const querySelectorDeep = (
  selector: string,
  root: QueryRoot = document,
  allElements: Element[] | null = null
): Element | null => {
  return _querySelectorDeep(selector, false, root, allElements) as Element | null;
};
const _querySelectorDeep = (
  selector: string,
  findMany: boolean,
  root: QueryRoot,
  allElements: Element[] | null = null
): Element[] | Element | NodeListOf<Element> | null => {
  selector = normalizeSelector(selector);
  const lightElement = root.querySelector(selector);
  const headWithLegacyShadow = document.head as HTMLHeadElement & {
    createShadowRoot?: () => ShadowRoot;
  };
  if (headWithLegacyShadow.createShadowRoot || document.head.attachShadow) {
    if (!findMany && lightElement) return lightElement;
    const selectionsToMake = splitByCharacterUnlessQuoted(selector, ',');
    return selectionsToMake.reduce<Element[] | Element | null>(
      (acc, minimalSelector) => {
        if (!findMany && acc) return acc;
        const splitSelector = splitByCharacterUnlessQuoted(
          minimalSelector.replace(/^\s+/g, '').replace(/\s*([>+~]+)\s*/g, '$1'),
          ' '
        )
          .filter((entry): entry is string => Boolean(entry))
          .map((entry) => splitByCharacterUnlessQuoted(entry, '>'));
        const possibleElementsIndex = splitSelector.length - 1;
        const lastSplitPart =
          splitSelector[possibleElementsIndex][
            splitSelector[possibleElementsIndex].length - 1
          ];
        const possibleElements = collectAllElementsDeep(lastSplitPart, root, allElements);
        const findElements = findMatchingElement(
          splitSelector,
          possibleElementsIndex,
          root
        );
        if (findMany) {
          return (acc as Element[]).concat(possibleElements.filter(findElements));
        }
        return possibleElements.find(findElements) ?? null;
      },
      findMany ? [] : null
    );
  }
  if (!findMany) return lightElement;
  return root.querySelectorAll(selector);
};
const findMatchingElement = (
  splitSelector: string[][],
  possibleElementsIndex: number,
  root: QueryRoot
) => {
  return (element: Element) => {
    let position = possibleElementsIndex;
    let parent: ParentNodeLike | null = element;
    let foundElement = false;
    while (parent && !isDocumentNode(parent)) {
      let foundMatch = true;
      if (splitSelector[position].length === 1) {
        foundMatch = (parent as Element).matches(splitSelector[position][0]);
      } else {
        const reversedParts = [...splitSelector[position]].reverse();
        let newParent: ParentNodeLike | null = parent;
        for (const part of reversedParts) {
          if (!newParent || !(newParent instanceof Element) || !newParent.matches(part)) {
            foundMatch = false;
            break;
          }
          newParent = findParentOrHost(newParent, root);
        }
      }
      if (foundMatch && position === 0) {
        foundElement = true;
        break;
      }
      if (foundMatch) position--;
      parent = findParentOrHost(parent, root);
    }
    return foundElement;
  };
};
const splitByCharacterUnlessQuoted = (selector: string, character: string): string[] => {
  const matches = selector.match(/\\?.|^$/g) ?? [];
  const parts = [''];
  let doubleQuoted = false;
  let singleQuoted = false;
  for (const current of matches) {
    if (current === '"' && !singleQuoted) {
      doubleQuoted = !doubleQuoted;
      parts[parts.length - 1] += current;
    } else if (current === "'" && !doubleQuoted) {
      singleQuoted = !singleQuoted;
      parts[parts.length - 1] += current;
    } else if (!doubleQuoted && !singleQuoted && current === character) {
      parts.push('');
    } else {
      parts[parts.length - 1] += current;
    }
  }
  return parts;
};
const isDocumentNode = (node: Node): node is Document | DocumentFragment => {
  return (
    node.nodeType === Node.DOCUMENT_FRAGMENT_NODE || node.nodeType === Node.DOCUMENT_NODE
  );
};
const findParentOrHost = (element: Node, _root: QueryRoot): ParentNodeLike | null => {
  const { parentNode } = element;
  if (!parentNode || parentNode.nodeType === 11) return null;
  return parentNode as ParentNodeLike;
};
const getShadowRoot = (
  element: DeepQueryRoot
): Document | DocumentFragment | ShadowRoot | null => {
  if (element === document) return element;
  return chrome.dom?.openOrClosedShadowRoot?.(element as Element) ?? null;
};
export const collectAllElementsDeep = (
  selector: string | null = null,
  root: QueryRoot,
  cachedElements: Element[] | null = null
): Element[] => {
  let allElements: Element[] = [];
  if (cachedElements) {
    allElements = cachedElements;
  } else {
    const findAllElements = (nodes: NodeListOf<Element>) => {
      for (let index = 0; index < nodes.length; index += 1) {
        const el = nodes[index];
        allElements.push(el);
        const shadowRoot = getShadowRoot(el);
        if (shadowRoot) {
          findAllElements(shadowRoot.querySelectorAll('*'));
        }
      }
    };
    const rootShadowRoot = getShadowRoot(root);
    if (rootShadowRoot) {
      findAllElements(rootShadowRoot.querySelectorAll('*'));
    }
    findAllElements(root.querySelectorAll('*'));
  }
  return selector ? allElements.filter((el) => el.matches(selector)) : allElements;
};
