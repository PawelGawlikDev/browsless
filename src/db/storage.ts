import Dexie, { type EntityTable } from 'dexie';
import type {
  DbStorageCredential,
  DbStorageTableData,
  DbStorageTableItem,
  DbStorageVariable,
} from '@/types/db';

const dbStorage = new Dexie('storage') as Dexie & {
  tablesData: EntityTable<DbStorageTableData, 'id'>;
  tablesItems: EntityTable<DbStorageTableItem, 'id'>;
  variables: EntityTable<DbStorageVariable, 'id'>;
  credentials: EntityTable<DbStorageCredential, 'id'>;
};
dbStorage.version(2).stores({
  tablesData: '++id, tableId',
  tablesItems: '++id, name, createdAt, modifiedAt',
  variables: '++id, &name',
  credentials: '++id, &name',
});

export default dbStorage;
