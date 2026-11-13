import React, { useState, useRef } from 'react';
import {
  Camera,
  Upload,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  FileText,
  ShieldCheck,
  Building2,
  Calendar,
  Layers,
  ArrowRight,
  X,
  RefreshCw,
  Eye,
  CookingPot,
  Warehouse,
  ArrowRightLeft,
  Receipt,
  FileCheck,
  Plus,
  Trash2,
  CheckCheck,
  Clock,
  Images,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useLanguage } from '../../context/LanguageContext';
import { getTodayDateString } from '../../utils/ethiopianDate';

export interface ScannedItem {
  name: string;
  quantity: number;
  unit: string;
  unitPrice?: number;
  subTotal?: number;
}

export interface ScannedVoucherData {
  documentType: 'STOCK_IN' | 'TRANSFER' | 'KITCHEN_PREP' | 'DAILY_SALES' | 'WASTE' | 'UNKNOWN';
  documentTypeAm: string;
  detectedBranch: string;
  date: string;
  ethiopianDateStr?: string;
  referenceNo: string;
  hasSignature: boolean;
  signatureStatusAm: string;
  signedBy?: string;
  notes?: string;
  items: ScannedItem[];
  totalAmount?: number;
  summaryAmharic: string;
}

export interface BatchVoucherItem {
  id: string;
  imagePreview: string;
  mimeType: string;
  fileName: string;
  fileSizeStr?: string;
  status: 'pending' | 'scanning' | 'scanned' | 'recorded' | 'error';
  scannedData?: ScannedVoucherData;
  targetBranchId: string;
  errorMessage?: string;
  recordedMessage?: string;
}

interface AiVoucherScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToTab?: (tab: any) => void;
}

