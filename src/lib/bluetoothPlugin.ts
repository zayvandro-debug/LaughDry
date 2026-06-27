import { registerPlugin } from '@capacitor/core';

export interface BluetoothClassicDevice {
  name: string;
  address: string;
}

export interface BluetoothClassicPluginInterface {
  listDevices(): Promise<{ devices: BluetoothClassicDevice[] }>;
  connect(options: { address: string }): Promise<{ success: boolean; name: string; address: string }>;
  write(options: { bytes: number[] }): Promise<{ success: boolean }>;
  printEscPos(options: { bytes: number[] }): Promise<{ success: boolean }>;
  disconnect(): Promise<{ success: boolean }>;
}

export const BluetoothClassicPlugin = registerPlugin<BluetoothClassicPluginInterface>('BluetoothClassicPlugin');
