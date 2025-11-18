// Lightweight IndexedDB helper used by landing-page attendance
const DB = (function(){
  const DB_NAME = 'FAYIS_DB';
  const DB_VERSION = 1;
  let db = null;

  async function open(){
    if (db) return;
    return new Promise((res, rej) => {
      const rq = indexedDB.open(DB_NAME, DB_VERSION);
      rq.onupgradeneeded = (e) => {
        db = e.target.result;
        if (!db.objectStoreNames.contains('staff')) {
          const s = db.createObjectStore('staff', { keyPath: 'staffCode' });
          s.createIndex('name', 'name', { unique: false });
        }
        if (!db.objectStoreNames.contains('attendance')) {
          const a = db.createObjectStore('attendance', { keyPath: 'id', autoIncrement: true });
          a.createIndex('date', 'date', { unique: false });
          a.createIndex('staffCode_date', ['staffCode','date'], { unique: false });
        }
      };
      rq.onsuccess = (e) => { db = e.target.result; res(); };
      rq.onerror = (e) => rej(e);
    });
  }

  function getStore(storeName, mode='readonly'){
    const tx = db.transaction(storeName, mode);
    return tx.objectStore(storeName);
  }

  async function addStaff(staff){
    await open();
    return new Promise((res,rej)=>{
      const s = getStore('staff','readwrite');
      const req = s.put(staff); // staffCode as key
      req.onsuccess = ()=> res(req.result);
      req.onerror = e=> rej(e);
    });
  }

  async function getAllStaff(){
    await open();
    return new Promise((res,rej)=>{
      const s = getStore('staff');
      const rq = s.getAll();
      rq.onsuccess = ()=> res(rq.result || []);
      rq.onerror = e=> rej(e);
    });
  }

  async function getStaff(staffCode){
    await open();
    return new Promise((res,rej)=>{
      const s = getStore('staff');
      const rq = s.get(staffCode);
      rq.onsuccess = ()=> res(rq.result || null);
      rq.onerror = e=> rej(e);
    });
  }

  async function addAttendance(entry){
    await open();
    return new Promise((res,rej)=>{
      const s = getStore('attendance','readwrite');
      const rq = s.add(entry);
      rq.onsuccess = ()=> res(rq.result);
      rq.onerror = e=> rej(e);
    });
  }

  async function hasAttendanceToday(staffCode, dateStr){
    await open();
    return new Promise((res,rej)=>{
      const s = getStore('attendance');
      const idx = s.index('staffCode_date');
      const range = IDBKeyRange.only([staffCode,dateStr]);
      // iterate — if any record exists, resolve true
      const cur = idx.openCursor(range);
      cur.onsuccess = (e) => {
        const c = e.target.result;
        if (c) res(true); else res(false);
      };
      cur.onerror = e => rej(e);
    });
  }

  async function getAttendanceByDate(dateStr){
    await open();
    return new Promise((res,rej)=>{
      const s = getStore('attendance');
      const idx = s.index('date');
      const range = IDBKeyRange.only(dateStr);
      const arr = [];
      const cur = idx.openCursor(range);
      cur.onsuccess = (e) => {
        const c = e.target.result;
        if (c) { arr.push(c.value); c.continue(); } else res(arr);
      };
      cur.onerror = e => rej(e);
    });
  }

  return { open, addStaff, getAllStaff, getStaff, addAttendance, hasAttendanceToday, getAttendanceByDate };
})();
