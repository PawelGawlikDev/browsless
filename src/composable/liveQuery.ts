import { liveQuery } from 'dexie';
import { useObservable } from '@vueuse/rxjs';
import type { Observable } from 'rxjs';
export const useLiveQuery = <T>(querier: () => Promise<T> | T) => {
  return useObservable(liveQuery(querier) as unknown as Observable<T>);
};
