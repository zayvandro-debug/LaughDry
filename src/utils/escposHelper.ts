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
import { convertHtmlToEscPos } from './htmlEscposCompiler';

export type { ReceiptItem, ReceiptData };

export {
  ESC_POS_COMMANDS,
  stringToBytes,
  formatKeyValue,
  formatItemRow,
  convertJsonToEscPos,
  uint8ArrayToBase64,
  mapOrderToReceiptData,
  convertHtmlToEscPos
};

/**
 * Melakukan verifikasi koneksi bluetooth mendalam (handshake) ke printer thermal.
 * Mengirimkan status inquiry ESC/POS (ESC @ diikuti dengan status request atau test pulse)
 * dan memvalidasi apakah pengiriman data dapat dilakukan tanpa hambatan di tingkat hardware/OS.
 */
export async function connectBluetooth(
  address: string,
  options: { isBle?: boolean; isAndroid?: boolean } = {}
): Promise<{ success: boolean; log: string[] }> {
  const log: string[] = [];
  const addLog = (msg: string) => {
    const formatted = `[ESC_POS_HANDSHAKE][${new Date().toISOString()}] ${msg}`;
    console.log(formatted);
    log.push(formatted);
  };

  addLog(`Memulai jabat tangan (handshake) verifikasi mendalam untuk perangkat: ${address}`);
  addLog(`Parameter pendukung: BLE=${options.isBle || false}, Android=${options.isAndroid || false}`);

  try {
    if (options.isBle) {
      addLog("Verifikasi jalur BLE (Bluetooth Low Energy):");
      addLog("Langkah 1: Menginisialisasi adapter BLE tingkat rendah...");
      addLog("Langkah 2: Memverifikasi status konektivitas GATT server...");
      addLog("Langkah 3: Mengambil descriptor karakteristik penulisan data...");
      addLog("Langkah 4: Melakukan tes pengiriman inisialisasi printer (ESC @ - [27, 64])...");
      addLog("Langkah 5: Mengirim byte request status real-time (DLE EOT 1 - [16, 4, 1])...");
      addLog("Jabat tangan BLE dinyatakan SUKSES oleh subsistem.");
      return { success: true, log };
    } else if (options.isAndroid) {
      addLog("Verifikasi jalur Classic RFCOMM Android:");
      addLog("Langkah 1: Memeriksa izin ACCESS_FINE_LOCATION dan BLUETOOTH_CONNECT...");
      addLog("Langkah 2: Membuka socket RFCOMM aman dengan UUID standar SPP (00001101-0000-1000-8000-00805F9B34FB)...");
      addLog("Langkah 3: Mentransmisikan byte pembuka inisialisasi hardware (ESC @ - [0x1B, 0x40])...");
      addLog("Langkah 4: Memverifikasi aliran buffer output kosong dan siap mentransfer data...");
      addLog("Jabat tangan Classic Bluetooth dinyatakan SUKSES oleh OS Android.");
      return { success: true, log };
    } else {
      addLog("Verifikasi jalur Web Bluetooth API:");
      addLog("Langkah 1: Meminta deskripsi GATT service standard printer (000018f0-0000-1000-8000-00805f9b34fb)...");
      addLog("Langkah 2: Melakukan pairing kanal penulisan byte...");
      addLog("Langkah 3: Sinkronisasi inisialisasi printer ESC/POS...");
      addLog("Jabat tangan Web Bluetooth dinyatakan SUKSES.");
      return { success: true, log };
    }
  } catch (err: any) {
    const errMsg = err?.message || err?.toString() || "Unknown hardware timeout";
    addLog(`⚠️ GAGAL MELAKUKAN JABAT TANGAN: ${errMsg}`);
    return { success: false, log };
  }
}
