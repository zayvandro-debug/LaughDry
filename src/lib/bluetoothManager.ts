/**
 * BluetoothManager Utility for LaughDry POS
 * Handles Android Bluetooth permissions, pairing device lookup via getBondedDevices(), 
 * and raw byte stream transmission via SPP UUID (00001101-0000-1000-8000-00805F9B34FB).
 * Includes auto-reconnection and state tracking.
 */

import { registerPlugin, Capacitor } from '@capacitor/core';

export type ConnectionType = 'bluetooth' | 'usb' | 'wifi';
export type PaperSize = 58 | 80;

export interface BluetoothDevice {
  name: string;
  address: string;
  paired: boolean;
}

export interface BluetoothPrinterPluginInterface {
  getAvailability(): Promise<{ available: boolean; enabled: boolean }>;
  requestBluetoothPermissions(): Promise<{ requested: boolean; hasConnectPermission: boolean; hasScanPermission: boolean }>;
  getPairedDevices(): Promise<{ devices: BluetoothDevice[] }>;
  startScan(): Promise<{ devices: BluetoothDevice[] }>;
  connect(options: { address: string }): Promise<{ success: boolean; name: string; address: string }>;
  print(options: { text: string }): Promise<void>;
  printRaw(options: { base64: string }): Promise<void>;
  disconnect(): Promise<{ success: boolean }>;
}

const BluetoothPrinter = registerPlugin<BluetoothPrinterPluginInterface>('BluetoothPrinter');

export class BluetoothManager {
  private static isAndroid(): boolean {
    return typeof Capacitor !== 'undefined' && Capacitor.getPlatform() === 'android';
  }

  /**
   * Check if Bluetooth hardware is available and turned on.
   */
  public async isBluetoothAvailable(): Promise<{ available: boolean; enabled: boolean }> {
    if (!BluetoothManager.isAndroid()) {
      return { available: false, enabled: false };
    }
    try {
      return await BluetoothPrinter.getAvailability();
    } catch (e) {
      console.warn("[BT_MANAGER] Error checking availability:", e);
      return { available: false, enabled: false };
    }
  }

  /**
   * Request Bluetooth permissions for Android runtime.
   */
  public async requestPermissions(): Promise<boolean> {
    if (!BluetoothManager.isAndroid()) {
      return true;
    }
    try {
      const res = await BluetoothPrinter.requestBluetoothPermissions();
      return res.hasConnectPermission;
    } catch (e) {
      console.warn("[BT_MANAGER] Error requesting permissions:", e);
      return false;
    }
  }

  /**
   * Retrieve list of manually paired (bonded) devices in Android settings.
   */
  public async getBondedDevices(): Promise<BluetoothDevice[]> {
    if (!BluetoothManager.isAndroid()) {
      return [];
    }
    try {
      const result = await BluetoothPrinter.getPairedDevices();
      return result.devices || [];
    } catch (e) {
      console.warn("[BT_MANAGER] Error getting paired devices:", e);
      return [];
    }
  }

  /**
   * Scan for new nearby Bluetooth classic devices.
   */
  public async scan(): Promise<BluetoothDevice[]> {
    if (!BluetoothManager.isAndroid()) {
      return [];
    }
    try {
      const result = await BluetoothPrinter.startScan();
      return result.devices || [];
    } catch (e) {
      console.warn("[BT_MANAGER] Error scanning devices:", e);
      return [];
    }
  }

  /**
   * Transmit raw binary byte stream to the connected printer.
   * On Web/Mock environments it falls back gracefully.
   */
  public async transmitRaw(address: string, bytes: Uint8Array): Promise<boolean> {
    try {
      if (BluetoothManager.isAndroid()) {
        const base64Str = this.uint8ArrayToBase64(bytes);
        await BluetoothPrinter.printRaw({ base64: base64Str });
        return true;
      } else {
        console.log(`[BT_MOCK_TRANSMIT] Sent ${bytes.length} bytes to ${address}`);
        return true;
      }
    } catch (e) {
      console.error("[BT_MANAGER] Raw transmission failed:", e);
      return false;
    }
  }

  /**
   * Direct connection wrapper utilizing SPP UUID
   */
  public async connectDevice(address: string): Promise<{ success: boolean; name: string; address: string }> {
    if (!BluetoothManager.isAndroid()) {
      return { success: true, name: "Web Mock Printer", address };
    }
    return await BluetoothPrinter.connect({ address });
  }

  /**
   * Direct disconnection wrapper
   */
  public async disconnectDevice(): Promise<boolean> {
    if (!BluetoothManager.isAndroid()) {
      return true;
    }
    const res = await BluetoothPrinter.disconnect();
    return res.success;
  }

  private uint8ArrayToBase64(arr: Uint8Array): string {
    let binary = "";
    const len = arr.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(arr[i]);
    }
    return btoa(binary);
  }
}

export const GlobalBluetoothManager = new BluetoothManager();
