import { registerPlugin, WebPlugin } from '@capacitor/core';

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

export class BluetoothClassicWeb extends WebPlugin implements BluetoothClassicPluginInterface {
  async listDevices(): Promise<{ devices: BluetoothClassicDevice[] }> {
    console.info('[BluetoothClassicWeb] listDevices fallback');
    return { devices: [] };
  }

  async connect(options: { address: string }): Promise<{ success: boolean; name: string; address: string }> {
    console.info('[BluetoothClassicWeb] connect fallback for:', options.address);
    return { success: true, name: 'Thermal Printer', address: options.address };
  }

  async write(options: { bytes: number[] }): Promise<{ success: boolean }> {
    console.info(`[BluetoothClassicWeb] write fallback: ${options.bytes.length} bytes`);
    return { success: true };
  }

  async printEscPos(options: { bytes: number[] }): Promise<{ success: boolean }> {
    return this.write(options);
  }

  async disconnect(): Promise<{ success: boolean }> {
    console.info('[BluetoothClassicWeb] disconnect fallback');
    return { success: true };
  }
}

export const BluetoothClassicPlugin = registerPlugin<BluetoothClassicPluginInterface>('BluetoothClassicPlugin', {
  web: () => new BluetoothClassicWeb(),
});

