import { 
  collection as originalCollection, 
  doc as originalDoc, 
  setDoc as originalSetDoc, 
  getDoc as originalGetDoc, 
  getDocs as originalGetDocs, 
  updateDoc as originalUpdateDoc, 
  deleteDoc as originalDeleteDoc, 
  query as originalQuery, 
  where as originalWhere, 
  orderBy as originalOrderBy,
  onSnapshot as originalOnSnapshot
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType, sanitizeFirestoreData } from '../lib/firebase';
import { Order, OrderStatus, Customer, Service, Expense, Branch, SystemSettings, AttendanceRecord, User, PushNotification } from '../types';

const isOffline = () => {
  if (typeof window === 'undefined') return true;
  if (localStorage.getItem('laughdry_firebase_disabled') === 'true') return true;
  const uid = auth.currentUser?.uid || localStorage.getItem('laughdry_firebase_uid') || 'default';
  if (uid === 'default') return true;
  return false;
};

const collection = (...args: any[]) => {
  if (isOffline()) return {} as any;
  return (originalCollection as any)(...args);
};

const doc = (...args: any[]) => {
  if (isOffline()) return {} as any;
  return (originalDoc as any)(...args);
};

const query = (...args: any[]) => {
  if (isOffline()) return {} as any;
  return (originalQuery as any)(...args);
};

const where = (...args: any[]) => {
  if (isOffline()) return {} as any;
  return (originalWhere as any)(...args);
};

const orderBy = (...args: any[]) => {
  if (isOffline()) return {} as any;
  return (originalOrderBy as any)(...args);
};

const setDoc = async (...args: any[]) => {
  if (isOffline()) return;
  return (originalSetDoc as any)(...args);
};

const getDoc = async (...args: any[]) => {
  if (isOffline()) return { exists: () => false, data: () => null } as any;
  return (originalGetDoc as any)(...args);
};

const getDocs = async (...args: any[]) => {
  if (isOffline()) return { forEach: () => {} } as any;
  return (originalGetDocs as any)(...args);
};

const updateDoc = async (...args: any[]) => {
  if (isOffline()) return;
  return (originalUpdateDoc as any)(...args);
};

const deleteDoc = async (...args: any[]) => {
  if (isOffline()) return;
  return (originalDeleteDoc as any)(...args);
};

const onSnapshot = (...args: any[]) => {
  if (isOffline()) {
    return () => {};
  }
  return (originalOnSnapshot as any)(...args);
};

function getUserIdPath(): string {
  const sharedDbId = localStorage.getItem('laughdry_shared_database_id');
  if (sharedDbId && sharedDbId.trim() !== '') {
    return `users_db/${sharedDbId.trim()}`;
  }
  const uid = auth.currentUser?.uid || localStorage.getItem('laughdry_firebase_uid') || 'default';
  return `users_db/${uid}`;
}

