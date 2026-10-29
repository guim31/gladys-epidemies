// -----------------------------------------------------------------------------
// Small persistence under /data (the only writable path of the container): the
// datasets read and their version, the time of the last check, a rate-limit
// pause, and the last week seen per area and disease (reference of the
// triggers). After a restart the devices and the widget have their values
// without a download, and the API is not asked again within 10 minutes nor
// during a pause. Losing the file is harmless: the data are read again (at
// most 7 requests), and the first weeks then fire no trigger.
// -----------------------------------------------------------------------------

import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createLogger } from '@gladysassistant/integration-sdk';

const logger = createLogger({ name: 'epidemies-store' });
const FILE_NAME = 'epidemies.json';

export class Store {
  constructor(directory = process.env.EPIDEMIES_DATA_DIR || '/data') {
    this.directory = directory;
    this.path = join(directory, FILE_NAME);
    this.pending = null;
    this.writing = null;
    // A failing disk would fail every save: logged once, then at debug.
    this.writeFailed = false;
  }

  async load() {
    try {
      const data = JSON.parse(await readFile(this.path, 'utf8'));
      return data && typeof data === 'object' ? data : {};
    } catch (err) {
      if (err.code !== 'ENOENT') {
        logger.warn(`Cannot read ${this.path}: ${err.message}`);
      }
      return {};
    }
  }

  // Writes are coalesced and atomic (temporary file + rename): a crash never
  // leaves half a JSON file behind.
  save(data) {
    this.latest = data;
    if (!this.pending) {
      // Chained after the write in progress, if any: one writer at a time.
      this.pending = (this.writing ?? Promise.resolve()).then(async () => {
        const snapshot = this.latest;
        this.pending = null;
        try {
          await mkdir(this.directory, { recursive: true });
          const temporary = `${this.path}.tmp`;
          await writeFile(temporary, JSON.stringify(snapshot));
          await rename(temporary, this.path);
          if (this.writeFailed) {
            this.writeFailed = false;
            logger.info(`${this.path} written again`);
          }
        } catch (err) {
          if (this.writeFailed) {
            logger.debug(`Cannot write ${this.path}: ${err.message}`);
          } else {
            this.writeFailed = true;
            logger.warn(`Cannot write ${this.path}: ${err.message}`);
          }
        }
      });
      this.writing = this.pending;
    }
    return this.pending;
  }

  /** Resolves once every write requested so far is on disk. */
  flush() {
    return this.writing ?? Promise.resolve();
  }
}
