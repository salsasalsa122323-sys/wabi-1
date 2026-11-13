import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { execFile } from 'child_process';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Body parser for JSON with 25MB limit for high-res photo uploads
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// API endpoint to analyze and OCR voucher photos
app.post('/api/scan-voucher', async (req, res) => {
  try {
    const { imageBase64, mimeType } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: 'ምስል አልተላከም (Image required)' });
    }

    const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z]+;base64,/, '');
    const cleanMime = mimeType || 'image/jpeg';

    const systemPrompt = `You are an expert restaurant/hotel ERP auditor and document parser specialized in Ethiopian hotel operations.
Analyze this photo of an Ethiopian hotel/restaurant voucher, handwritten kitchen slip, store transfer note, cash register Z-report, or receipt.

Extract all details into a clean JSON object with this exact schema:
{
  "documentType": "STOCK_IN" | "TRANSFER" | "KITCHEN_PREP" | "DAILY_SALES" | "WASTE" | "UNKNOWN",
  "documentTypeAm": string (e.g. "የገቢ እቃ (GRN)", "የስቶር ዝውውር", "የኩሽና ቅድመ-ዝግጅት", "የዕለቱ ሽያጭ", "ብክነት"),
  "detectedBranch": string (e.g. "ኮኮናት", "ሾላ", "6 ኪሎ", "ዋና ስቶር" or branch name detected on paper),
  "date": string (detected date in YYYY-MM-DD or empty if not detected),
  "ethiopianDateStr": string (e.g. "ጥቅምት 17/2018"),
  "referenceNo": string (voucher/receipt number or auto-generated like "VOUCH-102"),
  "hasSignature": boolean (true if there are handwritten signatures or stamps of sender, receiver, chef, or store keeper),
  "signatureStatusAm": string (e.g. "የተፈረመበት ደረሰኝ ነው (Signed)" or "ፊርማ አልተገኘም (Unsigned)"),
  "signedBy": string (names or titles of who signed, e.g. "ስቶር ጠባቂ / ሼፍ"),
  "notes": string,
  "items": [
    {
      "name": string (item name in Amharic or English, e.g. "እንቁላል", "የበሬ ስጋ", "ዘይት", "በርገር ዳቦ"),
      "quantity": number,
      "unit": string (e.g. "ኪ.ግ", "ሊትር", "ፍሬ", "ካርቶን"),
      "unitPrice": number,
      "subTotal": number
    }
  ],
  "totalAmount": number,
  "summaryAmharic": string (concise, clear Amharic summary of what this document is and what action should be taken in ERP)
}

Important Instructions:
- Support both handwritten Amharic notes, English text, and printed POS slips.
- Verify whether handwritten signatures or company stamps exist on the document.
- If it is a kitchen prep note (e.g. "ዛሬ 5 ኪሎ ማዮኔዝ ተዘጋጅቷል"), documentType is "KITCHEN_PREP".
- If it is a transfer from main store to kitchen, documentType is "TRANSFER".
- If it is items received from suppliers, documentType is "STOCK_IN".
- If it is evening sales, documentType is "DAILY_SALES".
- Return ONLY valid JSON.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { text: systemPrompt },
            {
              inlineData: {
                data: cleanBase64,
                mimeType: cleanMime,
              },
            },
          ],
        },
      ],
      config: {
        responseMimeType: 'application/json',
      },
    });

    const text = response.text || '{}';
    const parsed = JSON.parse(text);
    return res.json({ success: true, data: parsed });
  } catch (error: any) {
    console.error('Scan voucher error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'ሰነዱን ማንበብ አልተቻለም። እባክዎ እንደገና ይሞክሩ።',
    });
  }
});

// API endpoint: Advanced F&B Photo Scanner for Count Sheets, Chef Captain Orders, Cashier Sales, and Management Allowance
app.post('/api/scan-branch-photo', async (req, res) => {
  try {
    const { imageBase64, mimeType, preferredCategory, branchName, knownItems } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: 'ምስል አልተላከም (Image required)' });
    }

    const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z]+;base64,/, '');
    const cleanMime = mimeType || 'image/jpeg';

    const systemPrompt = `You are an expert Ethiopian Restaurant & Hotel F&B Inventory Auditor and Document Recognition AI.
The user is providing a photo taken with a smartphone camera or document scanner of a paper document from an Ethiopian restaurant branch (${branchName || 'Bello Fam Restaurant'}).

The document belongs to one of these operational document types:
1. "COUNT_SHEET" : Daily physical stock count sheet (የጠዋት ወይም የማታ ቆጠራ ቅጽ). Contains counted raw materials or portions (e.g. Beef/ስጋ, Chicken/ዶሮ, Oil/ዘይት, Butter/ቅቤ, Cheese/አይብ, Bread/ዳቦ, Eggs/እንቁላል, Teff/ጤፍ).
2. "CHEF_CAPTAIN_ORDERS" : Kitchen Captain Order slip / KOT (የሼፎች ካፕቴን ኦርደር ወረቀት). Written by waiters/captains or printed for kitchen chefs to prepare food (e.g. 5 Special Tibs, 3 Roast Chicken, 10 Burger).
3. "CASHIER_SALES" : Cashier POS register roll / Z-report / cash sales list (የካሸር ሽያጭ ሪፖርት). Contains billed food items with quantities and prices sold to customers.
4. "MANAGEMENT_ALLOWANCE" : Management consumption / staff meal voucher (የማኔጅመንት አሎአንስ / አመጋገብ). Food eaten by managers or staff on company account.
5. "STORE_RECEIVED" : Store Issue Voucher (SIV) or Delivery Note (ከማዕከላዊ ስቶር የተረከበ እቃ). Ingredients received by the branch kitchen.

