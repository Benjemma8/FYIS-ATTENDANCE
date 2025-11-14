// Simple IndexedDB wrapper for staff and attendance
const DB = (function(){
  const DB_NAME = 'FAYIS_DB';
  const DB_VERSION = 1;
  let db = null;

  function open(){
    return new Promise((res, rej) => {
      const rq = indexedDB.open(DB_NAME, DB_VERSION);
      rq.onupgradeneeded = (e) => {
        db = e.target.result;
        if (!db.objectStoreNames.contains('staff')) {
          const s = db.createObjectStore('staff', { keyPath: 'id', autoIncrement: true });
          s.createIndex('staffCode', 'staffCode', { unique: true });
        }
        if (!db.objectStoreNames.contains('attendance')) {
          const a = db.createObjectStore('attendance', { keyPath: 'id', autoIncrement: true });
          a.createIndex('date', 'date', { unique: false });
        }
      };
      rq.onsuccess = (e) => { db = e.target.result; res(); };
      rq.onerror = (e) => { rej(e); };
    });
  }

  function deleteDatabase(){
    return new Promise((res, rej) => {
      const del = indexedDB.deleteDatabase(DB_NAME);
      del.onsuccess = ()=> res();
      del.onerror = (e)=> rej(e);
    });
  }

  function addStaff(staff){
    return new Promise((res, rej) => {
      const tx = db.transaction('staff','readwrite');
      const store = tx.objectStore('staff');
      const req = store.add(staff);
      req.onsuccess = () => res(req.result);
      req.onerror = (e) => rej(e);
    });
  }

  function updateStaff(staff){
    return new Promise((res, rej) => {
      const tx = db.transaction('staff','readwrite');
      const store = tx.objectStore('staff');
      const req = store.put(staff);
      req.onsuccess = ()=> res();
      req.onerror = e => rej(e);
    });
  }

  function getAllStaff(){
    return new Promise((res, rej) => {
      const tx = db.transaction('staff','readonly');
      const store = tx.objectStore('staff');
      const rq = store.getAll();
      rq.onsuccess = ()=> res(rq.result || []);
      rq.onerror = e => rej(e);
    });
  }

  function getStaffByCode(code){
    return new Promise((res, rej) => {
      const tx = db.transaction('staff','readonly');
      const store = tx.objectStore('staff');
      const idx = store.index('staffCode');
      const rq = idx.get(code);
      rq.onsuccess = ()=> res(rq.result || null);
      rq.onerror = e => rej(e);
    });
  }

  function addAttendance(entry){
    return new Promise((res, rej) => {
      const tx = db.transaction('attendance','readwrite');
      const store = tx.objectStore('attendance');
      const req = store.add(entry);
      req.onsuccess = () => res(req.result);
      req.onerror = e => rej(e);
    });
  }

  function getAttendanceByDate(date){
    return new Promise((res, rej) => {
      const tx = db.transaction('attendance','readonly');
      const store = tx.objectStore('attendance');
      const idx = store.index('date');
      const range = IDBKeyRange.only(date);
      const list = [];
      const cur = idx.openCursor(range);
      cur.onsuccess = (e) => {
        const c = e.target.result;
        if (c) { list.push(c.value); c.continue(); } else { res(list); }
      };
      cur.onerror = e => rej(e);
    });
  }

  function getAttendanceByMonth(yearMonth){ // 'YYYY-MM'
    return new Promise((res, rej) => {
      const tx = db.transaction('attendance','readonly');
      const store = tx.objectStore('attendance');
      const list = [];
      const cur = store.openCursor();
      cur.onsuccess = (e) => {
        const c = e.target.result;
        if (c) {
          if (c.value.date.startsWith(yearMonth)) list.push(c.value);
          c.continue();
        } else res(list);
      };
      cur.onerror = e => rej(e);
    });
  }

  return {
    open, deleteDatabase, addStaff, updateStaff, getAllStaff, getStaffByCode,
    addAttendance, getAttendanceByDate, getAttendanceByMonth
  };
})();
