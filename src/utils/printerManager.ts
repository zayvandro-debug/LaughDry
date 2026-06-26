/**
 * Re-export PrinterManager from src/lib/printerManager to avoid duplication
 * and maintain seamless backwards compatibility.
 */

export { 
  GlobalPrinterManager, 
  ESCPosGenerator, 
  ESC_POS_COMMANDS 
} from '../lib/printerManager';

export {
  BluetoothManager,
  GlobalBluetoothManager
} from '../lib/bluetoothManager';

export type { ConnectionType, PaperSize } from '../lib/bluetoothManager';
export type { PrinterDevice } from '../lib/printerManager';
