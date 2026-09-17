import { mkdir, readFile, writeFile, rename, unlink } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { validateCatalog, validatePlayableCatalog, type ContentDraft, type ContentEnvelope, type GameCatalog } from './catalog';

export class ContentConflict extends Error {}
export class ContentStore {
  constructor(private root: string, private baseline: () => Promise<GameCatalog>, private migrate?: (catalog: GameCatalog) => Promise<GameCatalog>) {}
  private publishedPath() { return path.join(this.root, 'content', 'game-content.json'); }
  private draftPath() { return path.join(this.root, 'data', 'admin-content-draft.json'); }
  private async read<T>(filename: string): Promise<T | null> {
    try { return JSON.parse(await readFile(filename, 'utf8')); }
    catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null; throw error; }
  }
  private async write(filename: string, value: unknown) {
    await mkdir(path.dirname(filename), { recursive: true });
    const temporary = `${filename}.${randomUUID()}.tmp`;
    try {
      await writeFile(temporary, JSON.stringify(value, null, 2), { flag: 'wx', mode: 0o600 });
      await rename(temporary, filename);
    } finally { await unlink(temporary).catch(error => { if (error.code !== 'ENOENT') throw error; }); }
  }
  private async locked<T>(operation: () => Promise<T>): Promise<T> {
    const filename = path.join(this.root, 'data', 'admin-content.lock');
    await mkdir(path.dirname(filename), { recursive: true });
    try { await writeFile(filename, String(process.pid), { flag: 'wx', mode: 0o600 }); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'EEXIST') throw new ContentConflict('Другой запрос сохраняет изменения. Повторите действие.');
      throw error;
    }
    try { return await operation(); } finally { await unlink(filename); }
  }
  async published(): Promise<ContentEnvelope> {
    const stored = await this.read<ContentEnvelope>(this.publishedPath());
    if (stored) { validateCatalog(stored.catalog); return stored; }
    return { revision: 'baseline', catalog: await this.baseline() };
  }
  async draft(): Promise<ContentDraft> {
    const stored = await this.read<ContentDraft>(this.draftPath());
    if (stored) {
      if (!stored.catalog.words) stored.catalog.words = (await this.baseline()).words;
      validateCatalog(stored.catalog);
      return stored;
    }
    const published = await this.published();
    const catalog = this.migrate && published.revision === 'baseline' ? await this.migrate(structuredClone(published.catalog)) : published.catalog;
    if (!catalog.words) catalog.words = (await this.baseline()).words;
    const imported = JSON.stringify(catalog) !== JSON.stringify(published.catalog);
    return { ...published, catalog, baseRevision: published.revision, changes: imported ? ['Импорт прежних черновиков админки'] : [] };
  }
  async change(revision: string, label: string, edit: (catalog: GameCatalog) => void): Promise<ContentDraft> {
    return this.locked(async () => {
      const draft = await this.draft();
      if (draft.revision !== revision) throw new ContentConflict('Черновик изменён в другой вкладке. Обновите список.');
      edit(draft.catalog); validateCatalog(draft.catalog);
      draft.revision = randomUUID(); draft.changes.push(label);
      await this.write(this.draftPath(), draft);
      return draft;
    });
  }
  async applyChecks(edit: (catalog: GameCatalog) => number): Promise<ContentDraft> {
    return this.locked(async () => {
      const draft = await this.draft();
      const count = edit(draft.catalog);
      if (count > 0) {
        draft.revision = randomUUID(); draft.changes.push(`Проверка вопросов: ${count}`);
        await this.write(this.draftPath(), draft);
      }
      return draft;
    });
  }
  async sync(revision: string): Promise<ContentDraft> {
    return this.locked(async () => {
      const draft = await this.draft(); const published = await this.published();
      if (draft.revision !== revision) throw new ContentConflict('Есть более новые правки. Обновите список перед сохранением.');
      if (draft.baseRevision !== published.revision && JSON.stringify(draft.catalog) !== JSON.stringify(published.catalog)) {
        throw new ContentConflict('Игровой файл изменён вне админки. Сохранение остановлено для защиты правок.');
      }
      validatePlayableCatalog(draft.catalog);
      if (draft.changes.length === 0) return draft;
      await this.write(path.join(this.root, 'data', 'content-backups', `${Date.now()}-${randomUUID()}.json`), published);
      const next = { revision: randomUUID(), catalog: draft.catalog };
      await this.write(this.publishedPath(), next);
      const clean = { ...next, baseRevision: next.revision, changes: [] };
      await this.write(this.draftPath(), clean);
      return clean;
    });
  }
}
