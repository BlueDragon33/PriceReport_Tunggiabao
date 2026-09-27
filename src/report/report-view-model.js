import { calculateQuoteBreakdown, normalizeCatalogCurrency } from '../core.js';

const text = value => String(value ?? '').trim();

export function buildReportViewModel(quotation = {}) {
  const products = Array.isArray(quotation.products) ? quotation.products : [];
  const totals = calculateQuoteBreakdown({ ...quotation, products });
  return {
    quote: {
      quoteNo: text(quotation.quoteNo),
      quoteDate: text(quotation.quoteDate),
      validity: text(quotation.validity),
      title: text(quotation.quoteTitle || 'BẢNG BÁO GIÁ'),
      subtitle: text(quotation.quoteSubtitle),
      status: text(quotation.quoteStatus || 'draft'),
      currency: normalizeCatalogCurrency(quotation.currency || 'VND')
    },
    company: {
      name: text(quotation.companyName),
      address: text(quotation.companyAddressDetail || quotation.companyAddress),
      province: text(quotation.companyProvince),
      ward: text(quotation.companyWard),
      phone: text(quotation.phone),
      taxCode: text(quotation.taxCode),
      website: text(quotation.website),
      email: text(quotation.companyEmail)
    },
    customer: {
      name: text(quotation.customerName),
      company: text(quotation.customerCompany),
      address: text(quotation.customerAddress),
      phone: text(quotation.customerPhone),
      email: text(quotation.customerEmail),
      contact: text(quotation.customerContact)
    },
    items: products.map(item => ({
      itemId: text(item?.itemId),
      sourceProductId: text(item?.sourceProductId),
      group: text(item?.group),
      name: text(item?.name ?? item?.nameSnapshot),
      pack: text(item?.pack ?? item?.packSnapshot),
      unit: text(item?.unit ?? item?.unitSnapshot),
      qty: Number(item?.qty || 0),
      price: Number(item?.price ?? item?.unitPrice ?? 0),
      note: text(item?.note)
    })),
    totals,
    payment: {
      method: text(quotation.paymentMethod),
      bankName: text(quotation.bankName),
      bankAccount: text(quotation.bankAccount),
      bankOwner: text(quotation.bankOwner)
    },
    terms: text(quotation.termsText).split(/\r?\n/).map(line => line.trim()).filter(Boolean),
    signature: {
      dateLine: text(quotation.dateLine),
      leftTitle: text(quotation.leftTitle),
      leftName: text(quotation.leftName),
      rightTitle: text(quotation.rightTitle),
      rightName: text(quotation.rightName)
    }
  };
}
