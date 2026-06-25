/**
 * ESC/POS Command Helper Utility for 58mm Thermal Printers
 * Re-exports or implements functions from escPosGenerator for backwards compatibility and user requests.
 */

import {
  ReceiptItem,
  ReceiptData,
  ESC_POS_COMMANDS,
  stringToBytes,
  formatKeyValue,
  formatItemRow,
  convertJsonToEscPos,
  uint8ArrayToBase64,
  mapOrderToReceiptData
} from './escPosGenerator';

export type { ReceiptItem, ReceiptData };

export {
  ESC_POS_COMMANDS,
  stringToBytes,
  formatKeyValue,
  formatItemRow,
  convertJsonToEscPos,
  uint8ArrayToBase64,
  mapOrderToReceiptData
};
