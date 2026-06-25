/**
 * Global Bluetooth Printer Manager and Store for LaughDry POS
 */

import { registerPlugin, Capacitor } from '@capacitor/core';
import { BleClient } from '@capacitor-community/bluetooth-le';
import { useState, useEffect } from 'react';

export interface BluetoothPrinterPluginInterface {
  getAvailability(): Promise<{ available: boolean; enabled: boolean }>;
  requestBluetoothPermissions(): Promise<{ requested: boolean; hasConnectPermission: boolean; hasScanPermission: boolean }>;
  getPairedDevices(): Promise<{ devices: Array<{ name: string; address: string; paired: boolean }> }>;
  startScan(): Promise<{ devices: Array<{ name: string; address: string; paired: boolean }> }>;
  connect(options: { address: string }): Promise<{ success: boolean; name: string; address: string }>;
  print(options: { text: string }): Promise<void>;
  printRaw(options: { base64: string }): Promise<void>;
  disconnect(): Promise<{ success: boolean }>;
}

const BluetoothPrinter = registerPlugin<BluetoothPrinterPluginInterface>('BluetoothPrinter');

export const NativeBluetooth = {
  isAndroid: () => {
    return typeof Capacitor !== 'undefined' && Capacitor.getPlatform() === 'android';
  },
  
  getAvailability: async () => {
    if (NativeBluetooth.isAndroid()) {
      try {
        return await BluetoothPrinter.getAvailability();
      } catch (e) {
        console.error("Native getAvailability failed:", e);
        return { available: false, enabled: false };
      }
    }
    return { available: false, enabled: false };
  },

  requestBluetoothPermissions: async () => {
    if (NativeBluetooth.isAndroid()) {
      try {
        return await BluetoothPrinter.requestBluetoothPermissions();
      } catch (e) {
        console.error("Native requestBluetoothPermissions failed:", e);
        return { requested: false, hasConnectPermission: false, hasScanPermission: false };
      }
    }
    return { requested: false, hasConnectPermission: true, hasScanPermission: true };
  },

  getPairedDevices: async () => {
    if (NativeBluetooth.isAndroid()) {
      try {
        const result = await BluetoothPrinter.getPairedDevices();
        return result.devices || [];
      } catch (e) {
        console.error("Native getPairedDevices failed:", e);
        return [];
      }
    }
    return [];
  },

  startScan: async () => {
    if (NativeBluetooth.isAndroid()) {
      try {
        const result = await BluetoothPrinter.startScan();
        return result.devices || [];
      } catch (e) {
        console.error("Native startScan failed:", e);
        return [];
      }
    }
    return [];
  },

  connect: async (address: string) => {
    if (NativeBluetooth.isAndroid()) {
      try {
        console.log(`[BLUETOOTH_NATIVE] Menghubungkan ke alamat MAC: ${address}`);
        const res = await BluetoothPrinter.connect({ address });
        console.log(`[BLUETOOTH_NATIVE] Hasil koneksi:`, res);
        return res;
      } catch (e: any) {
        console.error(`[BLUETOOTH_NATIVE] Gagal menghubungkan ke ${address}:`, e);
        throw new Error(e.message || "Koneksi printer gagal");
      }
    }
    throw new Error("Native Bluetooth hanya tersedia di perangkat Android");
  },

  print: async (text: string) => {
    if (NativeBluetooth.isAndroid()) {
      try {
        await BluetoothPrinter.print({ text });
        return true;
      } catch (e: any) {
        throw new Error(e.message || "Pencetakan gagal");
      }
    }
    throw new Error("Native Bluetooth hanya tersedia di perangkat Android");
  },

  printRaw: async (base64: string) => {
    if (NativeBluetooth.isAndroid()) {
      try {
        await BluetoothPrinter.printRaw({ base64 });
        return true;
      } catch (e: any) {
        throw new Error(e.message || "Pencetakan ESC/POS gagal");
      }
    }
    throw new Error("Native Bluetooth hanya tersedia di perangkat Android");
  },

  disconnect: async () => {
    if (NativeBluetooth.isAndroid()) {
      try {
        return await BluetoothPrinter.disconnect();
      } catch (e) {
        console.error("Native disconnect failed:", e);
      }
    }
    return { success: true };
  }
};

type Listener = () => void;

