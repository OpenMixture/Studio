import { encodePng } from '../src/png';
import { loadRuntime } from '@openmixture/runtime';

// Only the browser-test build includes this page. It exercises the installed public entry.
declare global {
  interface Window {
    mixtureContract: { loadRuntime: typeof loadRuntime; encodePng: typeof encodePng };
  }
}
window.mixtureContract = { loadRuntime, encodePng };
