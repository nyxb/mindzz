import { AsyncLock } from '@toeverything/infra';
import { Subject } from 'rxjs';
import { applyUpdate, Doc as YDoc } from 'yjs';

import { logger } from '../logger';
import { getWorkspaceMeta } from '../workspace/meta';
import { SQLiteAdapter } from './db-adapter';
import { mergeUpdate } from './merge-update';

const TRIM_SIZE = 500;

export class WorkspaceSQLiteDB {
  lock = new AsyncLock();
  update$ = new Subject<void>();
  adapter = new SQLiteAdapter(this.path);

  constructor(
    public path: string,
    public workspaceId: string
  ) {}

  async transaction<T>(cb: () => Promise<T>): Promise<T> {
    using _lock = await this.lock.acquire();
    return await cb();
  }

  async destroy() {
    await this.adapter.destroy();

    // when db is closed, we can safely remove it from ensure-db list
    this.update$.complete();
  }

  private readonly toDBDocId = (docId: string) => {
    return this.workspaceId === docId ? undefined : docId;
  };

  getWorkspaceName = async () => {
    const ydoc = new YDoc();
    const updates = await this.adapter.getUpdates();
    updates.forEach(update => {
      applyUpdate(ydoc, update.data);
    });
    return ydoc.getMap('meta').get('name') as string;
  };

  async init() {
    const db = await this.adapter.connectIfNeeded();
    await this.tryTrim();
    return db;
  }

  async get(docId: string) {
    return this.adapter.getUpdates(docId);
  }

  // getUpdates then encode
  getDocAsUpdates = async (docId: string) => {
    const dbID = this.toDBDocId(docId);
    const update = await this.tryTrim(dbID);
    if (update) {
      return update;
    } else {
      const updates = await this.adapter.getUpdates(dbID);
      return mergeUpdate(updates.map(row => row.data));
    }
  };

  async addBlob(key: string, value: Uint8Array) {
    this.update$.next();
    const res = await this.adapter.addBlob(key, value);
    return res;
  }

  async getBlob(key: string) {
    return this.adapter.getBlob(key);
  }

  async getBlobKeys() {
    return this.adapter.getBlobKeys();
  }

  async deleteBlob(key: string) {
    this.update$.next();
    await this.adapter.deleteBlob(key);
  }

  async addUpdateToSQLite(update: Uint8Array, subdocId: string) {
    this.update$.next();
    await this.adapter.addUpdateToSQLite([
      {
        data: update,
        docId: this.toDBDocId(subdocId),
      },
    ]);
  }

  async deleteUpdate(subdocId: string) {
    this.update$.next();
    await this.adapter.deleteUpdates(this.toDBDocId(subdocId));
  }

  private readonly tryTrim = async (dbID?: string) => {
    const count = (await this.adapter?.getUpdatesCount(dbID)) ?? 0;
    if (count > TRIM_SIZE) {
      return await this.transaction(async () => {
        logger.debug(`trim ${this.workspaceId}:${dbID} ${count}`);
        const updates = await this.adapter.getUpdates(dbID);
        const update = mergeUpdate(updates.map(row => row.data));
        const insertRows = [{ data: update, dbID }];
        await this.adapter?.replaceUpdates(dbID, insertRows);
        logger.debug(`trim ${this.workspaceId}:${dbID} successfully`);
        return update;
      });
    }
    return null;
  };
}

export async function openWorkspaceDatabase(workspaceId: string) {
  const meta = await getWorkspaceMeta(workspaceId);
  const db = new WorkspaceSQLiteDB(meta.mainDBPath, workspaceId);
  await db.init();
  logger.info(`openWorkspaceDatabase [${workspaceId}]`);
  return db;
}
