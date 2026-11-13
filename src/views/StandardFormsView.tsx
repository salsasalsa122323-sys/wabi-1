import React, { useState } from 'react';
import {
  FileText,
  Printer,
  Download,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Users,
  ChefHat,
  Warehouse,
  Receipt,
  Scale,
  Sparkles,
  ShieldCheck,
  Eye,
  Copy,
  Scissors,
  ArrowRightLeft,
  CookingPot,
  FileCode,
  Check,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useApp } from '../context/AppContext';
import { formatEthiopianDate, getTodayDateString } from '../utils/ethiopianDate';

type FormType = 'siv' | 'kitchenPrep' | 'grn' | 'dailySales' | 'waste' | 'staffMeal';

export const StandardFormsView: React.FC = () => {
  const { language } = useLanguage();
  const { branches } = useApp();
  const [selectedForm, setSelectedForm] = useState<FormType>('siv');
  const [viewMode, setViewMode] = useState<'blank' | 'sample' | 'rules'>('blank');
  const [isPaperSaver, setIsPaperSaver] = useState<boolean>(true); // Default to Paper Saver (A5 - 2 per A4)
  const [copiedNotification, setCopiedNotification] = useState<string | null>(null);

  const todayStr = getTodayDateString();
  const ethDate = formatEthiopianDate(todayStr, language);

  const handlePrint = () => {
    window.print();
  };

  const formCatalog = [
    {
      id: 'siv' as FormType,
      titleAm: 'የስቶር ማስተላለፊያ ደረሰኝ (Store Transfer SIV)',
      titleEn: 'Store Issue Voucher (SIV)',
      shortTitleAm: 'የስቶር ማስተላለፊያ (SIV)',
      descAm: 'ከዋና ስቶር ወደ 3ቱ ብራንቾች (ኮኮናት 6 ኪሎ፣ ሾላ፣ ወዘተ) እቃ ሲላክ የሚሞላ',
      code: 'ETH-SIV-01',
      icon: ArrowRightLeft,
      targetRoleAm: 'ስቶር ኪፐር & የብራንች ሼፍ',
    },
    {
      id: 'kitchenPrep' as FormType,
      titleAm: 'የኩሽና የሶስ ዝግጅት ሎግ (Kitchen Prep Log)',
      titleEn: 'Kitchen Prep & Sauce Log',
      shortTitleAm: 'የሶስ ዝግጅት ሎግ (KPL)',
      descAm: 'ማዮኔዝ፣ ቦሎናይዝ፣ ዛፋራኖ፣ የፒዛ ስጋ ሲዘጋጅ ጥሬ ዕቃዎችን ለማቃለል',
      code: 'ETH-KPL-02',
      icon: CookingPot,
      targetRoleAm: 'የብራንች ሼፍ & ሄድ ሼፍ',
    },
    {
      id: 'grn' as FormType,
      titleAm: 'የዕቃ መረከቢያ ደረሰኝ (Store GRN)',
      titleEn: 'Goods Receiving Note (GRN)',
      shortTitleAm: 'የዕቃ መረከቢያ (GRN)',
      descAm: 'ከቄራ፣ ከአትክልት ወይም ከፋብሪካ አቅራቢዎች ወደ ስቶር ገቢ ሲደረግ',
      code: 'ETH-GRN-03',
      icon: Warehouse,
      targetRoleAm: 'ስቶር ኪፐር & ኦዲተር',
    },
    {
      id: 'dailySales' as FormType,
      titleAm: 'የዕለታዊ ሽያጭ እና ካሽ ማጠቃለያ (Daily Sales)',
      titleEn: 'Cashier Reconciliation Sheet',
      shortTitleAm: 'የዕለታዊ ካሽ ማጠቃለያ',
      descAm: 'የምግብ/መጠጥ ሽያጭ፣ የቴሌብር፣ የባንክና የካሽ ሂሳብ ማጠቃለያ',
      code: 'ETH-DSR-04',
      icon: Receipt,
      targetRoleAm: 'ፈረቃ ካሸር & ማኔጀር',
    },
    {
      id: 'waste' as FormType,
      titleAm: 'የብክነት እና የተበላሸ እቃ ማሳወቂያ (Waste Log)',
      titleEn: 'Kitchen Spoilage & Waste Log',
      shortTitleAm: 'የኩሽና ብክነት ሎግ',
      descAm: 'የተቃጠለ፣ የተሰበረ ወይም የረገፈ እቃ ብክነትን ለመቆጣጠር',
      code: 'ETH-WST-05',
      icon: AlertTriangle,
      targetRoleAm: 'የብራንች ሼፍ & ሱፐርቫይዘር',
    },
    {
      id: 'staffMeal' as FormType,
      titleAm: 'የሰራተኞች ምሳ/እራት መቆጣጠሪያ (Staff Meal)',
      titleEn: 'Staff Meal Headcount Log',
      shortTitleAm: 'የሰራተኞች ምሳ ሎግ',
      descAm: 'ለሰራተኞች ምግብ የወጡ ጥሬ ዕቃዎችን ለመመዝገብ',
      code: 'ETH-SML-06',
      icon: Users,
      targetRoleAm: 'ኪችን ሱፐርቫይዘር',
    },
  ];

  const currentFormMeta = formCatalog.find((f) => f.id === selectedForm) || formCatalog[0];

  // Helper to generate and download Word (.doc) file
  const downloadAsWord = (formType: FormType, compact: boolean) => {
    let htmlContent = '';
    const form = formCatalog.find((f) => f.id === formType) || formCatalog[0];

    const generateSingleHtmlForm = (isCopyTwo = false) => {
      if (formType === 'siv') {
        return `
          <div style="border: 1.5px solid #000; padding: 12px; margin-bottom: 15px; font-family: Arial, sans-serif;">
            <table style="width: 100%; border-bottom: 2px solid #000; padding-bottom: 5px; margin-bottom: 8px;">
              <tr>
                <td>
                  <h2 style="margin: 0; font-size: 16pt;">የስቶር እቃ ማስተላለፊያ ደረሰኝ (TRANSFER SIV)</h2>
                  <div style="font-size: 10pt; color: #444;">ከዋና ስቶር ወደ ቅርንጫፍ ኪችን እቃ ማስተላለፊያ ይፋዊ ሰነድ</div>
                </td>
                <td style="text-align: right;">
                  <div style="font-size: 10pt; font-weight: bold;">ኮድ፦ ${form.code}</div>
                  <div style="font-size: 10pt;">ቀን፦ _______________ ዓ.ም</div>
                </td>
              </tr>
            </table>

            <table style="width: 100%; background: #f3f4f6; border: 1px solid #999; margin-bottom: 8px; font-size: 10pt;">
              <tr>
                <td style="padding: 4px;"><strong>የላከው፦</strong> ማዕከላዊ ስቶር (Central Store)</td>
                <td style="padding: 4px;"><strong>የተላከለት ብራንች፦</strong> [ ] ኮኮናት (6 ኪሎ)  [ ] ሾላ  [ ] 3ኛ ብራንች</td>
                <td style="padding: 4px;"><strong>SIV ቁጥር፦</strong> _________ | [ ] ጠዋት [ ] ማታ</td>
              </tr>
            </table>

            <table style="width: 100%; border-collapse: collapse; margin-bottom: 8px; font-size: 9.5pt;">
              <thead>
                <tr style="background: #e5e7eb;">
                  <th style="border: 1px solid #000; padding: 4px; width: 35px; text-align: center;">ተ.ቁ</th>
                  <th style="border: 1px solid #000; padding: 4px; text-align: left;">የእቃው ስም እና መግለጫ (Item Name)</th>
                  <th style="border: 1px solid #000; padding: 4px; width: 70px; text-align: center;">መለኪያ</th>
                  <th style="border: 1px solid #000; padding: 4px; width: 85px; text-align: center;">የተጠየቀ</th>
                  <th style="border: 1px solid #000; padding: 4px; width: 85px; text-align: center;">የተሰጠ</th>
                  <th style="border: 1px solid #000; padding: 4px; width: 85px; text-align: center;">የተረከበ</th>
                  <th style="border: 1px solid #000; padding: 4px; text-align: left;">ምርመራ / ማስታወሻ</th>
                </tr>
              </thead>
              <tbody>
                ${Array.from({ length: compact ? 5 : 8 })
                  .map(
                    (_, i) => `
                  <tr>
                    <td style="border: 1px solid #000; padding: 5px; text-align: center;">${i + 1}</td>
                    <td style="border: 1px solid #000; padding: 5px;">${i === 0 && viewMode === 'sample' ? 'ትኩስ የበሬ ስጋ (Fresh Beef Meat)' : ''}</td>
                    <td style="border: 1px solid #000; padding: 5px; text-align: center;">${i === 0 && viewMode === 'sample' ? 'ኪ.ግ' : ''}</td>
                    <td style="border: 1px solid #000; padding: 5px; text-align: center;">${i === 0 && viewMode === 'sample' ? '15.0' : ''}</td>
                    <td style="border: 1px solid #000; padding: 5px; text-align: center;">${i === 0 && viewMode === 'sample' ? '15.0' : ''}</td>
                    <td style="border: 1px solid #000; padding: 5px; text-align: center;">${i === 0 && viewMode === 'sample' ? '15.0' : ''}</td>
                    <td style="border: 1px solid #000; padding: 5px;">${i === 0 && viewMode === 'sample' ? 'ጥራት ያለው' : ''}</td>
                  </tr>
                `
                  )
                  .join('')}
              </tbody>
            </table>

            <table style="width: 100%; border: 1px solid #777; background: #fafafa; font-size: 9pt;">
              <tr>
                <td style="padding: 6px; width: 33%; border-right: 1px solid #ccc;">
                  <strong>1. የሰጠው ስቶር ኪፐር፦</strong><br/>
                  ስም፦ ____________________<br/>
                  ፊርማ፦ __________________
                </td>
                <td style="padding: 6px; width: 33%; border-right: 1px solid #ccc;">
                  <strong>2. የተረከበው ሼፍ፦</strong><br/>
                  ስም፦ ____________________<br/>
                  ፊርማ፦ __________________
                </td>
                <td style="padding: 6px; width: 34%;">
                  <strong>3. ሱፐርቫይዘር / ማኔጀር፦</strong><br/>
                  ስም፦ ____________________<br/>
                  ማህተም/ፊርማ፦ ____________
                </td>
              </tr>
            </table>
            <div style="font-size: 8pt; color: #666; margin-top: 4px;">#OCR-ANCHOR: [DOC: SIV_TRANSFER] [SYS-SIV-01]</div>
          </div>
        `;
      } else if (formType === 'kitchenPrep') {
        return `
          <div style="border: 1.5px solid #000; padding: 12px; margin-bottom: 15px; font-family: Arial, sans-serif;">
            <table style="width: 100%; border-bottom: 2px solid #000; padding-bottom: 5px; margin-bottom: 8px;">
              <tr>
                <td>
                  <h2 style="margin: 0; font-size: 16pt;">የኩሽና የሶስ ዝግጅት ሎግ (KITCHEN PREP LOG)</h2>
                  <div style="font-size: 10pt; color: #444;">ማዮኔዝ፣ ቦሎናይዝ፣ ዛፋራኖ ሲመረት ጥሬ ዕቃዎችን ለማቃለል</div>
                </td>
                <td style="text-align: right;">
                  <div style="font-size: 10pt; font-weight: bold;">ኮድ፦ ${form.code}</div>
                  <div style="font-size: 10pt;">ቀን፦ _______________</div>
                </td>
              </tr>
            </table>

            <table style="width: 100%; background: #fef3c7; border: 1px solid #d97706; margin-bottom: 8px; font-size: 10pt;">
              <tr>
                <td style="padding: 4px;"><strong>ብራንች፦</strong> [ ] ኮኮናት 6 ኪሎ  [ ] ሾላ</td>
                <td style="padding: 4px;"><strong>የሶስ/ዝግጅት ስም፦</strong> ___________________</td>
                <td style="padding: 4px;"><strong>የተመረተ ብዛት፦</strong> ______ [ ] ሊትር [ ] ኪ.ግ</td>
              </tr>
            </table>

            <table style="width: 100%; border-collapse: collapse; margin-bottom: 8px; font-size: 9.5pt;">
              <thead>
                <tr style="background: #e5e7eb;">
                  <th style="border: 1px solid #000; padding: 4px; width: 35px; text-align: center;">ተ.ቁ</th>
                  <th style="border: 1px solid #000; padding: 4px; text-align: left;">የወጣው ጥሬ ዕቃ ስም (Raw Material)</th>
                  <th style="border: 1px solid #000; padding: 4px; width: 80px; text-align: center;">መለኪያ</th>
                  <th style="border: 1px solid #000; padding: 4px; width: 100px; text-align: center;">የወጣ መጠን</th>
                  <th style="border: 1px solid #000; padding: 4px; text-align: left;">ማስታወሻ</th>
                </tr>
              </thead>
              <tbody>
                ${Array.from({ length: compact ? 4 : 6 })
                  .map(
                    (_, i) => `
                  <tr>
                    <td style="border: 1px solid #000; padding: 5px; text-align: center;">${i + 1}</td>
                    <td style="border: 1px solid #000; padding: 5px;">${i === 0 && viewMode === 'sample' ? 'የእርሻ እንቁላል (Table Eggs)' : ''}</td>
                    <td style="border: 1px solid #000; padding: 5px; text-align: center;">${i === 0 && viewMode === 'sample' ? 'ፍሬ' : ''}</td>
                    <td style="border: 1px solid #000; padding: 5px; text-align: center;">${i === 0 && viewMode === 'sample' ? '24' : ''}</td>
                    <td style="border: 1px solid #000; padding: 5px;">${i === 0 && viewMode === 'sample' ? 'ለማዮኔዝ የወጣ' : ''}</td>
                  </tr>
                `
                  )
                  .join('')}
              </tbody>
            </table>

            <table style="width: 100%; border: 1px solid #777; background: #fafafa; font-size: 9pt;">
              <tr>
                <td style="padding: 6px; width: 50%;">
                  <strong>ያዘጋጀው ሼፍ፦</strong> ስም፦ __________________ ፊርማ፦ ____________
                </td>
                <td style="padding: 6px; width: 50%;">
                  <strong>ያረጋገጠው ሄድ ሼፍ፦</strong> ስም፦ __________________ ፊርማ፦ ____________
                </td>
              </tr>
            </table>
            <div style="font-size: 8pt; color: #666; margin-top: 4px;">#OCR-ANCHOR: [DOC: KITCHEN_PREP] [BATCH_CODE: KPL-02]</div>
          </div>
        `;
      } else {
        // Generic clean template for GRN, Daily Sales, Waste, Staff Meal
        return `
          <div style="border: 1.5px solid #000; padding: 12px; margin-bottom: 15px; font-family: Arial, sans-serif;">
            <table style="width: 100%; border-bottom: 2px solid #000; padding-bottom: 5px; margin-bottom: 8px;">
              <tr>
                <td>
                  <h2 style="margin: 0; font-size: 15pt;">${form.titleAm}</h2>
                  <div style="font-size: 9.5pt; color: #444;">${form.descAm}</div>
                </td>
                <td style="text-align: right;">
                  <div style="font-size: 9.5pt; font-weight: bold;">ኮድ፦ ${form.code}</div>
                  <div style="font-size: 9.5pt;">ቀን፦ _______________</div>
                </td>
              </tr>
            </table>

            <table style="width: 100%; background: #f3f4f6; border: 1px solid #999; margin-bottom: 8px; font-size: 9.5pt;">
              <tr>
                <td style="padding: 4px;"><strong>ቅርንጫፍ፦</strong> [ ] ኮኮናት (6 ኪሎ)  [ ] ሾላ  [ ] 3ኛ ብራንች</td>
                <td style="padding: 4px;"><strong>ፈረቃ፦</strong> [ ] ጠዋት [ ] ማታ</td>
                <td style="padding: 4px;"><strong>ማጣቀሻ ቁጥር፦</strong> ______________</td>
              </tr>
            </table>

            <table style="width: 100%; border-collapse: collapse; margin-bottom: 8px; font-size: 9.5pt;">
              <thead>
                <tr style="background: #e5e7eb;">
                  <th style="border: 1px solid #000; padding: 4px; width: 35px; text-align: center;">ተ.ቁ</th>
                  <th style="border: 1px solid #000; padding: 4px; text-align: left;">ዝርዝር መግለጫ (Description)</th>
                  <th style="border: 1px solid #000; padding: 4px; width: 80px; text-align: center;">መለኪያ</th>
                  <th style="border: 1px solid #000; padding: 4px; width: 90px; text-align: center;">መጠን / ብዛት</th>
                  <th style="border: 1px solid #000; padding: 4px; width: 90px; text-align: right;">ዋጋ (ብር)</th>
                  <th style="border: 1px solid #000; padding: 4px; text-align: left;">ምክንያት / ማስታወሻ</th>
                </tr>
              </thead>
              <tbody>
                ${Array.from({ length: compact ? 4 : 6 })
                  .map(
                    (_, i) => `
                  <tr>
                    <td style="border: 1px solid #000; padding: 5px; text-align: center;">${i + 1}</td>
                    <td style="border: 1px solid #000; padding: 5px;"></td>
                    <td style="border: 1px solid #000; padding: 5px;"></td>
                    <td style="border: 1px solid #000; padding: 5px;"></td>
                    <td style="border: 1px solid #000; padding: 5px;"></td>
                    <td style="border: 1px solid #000; padding: 5px;"></td>
                  </tr>
                `
                  )
                  .join('')}
              </tbody>
            </table>

            <table style="width: 100%; border: 1px solid #777; background: #fafafa; font-size: 9pt;">
              <tr>
                <td style="padding: 6px; width: 50%;">
                  <strong>ያዘጋጀው ሃላፊ፦</strong> ስም፦ __________________ ፊርማ፦ ____________
                </td>
                <td style="padding: 6px; width: 50%;">
                  <strong>ያረጋገጠው ማኔጀር፦</strong> ስም፦ __________________ ፊርማ፦ ____________
                </td>
              </tr>
            </table>
            <div style="font-size: 8pt; color: #666; margin-top: 4px;">#OCR-ANCHOR: [DOC: ${form.id.toUpperCase()}] [SYS-CODE: ${form.code}]</div>
          </div>
        `;
      }
    };

    if (compact) {
      // 2 identical slips on 1 page with cut line
      htmlContent = `
        ${generateSingleHtmlForm(false)}
        <div style="border-top: 1.5px dashed #000; margin: 15px 0; text-align: center; font-size: 9pt; font-weight: bold; padding-top: 2px;">
          ✂️ ------------------ [ የመቁረጫ መስመር - 1 ወረቀት ለ 2 ቫውቸር ] ------------------ ✂️
        </div>
        ${generateSingleHtmlForm(true)}
      `;
    } else {
      htmlContent = generateSingleHtmlForm(false);
    }

    const fullDocument = `<!DOCTYPE html>
<html xmlns:o='urn:schemas-microsoft-com:office:office' 
      xmlns:w='urn:schemas-microsoft-com:office:word' 
      xmlns='http://www.w3.org/TR/REC-html40'>
<head>
<meta charset='utf-8'>
<title>${form.shortTitleAm}</title>
<style>
  @page {
    size: A4 portrait;
    margin: 1.2cm 1cm 1.2cm 1cm;
  }
  body {
    font-family: Arial, 'Segoe UI', 'Noto Sans Ethiopic', sans-serif;
    color: #111;
  }
</style>
</head>
<body>
${htmlContent}
</body>
</html>`;

    const blob = new Blob(['\ufeff' + fullDocument], {
      type: 'application/msword;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${form.code}_${form.shortTitleAm.replace(/\s+/g, '_')}_${compact ? 'A5_ቆጣቢ' : 'A4_ሙሉ'}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setCopiedNotification(
      language === 'am'
        ? `📥 "${form.shortTitleAm}" በ Microsoft Word (.doc) በተሳካ ሁኔታ ወርዷል!`
        : 'Downloaded Word document!'
    );
    setTimeout(() => setCopiedNotification(null), 4000);
  };

  // Download all 6 forms bundled in one Word document
  const downloadAllInOneWord = () => {
    let combinedHtml = '';
    formCatalog.forEach((f, idx) => {
      combinedHtml += `
        <div style="${idx > 0 ? 'page-break-before: always;' : ''}">
          <h1 style="text-align: center; font-size: 14pt; margin-bottom: 5px;">ቅጽ ${idx + 1}፦ ${f.titleAm}</h1>
          <div style="text-align: center; font-size: 10pt; color: #555; margin-bottom: 12px;">የሆቴል ኦፕሬሽን ስታንዳርድ ቅጽ (ኮድ፦ ${f.code})</div>
          
          <div style="border: 1.5px solid #000; padding: 10px; margin-bottom: 10px;">
            <table style="width: 100%; border-bottom: 2px solid #000; padding-bottom: 4px; margin-bottom: 6px;">
              <tr>
                <td><strong>${f.titleAm}</strong></td>
                <td style="text-align: right;"><strong>ኮድ፦ ${f.code}</strong> | ቀን፦ _________</td>
              </tr>
            </table>

            <table style="width: 100%; background: #f3f4f6; border: 1px solid #999; margin-bottom: 8px; font-size: 9.5pt;">
              <tr>
                <td style="padding: 3px;"><strong>ቅርንጫፍ፦</strong> [ ] ኮኮናት (6 ኪሎ)  [ ] ሾላ  [ ] 3ኛ ብራንች</td>
                <td style="padding: 3px;"><strong>ፈረቃ፦</strong> [ ] ጠዋት [ ] ማታ</td>
              </tr>
            </table>

            <table style="width: 100%; border-collapse: collapse; margin-bottom: 6px; font-size: 9pt;">
              <thead>
                <tr style="background: #e5e7eb;">
                  <th style="border: 1px solid #000; padding: 3px; width: 30px; text-align: center;">ተ.ቁ</th>
                  <th style="border: 1px solid #000; padding: 3px; text-align: left;">የእቃው ስም / መግለጫ</th>
                  <th style="border: 1px solid #000; padding: 3px; width: 65px; text-align: center;">መለኪያ</th>
                  <th style="border: 1px solid #000; padding: 3px; width: 80px; text-align: center;">መጠን</th>
                  <th style="border: 1px solid #000; padding: 3px; text-align: left;">ማስታወሻ / ምርመራ</th>
                </tr>
              </thead>
              <tbody>
                ${Array.from({ length: 6 })
                  .map(
                    (_, i) => `
                  <tr>
                    <td style="border: 1px solid #000; padding: 4px; text-align: center;">${i + 1}</td>
                    <td style="border: 1px solid #000; padding: 4px;"></td>
                    <td style="border: 1px solid #000; padding: 4px;"></td>
                    <td style="border: 1px solid #000; padding: 4px;"></td>
                    <td style="border: 1px solid #000; padding: 4px;"></td>
                  </tr>
                `
                  )
                  .join('')}
              </tbody>
            </table>

            <table style="width: 100%; border: 1px solid #777; background: #fafafa; font-size: 8.5pt;">
              <tr>
                <td style="padding: 4px; width: 50%;"><strong>ያዘጋጀው ሃላፊ፦</strong> ስም፦ __________________ ፊርማ፦ ____________</td>
                <td style="padding: 4px; width: 50%;"><strong>ያረጋገጠው ማኔጀር፦</strong> ስም፦ __________________ ፊርማ፦ ____________</td>
              </tr>
            </table>
          </div>
        </div>
      `;
    });

    const fullDocument = `<!DOCTYPE html>
<html xmlns:o='urn:schemas-microsoft-com:office:office' 
      xmlns:w='urn:schemas-microsoft-com:office:word' 
      xmlns='http://www.w3.org/TR/REC-html40'>
<head>
<meta charset='utf-8'>
<title>ሙሉ_የሆቴል_ስታንዳርድ_ቅጾች_ጥቅል</title>
<style>
  @page { size: A4 portrait; margin: 1.2cm 1cm 1.2cm 1cm; }
  body { font-family: Arial, 'Segoe UI', 'Noto Sans Ethiopic', sans-serif; color: #111; }
</style>
</head>
<body>
${combinedHtml}
</body>
</html>`;

    const blob = new Blob(['\ufeff' + fullDocument], {
      type: 'application/msword;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ሙሉ_የሆቴል_ስታንዳርድ_ቅጾች_ጥቅል_6ቱ_ቅጾች.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setCopiedNotification(
      language === 'am'
        ? `📦 ሁሉም 6ቱ ስታንዳርድ ቅጾች በአንድ Microsoft Word (.doc) ፋይል ወርደዋል!`
        : 'All 6 forms downloaded in one Word file!'
    );
    setTimeout(() => setCopiedNotification(null), 4000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Fast Actions */}
      <div className="no-print flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950/30 p-5 rounded-3xl border border-amber-500/30 shadow-xl">
        <div className="flex items-start gap-3.5">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-amber-500/20 to-yellow-500/10 border border-amber-500/40 text-amber-400 shrink-0">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-white">
                {language === 'am' ? 'የስታንዳርድ ቅጾች ማዕከል' : 'Standard Operations Forms Hub'}
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-black border border-blue-500/40">
                WORD (.DOC) & A5 PAPER SAVER
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
              {language === 'am'
                ? 'ወረቀት እንዳይባክን በ 1 ወረቀት ላይ 2 ቫውቸሮች (A5 ቆጣቢ) የሚታተም፤ በ Microsoft Word በቀጥታ የሚከፈት እና የሚስተካከል ስታንዳርድ ቅርጸት!'
                : 'Compact paper-saver vouchers (2 per A4 sheet) and instant Microsoft Word (.doc) export.'}
            </p>
          </div>
        </div>

        {/* Word Download & Print Buttons */}
        <div className="flex flex-wrap items-center gap-2 self-start md:self-center">
          {/* Download Current Form in Word */}
          <button
            type="button"
            onClick={() => downloadAsWord(selectedForm, isPaperSaver)}
            className="px-3.5 py-2.5 rounded-xl font-bold text-xs text-white bg-blue-600 hover:bg-blue-500 shadow-md shadow-blue-600/30 flex items-center gap-2 cursor-pointer transition-all border border-blue-400/50"
            title="በ Microsoft Word ያውርዱ"
          >
            <Download className="w-4 h-4 stroke-[2.5]" />
            <span>{language === 'am' ? '📥 በ Word (.doc) አውርድ' : 'Download Word (.doc)'}</span>
          </button>

          {/* Download ALL in ONE Word */}
          <button
            type="button"
            onClick={downloadAllInOneWord}
            className="px-3 py-2.5 rounded-xl font-bold text-xs text-amber-300 bg-slate-900 hover:bg-slate-800 border border-amber-500/40 flex items-center gap-1.5 cursor-pointer transition-all"
            title="ሁሉንም 6 ቅጾች በአንድ የዎርድ ፋይል አውርድ"
          >
            <FileCode className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">{language === 'am' ? '📦 6ቱንም በ Word አውርድ' : 'All 6 in Word'}</span>
          </button>

          {/* Print Button */}
          <button
            type="button"
            onClick={handlePrint}
            className="px-3.5 py-2.5 rounded-xl font-bold text-xs text-slate-950 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 shadow-md flex items-center gap-1.5 cursor-pointer transition-all"
          >
            <Printer className="w-4 h-4 text-slate-950 stroke-[2.5]" />
            <span>{language === 'am' ? '🖨️ አትም (Print)' : 'Print'}</span>
          </button>
        </div>
      </div>

      {/* Notification Toast */}
      {copiedNotification && (
        <div className="p-3 bg-emerald-950/90 border border-emerald-500/50 rounded-2xl text-xs font-bold text-emerald-300 flex items-center gap-2 animate-fadeIn shadow-lg">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{copiedNotification}</span>
        </div>
      )}

      {/* Forms Catalog & Paper Saver Controls */}
      <div className="no-print space-y-3">
        {/* Form Selector Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {formCatalog.map((item) => {
            const Icon = item.icon;
            const isSelected = selectedForm === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setSelectedForm(item.id)}
                className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                  isSelected
                    ? 'bg-amber-500/15 border-amber-400 shadow-md shadow-amber-500/20 ring-1 ring-amber-400/50'
                    : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span
                    className={`p-1.5 rounded-xl text-xs ${
                      isSelected
                        ? 'bg-amber-400 text-slate-950 font-black'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </span>
                  <span className="text-[10px] font-mono font-bold text-slate-400">{item.code}</span>
                </div>
                <div>
                  <div className="font-bold text-xs text-white line-clamp-1">{item.shortTitleAm}</div>
                  <div className="text-[10px] text-amber-400/80 font-medium truncate mt-0.5">
                    {item.targetRoleAm}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Paper Saver Toggle & Display Mode Switcher */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950/80 p-2.5 rounded-2xl border border-slate-800">
          <div className="flex flex-wrap items-center gap-2">
            {/* PAPER SAVER SWITCH */}
            <div className="flex items-center bg-slate-900 p-0.5 rounded-xl border border-slate-700">
              <button
                type="button"
                onClick={() => setIsPaperSaver(true)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  isPaperSaver
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-sm font-black'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Scissors className="w-3 h-3 text-emerald-300" />
                <span>{language === 'am' ? '✂️ ወረቀት ቆጣቢ (1 ወረቀት = 2 ቫውቸር)' : 'A5 Paper Saver (2-up)'}</span>
              </button>
              <button
                type="button"
                onClick={() => setIsPaperSaver(false)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  !isPaperSaver
                    ? 'bg-amber-400 text-slate-950 shadow-sm font-black'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>{language === 'am' ? 'ሙሉ A4 ገጽ' : 'Full A4 Page'}</span>
              </button>
            </div>

            <div className="h-4 w-px bg-slate-800 hidden sm:block"></div>

            {/* Mode: Blank vs Sample vs SOP */}
            <button
              onClick={() => setViewMode('blank')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'blank'
                  ? 'bg-amber-400 text-slate-950 font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {language === 'am' ? 'ባዶ ሊታተም የተዘጋጀ' : 'Blank Sheet'}
            </button>
            <button
              onClick={() => setViewMode('sample')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'sample'
                  ? 'bg-amber-400 text-slate-950 font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {language === 'am' ? 'በናሙና የተሞላ መመሪያ' : 'Sample Guide'}
            </button>
            <button
              onClick={() => setViewMode('rules')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'rules'
                  ? 'bg-amber-400 text-slate-950 font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {language === 'am' ? 'የስራ መመሪያ (SOP)' : 'SOP Rules'}
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="font-mono text-amber-300 font-bold">{currentFormMeta.code}</span>
            <span>•</span>
            <span className="text-emerald-400 font-bold">
              {isPaperSaver ? '50% ወረቀት ይቆጥባል' : 'ሙሉ A4'}
            </span>
          </div>
        </div>
      </div>

      {/* Render Single Compact Slip Component */}
      {viewMode === 'rules' ? (
        <div className="bg-slate-900 rounded-3xl p-6 border border-amber-500/30 space-y-4">
          <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
            <ShieldCheck className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-bold text-white">
              ለሰራተኞች የሚሰጥ አጭር የአሰራር መመሪያ (SOP Rules)
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-slate-300">
            <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-1">
              <div className="font-bold text-amber-400">1. ወረቀት እንዳይባክን (A5 Pad Use)</div>
              <p>አንድን A4 ወረቀት በመሃል በመቁረጥ 2 ቫውቸሮች ይጠቀሙ። ለፓድ ማሰሪያነትም እጅግ አመቺ ነው።</p>
            </div>
            <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-1">
              <div className="font-bold text-emerald-400">2. የብራንች ሳጥን ምልክት ማድረግ</div>
              <p>እቃው ለየትኛው ብራንች (ኮኮናት 6 ኪሎ ወይስ ሾላ) እንደተላከ በቅጹ አናት ላይ ምልክት ያድርጉበት።</p>
            </div>
            <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-1">
              <div className="font-bold text-blue-400">3. ሁለት ወገን ፊርማ (Dual Signature)</div>
              <p>የሰጠው ስቶር ኪፐር እና የተረከበው ሼፍ በሰነዱ ግርጌ መፈረም አለባቸው።</p>
            </div>
            <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-1">
              <div className="font-bold text-purple-400">4. በስልክ ፎቶ ማንሳት</div>
              <p>ጠፍጣፋ ቦታ ላይ አስቀምጠው 4ቱም ማዕዘናት እንዲታዩ ፎቶ ያንሱ፤ AI በቅጽበት ያነበዋል።</p>
            </div>
          </div>
        </div>
      ) : (
        /* Printable Paper Container */
        <div className="flex justify-center">
          <div
            id="printable-form-container"
            className="w-full max-w-4xl bg-white text-slate-900 rounded-2xl p-4 sm:p-6 shadow-2xl border border-slate-300 font-sans print:m-0 print:p-2 print:border-none print:shadow-none print:w-full print:max-w-none space-y-4"
          >
            {/* Render Slip 1 */}
            <CompactSlipRenderer
              formType={selectedForm}
              viewMode={viewMode}
              meta={currentFormMeta}
              ethDate={ethDate}
              copyNumber={1}
            />

            {/* If Paper Saver is enabled, render cut line and Slip 2 */}
            {isPaperSaver && (
              <>
                <div className="border-t-2 border-dashed border-slate-500 my-3 py-1 flex items-center justify-between text-[11px] font-bold text-slate-600 print:my-2">
                  <span>✂️ ----------------------------------------------------</span>
                  <span className="bg-slate-100 px-3 py-0.5 rounded border border-slate-400">
                    የመቁረጫ መስመር (በግማሽ ቆርጠው 2 ቫውቸር ይጠቀሙ - 50% ወረቀት ቆጣቢ)
                  </span>
                  <span>---------------------------------------------------- ✂️</span>
                </div>

                <CompactSlipRenderer
                  formType={selectedForm}
                  viewMode={viewMode}
                  meta={currentFormMeta}
                  ethDate={ethDate}
                  copyNumber={2}
                />
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Compact Voucher Slip Sub-Component (Slim, tight padding, paper saving)
interface CompactSlipRendererProps {
  formType: FormType;
  viewMode: 'blank' | 'sample';
  meta: any;
  ethDate: string;
  copyNumber?: number;
}

const CompactSlipRenderer: React.FC<CompactSlipRendererProps> = ({
  formType,
  viewMode,
  meta,
  ethDate,
  copyNumber,
}) => {
  return (
    <div className="border border-slate-400 rounded-xl p-3 sm:p-4 bg-white space-y-2.5">
      {/* Slim Header */}
      <div className="border-b-2 border-slate-900 pb-2 flex items-start justify-between gap-2">
        <div>
          <h2 className="text-sm sm:text-base font-black text-slate-950 uppercase tracking-tight">
            {meta.titleAm}
          </h2>
          <div className="text-[10px] sm:text-xs font-bold text-slate-600">
            {meta.titleEn}
          </div>
        </div>

        <div className="text-right text-[10px] sm:text-xs">
          <div className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-300 inline-block">
            {meta.code}
          </div>
          <div className="text-slate-600 mt-0.5">
            ቀን፦ <strong className="underline text-slate-900">{viewMode === 'sample' ? ethDate : '_____/_____/2018'}</strong>
          </div>
        </div>
      </div>

      {/* Meta Bar: Branch, Shift, Reference */}
      <div className="grid grid-cols-3 gap-2 p-2 bg-slate-50 border border-slate-300 rounded text-[11px]">
        <div>
          <span className="font-bold text-slate-700">የተላከለት ብራንች፦</span>
          <div className="mt-0.5 space-y-0.5 text-[10px] font-bold text-slate-900">
            <span>[{viewMode === 'sample' ? '✔' : ' '}] ኮኮናት 6 ኪሎ</span>
            <span className="ml-2">[{viewMode === 'sample' ? ' ' : ' '}] ሾላ</span>
          </div>
        </div>

        <div>
          <span className="font-bold text-slate-700">ፈረቃ (Shift)፦</span>
          <div className="mt-0.5 text-[10px] text-slate-900">
            [{viewMode === 'sample' ? '✔' : ' '}] የጠዋት  [{viewMode === 'sample' ? ' ' : ' '}] የማታ
          </div>
        </div>

        <div>
          <span className="font-bold text-slate-700">ማጣቀሻ ቁጥር፦</span>
          <div className="mt-0.5 font-mono text-[10px] text-slate-900 font-bold">
            {viewMode === 'sample' ? 'SIV-0842' : '________________'}
          </div>
        </div>
      </div>

      {/* Compact Items Table (5 rows only for tight paper saving) */}
      <table className="w-full text-left border-collapse border border-slate-400 text-[10px] sm:text-xs">
        <thead>
          <tr className="bg-slate-200 text-slate-900 font-bold border-b border-slate-400">
            <th className="border border-slate-400 p-1 text-center w-8">ተ.ቁ</th>
            <th className="border border-slate-400 p-1">የእቃው ስም (Item Description)</th>
            <th className="border border-slate-400 p-1 text-center w-14">መለኪያ</th>
            <th className="border border-slate-400 p-1 text-center w-16">የተጠየቀ</th>
            <th className="border border-slate-400 p-1 text-center w-16">የተሰጠ</th>
            <th className="border border-slate-400 p-1 text-center w-16">የተረከበ</th>
            <th className="border border-slate-400 p-1">ምርመራ / ማስታወሻ</th>
          </tr>
        </thead>
        <tbody>
          {viewMode === 'sample' ? (
            <>
              <tr className="border-b border-slate-300">
                <td className="border border-slate-300 p-1 text-center font-bold">1</td>
                <td className="border border-slate-300 p-1 font-bold">ትኩስ የበሬ ስጋ (Beef Meat)</td>
                <td className="border border-slate-300 p-1 text-center">ኪ.ግ</td>
                <td className="border border-slate-300 p-1 text-center font-mono font-bold">15.0</td>
                <td className="border border-slate-300 p-1 text-center font-mono font-bold">15.0</td>
                <td className="border border-slate-300 p-1 text-center font-mono font-bold text-emerald-800">15.0</td>
                <td className="border border-slate-300 p-1 text-[10px]">ጥራት ያለው</td>
              </tr>
              <tr className="border-b border-slate-300">
                <td className="border border-slate-300 p-1 text-center font-bold">2</td>
                <td className="border border-slate-300 p-1 font-bold">የእርሻ እንቁላል (Table Eggs)</td>
                <td className="border border-slate-300 p-1 text-center">ፍሬ</td>
                <td className="border border-slate-300 p-1 text-center font-mono font-bold">60</td>
                <td className="border border-slate-300 p-1 text-center font-mono font-bold">60</td>
                <td className="border border-slate-300 p-1 text-center font-mono font-bold text-emerald-800">60</td>
                <td className="border border-slate-300 p-1 text-[10px]">ለማዮኔዝ</td>
              </tr>
              <tr className="border-b border-slate-300">
                <td className="border border-slate-300 p-1 text-center font-bold">3</td>
                <td className="border border-slate-300 p-1 font-bold">የምግብ ዘይት (Cooking Oil)</td>
                <td className="border border-slate-300 p-1 text-center">ሊትር</td>
                <td className="border border-slate-300 p-1 text-center font-mono font-bold">5.0</td>
                <td className="border border-slate-300 p-1 text-center font-mono font-bold">5.0</td>
                <td className="border border-slate-300 p-1 text-center font-mono font-bold text-emerald-800">5.0</td>
                <td className="border border-slate-300 p-1 text-[10px]">ማህተም ያለው</td>
              </tr>
              <tr className="border-b border-slate-300 h-6">
                <td className="border border-slate-300 p-1 text-center text-slate-400">4</td>
                <td className="border border-slate-300 p-1"></td>
                <td className="border border-slate-300 p-1"></td>
                <td className="border border-slate-300 p-1"></td>
                <td className="border border-slate-300 p-1"></td>
                <td className="border border-slate-300 p-1"></td>
                <td className="border border-slate-300 p-1"></td>
              </tr>
            </>
          ) : (
            Array.from({ length: 4 }).map((_, idx) => (
              <tr key={idx} className="border-b border-slate-300 h-6">
                <td className="border border-slate-300 p-1 text-center font-bold text-slate-500">
                  {idx + 1}
                </td>
                <td className="border border-slate-300 p-1"></td>
                <td className="border border-slate-300 p-1"></td>
                <td className="border border-slate-300 p-1"></td>
                <td className="border border-slate-300 p-1"></td>
                <td className="border border-slate-300 p-1"></td>
                <td className="border border-slate-300 p-1"></td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* Slim Signature Boxes */}
      <div className="grid grid-cols-3 gap-2 border border-slate-300 rounded p-1.5 bg-slate-50 text-[10px]">
        <div>
          <span className="font-bold text-slate-800">1. የሰጠው ስቶር ኪፐር፦</span>
          <div>ስም፦ <strong className="underline">{viewMode === 'sample' ? 'አበበ ተሾመ' : '___________'}</strong></div>
          <div>ፊርማ፦ <strong className="font-serif italic text-blue-900">{viewMode === 'sample' ? 'Abebe.T' : '___________'}</strong></div>
        </div>

        <div>
          <span className="font-bold text-slate-800">2. የተረከበው ሼፍ / ማኔጀር፦</span>
          <div>ስም፦ <strong className="underline">{viewMode === 'sample' ? 'ሳልሳዊ ስዩም' : '___________'}</strong></div>
          <div>ፊርማ፦ <strong className="font-serif italic text-blue-900">{viewMode === 'sample' ? 'Salsawi Seyoum' : '___________'}</strong></div>
        </div>

        <div>
          <span className="font-bold text-slate-800">3. ሱፐርቫይዘር / ማኔጀር፦</span>
          <div>ስም፦ <strong className="underline">{viewMode === 'sample' ? 'ሰለሞን አስራት' : '___________'}</strong></div>
          <div>ማህተም፦ <strong className="font-serif italic text-rose-800">{viewMode === 'sample' ? '[APPROVED]' : '___________'}</strong></div>
        </div>
      </div>

      {/* Micro OCR Anchor */}
      <div className="flex items-center justify-between text-[9px] text-slate-500 pt-0.5">
        <span className="font-mono">#OCR-ANCHOR: [DOC: {meta.id.toUpperCase()}] [{meta.code}]</span>
        <span>{copyNumber ? `ኮፒ ${copyNumber}` : ''}</span>
        <span>በ AI ስካነር በቀጥታ ይነበባል</span>
      </div>
    </div>
  );
};
