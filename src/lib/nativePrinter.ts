import { registerPlugin } from '@capacitor/core';

export interface BluetoothDevice {
  name: string;
  address: string;
  id: string;
  class?: number;
}

export interface BluetoothSerialPlugin {
  isEnabled(): Promise<{ enabled: boolean }>;
  enable(): Promise<void>;
  showSettings(): Promise<void>;
  list(): Promise<{ devices: BluetoothDevice[] }>;
  connect(options: { address: string }): Promise<void>;
  disconnect(): Promise<void>;
  write(options: { value: string; address?: string }): Promise<void>;
}

export const BluetoothSerial = registerPlugin<BluetoothSerialPlugin>('BluetoothSerial');

/**
 * Converts a Uint8Array to a binary string (latin1) to preserve exact byte values
 * when transmitted through Javascript string parameters.
 */
function uint8ArrayToBinaryString(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return binary;
}

/**
 * Prints raw ESC/POS command bytes to the specified MAC address using the
 * capacitor-bluetooth-serial plugin natively on Android.
 * 
 * @param macAddress MAC address of the paired Bluetooth thermal printer
 * @param data Pre-compiled raw ESC/POS byte commands
 */
export async function printRawBytes(macAddress: string, data: Uint8Array): Promise<void> {
  console.log(`[NATIVE_PRINTER] Mulai pencetakan native ke printer MAC: ${macAddress}, ukuran: ${data.length} bytes`);
  try {
    // Connect to the target Bluetooth Classic SPP device
    await BluetoothSerial.connect({ address: macAddress });
    
    // Convert pre-compiled ESC/POS binary data to standard binary string representation
    const binaryStr = uint8ArrayToBinaryString(data);
    
    // Send raw bytes directly through serial channel
    await BluetoothSerial.write({ address: macAddress, value: binaryStr });
    
    // Hold connection briefly to guarantee buffer delivery
    await new Promise((resolve) => setTimeout(resolve, 800));
    
    // Cleanly close serial channel
    await BluetoothSerial.disconnect();
    console.log("[NATIVE_PRINTER] Pengiriman perintah ESC/POS ke printer thermal selesai.");
  } catch (err: any) {
    console.error("[NATIVE_PRINTER] Gagal melakukan pencetakan Bluetooth serial native:", err);
    throw err;
  }
}
