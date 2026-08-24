import mitt from 'mitt';

type AppEvents = Record<string, unknown>;

const emitter = mitt<AppEvents>();

export default emitter;
