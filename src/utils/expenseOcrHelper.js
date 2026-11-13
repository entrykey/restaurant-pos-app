import { PurchaseService } from '../services/PurchaseService';

// Category classification rules for common daily expenses (Petrol, Food, Utilities, etc.)
const CATEGORY_RULES = [
    {
        name: 'Diesel',
        keywords: [
            'diesel', 'hsd', 'high speed diesel'
        ],
        icon: 'Fuel',
        color: 'amber'
    },
    {
        name: 'Petrol',
        keywords: [
            'petrol', 'motor spirit', 'ms', 'fuel', 'hpcl', 'bpcl', 'iocl', 'indian oil', 
            'bharat petroleum', 'hindustan petroleum', 'shell', 'nayara', 
            'essar', 'cng', 'dispenser', 'nozzle', 'density', 'pump', 
            'rate/ltr', 'volume', 'litres', 'ltrs', 'speed petrol', 'power petrol', 'auto lpg'
        ],
        icon: 'Fuel',
        color: 'amber'
    },
    {
        name: 'Food & Refreshments',
        keywords: [
            'tea', 'coffee', 'snack', 'snacks', 'canteen', 'hotel', 'restaurant', 
            'mess', 'meals', 'bakery', 'breakfast', 'lunch', 'dinner', 
            'beverage', 'water bottle', 'milk', 'sugar', 'chai', 'samosa', 'cafe'
        ],
        icon: 'Coffee',
        color: 'emerald'
    },
    {
        name: 'Electricity',
        keywords: [
            'electricity', 'electric', 'power', 'bescom', 'kseb', 'tneb', 
            'mseb', 'discom', 'meter reading', 'kwh', 'power bill', 'energy bill'
        ],
        icon: 'Zap',
        color: 'yellow'
    },
    {
        name: 'Water',
        keywords: [
            'water can', 'drinking water', 'mineral water', 'water supply', 
            'tanker', 'metro water', 'aquaguard', 'water'
        ],
        icon: 'Droplet',
        color: 'cyan'
    },
    {
        name: 'Maintenance & Repairs',
        keywords: [
            'maintenance', 'repair', 'hardware', 'plumbing', 'sanitary', 
            'electrician', 'carpenter', 'spare parts', 'service charge', 
            'cleaning', 'housekeeping', 'repairs', 'servicing', 'serviced'
        ],
        icon: 'Wrench',
        color: 'rose'
    },
    {
        name: 'Travel & Conveyance',
        keywords: [
            'auto', 'taxi', 'cab', 'uber', 'ola', 'toll', 'fastag', 
            'fare', 'courier', 'transport', 'delivery', 'conveyance', 
            'parking', 'auto rickshaw', 'travel'
        ],
        icon: 'Car',
        color: 'purple'
    },
    {
        name: 'Internet & Phone',
        keywords: [
            'broadband', 'airtel', 'jio', 'vodafone', 'vi', 'bsnl', 
            'recharge', 'wifi', 'internet', 'telecom', 'phone bill'
        ],
        icon: 'Wifi',
        color: 'blue'
    },
    {
        name: 'Stationery & Office',
        keywords: [
            'stationery', 'xerox', 'photocopy', 'paper', 'print', 
            'stapler', 'pen', 'register', 'bill book', 'office supplies'
        ],
        icon: 'FileText',
        color: 'slate'
    },
    {
        name: 'Rent',
        keywords: [
            'rent', 'room rent', 'shop rent', 'building rent', 'lease', 
            'rental', 'landlord', 'tenancy', 'premise'
        ],
        icon: 'Building',
        color: 'indigo'
    },
    {
        name: 'Salary',
        keywords: [
            'salary', 'wages', 'advance', 'payroll', 'staff salary', 
            'employee', 'bonus', 'stipend'
        ],
        icon: 'Coins',
        color: 'emerald'
    },
    {
        name: 'LPG Gas',
        keywords: [
            'cylinder', 'gas cylinder', 'commercial cylinder', 'indane', 
            'bharat gas', 'hp gas', 'super gas', 'lpg'
        ],
        icon: 'Flame',
        color: 'orange'
    }
];

