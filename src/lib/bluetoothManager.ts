/**
 * BluetoothManager Utility for LaughDry POS
 * Handles Android Bluetooth permissions, pairing device lookup via listDevices(), 
 * and raw byte stream transmission via SPP.
 * Consolidated to use BluetoothClassicPlugin exclusively.
 */

import { Capacitor } from '@capacitor/core';
import { BluetoothClassicPlugin } from './bluetoothPlugin';

export type ConnectionType = 'bluetooth' | 'usb' | 'wifi';
export type PaperSize = 58 | 80;

export interface BluetoothDevice {
  name: string;
  address: string;
  paired: boolean;
}

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
      await BluetoothClassicPlugin.listDevices();
      return { available: true, enabled: true };
    } catch (e: any) {
      console.warn("[BT_MANAGER] Error checking availability:", e);
      const msg = (e.message || "").toLowerCase();
      if (msg.includes("tidak tersedia") || msg.includes("not available")) {
        return { available: false, enabled: false };
      }
      return { available: true, enabled: false };
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
      // Trigger a call that requires permissions to prompt user if needed, or simply return true 
      // as our Kotlin plugin performs run-time permission checks of BLUETOOTH_CONNECT automatically.
      await BluetoothClassicPlugin.listDevices();
      return true;
    } catch (e) {
      console.warn("[BT_MANAGER] Error pre-checking permissions:", e);
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
      const result = await BluetoothClassicPlugin.listDevices();
      return (result.devices || []).map(d => ({ name: d.name, address: d.address, paired: true }));
    } catch (e) {
      console.warn("[BT_MANAGER] Error getting paired devices via BluetoothClassicPlugin:", e);
      return [];
    }
  }

  /**
   * Scan for nearby Bluetooth classic devices.
   */
  public async scan(): Promise<BluetoothDevice[]> {
    // For classic thermal printing, bonded/paired devices are always preferred.
    return await this.getBondedDevices();
  }

  /**
   * Transmit raw binary byte stream to the connected printer.
   * On Web/Mock environments it falls back gracefully.
   */
  public async transmitRaw(address: string, bytes: Uint8Array): Promise<boolean> {
    try {
      if (BluetoothManager.isAndroid()) {
        const intArray = Array.from(bytes);
        await BluetoothClassicPlugin.write({ bytes: intArray });
        return true;
      } else {
        console.log(`[BT_MOCK_TRANSMIT] Sent ${bytes.length} bytes to ${address}`);
        return true;
      }
    } catch (e) {
      console.error("[BT_MANAGER] Raw transmission failed via BluetoothClassicPlugin:", e);
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
    try {
      const result = await BluetoothClassicPlugin.connect({ address });
      return { success: result.success, name: result.name, address: result.address };
    } catch (e) {
      console.error("[BT_MANAGER] Error connecting via BluetoothClassicPlugin:", e);
      throw e;
    }
  }

  /**
   * Direct disconnection wrapper
   */
  public async disconnectDevice(): Promise<boolean> {
    if (!BluetoothManager.isAndroid()) {
      return true;
    }
    try {
      const res = await BluetoothClassicPlugin.disconnect();
      return res.success;
    } catch (e) {
      console.error("[BT_MANAGER] Error disconnecting via BluetoothClassicPlugin:", e);
      return false;
    }
  }
}

export const GlobalBluetoothManager = new BluetoothManager();