User preferred hint (if provided): "${preferredCategory || 'AUTO'}".
Known items and menu dishes in this restaurant: ${JSON.stringify(knownItems || [])}.

Analyze the image carefully (it may have handwritten Amharic/English, printed POS receipt fonts, tables, checkboxes, numbers, or rubber stamps).

Return ONLY a valid JSON object matching this exact schema:
{
  "detectedType": "COUNT_SHEET" | "CHEF_CAPTAIN_ORDERS" | "CASHIER_SALES" | "MANAGEMENT_ALLOWANCE" | "STORE_RECEIVED" | "OTHER",
  "detectedTypeAm": string,
  "countType": "BEGINNING" | "ENDING" | "UNKNOWN",
  "detectedBranch": string,
  "detectedDate": string,
  "referenceNo": string,
  "notes": string,
  "items": [
    {
      "rawName": string,
      "matchedItem": string,
      "quantity": number,
      "unit": string,
      "unitPrice": number,
      "totalAmount": number,
      "targetField": "beginningInventory" | "actualEnding" | "cashierSalesQty" | "chefCaptainOrderQty" | "managementConsumption" | "received"
    }
  ],
  "summaryAmharic": string,
  "confidenceScore": number
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { text: systemPrompt },
            {
              inlineData: {
                data: cleanBase64,
                mimeType: cleanMime,
              },
            },
          ],
        },
      ],
      config: {
        responseMimeType: 'application/json',
      },
    });

    const text = response.text || '{}';
    const parsed = JSON.parse(text);
    return res.json({ success: true, data: parsed });
  } catch (error: any) {
    console.error('Scan branch photo error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'ፎቶውን ማንበብ አልተቻለም። እባክዎ እንደገና ይሞክሩ።',
    });
  }
});


