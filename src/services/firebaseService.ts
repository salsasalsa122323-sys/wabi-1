import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from '../firebase';
import {
  Branch,
  InventoryItem,
  Recipe,
  BranchDailyModuleRecord,
  BranchTrackedItem,
  CentralBinCardEntry
} from '../types';

/**
 * Service to sync and persist data to Firebase Firestore
 */

// 1. Save or Update Daily Branch Audit Record
export async function saveDailyAuditToFirestore(record: BranchDailyModuleRecord): Promise<boolean> {
  try {
    const docId = `audit_${record.branchId}_${record.date}`;
    const docRef = doc(db, 'branch_daily_audits', docId);
    
    // Clean record to ensure plain JSON without undefined
    const cleanPayload = JSON.parse(JSON.stringify({
      ...record,
      firestoreDocId: docId,
      updatedAt: new Date().toISOString(),
      serverUpdatedAt: serverTimestamp(),
    }));

    await setDoc(docRef, cleanPayload, { merge: true });
    console.log(`[Firestore] Daily audit saved: ${docId}`);
    return true;
  } catch (error) {
    console.error('[Firestore] Error saving daily audit:', error);
    return false;
  }
}

// 2. Fetch Daily Audit Record from Firestore
export async function getDailyAuditFromFirestore(
  branchId: string,
  date: string
): Promise<BranchDailyModuleRecord | null> {
  try {
    const docId = `audit_${branchId}_${date}`;
    const docRef = doc(db, 'branch_daily_audits', docId);
    const snap = await getDoc(docRef);

    if (snap.exists()) {
      return snap.data() as BranchDailyModuleRecord;
    }
    return null;
  } catch (error) {
    console.error('[Firestore] Error fetching daily audit:', error);
    return null;
  }
}

// 3. Batch Sync Branches to Firestore
export async function syncBranchesToFirestore(branches: Branch[]): Promise<boolean> {
  try {
    const batch = writeBatch(db);
    branches.forEach((b) => {
      const docRef = doc(db, 'branches', b.id);
      batch.set(docRef, { ...b, updatedAt: new Date().toISOString() }, { merge: true });
    });
    await batch.commit();
    console.log(`[Firestore] Synced ${branches.length} branches.`);
    return true;
  } catch (error) {
    console.error('[Firestore] Error syncing branches:', error);
    return false;
  }
}

// 4. Batch Sync Inventory Catalog to Firestore
export async function syncInventoryItemsToFirestore(items: InventoryItem[]): Promise<boolean> {
  try {
    // Firestore batch limit is 500 operations
    const chunkSize = 400;
    for (let i = 0; i < items.length; i += chunkSize) {
      const chunk = items.slice(i, i + chunkSize);
      const batch = writeBatch(db);
      chunk.forEach((item) => {
        const docRef = doc(db, 'inventory_items', item.id);
        batch.set(docRef, { ...item, updatedAt: new Date().toISOString() }, { merge: true });
      });
      await batch.commit();
    }
    console.log(`[Firestore] Synced ${items.length} inventory items.`);
    return true;
  } catch (error) {
    console.error('[Firestore] Error syncing inventory items:', error);
    return false;
  }
}

// 5. Batch Sync Recipes to Firestore
export async function syncRecipesToFirestore(recipes: Recipe[]): Promise<boolean> {
  try {
    const chunkSize = 400;
    for (let i = 0; i < recipes.length; i += chunkSize) {
      const chunk = recipes.slice(i, i + chunkSize);
      const batch = writeBatch(db);
      chunk.forEach((r) => {
        const docRef = doc(db, 'recipes', r.id);
        batch.set(docRef, { ...r, updatedAt: new Date().toISOString() }, { merge: true });
      });
      await batch.commit();
    }
    console.log(`[Firestore] Synced ${recipes.length} recipes.`);
    return true;
  } catch (error) {
    console.error('[Firestore] Error syncing recipes:', error);
    return false;
  }
}

// 6. Batch Sync Branch Tracked Items
export async function syncTrackedItemsToFirestore(tracked: BranchTrackedItem[]): Promise<boolean> {
  try {
    const batch = writeBatch(db);
    tracked.forEach((t) => {
      const docRef = doc(db, 'branch_tracked_items', t.id);
      batch.set(docRef, { ...t, updatedAt: new Date().toISOString() }, { merge: true });
    });
    await batch.commit();
    console.log(`[Firestore] Synced ${tracked.length} tracked items.`);
    return true;
  } catch (error) {
    console.error('[Firestore] Error syncing tracked items:', error);
    return false;
  }
}

// 7. Full Cloud Sync (One-click complete mirroring to Firestore)
export async function syncFullERPToFirestore(data: {
  branches: Branch[];
  items: InventoryItem[];
  recipes: Recipe[];
  trackedItems?: BranchTrackedItem[];
  dailyAudits?: BranchDailyModuleRecord[];
}): Promise<{ success: boolean; message: string }> {
  try {
    await syncBranchesToFirestore(data.branches);
    await syncInventoryItemsToFirestore(data.items);
    await syncRecipesToFirestore(data.recipes);
    if (data.trackedItems && data.trackedItems.length > 0) {
      await syncTrackedItemsToFirestore(data.trackedItems);
    }
    if (data.dailyAudits && data.dailyAudits.length > 0) {
      for (const audit of data.dailyAudits) {
        await saveDailyAuditToFirestore(audit);
      }
    }
    return {
      success: true,
      message: `በስኬት ተከናውኗል! ${data.branches.length} ቅርንጫፎች፣ ${data.items.length} ጥሬ ዕቃዎች እና ${data.recipes.length} ሬሲፒዎች ወደ Firestore ገብተዋል።`
    };
  } catch (error: any) {
    return {
      success: false,
      message: error?.message || 'ወደ Firestore ሲገለበጥ ስህተት አጋጥሟል'
    };
  }
}
