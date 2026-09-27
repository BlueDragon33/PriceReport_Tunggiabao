import { isValidISODate, normalizeNonNegativeNumber } from '../core.js';

export function hasQuotationItemDraftContent(product) {
  if (!product) return false;
  if ([product.group, product.name, product.pack, product.unit, product.note].some(value => String(value || '').trim())) return true;
  if (normalizeNonNegativeNumber(product.price ?? product.unitPrice) > 0) return true;
  return normalizeNonNegativeNumber(product.qty) !== 1;
}
export function validateQuotation(data = {}) {
  const errors = [];
  const warnings = [];
  if (!String(data.companyName || '').trim()) errors.push('Thiếu tên công ty.');
  if (!String(data.quoteTitle || '').trim()) errors.push('Thiếu tiêu đề báo giá.');
  if (!String(data.recipientLine || '').trim()) warnings.push('Chưa có dòng Kính gửi.');
  const finalStatus = data.quoteStatus && data.quoteStatus !== 'draft';
  if (finalStatus && !String(data.quoteNo || '').trim()) errors.push('Báo giá đã rời trạng thái nháp nhưng chưa có số báo giá.');
  if (finalStatus && !String(data.quoteDate || '').trim()) errors.push('Báo giá đã rời trạng thái nháp nhưng chưa có ngày báo giá.');
  if (data.quoteDate && !isValidISODate(data.quoteDate)) (finalStatus ? errors : warnings).push('Ngày báo giá không hợp lệ; cần dùng định dạng ngày hợp lệ.');
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (data.companyEmail && !emailPattern.test(String(data.companyEmail))) warnings.push('Email công ty có vẻ chưa đúng định dạng.');
  if (data.customerEmail && !emailPattern.test(String(data.customerEmail))) warnings.push('Email khách hàng có vẻ chưa đúng định dạng.');
  const products = Array.isArray(data.products) ? data.products : [];
  const namedProducts = products.filter(product => String(product?.name || product?.nameSnapshot || '').trim());
  if (!namedProducts.length) errors.push('Chưa có sản phẩm hợp lệ.');
  products.forEach((product, index) => {
    const name = String(product?.name || product?.nameSnapshot || '').trim();
    const qty = Number(product?.qty || 0);
    const price = Number(product?.price ?? product?.unitPrice ?? 0);
    if (!name && hasQuotationItemDraftContent(product)) {
      errors.push('Dòng sản phẩm ' + (index + 1) + ' đã có dữ liệu nhưng chưa có tên.');
      return;
    }
    if (name && qty < 0) warnings.push('Dòng sản phẩm ' + (index + 1) + ' "' + name + '" có số lượng âm.');
    else if (name && (data.showQty || data.showAmount || data.showTotals) && qty === 0) warnings.push('Dòng sản phẩm ' + (index + 1) + ' "' + name + '" có số lượng bằng 0.');
    if (name && price < 0) warnings.push('Dòng sản phẩm ' + (index + 1) + ' "' + name + '" có đơn giá âm.');
    else if (name && data.showPrice && price === 0) warnings.push('Dòng sản phẩm ' + (index + 1) + ' "' + name + '" chưa có đơn giá.');
  });
  if (data.showQuoteMeta && !String(data.quoteNo || '').trim()) warnings.push('Đang hiện hộp thông tin nhưng chưa có số báo giá.');
  if (data.showLogo && !data.logo) warnings.push('Đang bật hiển thị logo nhưng chưa có file logo.');
  if ((Number(data.discountPct || 0) > 0 || Number(data.vatPct || 0) > 0 || Number(data.otherFee || 0) > 0) && !data.showTotals) warnings.push('Có giảm giá/VAT/phí khác nhưng bảng tổng cộng đang bị ẩn.');
  if (Number(data.vatPct || 0) > 0 && /đã bao gồm\s*VAT/i.test(String(data.termsText || ''))) warnings.push('Điều khoản ghi "đã bao gồm VAT" trong khi bảng tổng cộng đang cộng VAT riêng.');
  if (data.showTerms && !String(data.termsText || '').trim()) warnings.push('Đang bật điều khoản nhưng nội dung điều khoản đang trống.');
  if (data.showSignature && !String(data.rightTitle || '').trim()) warnings.push('Đang bật chữ ký nhưng chức danh đại diện công ty đang trống.');
  const transferOnly = /^\s*chuyển khoản\s*$/i.test(String(data.paymentMethod || ''));
  const partialBank = [data.bankName, data.bankAccount, data.bankOwner].some(Boolean) && ![data.bankName, data.bankAccount, data.bankOwner].every(Boolean);
  if (data.showPaymentBlock && transferOnly && !data.bankName) warnings.push('Phương thức là chuyển khoản nhưng chưa nhập ngân hàng.');
  if (data.showPaymentBlock && partialBank) warnings.push('Thông tin tài khoản ngân hàng đang nhập dở.');
  return { errors, warnings, info: [] };
}
