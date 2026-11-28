# Statement import adapters

The SBI value/post-date adapter supports seven logical columns: Value Date, Post Date, Details, Ref/Cheque, Debit, Credit, Balance. This includes PDFs whose first six header labels are rasterized and CSV conversions with blank padding columns and blank-date narration fragments.

Detection requires the printed Statement From period and Brought Forward / debit count / credit count / debit total / credit total / closing balance summary. PDF detection additionally requires the SBI text marker and one seven-column transaction table per transaction page. Missing dated rows, ambiguous amount columns, invalid dates, discrepancies in printed counts/totals and running/opening/closing balance differences cause rejection. Debit/credit directions come from fixed layout columns, never from guessed narration. Dates use the layout’s explicit DD/MM/YYYY posting-date column. The input date-format selector remains required for generic bank CSVs.

Regression coverage includes PDF/CSV equality, blank padding, missing rasterized headers, compact CR balances, changed directions, missing rows, inconsistent counts/totals/opening and unknown headerless inputs. Personal source statements are excluded from fixtures and deployment packages.

A backend deployment is required before the public app can use a newly added adapter. Existing failed jobs remain failed; submit a fresh upload after deployment. Canonical normalized CSV is supported by the existing backend.
