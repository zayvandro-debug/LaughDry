package com.laughdry.app

import android.Manifest
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothSocket
import android.content.pm.PackageManager
import android.os.Build
import android.util.Log
import androidx.core.app.ActivityCompat
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import java.io.IOException
import java.io.OutputStream
import java.util.UUID

@CapacitorPlugin(name = "BluetoothClassicPlugin")
class BluetoothClassicPlugin : Plugin() {
    private val sppUuid: UUID = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB")
    private var bluetoothAdapter: BluetoothAdapter? = null
    private var socket: BluetoothSocket? = null
    private var outputStream: OutputStream? = null

    override fun load() {
        bluetoothAdapter = BluetoothAdapter.getDefaultAdapter()
    }

    private fun checkPermission(permission: String): Boolean {
        return ActivityCompat.checkSelfPermission(context, permission) == PackageManager.PERMISSION_GRANTED
    }

    private fun hasRequiredPermissions(): Boolean {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            return checkPermission(Manifest.permission.BLUETOOTH_CONNECT)
        }
        return checkPermission(Manifest.permission.BLUETOOTH)
    }

    @PluginMethod
    fun listDevices(call: PluginCall) {
        if (bluetoothAdapter == null) {
            activity.runOnUiThread {
                call.reject("Bluetooth tidak tersedia di perangkat ini")
            }
            return
        }

        if (!hasRequiredPermissions()) {
            activity.runOnUiThread {
                call.reject("Izin Bluetooth (BLUETOOTH_CONNECT) tidak diberikan")
            }
            return
        }

        try {
            val pairedDevices = bluetoothAdapter!!.bondedDevices
            val devicesArray = JSArray()
            for (device in pairedDevices) {
                val deviceObj = JSObject()
                deviceObj.put("name", device.name ?: "Unknown Device")
                deviceObj.put("address", device.address)
                devicesArray.put(deviceObj)
            }
            val result = JSObject()
            result.put("devices", devicesArray)
            activity.runOnUiThread {
                call.resolve(result)
            }
        } catch (e: Exception) {
            activity.runOnUiThread {
                call.reject("Gagal mengambil daftar perangkat: ${e.message}")
            }
        }
    }

    @PluginMethod
    fun connect(call: PluginCall) {
        val address = call.getString("address")
        if (address == null || address.isEmpty()) {
            activity.runOnUiThread {
                call.reject("Alamat MAC printer tidak boleh kosong")
            }
            return
        }

        if (bluetoothAdapter == null) {
            activity.runOnUiThread {
                call.reject("Bluetooth tidak tersedia")
            }
            return
        }

        if (!hasRequiredPermissions()) {
            activity.runOnUiThread {
                call.reject("Izin Bluetooth tidak diberikan")
            }
            return
        }

        Thread {
            try {
                disconnectInternal()

                val device = bluetoothAdapter!!.getRemoteDevice(address)
                Log.d("BluetoothClassicPlugin", "Mencoba menghubungkan ke: ${device.name ?: "Unknown"} ($address)")

                if (bluetoothAdapter!!.isDiscovering) {
                    bluetoothAdapter!!.cancelDiscovery()
                }

                var connected = false
                var connectionError: Exception? = null

                // Cara 1: Standard SPP Connection
                try {
                    socket = device.createRfcommSocketToServiceRecord(sppUuid)
                    socket!!.connect()
                    connected = true
                    Log.d("BluetoothClassicPlugin", "Koneksi standard berhasil!")
                } catch (e: Exception) {
                    connectionError = e
                    Log.e("BluetoothClassicPlugin", "Koneksi standard gagal: ${e.message}")
                    disconnectInternal()
                }

                // Cara 2: Fallback via reflection (sangat berguna untuk printer thermal China)
                if (!connected) {
                    Log.d("BluetoothClassicPlugin", "Mencoba fallback dengan refleksi...")
                    try {
                        val m = device.javaClass.getMethod("createRfcommSocket", Int::class.javaPrimitiveType)
                        socket = m.invoke(device, 1) as BluetoothSocket
                        socket!!.connect()
                        connected = true
                        Log.d("BluetoothClassicPlugin", "Koneksi fallback berhasil!")
                    } catch (e: Exception) {
                        disconnectInternal()
                        val errMsg = "Koneksi standard gagal: ${connectionError?.message} | Fallback gagal: ${e.message}"
                        Log.e("BluetoothClassicPlugin", "Koneksi gagal total: $errMsg")
                        activity.runOnUiThread {
                            call.reject("Koneksi gagal: $errMsg")
                        }
                        return@Thread
                    }
                }

                outputStream = socket!!.outputStream
                Log.d("BluetoothClassicPlugin", "OutputStream berhasil diperoleh!")

                val res = JSObject()
                res.put("success", true)
                res.put("name", device.name ?: "Thermal Printer")
                res.put("address", address)
                activity.runOnUiThread {
                    call.resolve(res)
                }

            } catch (e: Exception) {
                Log.e("BluetoothClassicPlugin", "Error alur koneksi: ${e.message}")
                activity.runOnUiThread {
                    call.reject("Koneksi gagal karena error: ${e.message}")
                }
            }
        }.start()
    }

    @PluginMethod
    fun write(call: PluginCall) {
        val arr = call.getArray("bytes")
        if (arr == null) {
            activity.runOnUiThread {
                call.reject("Data 'bytes' tidak ditemukan")
            }
            return
        }

        if (outputStream == null) {
            activity.runOnUiThread {
                call.reject("Printer belum terhubung (OutputStream null)")
            }
            return
        }

        Thread {
            try {
                Log.d("BluetoothClassicPlugin", "Memproses array integer bytes untuk dikirim ke printer...")
                val bytes = ByteArray(arr.length())
                for (i in 0 until arr.length()) {
                    bytes[i] = arr.getInt(i).toByte()
                }

                outputStream!!.write(bytes)
                Log.d("PRINT", "Byte dikirim (${bytes.size}): ${bytes.joinToString(",")}")
                
                Thread.sleep(80)
                outputStream!!.flush()
                Thread.sleep(150)
                
                Log.d("BluetoothClassicPlugin", "Berhasil menulis ${bytes.size} byte ke printer!")
                val res = JSObject()
                res.put("success", true)
                activity.runOnUiThread {
                    call.resolve(res)
                }
            } catch (e: Exception) {
                Log.e("BluetoothClassicPlugin", "Gagal menulis data ke printer: ${e.message}")
                activity.runOnUiThread {
                    call.reject("Gagal mencetak: ${e.message}")
                }
            }
        }.start()
    }

    @PluginMethod
    fun printEscPos(call: PluginCall) {
        write(call)
    }

    @PluginMethod
    fun disconnect(call: PluginCall) {
        Thread {
            try {
                disconnectInternal()
                val res = JSObject()
                res.put("success", true)
                activity.runOnUiThread {
                    call.resolve(res)
                }
            } catch (e: Exception) {
                activity.runOnUiThread {
                    call.reject("Gagal memutuskan koneksi: ${e.message}")
                }
            }
        }.start()
    }

    private fun disconnectInternal() {
        try {
            // Berikan waktu jeda agar data buffer terakhir selesai terkirim lewat udara sebelum socket ditutup
            Thread.sleep(1500)
        } catch (e: InterruptedException) {
            Log.e("BluetoothClassicPlugin", "Sleep terinterupsi: ${e.message}")
        }

        try {
            outputStream?.close()
        } catch (e: IOException) {
            Log.e("BluetoothClassicPlugin", "Gagal menutup output stream: ${e.message}")
        } finally {
            outputStream = null
        }

        try {
            socket?.close()
        } catch (e: IOException) {
            Log.e("BluetoothClassicPlugin", "Gagal menutup socket: ${e.message}")
        } finally {
            socket = null
        }
    }
}