class BluetoothManagerStore {
  private listeners = new Set<Listener>();

  public isPrinterConnected = localStorage.getItem('laughdry_printer_connected') === 'true';
  public connectedPrinterName = localStorage.getItem('laughdry_printer_name') || '';
  public isBlePrinter = localStorage.getItem('laughdry_printer_is_ble') === 'true';
  public bleDeviceAddress = localStorage.getItem('laughdry_printer_address') || '';
  
  // Web Bluetooth characteristic instance (kept globally alive!)
  public bluetoothCharacteristic: any = null;

  constructor() {
    // Keep reference alive across console swaps
    console.log("[BLUETOOTH_STORE] Menginisialisasi Global Bluetooth Store. Status Terhubung:", this.isPrinterConnected);
  }

  public subscribe(listener: Listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach(l => {
      try { l(); } catch (e) { console.error(e); }
    });
  }

  public setConnectionState(
    connected: boolean,
    name: string,
    isBle: boolean = false,
    address: string = '',
    characteristic: any = null
  ) {
    console.log(`[BLUETOOTH_STORE] Memperbarui status koneksi:`, { connected, name, isBle, address });
    this.isPrinterConnected = connected;
    this.connectedPrinterName = name;
    this.isBlePrinter = isBle;
    this.bleDeviceAddress = address;
    if (characteristic) {
      this.bluetoothCharacteristic = characteristic;
    }

    if (connected) {
      localStorage.setItem('laughdry_printer_connected', 'true');
      localStorage.setItem('laughdry_printer_name', name);
      localStorage.setItem('laughdry_printer_is_ble', isBle ? 'true' : 'false');
      localStorage.setItem('laughdry_printer_address', address);
    } else {
      localStorage.setItem('laughdry_printer_connected', 'false');
      localStorage.removeItem('laughdry_printer_name');
      localStorage.removeItem('laughdry_printer_is_ble');
      localStorage.removeItem('laughdry_printer_address');
      this.bluetoothCharacteristic = null;
    }
    this.notify();
  }

  public async disconnect() {
    console.log("[BLUETOOTH_STORE] Memutuskan hubungan printer bluetooth...");
    try {
      if (this.isBlePrinter && this.bleDeviceAddress) {
        await BleClient.disconnect(this.bleDeviceAddress);
      } else if (NativeBluetooth.isAndroid()) {
        await NativeBluetooth.disconnect();
      }
    } catch (e) {
      console.warn("Disconnect error:", e);
    } finally {
      this.setConnectionState(false, '', false, '', null);
    }
  }
}

export const GlobalBluetoothManager = new BluetoothManagerStore();

export function useBluetoothPrinter() {
  const [isPrinterConnected, setIsPrinterConnected] = useState(GlobalBluetoothManager.isPrinterConnected);
  const [connectedPrinterName, setConnectedPrinterName] = useState(GlobalBluetoothManager.connectedPrinterName);
  const [isBlePrinter, setIsBlePrinter] = useState(GlobalBluetoothManager.isBlePrinter);
  const [bleDeviceAddress, setBleDeviceAddress] = useState(GlobalBluetoothManager.bleDeviceAddress);
  const [bluetoothCharacteristic, setBluetoothCharacteristic] = useState<any>(GlobalBluetoothManager.bluetoothCharacteristic);

  useEffect(() => {
    const unsubscribe = GlobalBluetoothManager.subscribe(() => {
      setIsPrinterConnected(GlobalBluetoothManager.isPrinterConnected);
      setConnectedPrinterName(GlobalBluetoothManager.connectedPrinterName);
      setIsBlePrinter(GlobalBluetoothManager.isBlePrinter);
      setBleDeviceAddress(GlobalBluetoothManager.bleDeviceAddress);
      setBluetoothCharacteristic(GlobalBluetoothManager.bluetoothCharacteristic);
    });
    return unsubscribe;
  }, []);

  return {
    isPrinterConnected,
    connectedPrinterName,
    isBlePrinter,
    bleDeviceAddress,
    bluetoothCharacteristic,
    setConnectionState: (connected: boolean, name: string, isBle: boolean = false, address: string = '', char: any = null) => {
      GlobalBluetoothManager.setConnectionState(connected, name, isBle, address, char);
    },
    disconnect: () => GlobalBluetoothManager.disconnect()
  };
}
