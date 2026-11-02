// 가이드 수집기 공개 API. 다른 프로젝트에서는 이 파일만 import 한다.
//
//   import * as collector from './guide-collector/lib/index.js';
//   await collector.init({ dataDir: '.cache/guides', sources: [...] });
//   const run = await collector.runCheckAndWait();
//   const specs = await collector.exportSpecs();
//
// 소스 형식은 README 「소스 정의」 참고.
export {
  init, loadSources, runCheck, runCheckAndWait, getState, getDoc, readSnapshot, exportSpecs, checkExpect,
  testSource, saveOverride, resetOverride, addCustomSource, removeCustomSource,
  addManualSpec, removeManualSpec, simulateChange, markSeen,
  getSettings, saveSchedule, startScheduler, job, EDITABLE,
} from './tracker.js';
export { extractSpecs, htmlToLines } from './extract.js';
export { diffLines, diffSpecs } from './diff.js';
export { readNotionPage } from './notion.js';
export { chromeAvailable } from './fetchers.js';
export { ocrAvailable } from './ocr.js';