// API endpoint: AI-powered Excel sheet structure detection and column mapping
app.post('/api/classify-excel-sheet', async (req, res) => {
  try {
    const { fileName, sheetName, headers, sampleRows, knownBranches } = req.body;
    if (!headers || !Array.isArray(headers)) {
      return res.status(400).json({ error: 'Headers array is required' });
    }

    const systemPrompt = `You are a senior Food & Beverage (F&B) Cost Controller and data engineer in Addis Ababa, Ethiopia.
Your job is to inspect an uploaded restaurant/hotel Excel spreadsheet, identify its exact category, target branch, date period, and map the column headers to our standard schema.

Supported File Categories:
1. "store_receipts" : Goods Received Note (GRN) into the main store from suppliers. (Columns often: Supplier, Item, Qty, Unit, Unit Price, Total, Date, GRN No).
2. "store_issues" : Items issued from main store to kitchen/branches (SIV). (Columns often: Item, Qty, Unit, Unit Price, Branch/Destination, Date, SIV No).
3. "price_catalog" : Item price list / transfer prices sent from store to branch. (Columns often: Item Name, Code, Unit, Purchase Price, Selling Price).
4. "kitchen_stock_counts" : Branch physical stock count. (Columns often: Item Name, Opening Stock, Received, Wastage, Closing/Counted Stock, Date).
5. "kitchen_production" : Kitchen chef daily production report. (Columns often: Menu Item / Dish, Portions Produced, Date, Shift).
6. "cashier_sales" : Cashier POS shift/day sales report. (Columns often: Menu Item, Quantity Sold, Unit Price, Total Amount, Branch, Date, Shift).

Known branches to check for in the text/headers/rows: ${JSON.stringify(knownBranches || ['Cocoon 6 Kilo (ኮኮን 6 ኪሎ)', 'Cocoon Shola (ኮኮን ሾላ)', 'Central Store (ማዕከላዊ ስቶር)'])}.

Analyze the following Excel metadata:
- File Name: "${fileName || ''}"
- Sheet Name: "${sheetName || ''}"
- Available Column Headers: ${JSON.stringify(headers)}
- Sample Rows (first few rows): ${JSON.stringify((sampleRows || []).slice(0, 5))}

Return ONLY a valid JSON object matching this exact schema:
{
  "fileType": "store_receipts" | "store_issues" | "price_catalog" | "kitchen_stock_counts" | "kitchen_production" | "cashier_sales" | "unknown",
  "fileTypeLabelAm": string,
  "detectedBranch": string,
  "detectedDatePeriod": string,
  "columnMapping": {
    "itemName": string | null,
    "itemCode": string | null,
    "quantity": string | null,
    "unit": string | null,
    "unitPrice": string | null,
    "totalPrice": string | null,
    "branchName": string | null,
    "date": string | null,
    "shift": string | null,
    "refNo": string | null,
    "openingStock": string | null,
    "receivedStock": string | null,
    "closingStock": string | null,
    "wastage": string | null,
    "supplier": string | null
  },
  "confidence": number,
  "reasoning": string
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [{ role: 'user', parts: [{ text: systemPrompt }] }],
      config: {
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json({ success: true, data: parsed });
  } catch (error: any) {
    console.error('Classify Excel error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Excel ፋይሉን መለየት አልተቻለም።',
    });
  }
});

// API endpoint: AI Human Controller Narrative & Pattern Anomaly Detection
app.post('/api/generate-controller-narrative', async (req, res) => {
  try {
    const { branchName, period, reconciliationData } = req.body;
    if (!reconciliationData) {
      return res.status(400).json({ error: 'reconciliationData is required' });
    }

    const systemPrompt = `You are an elite, highly experienced F&B Cost Controller writing an executive audit report for the General Manager and Finance Director of an Ethiopian restaurant group.
Write an authentic, human-like plain-language narrative explaining the reconciliation results. Do NOT invent numbers; use ONLY the exact numbers provided in the input summary.

Reconciliation Summary for ${branchName} (${period}):
${JSON.stringify(reconciliationData, null, 2)}

Provide your response in JSON format with this exact structure:
{
  "executiveSummaryAm": string (2-3 paragraphs in polished Amharic as a human auditor, highlighting top financial variances, root causes like unrecorded store transfers, recipe over-portioning or shrinkage, and cashier sales mismatches),
  "executiveSummaryEn": string (equivalent 2-3 paragraphs in professional English),
  "anomalies": [
    {
      "title": string,
      "severity": "HIGH" | "MEDIUM" | "LOW",
      "description": string,
      "affectedItems": string[]
    }
  ],
  "actionItems": string[] (concrete immediate actions for management, e.g. "Conduct immediate physical count of Beef Tenderloin with Kitchen Chef", "Verify SIV receipt signatures between Store and Cocoon 6 Kilo")
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [{ role: 'user', parts: [{ text: systemPrompt }] }],
      config: {
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json({ success: true, data: parsed });
  } catch (error: any) {
    console.error('Generate narrative error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'ሪፖርቱን ማመንጨት አልተቻለም።',
    });
  }
});

// --------------------------------------------------------------------------
// API endpoint: F&B Control System Data Matcher / Parser (4 Document Types)
// Supports: BEGINNING_BALANCE, ENDING_BALANCE, CHEF_SOLD_LIST, CASHIER_SALES
// --------------------------------------------------------------------------
app.post('/api/match-fnb-data', async (req, res) => {
  try {
    const { doc_type, pasted_data, item_list, menu_list } = req.body;
    if (!doc_type || !pasted_data) {
      return res.status(400).json({ error: 'doc_type and pasted_data are required' });
    }

    const systemPrompt = `አንተ በሆቴል/ካፌ የምግብና መጠጥ ቁጥጥር (F&B Control) ሲስተም ውስጥ የምትሰራ የዳታ ማመሳሰያ ረዳት ነህ።

ተጠቃሚው ከወረቀት የተገለበጠ ጽሑፍ ይለጥፋል። አንተ እያንዳንዱን መስመር አንብበህ በሲስተሙ ካለው ዝርዝር ጋር በስም ታመሳስላለህ።

ግብዓት፦
1. DOC_TYPE — የወረቀቱ ዓይነት፤ ከአራቱ አንዱ፦
   - BEGINNING_BALANCE (የመጀመሪያ ባላንስ)
   - ENDING_BALANCE (የመዝጊያ ባላንስ)
   - CHEF_SOLD_LIST (የሼፍ የተሸጠ ምግብ ዝርዝር)
   - CASHIER_SALES (የካሸር ሽያጭ ሪፖርት)
2. PASTED_DATA — የተለጠፈው ጽሑፍ (አማርኛ፣ እንግሊዝኛ ወይም ድብልቅ)።
3. ITEM_LIST — የስቶር ዕቃዎች (id፣ ስም፣ ዩኒት፣ aliases)። ለBEGINNING_BALANCE እና ENDING_BALANCE ብቻ።
4. MENU_LIST — የሜኑ ምግቦች (id፣ ስም፣ ዋጋ፣ aliases)። ለCHEF_SOLD_LIST እና CASHIER_SALES ብቻ።

አጠቃላይ ደንቦች፦
1. በDOC_TYPE መሠረት ትክክለኛውን ዝርዝር ተጠቀም (ባላንስ → ITEM_LIST፣ ሽያጭ → MENU_LIST)።
2. እያንዳንዱን መስመር ለየብቻ አንብብ፤ ስም፣ ብዛት፣ ዩኒት (እና ዋጋ ካለ) ለይ።
3. የፊደል ስህተት፣ የቃላት ቅደም ተከተል፣ አማርኛ/እንግሊዝኛ ድብልቅ፣ አህጽሮተ ቃላት (abbr) ተቀብለህ አመሳስል።
4. የመተማመን ደረጃ (confidence)፦
   - "ከፍተኛ" (High) — ስሙ ወይም alias ልክ ከሆነ
   - "መካከለኛ" (Medium) — በትንሽ የፊደል ልዩነት ወይም ግምት ከተመሳሰለ
   - "ዝቅተኛ" (Low) — እርግጠኛ ካልሆንክ ወይም አጠራጣሪ ከሆነ
5. ድግግሞሽ (Duplicate)፦ አንድ እቃ ከአንድ ጊዜ በላይ ከተጠቀሰ ለይተህ አሳይ ("ድግግሞሽ" በwarning ውስጥ አስቀምጥ)።
6. ያልተገኘ አዲስ እቃ፦ በሲስተሙ ዝርዝር ውስጥ የሌለ ከሆነ "new_items" ውስጥ አካትት።
7. ጥርጣሬ ወይም ማረጋገጫ የሚያስፈልገው፦ "needs_review" ውስጥ ከነምክንያቱ አስቀምጥ።
8. የዩኒት ቅየራ (Unit Conversion)፦ ለምሳሌ 500g ከሆነ ወደ 0.5kg ቀይረህ "converted": true አድርግ። ያለበለዚያ "converted": false።
9. ለCASHIER_SALES ብቻ፦
   - quantity * unit_price == line_total መሆኑን አረጋግጥ። ስህተት ካለ "calc_error": true እና "warning": "ስሌት አይመጣጠንም" በል።
   - በወረቀቱ ላይ የተገለጸ ጠቅላላ ድምር (Sheet Total) ካለ አስልተህ ከትክክለኛው ድምር ጋር አወዳድር።
10. ውጤቱን በSTRICT JSON ብቻ መልስ፤ ከJSON ውጪ ምንም ዓይነት ጽሑፍ አትጨምር።

የውጤት ቅርጸት (Strict JSON Schema):
{
  "doc_type": "${doc_type}",
  "matched": [
    {
      "id": "string (system item/menu id)",
      "name": "string (name from paper)",
      "matched_system_name": "string (official system name)",
      "quantity": number,
      "unit": "string",
      "confidence": "ከፍተኛ" | "መካከለኛ" | "ዝቅተኛ",
      "converted": boolean,
      "unit_price": number,
      "line_total": number,
      "calc_error": boolean,
      "warning": string | null
    }
  ],
  "needs_review": [
    {
      "raw_text": "string (original ambiguous line)",
      "reason": "string (why it needs review)",
      "suggested_matches": [
        {
          "id": "string",
          "name": "string",
          "confidence": "መካከለኛ" | "ዝቅተኛ"
        }
      ]
    }
  ],
  "new_items": [
    {
      "raw_name": "string",
      "quantity": number,
      "unit": "string",
      "unit_price": number
    }
  ],
  "sheet_total": {
    "stated": number | null,
    "calculated": number,
    "matches": boolean,
    "difference": number
  }
}`;

    const userMessage = `DOC_TYPE: ${doc_type}

PASTED_DATA:
${pasted_data}

ITEM_LIST:
${JSON.stringify(item_list || [])}

MENU_LIST:
${JSON.stringify(menu_list || [])}`;

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('AI generation timed out')), 4000)
    );

    const generatePromise = ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [
        {
          role: 'user',
          parts: [{ text: `${systemPrompt}\n\n---\n${userMessage}` }],
        },
      ],
      config: {
        responseMimeType: 'application/json',
      },
    });

    const response = (await Promise.race([generatePromise, timeoutPromise])) as any;

    const parsed = JSON.parse(response.text || '{}');
    return res.json({ success: true, data: parsed });
  } catch (error: any) {
    console.warn('AI matching experienced remote error, activating deterministic F&B engine:', error?.message || error);
    
    // Server-side deterministic fallback engine
    try {
      const { doc_type, pasted_data, item_list, menu_list } = req.body;
      const lines = String(pasted_data || '').split(/[\r\n]+/);
      const matchedList: any[] = [];
      const needsReviewList: any[] = [];
      const newItemsList: any[] = [];
      const seenIds = new Set<string>();

      let statedSheetTotal: number | null = null;
      let calculatedSheetTotal = 0;
      const isRawMaterial = doc_type === 'BEGINNING_BALANCE' || doc_type === 'ENDING_BALANCE';

      for (const line of lines) {
        const rawLine = line.trim();
        if (!rawLine || rawLine.startsWith('---') || rawLine.startsWith('===')) continue;

        const totalMatch = rawLine.match(/(?:ጠቅላላ\s*ድምር|ድምር|total|grand\s*total)[:=\s]+(\d+(?:\.\d+)?)/i);
        if (totalMatch) {
          statedSheetTotal = parseFloat(totalMatch[1]);
          continue;
        }

        if (isRawMaterial) {
          let converted = false;
          let detectedUnit = 'kg';
          let parsedQty = 0;

          const gramMatch = rawLine.match(/(\d+(?:\.\d+)?)\s*(?:g|gm|gram|ግራም)\b/i);
          if (gramMatch) {
            parsedQty = parseFloat(gramMatch[1]) / 1000;
            converted = true;
            detectedUnit = 'kg';
          } else {
            const numMatch = rawLine.match(/(\d+(?:\.\d+)?)/);
            if (numMatch) parsedQty = parseFloat(numMatch[1]);
            if (rawLine.match(/(?:lt|liter|ሊትር)/i)) detectedUnit = 'lt';
            else if (rawLine.match(/(?:pcs|piece|ፍሬ|ቁጥር)/i)) detectedUnit = 'pcs';
            else if (rawLine.match(/(?:kg|kilo|ኪ\.?ግ)/i)) detectedUnit = 'kg';
          }

          const cleanName = rawLine
            .replace(/(\d+(?:\.\d+)?)/g, '')
            .replace(/(?:kg|kilo|ኪ\.?ግ|lt|liter|ሊትር|pcs|piece|ፍሬ|g|gm|gram|ግራም)/gi, '')
            .replace(/[:=–\-_()]/g, ' ')
            .trim()
            .toLowerCase();

          if (!cleanName && parsedQty === 0) continue;

          let bestItem: any = null;
          let highestScore = 0;

          for (const item of (item_list || [])) {
            const nAm = String(item.name || item.nameAm || '').toLowerCase();
            const nEn = String(item.nameEn || '').toLowerCase();
            const cd = String(item.code || '').toLowerCase();
            const aliases = Array.isArray(item.aliases) ? item.aliases.map((a: any) => String(a).toLowerCase()) : [];

            let score = 0;
            if (cleanName === nAm || cleanName === nEn || aliases.includes(cleanName)) score = 100;
            else if (nAm.includes(cleanName) || cleanName.includes(nAm)) score = 80;
            else if (nEn.includes(cleanName) || cleanName.includes(nEn)) score = 70;
            else {
              const tokens = cleanName.split(/\s+/).filter((t: string) => t.length > 1);
              for (const tok of tokens) {
                if (nAm.includes(tok)) score += 30;
                if (nEn.includes(tok)) score += 25;
                if (cd.includes(tok)) score += 20;
                if (aliases.some((a: string) => a.includes(tok))) score += 25;
              }
            }

            if (score > highestScore && score >= 20) {
              highestScore = score;
              bestItem = item;
            }
          }

          if (bestItem) {
            const isDuplicate = seenIds.has(bestItem.id);
            seenIds.add(bestItem.id);
            const confidence = highestScore >= 80 ? 'ከፍተኛ' : highestScore >= 40 ? 'መካከለኛ' : 'ዝቅተኛ';
            const unitPrice = Number(bestItem.unit_price || bestItem.lastPurchasePrice || 0);

            matchedList.push({
              id: bestItem.id,
              name: rawLine,
              matched_system_name: bestItem.name || bestItem.nameAm,
              quantity: parsedQty,
              unit: detectedUnit,
              confidence,
              converted,
              unit_price: unitPrice,
              line_total: parsedQty * unitPrice,
              calc_error: false,
              warning: isDuplicate ? 'ድግግሞሽ' : null,
            });
          } else if (cleanName) {
            newItemsList.push({
              raw_name: cleanName,
              quantity: parsedQty,
              unit: detectedUnit,
              unit_price: 0,
            });
          }
        } else {
          // CHEF_SOLD_LIST or CASHIER_SALES
          let qty = 0;
          let unitPrice = 0;
          let lineTotal = 0;

          const calcMatch = rawLine.match(/(.+?)\s+(\d+(?:\.\d+)?)\s*[xX*]\s*(\d+(?:\.\d+)?)\s*=\s*(\d+(?:\.\d+)?)/);
          let cleanName = '';

          if (calcMatch) {
            cleanName = calcMatch[1].trim();
            qty = parseFloat(calcMatch[2]);
            unitPrice = parseFloat(calcMatch[3]);
            lineTotal = parseFloat(calcMatch[4]);
          } else {
            const nums = rawLine.match(/\d+(?:\.\d+)?/g);
            if (nums && nums.length >= 1) {
              qty = parseFloat(nums[0]);
              if (nums.length >= 2) unitPrice = parseFloat(nums[1]);
              if (nums.length >= 3) lineTotal = parseFloat(nums[2]);
              else lineTotal = qty * unitPrice;
            }
            cleanName = rawLine
              .replace(/\d+(?:\.\d+)?/g, '')
              .replace(/[:=–\-_()xX*]/g, ' ')
              .trim();
          }

          const cleanKey = cleanName.toLowerCase();
          if (!cleanKey && qty === 0) continue;

          let bestDish: any = null;
          let highestScore = 0;

          for (const dish of (menu_list || [])) {
            const nAm = String(dish.name || dish.nameAm || '').toLowerCase();
            const nEn = String(dish.nameEn || '').toLowerCase();
            const aliases = Array.isArray(dish.aliases) ? dish.aliases.map((a: any) => String(a).toLowerCase()) : [];

            let score = 0;
            if (cleanKey === nAm || cleanKey === nEn || aliases.includes(cleanKey)) score = 100;
            else if (nAm.includes(cleanKey) || cleanKey.includes(nAm)) score = 80;
            else if (nEn.includes(cleanKey) || cleanKey.includes(nEn)) score = 70;
            else {
              const tokens = cleanKey.split(/\s+/).filter((t: string) => t.length > 1);
              for (const tok of tokens) {
                if (nAm.includes(tok)) score += 30;
                if (nEn.includes(tok)) score += 25;
                if (aliases.some((a: string) => a.includes(tok))) score += 25;
              }
            }

            if (score > highestScore && score >= 20) {
              highestScore = score;
              bestDish = dish;
            }
          }

          if (bestDish) {
            const isDuplicate = seenIds.has(bestDish.id);
            seenIds.add(bestDish.id);

            const officialPrice = Number(bestDish.price || bestDish.sellingPrice || 0);
            const priceUsed = unitPrice > 0 ? unitPrice : officialPrice;
            const calculatedLine = qty * priceUsed;
            if (lineTotal === 0) lineTotal = calculatedLine;

            const isCalcMismatch = doc_type === 'CASHIER_SALES' && Math.abs(calculatedLine - lineTotal) > 0.01;
            calculatedSheetTotal += lineTotal;

            const confidence = highestScore >= 80 ? 'ከፍተኛ' : highestScore >= 40 ? 'መካከለኛ' : 'ዝቅተኛ';

            matchedList.push({
              id: bestDish.id,
              name: cleanName || rawLine,
              matched_system_name: bestDish.name || bestDish.nameAm,
              quantity: qty,
              unit: 'portion',
              confidence,
              converted: false,
              unit_price: priceUsed,
              line_total: lineTotal,
              calc_error: isCalcMismatch,
              warning: isCalcMismatch ? 'ስሌት አይመጣጠንም' : isDuplicate ? 'ድግግሞሽ' : null,
            });
          } else if (cleanName) {
            newItemsList.push({
              raw_name: cleanName,
              quantity: qty,
              unit: 'portion',
              unit_price: unitPrice,
            });
          }
        }
      }

      const sheetTotal = {
        stated: statedSheetTotal,
        calculated: calculatedSheetTotal,
        matches: statedSheetTotal !== null ? Math.abs(statedSheetTotal - calculatedSheetTotal) < 1 : true,
        difference: statedSheetTotal !== null ? Math.round((calculatedSheetTotal - statedSheetTotal) * 100) / 100 : 0,
      };

      return res.json({
        success: true,
        data: {
          doc_type,
          matched: matchedList,
          needs_review: needsReviewList,
          new_items: newItemsList,
          sheet_total: sheetTotal,
        },
      });
    } catch (fallbackErr: any) {
      return res.status(500).json({
        success: false,
        error: fallbackErr.message || 'ዳታውን ማመሳከር አልተቻለም።',
      });
    }
  }
});