export class LaundryService {
  /**
   * Add a new order or update an existing one in Firestore
   */
  static async addOrder(order: Order): Promise<void> {
    const parent = getUserIdPath();
    const path = `${parent}/orders/${order.id}`;
    try {
      const sanitizedData = sanitizeFirestoreData({
        ...order,
        updatedAt: new Date().toISOString()
      });
      await setDoc(doc(db, parent, 'orders', order.id), sanitizedData);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }

  /**
   * Update order status in Firestore and log the update details
   */
  static async updateOrderStatus(orderId: string, status: OrderStatus): Promise<void> {
    const parent = getUserIdPath();
    const path = `${parent}/orders/${orderId}`;
    try {
      const orderRef = doc(db, parent, 'orders', orderId);
      await updateDoc(orderRef, {
        status,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  }

  /**
   * Fetch orders from Firestore
   */
  static async getOrders(): Promise<Order[]> {
    const parent = getUserIdPath();
    const path = `${parent}/orders`;
    try {
      const q = query(collection(db, parent, 'orders'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const orders: Order[] = [];
      snapshot.forEach((doc) => {
        orders.push(doc.data() as Order);
      });
      return orders;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
      return [];
    }
  }

  /**
   * Fetch services from Firestore
   */
  static async getServices(): Promise<Service[]> {
    const parent = getUserIdPath();
    const path = `${parent}/services`;
    try {
      const snapshot = await getDocs(collection(db, parent, 'services'));
      const services: Service[] = [];
      snapshot.forEach((doc) => {
        services.push(doc.data() as Service);
      });
      return services;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
      return [];
    }
  }

  /**
   * Save a service to Firestore
   */
  static async saveService(service: Service): Promise<void> {
    const parent = getUserIdPath();
    const path = `${parent}/services/${service.id}`;
    try {
      await setDoc(doc(db, parent, 'services', service.id), sanitizeFirestoreData(service));
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }

  /**
   * Fetch customers from Firestore
   */
  static async getCustomers(): Promise<Customer[]> {
    const parent = getUserIdPath();
    const path = `${parent}/customers`;
    try {
      const snapshot = await getDocs(collection(db, parent, 'customers'));
      const customers: Customer[] = [];
      snapshot.forEach((doc) => {
        customers.push(doc.data() as Customer);
      });
      return customers;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
      return [];
    }
  }

  /**
   * Save a customer to Firestore
   */
  static async saveCustomer(customer: Customer): Promise<void> {
    const parent = getUserIdPath();
    const path = `${parent}/customers/${customer.id}`;
    try {
      await setDoc(doc(db, parent, 'customers', customer.id), sanitizeFirestoreData(customer));
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }

  /**
   * Delete a customer from Firestore
   */
  static async deleteCustomer(customerId: string): Promise<void> {
    const parent = getUserIdPath();
    const path = `${parent}/customers/${customerId}`;
    try {
      await deleteDoc(doc(db, parent, 'customers', customerId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  }

  /**
   * Delete an order from Firestore
   */
  static async deleteOrder(orderId: string): Promise<void> {
    const parent = getUserIdPath();
    const path = `${parent}/orders/${orderId}`;
    try {
      await deleteDoc(doc(db, parent, 'orders', orderId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  }

  /**
   * Delete a service from Firestore
   */
  static async deleteService(serviceId: string): Promise<void> {
    const parent = getUserIdPath();
    const path = `${parent}/services/${serviceId}`;
    try {
      await deleteDoc(doc(db, parent, 'services', serviceId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  }

  /**
   * Delete a branch from Firestore
   */
  static async deleteBranch(branchId: string): Promise<void> {
    const parent = getUserIdPath();
    const path = `${parent}/branches/${branchId}`;
    try {
      await deleteDoc(doc(db, parent, 'branches', branchId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  }

  /**
   * Fetch expenses from Firestore
   */
  static async getExpenses(): Promise<Expense[]> {
    const parent = getUserIdPath();
    const path = `${parent}/expenses`;
    try {
      const snapshot = await getDocs(collection(db, parent, 'expenses'));
      const expenses: Expense[] = [];
      snapshot.forEach((doc) => {
        expenses.push(doc.data() as Expense);
      });
      return expenses;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
      return [];
    }
  }

  /**
   * Save an expense to Firestore
   */
  static async saveExpense(expense: Expense): Promise<void> {
    const parent = getUserIdPath();
    const path = `${parent}/expenses/${expense.id}`;
    try {
      await setDoc(doc(db, parent, 'expenses', expense.id), sanitizeFirestoreData(expense));
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }

  /**
   * Delete an expense from Firestore
   */
  static async deleteExpense(expenseId: string): Promise<void> {
    const parent = getUserIdPath();
    const path = `${parent}/expenses/${expenseId}`;
    try {
      await deleteDoc(doc(db, parent, 'expenses', expenseId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  }

  /**
   * Fetch branches from Firestore
   */
  static async getBranches(): Promise<Branch[]> {
    const parent = getUserIdPath();
    const path = `${parent}/branches`;
    try {
      const snapshot = await getDocs(collection(db, parent, 'branches'));
      const branches: Branch[] = [];
      snapshot.forEach((doc) => {
        branches.push(doc.data() as Branch);
      });
      return branches;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
      return [];
    }
  }

  /**
   * Save a branch to Firestore
   */
  static async saveBranch(branch: Branch): Promise<void> {
    const parent = getUserIdPath();
    const path = `${parent}/branches/${branch.id}`;
    try {
      await setDoc(doc(db, parent, 'branches', branch.id), sanitizeFirestoreData(branch));
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }

  /**
   * Fetch settings from Firestore
   */
  static async getSettings(): Promise<SystemSettings | null> {
    const parent = getUserIdPath();
    const path = `${parent}/settings/system`;
    try {
      const docSnap = await getDoc(doc(db, parent, 'settings', 'system'));
      if (docSnap.exists()) {
        return docSnap.data() as SystemSettings;
      }
      return null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
      return null;
    }
  }

  /**
   * Save settings to Firestore
   */
  static async saveSettings(settings: SystemSettings): Promise<void> {
    const parent = getUserIdPath();
    const path = `${parent}/settings/system`;
    try {
      await setDoc(doc(db, parent, 'settings', 'system'), sanitizeFirestoreData(settings));
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }

  /**
   * Fetch users from Firestore
   */
  static async getFirestoreUsers(): Promise<User[]> {
    const parent = getUserIdPath();
    const path = `${parent}/users`;
    try {
      const snapshot = await getDocs(collection(db, parent, 'users'));
      const users: User[] = [];
      snapshot.forEach((doc) => {
        users.push(doc.data() as User);
      });
      return users;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
      return [];
    }
  }

  /**
   * Save a user to Firestore
   */
  static async saveFirestoreUser(user: User): Promise<void> {
    const parent = getUserIdPath();
    const path = `${parent}/users/${user.id}`;
    try {
      await setDoc(doc(db, parent, 'users', user.id), sanitizeFirestoreData(user));
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }

  /**
   * Delete a user from Firestore
   */
  static async deleteFirestoreUser(userId: string): Promise<void> {
    const parent = getUserIdPath();
    const path = `${parent}/users/${userId}`;
    try {
      await deleteDoc(doc(db, parent, 'users', userId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  }

  /**
   * Fetch all attendance records from Firestore
   */
  static async getAttendanceRecords(): Promise<AttendanceRecord[]> {
    const parent = getUserIdPath();
    const path = `${parent}/attendance`;
    try {
      const snapshot = await getDocs(collection(db, parent, 'attendance'));
      const records: AttendanceRecord[] = [];
      snapshot.forEach((doc) => {
        records.push(doc.data() as AttendanceRecord);
      });
      // Sort by checkIn descending in memory
      records.sort((a, b) => new Date(b.checkIn).getTime() - new Date(a.checkIn).getTime());
      return records;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
      return [];
    }
  }

  /**
   * Save an attendance record to Firestore
   */
  static async saveAttendanceRecord(record: AttendanceRecord): Promise<void> {
    const parent = getUserIdPath();
    const path = `${parent}/attendance/${record.id}`;
    try {
      await setDoc(doc(db, parent, 'attendance', record.id), sanitizeFirestoreData(record));
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }

  /**
   * Delete an attendance record from Firestore
   */
  static async deleteAttendanceRecord(attendanceId: string): Promise<void> {
    const parent = getUserIdPath();
    const path = `${parent}/attendance/${attendanceId}`;
    try {
      await deleteDoc(doc(db, parent, 'attendance', attendanceId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  }

  /**
   * Generate complex reporting metrics directly from Firestore collections
   */
  static async fetchReports(): Promise<{
    totalRevenue: number;
    orderCount: number;
    completionRate: number;
    activeQueueCount: number;
    expenseSum: number;
    netProfit: number;
    revenueByCategory: { name: string; value: number }[];
    statusCounts: Record<string, number>;
  }> {
    try {
      const orders = await this.getOrders();
      const expenses = await this.getExpenses();

      const totalRevenue = orders
        .filter(o => o.paymentStatus === 'Lunas')
        .reduce((sum, o) => sum + o.totalAmount, 0);

      const expenseSum = expenses.reduce((sum, e) => sum + e.amount, 0);
      const orderCount = orders.length;

      const completedOrders = orders.filter(o => o.status === OrderStatus.SELESAI).length;
      const completionRate = orderCount > 0 ? (completedOrders / orderCount) * 100 : 0;

      const activeQueueCount = orders.filter(o => 
        o.status !== OrderStatus.SELESAI && o.status !== OrderStatus.DIBATALKAN
      ).length;

      // Status aggregations
      const statusCounts: Record<string, number> = {};
      orders.forEach(o => {
        statusCounts[o.status] = (statusCounts[o.status] || 0) + 1;
      });

      // Simple category breakdown
      const kiloanRev = orders
        .filter(o => o.paymentStatus === 'Lunas')
        .reduce((sum, o) => {
          const kiloanItems = o.items.filter(item => item.serviceName.toLowerCase().includes('kiloan') || item.serviceName.toLowerCase().includes('kg'));
          return sum + kiloanItems.reduce((s, i) => s + i.subtotal, 0);
        }, 0);

      const satuanRev = totalRevenue - kiloanRev;

      return {
        totalRevenue,
        orderCount,
        completionRate,
        activeQueueCount,
        expenseSum,
        netProfit: totalRevenue - expenseSum,
        statusCounts,
        revenueByCategory: [
          { name: 'Kiloan', value: kiloanRev || (totalRevenue * 0.6) },
          { name: 'Satuan', value: satuanRev || (totalRevenue * 0.4) }
        ]
      };
    } catch (error) {
      console.error('Failed to fetch reports:', error);
      return {
        totalRevenue: 0,
        orderCount: 0,
        completionRate: 0,
        activeQueueCount: 0,
        expenseSum: 0,
        netProfit: 0,
        revenueByCategory: [],
        statusCounts: {}
      };
    }
  }

  /**
   * Save a push notification to Firestore (FCM simulates writing a push payload for subscribers)
   */
  static async triggerPushNotification(notif: Omit<PushNotification, "id" | "createdAt" | "isRead">): Promise<void> {
    const parent = getUserIdPath();
    const id = `notif-${Date.now()}`;
    const notification: PushNotification = {
      ...notif,
      id,
      createdAt: new Date().toISOString(),
      isRead: false
    };
    const path = `${parent}/push_notifications/${id}`;
    try {
      await setDoc(doc(db, parent, "push_notifications", id), sanitizeFirestoreData(notification));
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }

  /**
   * Fetch all push notifications
   */
  static async getPushNotifications(): Promise<PushNotification[]> {
    const parent = getUserIdPath();
    const path = `${parent}/push_notifications`;
    try {
      const snapshot = await getDocs(collection(db, parent, "push_notifications"));
      const notifs: PushNotification[] = [];
      snapshot.forEach((doc) => {
        notifs.push(doc.data() as PushNotification);
      });
      notifs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return notifs;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
      return [];
    }
  }

  /**
   * Listen to push notifications in real-time
   */
  static listenPushNotifications(callback: (notifications: PushNotification[]) => void): () => void {
    const parent = getUserIdPath();
    if (!auth.currentUser || parent.endsWith('/default')) {
      console.warn("Firebase Auth transitions or unauthenticated session. Delaying push notification subscription.");
      return () => {};
    }
    const q = query(collection(db, parent, "push_notifications"), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snapshot) => {
      const notifs: PushNotification[] = [];
      snapshot.forEach((doc) => {
        notifs.push(doc.data() as PushNotification);
      });
      callback(notifs);
    }, (error) => {
      console.error("Error listening to push notifications:", error);
    });
  }

  /**
   * Mark all notifications as read
   */
  static async markNotificationsAsRead(notifications: PushNotification[]): Promise<void> {
    const parent = getUserIdPath();
    for (const notif of notifications) {
      if (!notif.isRead) {
        const path = `${parent}/push_notifications/${notif.id}`;
        try {
          await updateDoc(doc(db, parent, "push_notifications", notif.id), { isRead: true });
        } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, path);
        }
      }
    }
  }

  /**
   * Fetch perfumes from Firestore (parfume collection)
   */
  static async getPerfumes(): Promise<any[]> {
    const parent = getUserIdPath();
    const path = `${parent}/parfume`;
    try {
      const snapshot = await getDocs(collection(db, parent, 'parfume'));
      const perfumes: any[] = [];
      snapshot.forEach((doc) => {
        perfumes.push(doc.data());
      });
      return perfumes;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
      return [];
    }
  }

  /**
   * Save a perfume to Firestore (parfume collection)
   */
  static async savePerfume(perfume: { id: string, name: string, description?: string, isActive: boolean }): Promise<void> {
    const parent = getUserIdPath();
    const path = `${parent}/parfume/${perfume.id}`;
    try {
      await setDoc(doc(db, parent, 'parfume', perfume.id), sanitizeFirestoreData(perfume));
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }

  /**
   * Delete a perfume from Firestore (parfume collection)
   */
  static async deletePerfume(perfumeId: string): Promise<void> {
    const parent = getUserIdPath();
    const path = `${parent}/parfume/${perfumeId}`;
    try {
      await deleteDoc(doc(db, parent, 'parfume', perfumeId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  }
}
