/* Pranava — IndexedDB store for user-imported sounds (kept on-device). */
const SoundDB = {
  db: null,
  open() {
    return new Promise((res, rej) => {
      if (this.db) return res(this.db);
      const r = indexedDB.open('pranava', 1);
      r.onupgradeneeded = e => e.target.result.createObjectStore('sounds', { keyPath:'id', autoIncrement:true });
      r.onsuccess = e => { this.db = e.target.result; res(this.db); };
      r.onerror = () => rej(r.error);
    });
  },
  tx(mode) { return this.db.transaction('sounds', mode).objectStore('sounds'); },
  async add(name, blob) {
    await this.open();
    return new Promise((res, rej) => {
      const rq = this.tx('readwrite').add({ name, blob });
      rq.onsuccess = () => res(rq.result); rq.onerror = () => rej(rq.error);
    });
  },
  async all() {
    await this.open();
    return new Promise((res, rej) => {
      const rq = this.tx('readonly').getAll();
      rq.onsuccess = () => res(rq.result); rq.onerror = () => rej(rq.error);
    });
  },
  async get(id) {
    await this.open();
    return new Promise((res, rej) => {
      const rq = this.tx('readonly').get(id);
      rq.onsuccess = () => res(rq.result); rq.onerror = () => rej(rq.error);
    });
  },
  async del(id) {
    await this.open();
    return new Promise((res, rej) => {
      const rq = this.tx('readwrite').delete(id);
      rq.onsuccess = () => res(); rq.onerror = () => rej(rq.error);
    });
  },
};
