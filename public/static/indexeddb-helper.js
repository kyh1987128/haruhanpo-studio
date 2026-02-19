/**
 * IndexedDB Helper - SlideDB v1.0
 * localStorage base64 이미지의 QuotaExceededError 문제를 해결하기 위한
 * IndexedDB 기반 슬라이드 저장소
 *
 * DB: MarketingHubDB, Store: slideCollection, Version: 1
 */
(function () {
  'use strict';

  var DB_NAME = 'MarketingHubDB';
  var STORE_NAME = 'slideCollection';
  var DB_VERSION = 1;
  var _db = null;

  /**
   * slideData 스키마:
   * {
   *   id: string,          // 고유 ID
   *   source: string,      // 출처 (image-search, ai-gen, thumbnail, card-news, etc.)
   *   label: string,       // 라벨/제목
   *   imageData: string,   // base64 이미지 데이터
   *   thumbnail: string,   // 축소 썸네일 (옵션)
   *   createdAt: number,   // 생성 timestamp
   *   updatedAt: number,   // 수정 timestamp
   *   // 카드뉴스 전용 필드 (옵션)
   *   groupId: string,
   *   groupName: string,
   *   groupOrder: number,
   *   groupTotal: number,
   *   role: string
   * }
   */

  window.SlideDB = {
    open: open,
    getAll: getAll,
    get: get,
    add: add,
    update: update,
    delete: deleteItem,
    clear: clear,
    count: count,
    migrateFromLocalStorage: migrateFromLocalStorage
  };

  /** DB 열기 (싱글턴) */
  function open() {
    return new Promise(function (resolve, reject) {
      if (_db) { resolve(_db); return; }

      if (!window.indexedDB) {
        console.warn('[SlideDB] IndexedDB 미지원 — localStorage 폴백');
        reject(new Error('IndexedDB not supported'));
        return;
      }

      var req = indexedDB.open(DB_NAME, DB_VERSION);

      req.onupgradeneeded = function (e) {
        var db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          var store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('source', 'source', { unique: false });
          store.createIndex('createdAt', 'createdAt', { unique: false });
          store.createIndex('groupId', 'groupId', { unique: false });
        }
      };

      req.onsuccess = function (e) {
        _db = e.target.result;

        // DB 연결 종료 시 재연결 허용
        _db.onclose = function () { _db = null; };

        console.log('[SlideDB] DB 열기 성공');
        resolve(_db);
      };

      req.onerror = function (e) {
        console.error('[SlideDB] DB 열기 실패:', e.target.error);
        reject(e.target.error);
      };
    });
  }

  /** 모든 슬라이드 가져오기 (createdAt 순) */
  function getAll() {
    return open().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(STORE_NAME, 'readonly');
        var store = tx.objectStore(STORE_NAME);
        var req = store.getAll();
        req.onsuccess = function () {
          var items = req.result || [];
          items.sort(function (a, b) { return (a.createdAt || 0) - (b.createdAt || 0); });
          resolve(items);
        };
        req.onerror = function () { reject(req.error); };
      });
    });
  }

  /** 단일 슬라이드 가져오기 */
  function get(id) {
    return open().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(STORE_NAME, 'readonly');
        var store = tx.objectStore(STORE_NAME);
        var req = store.get(id);
        req.onsuccess = function () { resolve(req.result || null); };
        req.onerror = function () { reject(req.error); };
      });
    });
  }

  /** 슬라이드 추가 */
  function add(slideData) {
    var now = Date.now();
    var item = Object.assign({}, slideData, {
      id: slideData.id || (now + '_' + Math.random().toString(36).substring(2, 8)),
      createdAt: slideData.createdAt || now,
      updatedAt: now
    });

    return open().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(STORE_NAME, 'readwrite');
        var store = tx.objectStore(STORE_NAME);
        var req = store.put(item);
        req.onsuccess = function () { resolve(item); };
        req.onerror = function () { reject(req.error); };
      });
    });
  }

  /** 슬라이드 업데이트 */
  function update(id, changes) {
    return get(id).then(function (existing) {
      if (!existing) throw new Error('슬라이드를 찾을 수 없습니다: ' + id);
      var updated = Object.assign({}, existing, changes, { updatedAt: Date.now() });
      return open().then(function (db) {
        return new Promise(function (resolve, reject) {
          var tx = db.transaction(STORE_NAME, 'readwrite');
          var store = tx.objectStore(STORE_NAME);
          var req = store.put(updated);
          req.onsuccess = function () { resolve(updated); };
          req.onerror = function () { reject(req.error); };
        });
      });
    });
  }

  /** 슬라이드 삭제 */
  function deleteItem(id) {
    return open().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(STORE_NAME, 'readwrite');
        var store = tx.objectStore(STORE_NAME);
        var req = store.delete(id);
        req.onsuccess = function () { resolve(); };
        req.onerror = function () { reject(req.error); };
      });
    });
  }

  /** 모든 슬라이드 삭제 */
  function clear() {
    return open().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(STORE_NAME, 'readwrite');
        var store = tx.objectStore(STORE_NAME);
        var req = store.clear();
        req.onsuccess = function () { resolve(); };
        req.onerror = function () { reject(req.error); };
      });
    });
  }

  /** 저장된 슬라이드 수 */
  function count() {
    return open().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(STORE_NAME, 'readonly');
        var store = tx.objectStore(STORE_NAME);
        var req = store.count();
        req.onsuccess = function () { resolve(req.result); };
        req.onerror = function () { reject(req.error); };
      });
    });
  }

  /**
   * localStorage → IndexedDB 마이그레이션
   * 첫 로드 시 기존 데이터 이전
   */
  function migrateFromLocalStorage() {
    var LS_KEY = 'slideCollection';
    var MIGRATED_KEY = 'slideDB_migrated';

    // 이미 마이그레이션 완료
    if (localStorage.getItem(MIGRATED_KEY) === 'true') {
      return Promise.resolve(false);
    }

    var raw = localStorage.getItem(LS_KEY);
    if (!raw) {
      localStorage.setItem(MIGRATED_KEY, 'true');
      return Promise.resolve(false);
    }

    var oldSlides;
    try {
      oldSlides = JSON.parse(raw);
    } catch (e) {
      localStorage.setItem(MIGRATED_KEY, 'true');
      return Promise.resolve(false);
    }

    if (!Array.isArray(oldSlides) || oldSlides.length === 0) {
      localStorage.setItem(MIGRATED_KEY, 'true');
      return Promise.resolve(false);
    }

    console.log('[SlideDB] localStorage → IndexedDB 마이그레이션 시작 (' + oldSlides.length + '건)');

    var promises = oldSlides.map(function (s) {
      return add({
        id: s.id || (Date.now() + '_' + Math.random().toString(36).substring(2, 8)),
        source: s.source || 'unknown',
        label: s.title || s.label || '슬라이드',
        imageData: s.image || s.imageData || '',
        thumbnail: s.thumbnail || '',
        createdAt: s.createdAt || Date.now(),
        updatedAt: Date.now(),
        groupId: s.groupId || '',
        groupName: s.groupName || '',
        groupOrder: s.groupOrder || 0,
        groupTotal: s.groupTotal || 0,
        role: s.role || ''
      });
    });

    return Promise.all(promises).then(function () {
      // 마이그레이션 완료 후 localStorage 정리
      localStorage.removeItem(LS_KEY);
      localStorage.setItem(MIGRATED_KEY, 'true');
      console.log('[SlideDB] ✅ 마이그레이션 완료 (' + oldSlides.length + '건)');
      return true;
    }).catch(function (err) {
      console.error('[SlideDB] 마이그레이션 오류:', err);
      return false;
    });
  }

  // 초기화: DB 열기 + 마이그레이션
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      open().then(function () { return migrateFromLocalStorage(); }).catch(function () {});
    });
  } else {
    open().then(function () { return migrateFromLocalStorage(); }).catch(function () {});
  }
})();
