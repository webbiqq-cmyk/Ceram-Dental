// Shared helpers for turning a dataset into a downloadable Excel or Word
// file — one place for the actual file-building logic, so each export
// controller function is just "pick the rows, describe the columns".
const ExcelJS = require('exceljs');
const { Document, Packer, Paragraph, HeadingLevel, Table, TableRow, TableCell, TextRun } = require('docx');

// Inclusive date-range check. `to` is treated as end-of-day so
// "to=2026-01-31" actually includes everything on the 31st, not just
// midnight.
function inRange(date, from, to) {
  const d = new Date(date).getTime();
  if (Number.isNaN(d)) return true; // don't silently drop rows with an odd/missing date
  if (from && d < new Date(from).getTime()) return false;
  if (to && d > new Date(to).getTime() + 86399999) return false;
  return true;
}

// Strict YYYY-MM-DD only. `from`/`to` end up in a filename and then a
// Content-Disposition header — Node's http module throws on invalid
// header characters, and a query string is exactly the kind of thing an
// attacker (or just a bad link) puts arbitrary bytes into. Rejecting
// anything that isn't a plain date here, before it reaches a header,
// closes that off at the source rather than relying only on the
// asyncHandler safety net downstream.
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
function sanitizeDateParam(v) {
  if (typeof v !== 'string' || !DATE_ONLY.test(v)) return null;
  return Number.isNaN(new Date(v).getTime()) ? null : v;
}

// Defaults to the current calendar month when no range is given — matches
// "export this month's X" being the common case.
function resolveRange(query) {
  const now = new Date();
  const from = sanitizeDateParam(query.from) || new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const to = sanitizeDateParam(query.to) || now.toISOString().slice(0, 10);
  return { from, to };
}

async function buildXlsx(sheetName, columns, rows) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Ceram Dental';
  wb.created = new Date();
  const sheet = wb.addWorksheet(sheetName);
  sheet.columns = columns;
  rows.forEach(r => sheet.addRow(r));
  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0EBF3' } };
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columns.length } };
  return wb.xlsx.writeBuffer();
}

function sendXlsx(res, filename, buffer) {
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="' + filename + '"');
  res.send(Buffer.from(buffer));
}

async function buildReportDocx({ title, subtitle, sections }) {
  const children = [
    new Paragraph({ text: title, heading: HeadingLevel.TITLE }),
    new Paragraph({ text: subtitle, spacing: { after: 300 } })
  ];
  for (const s of sections) {
    children.push(new Paragraph({ text: s.heading, heading: HeadingLevel.HEADING_2, spacing: { before: 300, after: 150 } }));
    if (s.paragraphs) s.paragraphs.forEach(p => children.push(new Paragraph({ text: p })));
    if (s.table) {
      const rows = [s.table.header, ...s.table.rows].map((r, i) =>
        new TableRow({
          children: r.map(cell => new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: String(cell), bold: i === 0 })] })]
          }))
        })
      );
      children.push(new Table({ rows }));
    }
  }
  const doc = new Document({ sections: [{ children }] });
  return Packer.toBuffer(doc);
}

function sendDocx(res, filename, buffer) {
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  res.setHeader('Content-Disposition', 'attachment; filename="' + filename + '"');
  res.send(Buffer.from(buffer));
}

module.exports = { inRange, resolveRange, buildXlsx, sendXlsx, buildReportDocx, sendDocx };
