import React from 'react';
import { Printer } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { DEMO_PREVIEW, buildUpiPayString } from '../../utils/upiQr';
import { SAMPLE_BARCODE_ITEM } from '../../utils/printTestHelpers';

const DemoLogo = () => (
    <div className="w-12 h-8 mx-auto mb-1 bg-gray-200 border border-gray-300 rounded flex items-center justify-center text-[8px] font-black text-gray-500 uppercase">Logo</div>
);

const UpiQrPreview = ({ upiId, payeeName, amount, size = 80 }) => {
    const value = buildUpiPayString({ upiId, payeeName, amount });
    if (!value) return null;
    return (
        <div className="text-center mt-2">
            <QRCodeSVG value={value} size={size} level="M" />
            <p className="text-[8px] text-gray-500 mt-1">Scan to pay {Number(amount).toFixed(2)}</p>
        </div>
    );
};

const PreviewShell = ({ title, children, onTestPrint, theme, hint }) => (
    <div className={`rounded-2xl border ${theme.borderLight} ${theme.inputBg} p-4 space-y-3 md:sticky md:top-4`}>
        <div className="flex items-center justify-between gap-2">
            <p className={`text-[10px] font-black uppercase tracking-widest ${theme.textMuted}`}>{title}</p>
            <button type="button" onClick={onTestPrint} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider ${theme.buttonBg} ${theme.buttonText}`}>
                <Printer size={14} /> Test Print
            </button>
        </div>
        <div className={`rounded-xl border-2 border-dashed ${theme.borderLight} bg-white/95 dark:bg-slate-900/40 overflow-auto flex items-start justify-center p-3 min-h-[220px] max-h-[560px]`}>
            {children}
        </div>
        {hint && <p className={`text-[10px] ${theme.textMuted} text-center`}>{hint}</p>}
    </div>
);

const BarcodePreview = ({ settings, formatCurrency }) => {
    const s = settings || {};
    const scale = 3;
    const d = DEMO_PREVIEW;
    const order = s.elementsOrder || ['shopName', 'logo', 'barcode', 'name', 'code', 'price'];
    const item = SAMPLE_BARCODE_ITEM;

    const renderSlot = (key) => {
        if (key === 'shopName' && s.includeShopName) return <div key={key} style={{ fontWeight: 800, fontSize: `${(s.baseFontSize || 10) * 1.05}px`, textTransform: 'uppercase' }}>{d.shopName}</div>;
        if (key === 'logo' && s.includeLogo) return <DemoLogo key={key} />;
        if (key === 'barcode') return (
            <div key={key} className="flex gap-px justify-center my-1" style={{ height: 28, maxWidth: '95%' }}>
                {Array.from({ length: 28 }, (_, i) => <div key={i} style={{ width: i % 3 === 0 ? 2 : 1, height: '100%', background: '#111' }} />)}
            </div>
        );
        if (key === 'name' && s.includeName) return <div key={key} style={{ fontWeight: 700 }}>{s.showNameLabel ? 'Item: ' : ''}{item.name}</div>;
        if (key === 'code' && s.includeCode) return <div key={key} style={{ fontSize: `${(s.baseFontSize || 10) * 0.85}px` }}>{s.showCodeLabel ? 'Code: ' : ''}{item.itemCode}</div>;
        if (key === 'price' && s.includePrice) return <div key={key} style={{ fontWeight: 800 }}>{s.showPriceLabel ? 'Price: ' : ''}{formatCurrency(item.sellingPrice)}</div>;
        if (key === 'mrp' && s.includeMRP) return <div key={key} style={{ fontWeight: 800 }}>{s.showMRPLabel ? 'MRP: ' : ''}{formatCurrency(item.mrp)}</div>;
        if (key === 'batch' && s.includeBatch) return <div key={key} style={{ fontSize: `${(s.baseFontSize || 10) * 0.85}px` }}>{s.showBatchLabel ? 'Batch: ' : ''}BATCH-001</div>;
        if (key === 'expiry' && s.includeExpiry) return <div key={key} style={{ fontSize: `${(s.baseFontSize || 10) * 0.85}px` }}>{s.showExpiryLabel ? 'Exp: ' : ''}31-12-2026</div>;
        if (key === 'unit' && s.includeUnit) return <div key={key} style={{ fontWeight: 600 }}>{s.showUnitLabel ? 'Qty: ' : ''}1 kg</div>;
        if (key === 'custom' && s.customText) return <div key={key} style={{ fontSize: 8 }}>{s.customText}</div>;
        return null;
    };

    return (
        <div className="bg-white text-black shadow-md" style={{
            width: `${(s.labelWidth || 50) * scale}px`, minHeight: `${(s.labelHeight || 25) * scale}px`,
            padding: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            textAlign: 'center', fontSize: `${s.baseFontSize || 10}px`, boxSizing: 'border-box',
        }}>
            {order.map(renderSlot)}
        </div>
    );
};

const BillThermalPreview = ({ fmt }) => {
    const d = DEMO_PREVIEW;
    const w = fmt.paperWidthMm || 80;
    const fs = fmt.baseFontSize || 12;
    const metaParts = [
        fmt.includeInvoiceNumber !== false && d.invoiceNumber,
        fmt.includeOrderNumber !== false && d.orderNumber,
        fmt.includeTable !== false && d.table,
        fmt.includeCustomer !== false && d.customer,
        fmt.includePaymentMethod && d.paymentMethod,
    ].filter(Boolean);

    return (
        <div className="bg-white text-black font-mono p-3 mx-auto shadow-md" style={{ width: `${Math.min(w * 2.2, 280)}px`, fontSize: `${fs}px` }}>
            <div className="text-center space-y-0.5">
                {fmt.includeLogo !== false && <DemoLogo />}
                {fmt.includeShopName !== false && <div className="font-black text-sm">{d.shopName}</div>}
                {fmt.includeBranchName !== false && <div className="font-bold text-xs">{d.branchName}</div>}
                {fmt.includeAddress !== false && <div className="text-[9px] text-gray-600">{d.address}</div>}
                {fmt.includeContact !== false && <div className="text-[10px] font-bold">{d.contact}</div>}
                {fmt.includeGstNumber && <div className="text-[9px] text-gray-600">GSTIN: {d.gstNumber}</div>}
                {fmt.includeFssai && <div className="text-[9px] text-gray-600">FSSAI: {d.fssai}</div>}
            </div>
            <div className="border-t border-dashed border-gray-400 my-2" />
            <div className="text-center font-black text-sm">BILL</div>
            {metaParts.length > 0 && <div className="text-center text-[9px] text-gray-500">{metaParts.join(' • ')}</div>}
            {fmt.includeStaff && <div className="text-center text-[9px] text-gray-500">Billed by: {d.staffName}</div>}
            <div className="border-t border-dashed border-gray-400 my-2" />
            <table className="w-full text-[10px]">
                <thead><tr className="border-b border-dashed border-gray-400"><th className="text-left">#</th><th className="text-left">Item</th><th className="text-right">Qty</th><th className="text-right">Amt</th></tr></thead>
                <tbody>
                    <tr><td>1</td><td>Sample Item A</td><td className="text-right">2</td><td className="text-right">360</td></tr>
                    <tr><td>2</td><td>Sample Item B</td><td className="text-right">1</td><td className="text-right">60</td></tr>
                </tbody>
            </table>
            <div className="border-t border-dashed border-gray-400 my-2" />
            <div className="text-[10px] space-y-0.5">
                <div className="flex justify-between"><span>Subtotal</span><span>420.00</span></div>
                {fmt.includeOffers !== false && <div className="flex justify-between text-green-600"><span>Offer</span><span>-20.00</span></div>}
                <div className="flex justify-between"><span>Tax</span><span>20.00</span></div>
                {fmt.includeTaxBreakdown !== false && <>
                    <div className="flex justify-between text-gray-500 pl-2"><span>CGST</span><span>10.00</span></div>
                    <div className="flex justify-between text-gray-500 pl-2"><span>SGST</span><span>10.00</span></div>
                </>}
                <div className="flex justify-between font-black text-sm border-t border-gray-300 pt-1"><span>Total</span><span>420.00</span></div>
            </div>
            {fmt.includeUpiCode && <UpiQrPreview upiId={d.upiId} payeeName={d.payeeName} amount={d.billTotal} size={72} />}
            {fmt.includeThankYou !== false && fmt.footerText && <div className="text-center text-[9px] italic text-gray-500 mt-2">{fmt.footerText}</div>}
        </div>
    );
};

const BillA4Preview = ({ fmt }) => {
    const d = DEMO_PREVIEW;
    return (
        <div className="bg-white text-black p-5 w-full shadow-md text-xs" style={{ maxWidth: 420, minHeight: 520 }}>
            <div className="flex justify-between border-b-2 border-gray-200 pb-3 mb-3">
                <div>
                    <div className="text-lg font-black uppercase">Tax Invoice</div>
                    {fmt.includeInvoiceNumber !== false && <div className="text-[10px] mt-1">Invoice: {d.invoiceNumber}</div>}
                    {fmt.includeOrderNumber !== false && <div className="text-[10px]">Order: {d.orderNumber}</div>}
                    {fmt.includeCustomer !== false && <div className="text-[10px]">Customer: {d.customer}</div>}
                </div>
                <div className="text-right">
                    {fmt.includeLogo !== false && <DemoLogo />}
                    {fmt.includeShopName !== false && <div className="font-black">{d.shopName}</div>}
                    {fmt.includeBranchName !== false && <div className="text-gray-600">{d.branchName}</div>}
                </div>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="border rounded-lg p-2">
                    <div className="text-[9px] uppercase text-gray-500 mb-1">Sold By</div>
                    {fmt.includeShopName !== false && <div className="font-bold">{d.shopName}</div>}
                    {fmt.includeAddress !== false && <div className="text-[10px] text-gray-600">{d.address}</div>}
                    {fmt.includeContact !== false && <div className="text-[10px]">{d.contact}</div>}
                    {fmt.includeGstNumber && <div className="text-[10px]">GSTIN: {d.gstNumber}</div>}
                    {fmt.includeFssai && <div className="text-[10px]">FSSAI: {d.fssai}</div>}
                </div>
                <div className="border rounded-lg p-2">
                    <div className="text-[9px] uppercase text-gray-500 mb-1">Branch</div>
                    {fmt.includeBranchName !== false && <div className="font-bold">{d.branchName}</div>}
                </div>
            </div>
            <table className="w-full text-[10px] mb-3">
                <thead className="border-b-2 border-gray-800"><tr><th>#</th><th>Item</th><th className="text-right">Qty</th><th className="text-right">Amt</th></tr></thead>
                <tbody>
                    <tr className="border-b"><td>01</td><td className="font-bold">Sample Item A</td><td className="text-right">2</td><td className="text-right">360</td></tr>
                    <tr className="border-b"><td>02</td><td className="font-bold">Sample Item B</td><td className="text-right">1</td><td className="text-right">60</td></tr>
                </tbody>
            </table>
            <div className="flex justify-end gap-4 items-start">
                <div className="border rounded-lg p-2 w-40 space-y-1">
                    <div className="flex justify-between"><span>Subtotal</span><span>420</span></div>
                    {fmt.includeOffers !== false && <div className="flex justify-between text-green-600"><span>Offer</span><span>-20</span></div>}
                    <div className="flex justify-between font-black border-t pt-1"><span>Total</span><span>420</span></div>
                </div>
                {fmt.includeUpiCode && <UpiQrPreview upiId={d.upiId} payeeName={d.payeeName} amount={d.billTotal} size={64} />}
            </div>
            {fmt.includeStaff && <div className="text-[10px] text-gray-500 mt-3">Billed by: {d.staffName}</div>}
            {fmt.includeThankYou !== false && fmt.footerText && <div className="text-center text-[9px] text-gray-400 mt-4 uppercase tracking-wider">{fmt.footerText}</div>}
        </div>
    );
};

const PurchasePreview = ({ pis }) => {
    const d = DEMO_PREVIEW;
    const isA4 = (pis.defaultPaperSize || 'a4') === 'a4';
    const wrapperClass = isA4
        ? 'bg-white text-black p-5 w-full shadow-md text-xs'
        : 'bg-white text-black font-mono p-3 mx-auto shadow-md text-[10px]';
    const wrapperStyle = isA4 ? { maxWidth: 420, minHeight: 480 } : { width: 220 };

    if (!isA4) {
        return (
            <div className={wrapperClass} style={wrapperStyle}>
                <div className="text-center font-black text-sm">PURCHASE</div>
                {pis.includeShopName !== false && <div className="text-center font-bold">{d.shopName}</div>}
                {pis.includePurchaseDate !== false && <div className="text-center text-[9px] text-gray-500">{d.purchaseRef}</div>}
                <div className="border-t border-dashed my-2" />
                {pis.includeSupplierDetails !== false && <div className="mb-1"><span className="font-bold">{d.supplierName}</span></div>}
                {pis.includeBranchAddress !== false && <div className="text-[9px]">{d.branchName}</div>}
                {pis.includeGstNumber && <div className="text-[9px]">GST: {d.gstNumber}</div>}
                {pis.includeFssai && <div className="text-[9px]">FSSAI: {d.fssai}</div>}
                <div className="border-t border-dashed my-2" />
                <div className="flex justify-between"><span>Sample Item</span><span>2,132</span></div>
                <div className="border-t border-dashed my-2 font-black flex justify-between"><span>Total</span><span>2,132</span></div>
            </div>
        );
    }

    return (
        <div className={wrapperClass} style={wrapperStyle}>
            <div className="flex justify-between border-b pb-3 mb-3">
                <div>
                    <div className="text-xl font-black uppercase">Purchase Invoice</div>
                    {pis.includePurchaseDate !== false && <div className="text-[10px] mt-1">Date: 14/06/2026</div>}
                    {pis.includeInvoiceNumber !== false && <div className="text-[10px]">Ref: {d.purchaseRef}</div>}
                </div>
                {pis.includeShopName !== false && <div className="font-black text-right">{d.shopName}</div>}
            </div>
            <div className="grid grid-cols-2 gap-2 mb-3">
                {pis.includeSupplierDetails !== false && (
                    <div className="border rounded p-2">
                        <div className="text-[9px] uppercase text-gray-500">Supplier</div>
                        <div className="font-bold">{d.supplierName}</div>
                        <div className="text-[10px] text-gray-600">{d.supplierAddress}</div>
                    </div>
                )}
                <div className="border rounded p-2">
                    <div className="text-[9px] uppercase text-gray-500">Branch</div>
                    <div className="font-bold">{d.branchName}</div>
                    {pis.includeBranchAddress !== false && <div className="text-[10px] text-gray-600">{d.address}</div>}
                    {pis.includeGstNumber && <div className="text-[10px]">GST: {d.gstNumber}</div>}
                    {pis.includeFssai && <div className="text-[10px]">FSSAI: {d.fssai}</div>}
                </div>
            </div>
            <table className="w-full text-[10px]">
                <thead className="border-b-2"><tr><th>#</th><th>Item</th><th>Qty</th><th>Total</th></tr></thead>
                <tbody>
                    <tr className="border-b"><td>01</td><td><div className="font-bold">Sample Raw Item</div>{pis.includeItemCode !== false && <div className="text-gray-500">RM001</div>}</td><td>10</td><td>2,132</td></tr>
                </tbody>
            </table>
            {pis.includeNotes !== false && <div className="text-[10px] text-gray-500 mt-3">Notes: Demo purchase note</div>}
            {pis.footerText && <div className="text-center text-[9px] text-gray-400 mt-4">{pis.footerText}</div>}
        </div>
    );
};

const PrintSettingsPreview = ({ type, settings, billSettings, purchaseSettings, formatCurrency, onTestPrint, theme }) => {
    const meta = {
        barcode: { title: 'Label Preview', hint: 'Demo label — toggles control visible fields.' },
        thermal: { title: 'Thermal Bill Preview', hint: 'Demo 80mm receipt — only enabled fields shown.' },
        a4: { title: 'A4 Invoice Preview', hint: 'Demo A4 tax invoice layout.' },
        purchase: {
            title: `Purchase Preview (${(purchaseSettings?.defaultPaperSize || 'a4') === 'a4' ? 'A4' : 'Thermal'})`,
            hint: `Demo ${(purchaseSettings?.defaultPaperSize || 'a4') === 'a4' ? 'A4' : 'thermal'} purchase invoice.`,
        },
    }[type];

    let content = null;
    if (type === 'barcode') content = <BarcodePreview settings={settings} formatCurrency={formatCurrency} />;
    if (type === 'thermal') content = <BillThermalPreview fmt={billSettings?.thermal || {}} />;
    if (type === 'a4') content = <BillA4Preview fmt={billSettings?.a4 || {}} />;
    if (type === 'purchase') content = <PurchasePreview pis={purchaseSettings} />;

    return (
        <PreviewShell title={meta.title} onTestPrint={onTestPrint} theme={theme} hint={meta.hint}>
            {content}
        </PreviewShell>
    );
};

export default PrintSettingsPreview;