// --------------------------------------------------------------------------
// LIVE STORE & CATALOG SERVER SYNCHRONIZATION
// Guarantees manager's laptop & storekeeper's phone have 100% identical items!
// --------------------------------------------------------------------------
const DATA_DIR = path.resolve(process.cwd(), 'data');
const CATALOG_FILE = path.join(DATA_DIR, 'shared_store_catalog.json');
const ACTIVITIES_FILE = path.join(DATA_DIR, 'shared_store_activities.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const BRANCH_DAILY_FILE_PATH = path.join(DATA_DIR, 'branch_daily_records.json');

// 1. Sync Catalog (Manager or Storekeeper pushes current items to server)
app.post('/api/store/sync-catalog', (req, res) => {
  try {
    const { items, managerName } = req.body;
    if (!Array.isArray(items)) {
      return res.status(400).json({ error: 'items array is required' });
    }
    if (items.length === 0) {
      if (fs.existsSync(CATALOG_FILE)) {
        fs.unlinkSync(CATALOG_FILE);
      }
      return res.json({ success: true, count: 0 });
    }

    // Reject stale legacy 134-item AutoSync dump from old browser sessions
    const isLegacySeedDump =
      items.length >= 50 &&
      items.some(
        (it: any) =>
          it?.id === 'raw-beef' &&
          Array.isArray(it?.priceHistory) &&
          it.priceHistory[0]?.grnNumber === 'GRN-LAST-01'
      );
    if (isLegacySeedDump) {
      if (fs.existsSync(CATALOG_FILE)) {
        fs.unlinkSync(CATALOG_FILE);
      }
      console.log('[StoreSync] Blocked legacy 134-item AutoSync sample catalog dump.');
      return res.json({ success: true, count: 0, ignoredLegacySeed: true });
    }

    const payload = {
      updatedAt: new Date().toISOString(),
      updatedBy: managerName || 'Manager',
      itemCount: items.length,
      items,
    };
    fs.writeFileSync(CATALOG_FILE, JSON.stringify(payload, null, 2), 'utf-8');
    console.log(`[StoreSync] Master catalog updated on server with ${items.length} items by ${managerName || 'Manager'}`);
    return res.json({ success: true, count: items.length });
  } catch (err: any) {
    console.error('Error saving catalog to server:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 1b. Reset server-cached store catalog, activities & branch daily records cleanly to zero
app.post('/api/store/reset-zero', (_req, res) => {
  try {
    [CATALOG_FILE, ACTIVITIES_FILE, BRANCH_DAILY_FILE_PATH].forEach((filePath) => {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    });
    console.log('[StoreSync] Server catalog, activities, and daily records reset cleanly to zero.');
    return res.json({ success: true });
  } catch (err: any) {
    console.error('Error resetting server store files:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Get Catalog (Returns shared master store items)
app.get('/api/store/catalog', (_req, res) => {
  try {
    if (fs.existsSync(CATALOG_FILE)) {
      const raw = fs.readFileSync(CATALOG_FILE, 'utf-8');
      const data = JSON.parse(raw);
      return res.json({ success: true, data });
    }
    return res.json({ success: true, data: null });
  } catch (err: any) {
    console.error('Error reading catalog from server:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Add Item (Storekeeper or Manager adds an item on the fly)
app.post('/api/store/add-item', (req, res) => {
  try {
    const { item } = req.body;
    if (!item || !item.nameAm) {
      return res.status(400).json({ error: 'Valid item object is required' });
    }

    let existingItems: any[] = [];
    if (fs.existsSync(CATALOG_FILE)) {
      try {
        const raw = fs.readFileSync(CATALOG_FILE, 'utf-8');
        const data = JSON.parse(raw);
        if (Array.isArray(data.items)) {
          existingItems = data.items;
        }
      } catch {}
    }

    const idx = existingItems.findIndex(
      (it: any) => it.id === item.id || it.nameAm.trim().toLowerCase() === item.nameAm.trim().toLowerCase()
    );

    if (idx >= 0) {
      existingItems[idx] = { ...existingItems[idx], ...item };
    } else {
      existingItems.push(item);
    }

    const payload = {
      updatedAt: new Date().toISOString(),
      updatedBy: 'Storekeeper',
      itemCount: existingItems.length,
      items: existingItems,
    };

    fs.writeFileSync(CATALOG_FILE, JSON.stringify(payload, null, 2), 'utf-8');
    console.log(`[StoreSync] New item "${item.nameAm}" saved on server. Total items now: ${existingItems.length}`);
    return res.json({ success: true, item, totalCount: existingItems.length, items: existingItems });
  } catch (err: any) {
    console.error('Error adding item on server:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 4. Record Activity (Storekeeper GRN or SIV) and update master catalog in real time
app.post('/api/store/record-activity', (req, res) => {
  try {
    const { activity } = req.body;
    if (!activity) return res.status(400).json({ error: 'Activity is required' });

    let activities: any[] = [];
    if (fs.existsSync(ACTIVITIES_FILE)) {
      try {
        const raw = fs.readFileSync(ACTIVITIES_FILE, 'utf-8');
        activities = JSON.parse(raw);
      } catch {}
    }

    const activityRecord = {
      id: activity.id || `act-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      ...activity,
      serverTimestamp: new Date().toISOString(),
    };

    activities.unshift(activityRecord);
    if (activities.length > 500) activities = activities.slice(0, 500);
    fs.writeFileSync(ACTIVITIES_FILE, JSON.stringify(activities, null, 2), 'utf-8');

    // Also update current item stock directly in master catalog
    if (fs.existsSync(CATALOG_FILE) && activity.itemId) {
      try {
        const rawCat = fs.readFileSync(CATALOG_FILE, 'utf-8');
        const catData = JSON.parse(rawCat);
        if (Array.isArray(catData.items)) {
          const itemIdx = catData.items.findIndex((it: any) => it.id === activity.itemId);
          if (itemIdx >= 0) {
            const item = catData.items[itemIdx];
            const oldStock = Number(item.currentCentralStock || 0);
            const qty = Number(activity.quantity || 0);
            if (activity.type === 'GRN') {
              const newPrice = Number(activity.unitPrice || item.lastPurchasePrice || 0);
              const oldCost = Number(item.weightedAvgCost || item.lastPurchasePrice || 0);
              const totalStock = oldStock + qty;
              const newWac = totalStock > 0 ? ((oldStock * oldCost) + (qty * newPrice)) / totalStock : newPrice;
              catData.items[itemIdx] = {
                ...item,
                currentCentralStock: totalStock,
                lastPurchasePrice: newPrice,
                weightedAvgCost: Number(newWac.toFixed(2)),
              };
            } else if (activity.type === 'SIV') {
              catData.items[itemIdx] = {
                ...item,
                currentCentralStock: Math.max(0, oldStock - qty),
              };
            }
            catData.updatedAt = new Date().toISOString();
            catData.updatedBy = 'Storekeeper Activity';
            fs.writeFileSync(CATALOG_FILE, JSON.stringify(catData, null, 2), 'utf-8');
          }
        }
      } catch (catErr) {
        console.warn('Error updating catalog from activity:', catErr);
      }
    }

    console.log(`[StoreActivity] Recorded ${activity.type} for item ${activity.itemId} by ${activity.recordedBy || 'Storekeeper'}`);
    return res.json({ success: true, activity: activityRecord });
  } catch (err: any) {
    console.error('Error recording activity on server:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 5. Get Activities
app.get('/api/store/activities', (_req, res) => {
  try {
    if (fs.existsSync(ACTIVITIES_FILE)) {
      const raw = fs.readFileSync(ACTIVITIES_FILE, 'utf-8');
      const data = JSON.parse(raw);
      return res.json({ success: true, activities: data });
    }
    return res.json({ success: true, activities: [] });
  } catch (err: any) {
    console.error('Error reading activities from server:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// --------------------------------------------------------------------------
// DAILY BRANCH CONTROL SERVER PERSISTENCE
// Prevents data loss across menu switches, page reloads, and dates
// --------------------------------------------------------------------------
const BRANCH_DAILY_FILE = path.join(DATA_DIR, 'branch_daily_records.json');

app.post('/api/branch-daily-save', (req, res) => {
  try {
    const { branchId, date, record } = req.body;
    if (!branchId || !date || !record) {
      return res.status(400).json({ error: 'branchId, date, and record are required' });
    }

    let allRecords: Record<string, any> = {};
    if (fs.existsSync(BRANCH_DAILY_FILE)) {
      try {
        const raw = fs.readFileSync(BRANCH_DAILY_FILE, 'utf-8');
        allRecords = JSON.parse(raw);
      } catch {}
    }

    const key = `${branchId}_${date}`;
    allRecords[key] = {
      ...record,
      serverSavedAt: new Date().toISOString(),
    };

    fs.writeFileSync(BRANCH_DAILY_FILE, JSON.stringify(allRecords, null, 2), 'utf-8');
    return res.json({ success: true, key });
  } catch (err: any) {
    console.error('Error saving branch daily record:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/branch-daily-records', (req, res) => {
  try {
    const branchId = req.query.branchId as string;
    if (!fs.existsSync(BRANCH_DAILY_FILE)) {
      return res.json({ success: true, records: {}, activeDates: [] });
    }

    const raw = fs.readFileSync(BRANCH_DAILY_FILE, 'utf-8');
    const allRecords = JSON.parse(raw);

    if (branchId) {
      const branchRecords: Record<string, any> = {};
      const activeDates: string[] = [];
      Object.entries(allRecords).forEach(([key, val]: [string, any]) => {
        if (key.startsWith(`${branchId}_`)) {
          const datePart = key.replace(`${branchId}_`, '');
          branchRecords[datePart] = val;
          activeDates.push(datePart);
        }
      });
      return res.json({ success: true, records: branchRecords, activeDates });
    }

    return res.json({ success: true, records: allRecords });
  } catch (err: any) {
    console.error('Error fetching branch daily records:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// --------------------------------------------------------------------------
// FULL-STACK SOURCE CODE ARCHIVE EXPORT (.ZIP)
// Packages complete clean-zero frontend + backend + config files for external deployment
// --------------------------------------------------------------------------
app.get('/api/export-full-source-zip', (_req, res) => {
  const rootDir = process.cwd();
  const outZip = path.join(os.tmpdir(), `Ethiopia_FNB_ERP_CleanZero_${Date.now()}.zip`);

  const pyScript = `
import os, sys, zipfile

root = sys.argv[1]
out_zip = sys.argv[2]

exclude_dirs = {'node_modules', 'dist', 'dev-dist', '.git', '.aistudio', '__pycache__', 'coverage', 'build'}
exclude_exts = ('.tar.gz', '.zip', '.tgz', '.log')

with zipfile.ZipFile(out_zip, 'w', zipfile.ZIP_DEFLATED) as zf:
    for dirpath, dirnames, filenames in os.walk(root):
        is_root = os.path.abspath(dirpath) == os.path.abspath(root)
        dirnames[:] = sorted([d for d in dirnames if d not in exclude_dirs and not (is_root and d == 'data')])
        rel_dir = os.path.relpath(dirpath, root)
        for fname in sorted(filenames):
            if fname == '.DS_Store' or fname.endswith(exclude_exts):
                continue
            if fname.startswith('.env') and fname != '.env.example':
                continue
            full_path = os.path.join(dirpath, fname)
            arc_name = fname if rel_dir == '.' else os.path.join(rel_dir, fname)
            zf.write(full_path, os.path.join('Ethiopia_FNB_ERP_CleanZero', arc_name))
    zf.writestr('Ethiopia_FNB_ERP_CleanZero/data/.gitkeep', '')
`;

  execFile('python3', ['-c', pyScript, rootDir, outZip], { maxBuffer: 10 * 1024 * 1024 }, (err) => {
    if (err) {
      console.error('Error creating full-stack zip:', err);
      return res.status(500).json({ success: false, error: 'Failed to create project zip archive.' });
    }
    res.download(outZip, 'Ethiopia_FNB_ERP_CleanZero_FullStack.zip', (downloadErr) => {
      try {
        if (fs.existsSync(outZip)) fs.unlinkSync(outZip);
      } catch {}
      if (downloadErr && !res.headersSent) {
        console.error('Error sending zip:', downloadErr);
      }
    });
  });
});

// Mount Vite in development or serve static in production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(process.cwd(), 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(process.cwd(), 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ERP Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