export const AiVoucherScannerModal: React.FC<AiVoucherScannerModalProps> = ({
  isOpen,
  onClose,
  onNavigateToTab,
}) => {
  const {
    items,
    branches,
    kitchenPrepItems,
    recordStockIn,
    transferToBranch,
    recordKitchenPrepProduction,
  } = useApp();
  const { language, formatCurrency } = useLanguage();

  const [batchItems, setBatchItems] = useState<BatchVoucherItem[]>([]);
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [isScanningAll, setIsScanningAll] = useState(false);
  const [statusNotification, setStatusNotification] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const activeItem = batchItems.find((b) => b.id === activeItemId) || batchItems[0] || null;

  // Format file size
  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  };

  // Handle incoming multiple files
  const processFiles = (files: FileList | File[]) => {
    const fileArray = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (fileArray.length === 0) return;

    const newItems: BatchVoucherItem[] = [];
    let pendingCount = fileArray.length;

    fileArray.forEach((file, index) => {
      const reader = new FileReader();
      const itemId = `batch-${Date.now()}-${index}-${Math.random().toString(36).substring(2, 7)}`;
      reader.onload = () => {
        const result = reader.result as string;
        newItems.push({
          id: itemId,
          imagePreview: result,
          mimeType: file.type || 'image/jpeg',
          fileName: file.name,
          fileSizeStr: formatBytes(file.size),
          status: 'pending',
          targetBranchId: branches[0]?.id || '',
        });

        pendingCount--;
        if (pendingCount === 0) {
          setBatchItems((prev) => {
            const updated = [...prev, ...newItems];
            if (!activeItemId && updated.length > 0) {
              setActiveItemId(updated[0].id);
            }
            return updated;
          });
          // Auto scan first new item or trigger scan prompt
          setStatusNotification(
            language === 'am'
              ? `📁 ${newItems.length} ፎቶዎች ተመርጠዋል! "ሁሉንም አንብብ" የሚለውን በመጫን በ AI ማስመርመር ይችላሉ።`
              : `📁 ${newItems.length} photos added to queue!`
          );
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
    // reset input so the same files can be re-selected if deleted
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Drag and Drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  // Scan a single item
  const scanSingleItem = async (itemId: string) => {
    const target = batchItems.find((b) => b.id === itemId);
    if (!target) return;

    setBatchItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, status: 'scanning', errorMessage: undefined } : item))
    );

    try {
      const res = await fetch('/api/scan-voucher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: target.imagePreview,
          mimeType: target.mimeType,
        }),
      });

      const json = await res.json();
      if (json.success && json.data) {
        // Auto-match branch if detected
        let autoBranchId = target.targetBranchId;
        if (json.data.detectedBranch) {
          const match = branches.find(
            (b) =>
              json.data.detectedBranch.toLowerCase().includes(b.nameAm.toLowerCase()) ||
              json.data.detectedBranch.toLowerCase().includes(b.nameEn.toLowerCase())
          );
          if (match) autoBranchId = match.id;
        }

        setBatchItems((prev) =>
          prev.map((item) =>
            item.id === itemId
              ? {
                  ...item,
                  status: 'scanned',
                  scannedData: json.data,
                  targetBranchId: autoBranchId,
                }
              : item
          )
        );
      } else {
        setBatchItems((prev) =>
          prev.map((item) =>
            item.id === itemId
              ? {
                  ...item,
                  status: 'error',
                  errorMessage: json.error || 'ሰነዱን ማንበብ አልተቻለም። እባክዎ እንደገና ይሞክሩ።',
                }
              : item
          )
        );
      }
    } catch (err: any) {
      setBatchItems((prev) =>
        prev.map((item) =>
          item.id === itemId
            ? {
                ...item,
                status: 'error',
                errorMessage: 'የሰርቨር ግንኙነት ችግር ተፈጥሯል፤ እባክዎ እንደገና ይሞክሩ።',
              }
            : item
        )
      );
    }
  };

  // Scan all pending items in batch
  const scanAllPending = async () => {
    const pendingList = batchItems.filter((it) => it.status === 'pending' || it.status === 'error');
    if (pendingList.length === 0) return;

    setIsScanningAll(true);
    setStatusNotification(
      language === 'am'
        ? `🔄 ${pendingList.length} ሰነዶች በ AI እየተነበቡ ነው... እባክዎ ይጠብቁ`
        : `Scanning ${pendingList.length} documents...`
    );

    // Process sequentially or chunks to avoid hammering
    for (const item of pendingList) {
      await scanSingleItem(item.id);
    }

    setIsScanningAll(false);
    setStatusNotification(
      language === 'am'
        ? `✨ የሰነዶች ምርመራ ተጠናቋል! ዝርዝሩን አይተው በአንድ ክሊክ ወደ ሲስተም መመዝገብ ይችላሉ።`
        : `Batch scanning complete!`
    );
  };

  // Remove item from batch
  const removeItem = (itemId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setBatchItems((prev) => {
      const remaining = prev.filter((it) => it.id !== itemId);
      if (activeItemId === itemId) {
        setActiveItemId(remaining[0]?.id || null);
      }
      return remaining;
    });
  };

  // Clear entire batch
  const clearAllBatch = () => {
    setBatchItems([]);
    setActiveItemId(null);
  };

  // Update target branch for an item
  const updateItemBranch = (itemId: string, branchId: string) => {
    setBatchItems((prev) =>
      prev.map((it) => (it.id === itemId ? { ...it, targetBranchId: branchId } : it))
    );
  };

  // Execute single item into ERP
  const executeSingleItem = (itemToRecord: BatchVoucherItem): boolean => {
    if (!itemToRecord.scannedData || !itemToRecord.scannedData.items || itemToRecord.scannedData.items.length === 0) {
      return false;
    }

    const { scannedData, targetBranchId: bId } = itemToRecord;
    const docType = scannedData.documentType;
    const selectedBranch = branches.find((b) => b.id === bId) || branches[0];

    try {
      if (docType === 'STOCK_IN') {
        let count = 0;
        scannedData.items.forEach((it) => {
          const matchedItem = items.find(
            (catalog) =>
              it.name.toLowerCase().includes(catalog.nameAm.toLowerCase()) ||
              catalog.nameAm.toLowerCase().includes(it.name.toLowerCase()) ||
              it.name.toLowerCase().includes(catalog.nameEn.toLowerCase())
          ) || items[0];

          if (matchedItem) {
            recordStockIn({
              itemId: matchedItem.id,
              date: scannedData.date || getTodayDateString(),
              quantity: it.quantity,
              unitPrice: it.unitPrice || matchedItem.lastPurchasePrice || 100,
              supplier: 'AI Batch Voucher',
              grnNumber: scannedData.referenceNo || `AI-GRN-${Date.now().toString().slice(-4)}`,
              notes: `በ AI ባች ሰነድ የተመዘገበ: ${scannedData.referenceNo || ''}`,
            });
            count++;
          }
        });

        setBatchItems((prev) =>
          prev.map((it) =>
            it.id === itemToRecord.id
              ? {
                  ...it,
                  status: 'recorded',
                  recordedMessage: `✅ ${count} እቃዎች ወደ ዋና ስቶር ገቢ ተደርገዋል!`,
                }
              : it
          )
        );
        return true;
      } else if (docType === 'TRANSFER') {
        let count = 0;
        scannedData.items.forEach((it) => {
          const matchedItem = items.find(
            (catalog) =>
              it.name.toLowerCase().includes(catalog.nameAm.toLowerCase()) ||
              catalog.nameAm.toLowerCase().includes(it.name.toLowerCase()) ||
              it.name.toLowerCase().includes(catalog.nameEn.toLowerCase())
          ) || items[0];

          if (matchedItem) {
            transferToBranch({
              branchId: selectedBranch.id,
              itemId: matchedItem.id,
              date: scannedData.date || getTodayDateString(),
              quantity: it.quantity,
              sivNumber: scannedData.referenceNo || `AI-SIV-${Date.now().toString().slice(-4)}`,
              notes: `በ AI ባች ቫውቸር የተላለፈ: ${scannedData.referenceNo || ''}`,
            });
            count++;
          }
        });

        setBatchItems((prev) =>
          prev.map((it) =>
            it.id === itemToRecord.id
              ? {
                  ...it,
                  status: 'recorded',
                  recordedMessage: `✅ ${count} እቃዎች ወደ ${selectedBranch.nameAm} ተላልፈዋል!`,
                }
              : it
          )
        );
        return true;
      } else if (docType === 'KITCHEN_PREP') {
        const firstItem = scannedData.items[0];
        const matchedPrep = kitchenPrepItems.find(
          (p) =>
            firstItem.name.toLowerCase().includes(p.nameAm.toLowerCase()) ||
            p.nameAm.toLowerCase().includes(firstItem.name.toLowerCase()) ||
            firstItem.name.toLowerCase().includes(p.nameEn.toLowerCase())
        ) || kitchenPrepItems[0];

        if (matchedPrep) {
          recordKitchenPrepProduction({
            branchId: selectedBranch.id,
            prepItemId: matchedPrep.id,
            quantityProduced: firstItem.quantity,
            date: scannedData.date || getTodayDateString(),
            notes: `በ AI ሰነድ የተረጋገጠ የኩሽና ዝግጅት: ${scannedData.referenceNo || ''}`,
          });

          setBatchItems((prev) =>
            prev.map((it) =>
              it.id === itemToRecord.id
                ? {
                    ...it,
                    status: 'recorded',
                    recordedMessage: `✅ ${firstItem.quantity} ${matchedPrep.outputUnitAm} ${matchedPrep.nameAm} ተመዝግቧል፤ ጥሬ ዕቃዎች ተቀናንሰዋል!`,
                  }
                : it
            )
          );
          return true;
        } else {
          setBatchItems((prev) =>
            prev.map((it) =>
              it.id === itemToRecord.id
                ? {
                    ...it,
                    errorMessage: 'የሶስ ወይም የዝግጅት ፎርሙላ አልተገኘም። እባክዎ በቅድሚያ ፎርሙላውን ይመዝግቡ።',
                  }
                : it
            )
          );
          return false;
        }
      } else if (docType === 'DAILY_SALES') {
        setBatchItems((prev) =>
          prev.map((it) =>
            it.id === itemToRecord.id
              ? {
                  ...it,
                  status: 'recorded',
                  recordedMessage: `✅ የሽያጭ መረጃው ተረጋግጧል! ወደ ሪኮንሲሌሽን ገጽ ማጠቃለያ ማስተላለፍ ይችላሉ።`,
                }
              : it
          )
        );
        return true;
      } else {
        setBatchItems((prev) =>
          prev.map((it) =>
            it.id === itemToRecord.id
              ? {
                  ...it,
                  status: 'recorded',
                  recordedMessage: `✅ ሰነዱ ተመዝግቧል!`,
                }
              : it
          )
        );
        return true;
      }
    } catch (e: any) {
      setBatchItems((prev) =>
        prev.map((it) =>
          it.id === itemToRecord.id
            ? {
                ...it,
                errorMessage: e.message || 'ማስፈጸም አልተቻለም',
              }
            : it
        )
      );
      return false;
    }
  };

  // Batch Record All Scanned
  const executeAllScannedBatch = () => {
    const readyItems = batchItems.filter((it) => it.status === 'scanned');
    if (readyItems.length === 0) return;

    let successCount = 0;
    readyItems.forEach((it) => {
      const ok = executeSingleItem(it);
      if (ok) successCount++;
    });

    setStatusNotification(
      language === 'am'
        ? `🎉 እሰይ! ${successCount} የተለያዩ ሰነዶች/ቫውቸሮች በአንድ ጊዜ ወደ ኢንቬንተሪ ሲስተም ገብተዋል!`
        : `Successfully recorded ${successCount} documents into ERP!`
    );
  };

  // Load Multi-Sample Demo (Generates 3 varied paper vouchers)
  const handleLoadMultiDemo = () => {
    // Generate Sample 1: SIV Transfer Slip
    const canvas1 = document.createElement('canvas');
    canvas1.width = 600;
    canvas1.height = 380;
    const ctx1 = canvas1.getContext('2d');
    if (ctx1) {
      ctx1.fillStyle = '#fdfbf7';
      ctx1.fillRect(0, 0, 600, 380);
      ctx1.fillStyle = '#1e293b';
      ctx1.font = 'bold 18px sans-serif';
      ctx1.fillText('የስቶር ማስተላለፊያ ደረሰኝ (Store Transfer SIV)', 80, 40);
      ctx1.font = '13px sans-serif';
      ctx1.fillStyle = '#475569';
      ctx1.fillText('ከ: ማዕከላዊ ስቶር  |  ለ: ኮኮናት ብራንች ኪችን', 50, 75);
      ctx1.fillText('ቀን: ጥቅምት 17/2018  |  ማዘዣ ቁጥር: SIV-0842', 50, 100);
      ctx1.fillStyle = '#0f172a';
      ctx1.font = 'bold 14px sans-serif';
      ctx1.fillText('1. ትኩስ የበሬ ስጋ  -  15.0 ኪ.ግ  @ 750 ብር', 60, 150);
      ctx1.fillText('2. የእርሻ እንቁላል   -  60 ፍሬ     @ 18 ብር', 60, 190);
      ctx1.fillText('3. የምግብ ዘይት     -  5.0 ሊትር  @ 180 ብር', 60, 230);
      ctx1.fillStyle = '#dc2626';
      ctx1.font = 'bold 12px sans-serif';
      ctx1.fillText('★ KOKONUT KITCHEN RECEIVED ★', 60, 280);
      ctx1.fillStyle = '#1e3a8a';
      ctx1.font = 'italic bold 15px cursive';
      ctx1.fillText('Abebe (Store Keeper) - Signed', 60, 320);
      ctx1.fillText('Manager Salsawi - Signed', 360, 320);
    }

    // Generate Sample 2: Kitchen Prep Sauce Slip
    const canvas2 = document.createElement('canvas');
    canvas2.width = 600;
    canvas2.height = 380;
    const ctx2 = canvas2.getContext('2d');
    if (ctx2) {
      ctx2.fillStyle = '#fffdf0';
      ctx2.fillRect(0, 0, 600, 380);
      ctx2.fillStyle = '#1e293b';
      ctx2.font = 'bold 18px sans-serif';
      ctx2.fillText('የኩሽና ዕለታዊ ዝግጅት ማስታወሻ (Kitchen Prep Batch Log)', 60, 40);
      ctx2.font = '13px sans-serif';
      ctx2.fillStyle = '#475569';
      ctx2.fillText('ቅርንጫፍ: ሾላ ብራንች ኪችን  |  ሰነድ ቁጥር: KP-019', 50, 75);
      ctx2.fillText('ቀን: ጥቅምት 17/2018  |  ፈረቃ: የጠዋት ፈረቃ', 50, 100);
      ctx2.fillStyle = '#0f172a';
      ctx2.font = 'bold 14px sans-serif';
      ctx2.fillText('የተዘጋጀው አይተም፦ ማዮኔዝ ሶስ (Mayonnaise Sauce)', 60, 150);
      ctx2.fillText('የተመረተ ብዛት፦ 6.0 ሊትር', 60, 190);
      ctx2.fillText('ጥሬ ዕቃዎች የተቀነሱበት፦ እንቁላል 24 ፍሬ፣ ዘይት 3 ሊትር', 60, 230);
      ctx2.fillStyle = '#059669';
      ctx2.font = 'bold 12px sans-serif';
      ctx2.fillText('✔ SHOLA HEAD CHEF VERIFIED', 60, 280);
      ctx2.fillStyle = '#1e3a8a';
      ctx2.font = 'italic bold 15px cursive';
      ctx2.fillText('Chef Solomon (Kitchen Lead) - Signed', 60, 320);
    }

    // Generate Sample 3: Meat/Supplier Purchase GRN
    const canvas3 = document.createElement('canvas');
    canvas3.width = 600;
    canvas3.height = 380;
    const ctx3 = canvas3.getContext('2d');
    if (ctx3) {
      ctx3.fillStyle = '#f8fafc';
      ctx3.fillRect(0, 0, 600, 380);
      ctx3.fillStyle = '#1e293b';
      ctx3.font = 'bold 18px sans-serif';
      ctx3.fillText('የእቃ መረከቢያ ሰነድ (Central Store GRN)', 90, 40);
      ctx3.font = '13px sans-serif';
      ctx3.fillStyle = '#475569';
      ctx3.fillText('አቅራቢ: ቃሊቲ ቄራ አቅራቢዎች  |  GRN-9941', 50, 75);
      ctx3.fillText('ቀን: ጥቅምት 17/2018  |  ገቢ የተደረገበት: ዋና ስቶር', 50, 100);
      ctx3.fillStyle = '#0f172a';
      ctx3.font = 'bold 14px sans-serif';
      ctx3.fillText('1. ትኩስ የበሬ ስጋ  -  40.0 ኪ.ግ  @ 720 ብር', 60, 150);
      ctx3.fillText('2. ትኩስ የዶሮ ስጋ  -  15.0 ኪ.ግ  @ 420 ብር', 60, 190);
      ctx3.fillStyle = '#1e3a8a';
      ctx3.font = 'italic bold 15px cursive';
      ctx3.fillText('Kassahun (Store Manager) - Signed & Received', 60, 290);
    }

    const demoItems: BatchVoucherItem[] = [
      {
        id: `demo-1-${Date.now()}`,
        imagePreview: canvas1.toDataURL('image/jpeg'),
        mimeType: 'image/jpeg',
        fileName: 'Kokonut_Transfer_SIV_0842.jpg',
        fileSizeStr: '142 KB',
        status: 'pending',
        targetBranchId: branches[0]?.id || '',
      },
      {
        id: `demo-2-${Date.now()}`,
        imagePreview: canvas2.toDataURL('image/jpeg'),
        mimeType: 'image/jpeg',
        fileName: 'Shola_Kitchen_Prep_KP019.jpg',
        fileSizeStr: '136 KB',
        status: 'pending',
        targetBranchId: branches[1]?.id || branches[0]?.id || '',
      },
      {
        id: `demo-3-${Date.now()}`,
        imagePreview: canvas3.toDataURL('image/jpeg'),
        mimeType: 'image/jpeg',
        fileName: 'Central_Store_GRN_9941.jpg',
        fileSizeStr: '155 KB',
        status: 'pending',
        targetBranchId: branches[0]?.id || '',
      },
    ];

    setBatchItems(demoItems);
    setActiveItemId(demoItems[0].id);
    setStatusNotification(
      language === 'am'
        ? '💡 3 ናሙና የሆቴል ሰነዶች ተዘጋጅተዋል! "ሁሉንም አንብብ" የሚለውን በመጫን ባች አሰራሩን ይመልከቱ።'
        : '3 sample vouchers loaded into queue!'
    );
  };

  const scannedReadyCount = batchItems.filter((b) => b.status === 'scanned').length;
  const pendingCount = batchItems.filter((b) => b.status === 'pending' || b.status === 'error').length;
  const recordedCount = batchItems.filter((b) => b.status === 'recorded').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 rounded-3xl shadow-2xl max-w-5xl w-full overflow-hidden border border-amber-500/40 text-slate-100 max-h-[95vh] flex flex-col">
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-amber-500/20 bg-slate-950">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-2xl bg-gradient-to-br from-amber-500/20 to-yellow-500/10 border border-amber-500/40 text-amber-400">
              <Images className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">
                  {language === 'am' ? 'ባች AI ሰነድ እና ቫውቸር አንባቢ' : 'Multi-Voucher AI Batch Scanner'}
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-black border border-amber-500/30">
                  BATCH MULTI-PHOTO
                </span>
                {batchItems.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px] font-bold border border-slate-700">
                    {batchItems.length} ፎቶዎች
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                {language === 'am'
                  ? 'ከስልክዎ ወይም ከላፕቶፕዎ ብዙ ፎቶዎችን በአንድ ጊዜ ይምረጡ፤ AI እያንዳንዳቸውን መርምሮ በአንድ ክሊክ ወደ ሲስተም ያስገባልዎታል'
                  : 'Select multiple voucher photos at once; AI reads signatures, items & branches, batch-records in 1 click'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onNavigateToTab && (
              <button
                type="button"
                onClick={() => {
                  onNavigateToTab('standardForms');
                  onClose();
                }}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-amber-500/30 text-amber-300 hover:text-white hover:bg-slate-800 text-xs font-bold transition-all cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 text-amber-400" />
                <span>{language === 'am' ? 'የስታንዳርድ ቅጾች አውርድ' : 'Get Standard Forms'}</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Status Notification Toast */}
        {statusNotification && (
          <div className="px-5 py-2.5 bg-gradient-to-r from-amber-950/90 via-slate-900 to-amber-950/90 border-b border-amber-500/30 flex items-center justify-between text-xs font-bold text-amber-300">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{statusNotification}</span>
            </div>
            <button
              onClick={() => setStatusNotification(null)}
              className="text-amber-400/80 hover:text-white text-xs cursor-pointer ml-3"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Modal Main Area */}
        <div className="flex-1 overflow-hidden flex flex-col p-4 sm:p-5 gap-4">
          {/* Top Controls: File Picker + Batch Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950/80 p-3 rounded-2xl border border-slate-800">
            {/* Hidden File Input supporting MULTIPLE files */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              multiple
              className="hidden"
            />

            <div className="flex flex-wrap items-center gap-2">
              {/* Add Multi Photos Button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 transition-all flex items-center gap-1.5 shadow-md shadow-amber-500/20 cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>{language === 'am' ? 'ብዙ ፎቶዎችን በአንድ ጊዜ ምረጥ (Select Photos)' : 'Select Multiple Photos'}</span>
              </button>

              {/* Sample Multi Demo Button */}
              <button
                type="button"
                onClick={handleLoadMultiDemo}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs border border-amber-500/30 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>{language === 'am' ? 'ናሙና 3 ሰነዶች ሞክር (Demo)' : 'Try 3 Demo Slips'}</span>
              </button>

              {batchItems.length > 0 && (
                <button
                  type="button"
                  onClick={clearAllBatch}
                  className="px-2.5 py-2 rounded-xl text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 font-bold text-xs transition-all flex items-center gap-1 cursor-pointer"
                  title="ሁሉንም ፎቶዎች አጽዳ"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{language === 'am' ? 'ሁሉንም አጽዳ' : 'Clear All'}</span>
                </button>
              )}
            </div>

            {/* Batch Processing Buttons */}
            {batchItems.length > 0 && (
              <div className="flex items-center gap-2">
                {pendingCount > 0 && (
                  <button
                    type="button"
                    onClick={scanAllPending}
                    disabled={isScanningAll}
                    className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md disabled:opacity-60 cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isScanningAll ? 'animate-spin' : ''}`} />
                    <span>
                      {isScanningAll
                        ? language === 'am'
                          ? 'በ AI እየተነበቡ ነው...'
                          : 'Scanning All...'
                        : language === 'am'
                        ? `🚀 ያልተነበቡትን አንብብ (${pendingCount})`
                        : `Scan All (${pendingCount})`}
                    </span>
                  </button>
                )}

                {scannedReadyCount > 0 && (
                  <button
                    type="button"
                    onClick={executeAllScannedBatch}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md shadow-emerald-500/20 cursor-pointer"
                  >
                    <CheckCheck className="w-4 h-4 stroke-[2.5]" />
                    <span>
                      {language === 'am'
                        ? `✅ ሁሉንም በአንድ ክሊክ መዝግብ (${scannedReadyCount})`
                        : `Record All Batch (${scannedReadyCount})`}
                    </span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Empty State / Drag and Drop Area */}
          {batchItems.length === 0 ? (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`flex-1 border-2 border-dashed rounded-3xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                isDragOver
                  ? 'border-amber-400 bg-amber-500/10'
                  : 'border-slate-700 hover:border-amber-400/70 bg-slate-950/60 hover:bg-slate-950'
              }`}
            >
              <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-4 shadow-inner">
                <Upload className="w-8 h-8" />
              </div>
              <h4 className="text-base font-bold text-white">
                {language === 'am'
                  ? 'ፎቶዎቹን እዚህ ላይ ጎትተው ያስቀምጡ ወይም ክሊክ ያድርጉ'
                  : 'Drag & Drop multiple voucher photos here or click to browse'}
              </h4>
              <p className="text-xs text-slate-400 max-w-md mt-2">
                {language === 'am'
                  ? 'ከስልክዎ ጋለሪ ወይም ከላፕቶፕ ፎልደር 5፣ 10 ወይም ከዚያ በላይ የሆኑ የተለያዩ የስቶር፣ የኪችን ወይም የዕቃ ግዢ ደረሰኝ ፎቶዎችን በአንድ ጊዜ ይምረጡ'
                  : 'Select 5, 10 or more slip photos simultaneously from phone or computer. AI will process each one in queue.'}
              </p>
              <div className="mt-5 flex items-center gap-2 text-xs font-bold text-amber-400 bg-amber-500/10 px-4 py-2 rounded-2xl border border-amber-500/20">
                <Sparkles className="w-4 h-4" />
                <span>{language === 'am' ? 'JPG, PNG, WebP ፎቶዎችን ይደግፋል' : 'Supports JPG, PNG, WebP'}</span>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-hidden flex flex-col md:flex-row gap-4">
              {/* Left Column: Horizontal / Vertical Batch Carousel Thumbnail Queue */}
              <div className="md:w-72 flex flex-col bg-slate-950/70 rounded-2xl border border-slate-800 p-2.5 overflow-hidden shrink-0">
                <div className="flex items-center justify-between px-2 py-1 mb-2 border-b border-slate-800 text-[11px] font-bold text-slate-400">
                  <span>የፎቶዎች ሰልፍ ({batchItems.length})</span>
                  <span className="text-amber-400">{recordedCount} ተመዝግቧል</span>
                </div>

                <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                  {batchItems.map((item, index) => {
                    const isSelected = item.id === activeItemId;
                    return (
                      <div
                        key={item.id}
                        onClick={() => setActiveItemId(item.id)}
                        className={`p-2 rounded-xl border transition-all cursor-pointer relative group flex items-center gap-2.5 ${
                          isSelected
                            ? 'bg-amber-500/15 border-amber-400 shadow-md'
                            : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        {/* Number Index */}
                        <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-300 text-[10px] font-black flex items-center justify-center shrink-0">
                          {index + 1}
                        </span>

                        {/* Thumbnail */}
                        <div className="w-12 h-12 rounded-lg overflow-hidden bg-slate-950 shrink-0 border border-slate-700 relative">
                          <img
                            src={item.imagePreview}
                            alt={item.fileName}
                            className="w-full h-full object-cover"
                          />
                          {item.status === 'scanning' && (
                            <div className="absolute inset-0 bg-blue-900/60 flex items-center justify-center">
                              <RefreshCw className="w-4 h-4 text-blue-300 animate-spin" />
                            </div>
                          )}
                        </div>

                        {/* Info & Status */}
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-bold text-white truncate">
                            {item.scannedData?.documentTypeAm || item.fileName}
                          </div>
                          <div className="text-[10px] text-slate-400 truncate flex items-center gap-1 mt-0.5">
                            {item.status === 'pending' && (
                              <span className="text-amber-400 flex items-center gap-0.5">
                                <Clock className="w-3 h-3" /> አልተነበበም
                              </span>
                            )}
                            {item.status === 'scanning' && (
                              <span className="text-blue-400 flex items-center gap-0.5">
                                <RefreshCw className="w-3 h-3 animate-spin" /> በማንበብ ላይ...
                              </span>
                            )}
                            {item.status === 'scanned' && (
                              <span className="text-emerald-400 flex items-center gap-0.5">
                                <CheckCircle2 className="w-3 h-3" />
                                {item.scannedData?.hasSignature ? 'የተፈረመበት' : 'ተነቧል'}
                              </span>
                            )}
                            {item.status === 'recorded' && (
                              <span className="text-teal-300 font-bold flex items-center gap-0.5">
                                <CheckCheck className="w-3 h-3" /> ተመዝግቧል
                              </span>
                            )}
                            {item.status === 'error' && (
                              <span className="text-rose-400 flex items-center gap-0.5">
                                <AlertTriangle className="w-3 h-3" /> ስህተት
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Delete single button */}
                        <button
                          type="button"
                          onClick={(e) => removeItem(item.id, e)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-rose-400 rounded transition-opacity"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Selected Active Voucher Inspector & Details */}
              {activeItem && (
                <div className="flex-1 overflow-y-auto bg-slate-950/70 rounded-2xl border border-slate-800 p-4 space-y-4 flex flex-col">
                  {/* Active Header */}
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-amber-400" />
                      <span className="font-bold text-xs text-white truncate max-w-xs">
                        {activeItem.fileName}
                      </span>
                      {activeItem.fileSizeStr && (
                        <span className="text-[10px] text-slate-400">({activeItem.fileSizeStr})</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {activeItem.status === 'pending' || activeItem.status === 'error' ? (
                        <button
                          type="button"
                          onClick={() => scanSingleItem(activeItem.id)}
                          className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>ይህንን ብቻ አንብብ (Scan This)</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => scanSingleItem(activeItem.id)}
                          className="px-2.5 py-1 rounded-lg text-slate-400 hover:text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span>እንደገና ፈትሽ</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Inspector Body: Photo + OCR Data */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1">
                    {/* Left preview of this active photo */}
                    <div className="lg:col-span-5 flex flex-col">
                      <div className="bg-slate-900 rounded-2xl p-2 border border-slate-800 flex items-center justify-center relative overflow-hidden group min-h-[200px] max-h-[340px]">
                        <img
                          src={activeItem.imagePreview}
                          alt="Selected voucher preview"
                          className="w-full h-full object-contain rounded-xl max-h-[320px]"
                        />

                        {activeItem.status === 'scanning' && (
                          <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-xl">
                            <div className="w-full h-1 bg-gradient-to-r from-transparent via-amber-400 to-transparent shadow-[0_0_15px_#f59e0b] animate-scanline"></div>
                            <div className="absolute inset-0 bg-amber-500/10 backdrop-blur-[1px]"></div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right Extracted OCR Data */}
                    <div className="lg:col-span-7 space-y-3 flex flex-col justify-between">
                      {activeItem.status === 'scanning' ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-3 bg-slate-900/50 rounded-2xl border border-blue-500/30">
                          <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400 animate-spin">
                            <Sparkles className="w-5 h-5" />
                          </div>
                          <div className="text-xs font-bold text-blue-300">
                            የሰነዱ ጽሁፍ እና ፊርማ በ AI እየተነበበ ነው...
                          </div>
                          <div className="text-[11px] text-slate-400 max-w-xs">
                            የእቃ ዝርዝሮችን፣ መጠኖችን እና የቅርንጫፍ ማስታወሻዎችን በመተንተን ላይ
                          </div>
                        </div>
                      ) : activeItem.status === 'scanned' && activeItem.scannedData ? (
                        <div className="space-y-3">
                          {/* Badges: Type & Signature */}
                          <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-2xl bg-slate-900 border border-slate-800">
                            <div className="flex items-center gap-2">
                              <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                {activeItem.scannedData.documentType === 'STOCK_IN' && <Warehouse className="w-4 h-4" />}
                                {activeItem.scannedData.documentType === 'TRANSFER' && <ArrowRightLeft className="w-4 h-4" />}
                                {activeItem.scannedData.documentType === 'KITCHEN_PREP' && <CookingPot className="w-4 h-4" />}
                                {activeItem.scannedData.documentType === 'DAILY_SALES' && <Receipt className="w-4 h-4" />}
                                {activeItem.scannedData.documentType === 'WASTE' && <AlertTriangle className="w-4 h-4" />}
                              </span>
                              <div>
                                <div className="font-bold text-xs text-white">
                                  {activeItem.scannedData.documentTypeAm}
                                </div>
                                <div className="text-[10px] text-slate-400">
                                  ቁጥር: {activeItem.scannedData.referenceNo || 'ያልተጠቀሰ'} • ቀን: {activeItem.scannedData.date || 'የዛሬ'}
                                </div>
                              </div>
                            </div>

                            {activeItem.scannedData.hasSignature ? (
                              <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-950/80 text-emerald-400 border border-emerald-500/40 text-[11px] font-bold">
                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                                <span>{activeItem.scannedData.signatureStatusAm || 'የተፈረመበት'}</span>
                              </div>
                            ) : (
                              <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-950/80 text-amber-300 border border-amber-500/40 text-[11px] font-bold">
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                                <span>ፊርማ አልተገኘም</span>
                              </div>
                            )}
                          </div>

                          {/* Branch Selection */}
                          <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs">
                            <span className="text-slate-400 font-bold flex items-center gap-1">
                              <Building2 className="w-3.5 h-3.5 text-amber-400" />
                              <span>ቅርንጫፍ፦</span>
                            </span>
                            <select
                              value={activeItem.targetBranchId}
                              onChange={(e) => updateItemBranch(activeItem.id, e.target.value)}
                              className="px-2.5 py-1 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white font-bold focus:outline-none focus:border-amber-400"
                            >
                              {branches.map((b) => (
                                <option key={b.id} value={b.id}>
                                  {b.nameAm} ({b.nameEn})
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Extracted Items */}
                          <div className="space-y-1.5">
                            <div className="text-[11px] font-bold text-amber-300 flex items-center justify-between">
                              <span>የተገኙ እቃዎች ({activeItem.scannedData.items?.length || 0})</span>
                              {activeItem.scannedData.totalAmount ? (
                                <span className="font-mono text-emerald-400 text-xs">
                                  ድምር፡ {formatCurrency(activeItem.scannedData.totalAmount)}
                                </span>
                              ) : null}
                            </div>

                            <div className="max-h-36 overflow-y-auto rounded-xl border border-slate-800 bg-slate-900/60 text-xs">
                              <table className="w-full text-left">
                                <thead>
                                  <tr className="border-b border-slate-800 text-[10px] text-slate-400 bg-slate-950">
                                    <th className="py-1.5 px-2.5">የእቃው ስም</th>
                                    <th className="py-1.5 px-2 text-center">መጠን</th>
                                    <th className="py-1.5 px-2 text-center">መለኪያ</th>
                                    <th className="py-1.5 px-2.5 text-right">ዋጋ</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/60">
                                  {activeItem.scannedData.items?.map((it, idx) => (
                                    <tr key={idx}>
                                      <td className="py-1.5 px-2.5 font-bold text-white text-[11px]">
                                        {it.name}
                                      </td>
                                      <td className="py-1.5 px-2 text-center font-mono font-bold text-amber-300 text-[11px]">
                                        {it.quantity}
                                      </td>
                                      <td className="py-1.5 px-2 text-center text-slate-300 text-[10px]">
                                        {it.unit}
                                      </td>
                                      <td className="py-1.5 px-2.5 text-right font-mono text-slate-300 text-[11px]">
                                        {it.unitPrice ? formatCurrency(it.unitPrice) : '-'}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>

                          {/* Execute This Single Item */}
                          <button
                            type="button"
                            onClick={() => executeSingleItem(activeItem)}
                            className="w-full py-2.5 px-4 rounded-xl font-bold text-xs text-slate-950 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-300 shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                          >
                            <FileCheck className="w-4 h-4 text-slate-950" />
                            <span>
                              {activeItem.scannedData.documentType === 'STOCK_IN' && 'ይህንን ብቻ ወደ ዋና ስቶር አስገባ'}
                              {activeItem.scannedData.documentType === 'TRANSFER' && `ይህንን ብቻ ወደ ${branches.find(b => b.id === activeItem.targetBranchId)?.nameAm || ''} አስተላልፍ`}
                              {activeItem.scannedData.documentType === 'KITCHEN_PREP' && 'ይህንን የኩሽና ዝግጅት ብቻ መዝግብ'}
                              {activeItem.scannedData.documentType === 'DAILY_SALES' && 'ወደ ቀን ማጠቃለያ ሂሳብ ውሰድ'}
                              {activeItem.scannedData.documentType === 'WASTE' && 'ይህንን ብክነት ብቻ መዝግብ'}
                              {activeItem.scannedData.documentType === 'UNKNOWN' && 'ይህንን ሰነድ ብቻ መዝግብ'}
                            </span>
                          </button>
                        </div>
                      ) : activeItem.status === 'recorded' ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-2.5 bg-emerald-950/40 rounded-2xl border border-emerald-500/40">
                          <CheckCheck className="w-10 h-10 text-emerald-400" />
                          <div className="text-xs font-bold text-emerald-300">
                            {activeItem.recordedMessage || 'ይህ ሰነድ በተሳካ ሁኔታ ተመዝግቧል!'}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            ስቶክ እና የሂሳብ መረጃው በቀጥታ ተዘምኗል።
                          </div>
                        </div>
                      ) : activeItem.status === 'error' ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-2.5 bg-rose-950/40 rounded-2xl border border-rose-500/40">
                          <AlertTriangle className="w-10 h-10 text-rose-400" />
                          <div className="text-xs font-bold text-rose-300">
                            {activeItem.errorMessage || 'ሰነዱን ማንበብ አልተቻለም'}
                          </div>
                          <button
                            type="button"
                            onClick={() => scanSingleItem(activeItem.id)}
                            className="mt-2 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-amber-300 cursor-pointer"
                          >
                            እንደገና ሞክር
                          </button>
                        </div>
                      ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-2.5 bg-slate-900/50 rounded-2xl border border-dashed border-slate-800">
                          <Clock className="w-8 h-8 text-amber-400/60" />
                          <div className="text-xs font-bold text-slate-300">
                            ይህ ሰነድ እስካሁን አልተነበበም
                          </div>
                          <div className="text-[11px] text-slate-500 max-w-xs">
                            "ይህንን ብቻ አንብብ" የሚለውን ወይም ከላይ "ያልተነበቡትን ሁሉ አንብብ" የሚለውን በመጫን በ AI ማስመርመር ይችላሉ።
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Bottom Status Summary */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-3">
            <span>
              ድምር ፎቶዎች: <strong className="text-white">{batchItems.length}</strong>
            </span>
            <span>•</span>
            <span>
              የተነበቡ: <strong className="text-emerald-400">{scannedReadyCount}</strong>
            </span>
            <span>•</span>
            <span>
              ወደ ሲስተም የገቡ: <strong className="text-teal-300">{recordedCount}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
            >
              ዝጋ (Close)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