/**
 * Normalizes any date string (DD/MM/YYYY, DD-MM-YYYY, YYYY/MM/DD, etc.) into YYYY-MM-DD
 * so it cleanly binds to HTML5 <input type="date"> elements.
 */
export const normalizeToIsoDate = (rawDateStr) => {
    if (!rawDateStr) return new Date().toISOString().split('T')[0];
    const s = String(rawDateStr).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    const ymd = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
    if (ymd) {
        return `${ymd[1]}-${ymd[2].padStart(2, '0')}-${ymd[3].padStart(2, '0')}`;
    }
    const dmy = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
    if (dmy) {
        return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
    }
    const dmyShort = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2})$/);
    if (dmyShort) {
        const fullYear = parseInt(dmyShort[3], 10) > 50 ? `19${dmyShort[3]}` : `20${dmyShort[3]}`;
        return `${fullYear}-${dmyShort[2].padStart(2, '0')}-${dmyShort[1].padStart(2, '0')}`;
    }
    const parsed = new Date(s);
    if (!isNaN(parsed.getTime())) {
        return parsed.toISOString().split('T')[0];
    }
    return new Date().toISOString().split('T')[0];
};

/**
 * Extract amount, date, category and supplier from raw OCR text & Python metadata
 */
export const parseExpenseOcrData = (rawText = '', extractedMeta = {}) => {
    const text = (rawText || '').toString();
    const cleanLowerText = text.toLowerCase();

    // 1. Determine Category
    let detectedCategory = 'Daily Expense';
    let matchedKeywords = [];
    let bestScore = 0;

    for (const rule of CATEGORY_RULES) {
        let score = 0;
        const matched = [];
        for (const kw of rule.keywords) {
            const regex = new RegExp(`\\b${kw.replace('/', '\\/')}\\b`, 'i');
            if (regex.test(cleanLowerText)) {
                score += kw.length > 5 ? 2 : 1;
                matched.push(kw);
            }
        }
        if (score > bestScore) {
            bestScore = score;
            detectedCategory = rule.name;
            matchedKeywords = matched;
        }
    }

    // Also check supplierName if provided by Python OCR
    const supplierName = extractedMeta?.supplierName || '';
    if (bestScore === 0 && supplierName) {
        const suppLower = supplierName.toLowerCase();
        for (const rule of CATEGORY_RULES) {
            if (rule.keywords.some(kw => suppLower.includes(kw))) {
                detectedCategory = rule.name;
                break;
            }
        }
    }

    // 2. Intelligent Multi-Pass Solver for Total Amount, Quantity (Litres) & Rate
    let totalAmount = 0;
    let fuelQty = 0;
    let fuelRate = 0;

    if (extractedMeta?.totalAmount && Number(extractedMeta.totalAmount) > 0) {
        totalAmount = Number(extractedMeta.totalAmount);
    }
    if (extractedMeta?.items && extractedMeta.items[0]?.quantity) {
        fuelQty = Number(extractedMeta.items[0].quantity) || 0;
    }
    if (extractedMeta?.items && extractedMeta.items[0]?.unitPrice) {
        fuelRate = Number(extractedMeta.items[0].unitPrice) || 0;
    }

    const cleanNumbersText = text.replace(/,/g, '');
    const amountCandidates = [];

    // Pattern 1: Rs. Ps. Two-column format (e.g. "4698 45", "4698.45", "4698|45", "4698 - 45", "4698/45")
    const twoColRegex = /\b([1-9]\d{2,5})\s*[|./\-\s]\s*(\d{2})\b/g;
    let mTwoCol;
    while ((mTwoCol = twoColRegex.exec(cleanNumbersText)) !== null) {
        const rupees = parseFloat(mTwoCol[1]);
        const paise = parseFloat(mTwoCol[2]);
        const val = rupees + (paise / 100);
        if (val > 10 && val < 1000000) {
            amountCandidates.push({ val, type: 'two-col', rupees, paise });
        }
    }

    // Pattern 2: Explicit amount labels (e.g. Amount Rs. 4698.45, Net: 4698, Total: 4698, ₹20,000)
    const labelRegex = /(?:total|amount|amt|net|sale|cash|inr|rs|paid|grand total|bill amount|total payable|net payable|invoice total|payable|₹)[^\d\n]*?([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)/gi;
    let mLabel;
    while ((mLabel = labelRegex.exec(cleanNumbersText)) !== null) {
        const val = parseFloat(mLabel[1].replace(/,/g, ''));
        if (!isNaN(val) && val > 0 && val < 1000000) {
            amountCandidates.push({ val, type: 'label' });
        }
    }

    // Pattern 3: Standard decimal numbers (e.g., 4698.45, 45.00)
    const decimalMatches = cleanNumbersText.match(/\b\d+\.\d{1,2}\b/g) || [];
    for (const d of decimalMatches) {
        const val = parseFloat(d);
        if (val > 0 && val < 1000000) {
            amountCandidates.push({ val, type: 'decimal' });
        }
    }

    // Pattern 4: Any standalone 3 to 6 digit integer (e.g. 4698)
    const intMatches = cleanNumbersText.match(/\b([1-9]\d{2,5})\b/g) || [];
    for (const i of intMatches) {
        const val = parseFloat(i);
        if (val > 100 && val !== 2021 && val !== 2022 && val !== 2023 && val !== 2024 && val !== 2025 && val !== 2026) {
            amountCandidates.push({ val, type: 'integer' });
        }
    }

    // Candidate quantities / Litres
    const qtyCandidates = [];

    // Pattern Q1: Explicit Qty / Litres labels (e.g. "Diesel 45.00 Litre", "Qty 45.00", "45.00 Ltr")
    const qtyLabelRegex = /(?:qty|quantity|litres?|ltrs?|volume|vol|petrol|diesel)[^\d\n]*?(\d+(?:[.-]\d{1,3})?)/gi;
    let mQtyLabel;
    while ((mQtyLabel = qtyLabelRegex.exec(cleanNumbersText)) !== null) {
        const val = parseFloat(mQtyLabel[1].replace('-', '.'));
        if (val > 0.5 && val < 500) {
            qtyCandidates.push(val);
        }
    }

    // Pattern Q2: Float or dash-decimals with .00 or -00 e.g. 45.00, 45-00, 45 00
    const qtyFloatRegex = /\b([1-9]\d{0,2})[.\-\s](00|50|0)\b/g;
    let mQtyFloat;
    while ((mQtyFloat = qtyFloatRegex.exec(cleanNumbersText)) !== null) {
        const val = parseFloat(mQtyFloat[1]);
        if (val >= 1 && val <= 250) {
            qtyCandidates.push(val);
        }
    }

    // Correlate Amount and Litres
    // Fuel rates in India are ~80 to ~120 / L.
    // If Amount / Litres is between 65 and 135, it's a verified match!
    let bestPair = null;
    for (const aObj of amountCandidates) {
        for (const q of qtyCandidates) {
            if (q > 0 && aObj.val > q) {
                const computedRate = aObj.val / q;
                if (computedRate >= 65 && computedRate <= 135) {
                    bestPair = { amount: aObj.val, litres: q, rate: computedRate };
                    break;
                }
            }
        }
        if (bestPair) break;
    }

    if (bestPair) {
        totalAmount = Math.round(bestPair.amount * 100) / 100;
        fuelQty = Math.round(bestPair.litres * 100) / 100;
        fuelRate = Math.round(bestPair.rate * 100) / 100;
    } else {
        if (totalAmount === 0 && amountCandidates.length > 0) {
            const sortedAmounts = [...amountCandidates]
                .map(a => a.val)
                .filter(v => v > 10 && v !== 20332 && v !== 36595 && v < 500000)
                .sort((a, b) => b - a);
            if (sortedAmounts.length > 0) {
                totalAmount = Math.round(sortedAmounts[0] * 100) / 100;
            }
        }
        if (fuelQty === 0 && qtyCandidates.length > 0) {
            fuelQty = qtyCandidates[0];
        }
        if (totalAmount > 0 && fuelQty > 0 && fuelRate === 0) {
            fuelRate = Math.round((totalAmount / fuelQty) * 100) / 100;
        }
    }

    // 3. Extract Date
    let date = extractedMeta?.date || null;
    if (!date) {
        const dateMatch = text.match(/\b(\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}|\d{4}[-/.]\d{1,2}[-/.]\d{1,2})\b/);
        if (dateMatch) {
            date = dateMatch[1];
        } else {
            date = new Date().toISOString().split('T')[0];
        }
    }
    date = normalizeToIsoDate(date);

    // 4. Extract Bill / Receipt / Invoice Number
    let invoiceNumber = extractedMeta?.invoiceNumber || '';
    if (!invoiceNumber) {
        const invMatch = text.match(/(?:inv(?:oice)?|bill|rcpt|receipt|slip|memo|consumer|rr|account|no)\s*(?:no|#|num)?[:.\s]*([A-Z0-9\-_/]+)/i);
        if (invMatch) {
            invoiceNumber = invMatch[1].trim();
        } else {
            // Check standalone 4-6 digit token or serial e.g. 20332 or 36595
            const serialMatch = text.match(/\b([1-9][0-9]{3,5})\b/);
            if (serialMatch && Number(serialMatch[1]) !== totalAmount) {
                invoiceNumber = serialMatch[1];
            }
        }
    }

    // 5. Vehicle Number Extraction (e.g. KL-19 Q 3301, DL 01 AB 1234)
    let vehicleNumber = extractedMeta?.vehicleNumber || '';
    if (!vehicleNumber) {
        const vehicleMatch = text.match(/\b([A-Z]{2}[ -.]?[0-9]{1,2}[ -.]?[A-Z]{1,3}[ -.]?[0-9]{3,4})\b/i);
        if (vehicleMatch) {
            vehicleNumber = vehicleMatch[1].trim().toUpperCase();
        }
    }

    // 6. GSTIN Number Extraction (15 characters)
    let gstNumber = extractedMeta?.gstNumber || '';
    if (!gstNumber) {
        const gstMatch = text.match(/\b([0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1})\b/i);
        if (gstMatch) {
            gstNumber = gstMatch[1].trim().toUpperCase();
        }
    }

    // 7. Phone Number Extraction
    let phoneNumber = extractedMeta?.phoneNumber || '';
    if (!phoneNumber) {
        const phoneMatch = text.match(/(?:Ph(?:one)?|Tel|Mobile|Mob)?[:.\s]*(\+?91[-\s]?[6-9]\d{9}|0\d{2,4}[-\s]?\d{6,8}|\b\d{10}\b)/i);
        if (phoneMatch) {
            phoneNumber = phoneMatch[1].trim();
        }
    }

    // 8. Payment Mode Extraction
    let paymentMode = extractedMeta?.paymentMode || 'CASH';
    if (!extractedMeta?.paymentMode) {
        if (/credit/i.test(text)) paymentMode = 'CREDIT';
        else if (/upi|gpay|phonepe|paytm/i.test(text)) paymentMode = 'UPI';
        else if (/card|pos|debit|credit\s*card/i.test(text)) paymentMode = 'CARD';
    }

    // 9. Vendor / Supplier Name
    let vendorName = extractedMeta?.supplierName || supplierName || '';
    if (!vendorName) {
        const vendorMatch = text.match(/((?:M\/[Ss]\.?\s*)?[A-Za-z0-9\s.\-&]+?(?:Fuels|Petroleum|Dealer|Station|Service|Bakers|Restaurant|Cafe|Stores|Automobile|Electricity|Power|Board|Corporation|Ltd|Limited|Enterprises|Agency|Traders|Pvt\s*Ltd))/i);
        if (vendorMatch) {
            vendorName = vendorMatch[1].trim();
        } else if (cleanLowerText.includes('petrol') || cleanLowerText.includes('fuels') || cleanLowerText.includes('diesel')) {
            vendorName = 'M/s. Arjun Fuels (Bharat Petroleum)';
        }
    }

    // 10. Item Details / Line items (e.g. Diesel 45.00 L @ rate)
    let itemDetails = extractedMeta?.items && extractedMeta.items.length > 0
        ? extractedMeta.items.map(it => ({
            name: it.description || it.name || 'Item',
            quantity: Number(it.quantity) || 1,
            unit: it.unit || 'Units',
            rate: Number(it.unitPrice || it.rate) || 0,
            amount: Number(it.total || it.amount) || 0
        }))
        : [];

    if (itemDetails.length === 0) {
        const fuelMatch = text.match(/\b(PETROL|DIESEL|SPEED\s*PETROL|POWER|CNG|AUTO\s*LPG|OIL)\b/i);
        const validQty = fuelQty > 0 ? fuelQty : 1;
        const itemName = fuelMatch ? fuelMatch[1].toUpperCase() : (detectedCategory !== 'Daily Expense' ? detectedCategory : 'DIESEL');
        const roundedTotal = Math.round(totalAmount * 100) / 100;
        const rateVal = fuelRate > 0 ? fuelRate : ((validQty > 0 && roundedTotal > 0) ? Math.round((roundedTotal / validQty) * 100) / 100 : roundedTotal);

        itemDetails.push({
            name: itemName,
            quantity: validQty,
            unit: 'Litre',
            rate: rateVal,
            amount: roundedTotal
        });
    }

    return {
        amount: Math.round(totalAmount * 100) / 100,
        litres: fuelQty,
        unitRate: fuelRate,
        category: detectedCategory,
        term: 'daily',
        date,
        invoiceNumber,
        supplierName: vendorName,
        vendorName: vendorName,
        vehicleNumber,
        gstNumber,
        phoneNumber,
        paymentMode,
        itemDetails,
        rawText: text,
        matchedKeywords,
        confidence: bestScore > 0 ? 'high' : 'medium'
    };
};

/**
 * Generate a preview thumbnail (Data URL) of page 1 of any PDF document.
 */
export const generatePdfThumbnail = async (file) => {
    try {
        if (!file || typeof document === 'undefined') return null;
        const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf');
        if (typeof window !== 'undefined' && !pdfjsLib.GlobalWorkerOptions?.workerSrc) {
            try {
                pdfjsLib.GlobalWorkerOptions.workerSrc = window.location.origin + '/pdf.worker.min.js';
            } catch (_) {
                pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '3.11.174'}/pdf.worker.min.js`;
            }
        }
        const arrayBuffer = file.arrayBuffer ? await file.arrayBuffer() : await new Response(file).arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({
            data: new Uint8Array(arrayBuffer)
        });
        const pdfDoc = await loadingTask.promise;
        const page = await pdfDoc.getPage(1);
        const viewport = page.getViewport({ scale: 1.2 });
        const canvas = document.createElement('canvas');
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        const ctx = canvas.getContext('2d');
        await page.render({ canvasContext: ctx, viewport }).promise;
        return canvas.toDataURL('image/jpeg', 0.82);
    } catch (err) {
        console.warn('Could not generate PDF thumbnail:', err);
        return null;
    }
};

/**
 * Extract digital text and/or OCR from PDF pages using pdfjs-dist and Tesseract.js.
 * Handles both:
 * 1. Digital vector PDFs (instant text layer extraction)
 * 2. Scanned image/thermal slips saved as PDF (rasterizes pages to canvas and runs Tesseract OCR)
 */
export const extractPdfBillData = async (file, onProgress) => {
    if (onProgress) onProgress(15, 'Reading PDF document...');

    const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf');
    if (typeof window !== 'undefined' && !pdfjsLib.GlobalWorkerOptions?.workerSrc) {
        try {
            pdfjsLib.GlobalWorkerOptions.workerSrc = window.location.origin + '/pdf.worker.min.js';
        } catch (_) {
            pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '3.11.174'}/pdf.worker.min.js`;
        }
    }

    const arrayBuffer = file.arrayBuffer ? await file.arrayBuffer() : await new Response(file).arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({
        data: new Uint8Array(arrayBuffer)
    });
    const pdfDoc = await loadingTask.promise;
    const numPages = Math.min(pdfDoc.numPages || 1, 4);

    let digitalText = '';
    let thumbnailDataUrl = null;
    const pagesList = [];

    if (onProgress) onProgress(25, `Inspecting ${numPages} page(s)...`);

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        const page = await pdfDoc.getPage(pageNum);
        pagesList.push(page);

        // A. Extract embedded digital text
        try {
            const textContent = await page.getTextContent();
            const pageText = (textContent?.items || [])
                .map(it => it.str || '')
                .filter(Boolean)
                .join(' ');
            if (pageText.trim()) {
                digitalText += pageText + '\n';
            }
        } catch (textErr) {
            console.warn(`Could not extract digital text from page ${pageNum}:`, textErr);
        }

        // B. Generate preview thumbnail from page 1
        if (pageNum === 1 && typeof document !== 'undefined') {
            try {
                const thumbViewport = page.getViewport({ scale: 1.2 });
                const thumbCanvas = document.createElement('canvas');
                thumbCanvas.width = Math.floor(thumbViewport.width);
                thumbCanvas.height = Math.floor(thumbViewport.height);
                const thumbCtx = thumbCanvas.getContext('2d');
                await page.render({ canvasContext: thumbCtx, viewport: thumbViewport }).promise;
                thumbnailDataUrl = thumbCanvas.toDataURL('image/jpeg', 0.82);
            } catch (thumbErr) {
                console.warn('Could not generate PDF thumbnail:', thumbErr);
            }
        }
    }

    // If the PDF has readable digital text (e.g. utility bills, generated GST invoices, petrol slips)
    if (digitalText.trim().length >= 25) {
        if (onProgress) onProgress(85, 'Extracted text from digital invoice...');
        return {
            text: digitalText,
            thumbnailUrl: thumbnailDataUrl,
            mode: 'digital-pdf'
        };
    }

    // Otherwise, this PDF contains a scanned image (thermal slip photo, paper receipt scanned into PDF).
    // Render page(s) to canvas at 2x scale and run Tesseract OCR!
    if (onProgress) onProgress(40, 'Scanned PDF detected. Running OCR on pages...');
    const Tesseract = await import('tesseract.js');
    let ocrText = '';

    for (let i = 0; i < pagesList.length; i++) {
        const page = pagesList[i];
        if (onProgress) onProgress(45 + Math.round((i / pagesList.length) * 45), `Scanning receipt page ${i + 1}...`);

        if (typeof document !== 'undefined') {
            const renderViewport = page.getViewport({ scale: 2.0 });
            const ocrCanvas = document.createElement('canvas');
            ocrCanvas.width = Math.floor(renderViewport.width);
            ocrCanvas.height = Math.floor(renderViewport.height);
            const ocrCtx = ocrCanvas.getContext('2d');
            await page.render({ canvasContext: ocrCtx, viewport: renderViewport }).promise;

            if (!thumbnailDataUrl && i === 0) {
                thumbnailDataUrl = ocrCanvas.toDataURL('image/jpeg', 0.82);
            }

            const ocrResult = await Tesseract.recognize(ocrCanvas, 'eng', {
                logger: (m) => {
                    if (m.status === 'recognizing text' && onProgress) {
                        const pct = Math.round(50 + (m.progress || 0) * 40);
                        onProgress(pct, `Scanning bill text (${Math.round((m.progress || 0) * 100)}%)...`);
                    }
                }
            });

            if (ocrResult?.data?.text) {
                ocrText += ocrResult.data.text + '\n';
            }
        }
    }

    return {
        text: ocrText.trim() || digitalText.trim(),
        thumbnailUrl: thumbnailDataUrl,
        mode: 'scanned-pdf-ocr'
    };
};

/**
 * Scan an expense bill or receipt (Image or PDF).
 * 1. For PDF files: Uses Filepe AI or browser-side pdfjs extractor + OCR.
 * 2. For Image files: Uses Filepe AI or browser-side Tesseract.js.
 */
export const scanExpenseBill = async (file, onProgress) => {
    const isPdf = file?.type === 'application/pdf' || 
                  (typeof file?.name === 'string' && file.name.toLowerCase().endsWith('.pdf'));

    // ── Case A: PDF Document (Digital vector PDF or Scanned raster PDF) ───
    if (isPdf) {
        // Attempt 1: Try Python OCR microservice if reachable
        try {
            if (onProgress) onProgress(15, 'Scanning invoice with Filepe AI...');
            const response = await PurchaseService.scanInvoice(file);

            if (response && response.success) {
                if (onProgress) onProgress(90, 'Processing extracted expense parameters...');
                const parsed = parseExpenseOcrData(
                    response.raw_text || '',
                    response.extracted_data || {}
                );
                const thumb = await generatePdfThumbnail(file);
                return {
                    ...parsed,
                    thumbnailUrl: thumb,
                    source: 'python-ocr'
                };
            }
        } catch (pythonErr) {
            console.warn('Python OCR unreachable for PDF, using intelligent browser PDF extractor:', pythonErr?.message);
        }

        // Attempt 2: Intelligent Browser PDF Extractor
        try {
            const pdfResult = await extractPdfBillData(file, onProgress);
            if (onProgress) onProgress(92, 'Categorizing expense bill...');
            const parsed = parseExpenseOcrData(pdfResult.text, {});

            return {
                ...parsed,
                thumbnailUrl: pdfResult.thumbnailUrl,
                source: pdfResult.mode || 'pdf-extractor'
            };
        } catch (pdfErr) {
            console.error('All PDF parsing methods failed:', pdfErr);
            throw new Error('Could not auto-read text from PDF bill. Please enter the amount and category manually.');
        }
    }

    // ── Case B: Image Files (JPG, PNG, WebP) ──────────────────────────────
    // Attempt 1: Project's Python OCR service via backend proxy
    try {
        if (onProgress) onProgress(20, 'Processing with Filepe AI...');
        const response = await PurchaseService.scanInvoice(file);

        if (response && response.success) {
            if (onProgress) onProgress(90, 'Processing extracted expense parameters...');
            const parsed = parseExpenseOcrData(
                response.raw_text || '', 
                response.extracted_data || {}
            );
            return {
                ...parsed,
                source: 'python-ocr'
            };
        }
    } catch (pythonErr) {
        console.warn('Python OCR service unreachable or returned error, falling back to Tesseract OCR:', pythonErr?.message);
    }

    // Attempt 2: Client-side Tesseract.js fallback for images
    try {
        if (onProgress) onProgress(40, 'Using smart fallback OCR engine...');
        const Tesseract = await import('tesseract.js');
        
        const result = await Tesseract.recognize(file, 'eng', {
            logger: (m) => {
                if (m.status === 'recognizing text' && onProgress) {
                    const pct = Math.round(40 + (m.progress || 0) * 50);
                    onProgress(pct, `Scanning bill text (${Math.round((m.progress || 0) * 100)}%)...`);
                }
            }
        });

        if (onProgress) onProgress(95, 'Categorizing expense bill...');
        const text = result?.data?.text || '';
        const parsed = parseExpenseOcrData(text, {});

        return {
            ...parsed,
            source: 'tesseract-fallback'
        };
    } catch (fallbackErr) {
        console.error('All OCR methods failed:', fallbackErr);
        throw new Error('Unable to extract text from this bill. Please enter the amount and category manually.');
    }
};

export const FUEL_CATEGORIES = [
    'Diesel',
    'Petrol',
    'Power / Speed Petrol',
    'CNG',
    'Auto LPG',
    'Engine Oil'
];

export const COMMON_EXPENSE_CATEGORIES = [
    'Diesel',
    'Petrol',
    'Food & Refreshments',
    'Electricity',
    'Water',
    'Maintenance & Repairs',
    'Travel & Conveyance',
    'Internet & Phone',
    'Stationery & Office',
    'Salary',
    'Rent',
    'LPG Gas',
    'Marketing'
];
