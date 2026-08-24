type EditorNode = { id: string } & Record<string, unknown>;
type EditorEdge = { id: string } & Record<string, unknown>;

type EditorLike = {
  addNodes: (nodes: EditorNode[]) => unknown;
  removeNodes: (ids: string[]) => unknown;
  addEdges: (edges: EditorEdge[]) => unknown;
  removeEdges: (ids: string[]) => unknown;
};

type EditorState = {
  nodes: Record<string, EditorNode>;
  edges: Record<string, EditorEdge>;
};

type EditorCommand = {
  name: string;
  execute: () => unknown;
  undo: () => unknown;
};

class EditorCommands {
  editor: EditorLike;
  state: EditorState;

  constructor(editor: EditorLike, initialStates: Partial<EditorState> = {}) {
    this.editor = editor;
    this.state = {
      nodes: initialStates.nodes ?? {},
      edges: initialStates.edges ?? {},
    };
  }

  nodeAdded(addedNodes: EditorNode[]): EditorCommand {
    const ids: string[] = [];
    addedNodes.forEach((node) => {
      ids.push(node.id);
      this.state.nodes[node.id] = node;
    });

    return {
      name: 'node-added',
      execute: () => {
        this.editor.addNodes(addedNodes);
      },
      undo: () => {
        this.editor.removeNodes(ids);
      },
    };
  }

  nodeRemoved(ids: string[]): EditorCommand {
    return {
      name: 'node-removed',
      execute: () => {
        this.editor.removeNodes(ids);
      },
      undo: () => {
        const nodes = ids.map((id) => this.state.nodes[id]);
        this.editor.addNodes(nodes);
      },
    };
  }

  edgeAdded(addedEdges: EditorEdge[]): EditorCommand {
    const ids: string[] = [];
    addedEdges.forEach((edge) => {
      ids.push(edge.id);
      this.state.edges[edge.id] = edge;
    });

    return {
      name: 'edge-added',
      execute: () => {
        this.editor.addEdges(addedEdges);
      },
      undo: () => {
        this.editor.removeEdges(ids);
      },
    };
  }

  edgeRemoved(ids: string[]): EditorCommand {
    return {
      name: 'edge-removed',
      execute: () => {
        this.editor.removeEdges(ids);
      },
      undo: () => {
        const edges = ids.map((id) => this.state.edges[id]);
        this.editor.addEdges(edges);
      },
    };
  }
}

export default EditorCommands;
