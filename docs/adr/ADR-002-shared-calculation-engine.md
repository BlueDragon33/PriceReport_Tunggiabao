# ADR-002: One quotation calculation engine

Status: Accepted — V6.19

`calculateQuoteBreakdown()` owns subtotal, discount, taxable base, VAT, fees and grand total. Preview and Excel/export consume it instead of duplicating formulas.
