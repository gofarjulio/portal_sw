(function () {
  "use strict";

  var STORAGE_KEY = "standardized_work_app_v1";
  // Struktur data utama aplikasi yang selalu kita jaga.
  var DEFAULT_DATA = {
    observations: [],
    activeObservationId: null,
    drafts: {
      observasi: null
    },
    tskLayouts: {},
    manPowerMap: {},
    settings: {
      taktTime: 60
    },
    meta: {
      updatedAt: null
    }
  };

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function withDefaults(data) {
    // Gabungkan data lama dengan default supaya aman saat ada field baru.
    var base = clone(DEFAULT_DATA);
    if (!data || typeof data !== "object") {
      return base;
    }

    return {
      observations: Array.isArray(data.observations) ? data.observations : base.observations,
      activeObservationId: data.activeObservationId || null,
      drafts: Object.assign({}, base.drafts, data.drafts || {}),
      tskLayouts: Object.assign({}, base.tskLayouts, data.tskLayouts || {}),
      manPowerMap: Object.assign({}, base.manPowerMap, data.manPowerMap || {}),
      settings: Object.assign({}, base.settings, data.settings || {}),
      meta: Object.assign({}, base.meta, data.meta || {})
    };
  }

  function loadData() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return clone(DEFAULT_DATA);
      }
      return withDefaults(JSON.parse(raw));
    } catch (error) {
      console.error("Gagal membaca localStorage:", error);
      return clone(DEFAULT_DATA);
    }
  }

  function saveData(data) {
    var finalData = withDefaults(data);
    finalData.meta.updatedAt = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(finalData));
    return finalData;
  }

  function updateData(mutator) {
    var current = loadData();
    var working = clone(current);
    var maybeNext = mutator(working);
    var next = maybeNext && typeof maybeNext === "object" ? maybeNext : working;
    return saveData(next);
  }

  function resetData() {
    localStorage.removeItem(STORAGE_KEY);
  }

  function exportJson(filename) {
    // Export penuh agar mudah backup/migrasi data.
    var name = filename || "standardized-work-data.json";
    var data = loadData();
    var blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var link = document.createElement("a");
    link.href = url;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function importJsonFile(file) {
    return new Promise(function (resolve, reject) {
      if (!file) {
        reject(new Error("File tidak ditemukan."));
        return;
      }

      var reader = new FileReader();
      reader.onload = function (event) {
        try {
          // Validasi ringan dengan cara normalisasi ke struktur default.
          var parsed = JSON.parse(String(event.target.result || ""));
          var safeData = withDefaults(parsed);
          saveData(safeData);
          resolve(safeData);
        } catch (error) {
          reject(new Error("Format JSON tidak valid."));
        }
      };
      reader.onerror = function () {
        reject(new Error("Gagal membaca file import."));
      };
      reader.readAsText(file);
    });
  }

  var textEncoder = new TextEncoder();
  var CRC32_TABLE = buildCrc32Table();

  function toUtf8Bytes(text) {
    return textEncoder.encode(String(text == null ? "" : text));
  }

  function concatBytes(chunks) {
    var total = chunks.reduce(function (sum, chunk) { return sum + chunk.length; }, 0);
    var result = new Uint8Array(total);
    var offset = 0;
    chunks.forEach(function (chunk) {
      result.set(chunk, offset);
      offset += chunk.length;
    });
    return result;
  }

  function buildCrc32Table() {
    var table = new Uint32Array(256);
    for (var i = 0; i < 256; i += 1) {
      var c = i;
      for (var j = 0; j < 8; j += 1) {
        c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
      }
      table[i] = c >>> 0;
    }
    return table;
  }

  function crc32(bytes) {
    var crc = 0 ^ (-1);
    for (var i = 0; i < bytes.length; i += 1) {
      crc = (crc >>> 8) ^ CRC32_TABLE[(crc ^ bytes[i]) & 0xff];
    }
    return (crc ^ (-1)) >>> 0;
  }

  function dosDateTime() {
    var now = new Date();
    var year = Math.max(1980, now.getFullYear());
    var month = now.getMonth() + 1;
    var day = now.getDate();
    var hour = now.getHours();
    var minute = now.getMinutes();
    var second = Math.floor(now.getSeconds() / 2);
    return {
      date: ((year - 1980) << 9) | (month << 5) | day,
      time: (hour << 11) | (minute << 5) | second
    };
  }

  function createZip(files) {
    var localParts = [];
    var centralParts = [];
    var offset = 0;
    var stamp = dosDateTime();

    files.forEach(function (file) {
      var nameBytes = toUtf8Bytes(String(file.name || "").replace(/\\/g, "/"));
      var dataBytes = file.data instanceof Uint8Array ? file.data : toUtf8Bytes(file.data);
      var crc = crc32(dataBytes);
      var size = dataBytes.length;
      var localHeader = new ArrayBuffer(30);
      var localView = new DataView(localHeader);
      localView.setUint32(0, 0x04034b50, true);
      localView.setUint16(4, 20, true);
      localView.setUint16(6, 0, true);
      localView.setUint16(8, 0, true);
      localView.setUint16(10, stamp.time, true);
      localView.setUint16(12, stamp.date, true);
      localView.setUint32(14, crc, true);
      localView.setUint32(18, size, true);
      localView.setUint32(22, size, true);
      localView.setUint16(26, nameBytes.length, true);
      localView.setUint16(28, 0, true);
      localParts.push(new Uint8Array(localHeader), nameBytes, dataBytes);

      var centralHeader = new ArrayBuffer(46);
      var centralView = new DataView(centralHeader);
      centralView.setUint32(0, 0x02014b50, true);
      centralView.setUint16(4, 20, true);
      centralView.setUint16(6, 20, true);
      centralView.setUint16(8, 0, true);
      centralView.setUint16(10, 0, true);
      centralView.setUint16(12, stamp.time, true);
      centralView.setUint16(14, stamp.date, true);
      centralView.setUint32(16, crc, true);
      centralView.setUint32(20, size, true);
      centralView.setUint32(24, size, true);
      centralView.setUint16(28, nameBytes.length, true);
      centralView.setUint16(30, 0, true);
      centralView.setUint16(32, 0, true);
      centralView.setUint16(34, 0, true);
      centralView.setUint16(36, 0, true);
      centralView.setUint32(38, 0, true);
      centralView.setUint32(42, offset, true);
      centralParts.push(new Uint8Array(centralHeader), nameBytes);

      offset += 30 + nameBytes.length + size;
    });

    var centralSize = centralParts.reduce(function (sum, part) { return sum + part.length; }, 0);
    var endHeader = new ArrayBuffer(22);
    var endView = new DataView(endHeader);
    endView.setUint32(0, 0x06054b50, true);
    endView.setUint16(4, 0, true);
    endView.setUint16(6, 0, true);
    endView.setUint16(8, files.length, true);
    endView.setUint16(10, files.length, true);
    endView.setUint32(12, centralSize, true);
    endView.setUint32(16, offset, true);
    endView.setUint16(20, 0, true);

    return concatBytes(localParts.concat(centralParts, [new Uint8Array(endHeader)]));
  }

  function escapeXml(text) {
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  }

  function columnName(index) {
    var name = "";
    var i = index;
    while (i > 0) {
      var mod = (i - 1) % 26;
      name = String.fromCharCode(65 + mod) + name;
      i = Math.floor((i - 1) / 26);
    }
    return name || "A";
  }

  function sanitizeSheetName(name) {
    var safe = String(name || "Sheet1")
      .replace(/[\\\/\*\?\:\[\]]/g, " ")
      .trim();
    if (!safe) {
      safe = "Sheet1";
    }
    if (safe.length > 31) {
      safe = safe.slice(0, 31);
    }
    return safe;
  }

  function needsPreserveSpace(text) {
    return /^\s/.test(text) || /\s$/.test(text) || /\n/.test(text) || /\t/.test(text) || /  +/.test(text);
  }

  function cellXml(value, rowIndex, colIndex) {
    if (value == null || value === "") {
      return "";
    }
    var ref = columnName(colIndex) + String(rowIndex);
    if (typeof value === "number" && isFinite(value)) {
      return "<c r='" + ref + "'><v>" + String(value) + "</v></c>";
    }
    if (typeof value === "boolean") {
      return "<c r='" + ref + "' t='b'><v>" + (value ? "1" : "0") + "</v></c>";
    }

    var text = String(value);
    var preserve = needsPreserveSpace(text) ? " xml:space='preserve'" : "";
    return "<c r='" + ref + "' t='inlineStr'><is><t" + preserve + ">" + escapeXml(text) + "</t></is></c>";
  }

  function worksheetXml(rows) {
    var safeRows = Array.isArray(rows) ? rows : [];
    var lastRow = Math.max(1, safeRows.length);
    var maxCol = 1;
    var body = "";

    safeRows.forEach(function (rawRow, rowIdx) {
      var values = Array.isArray(rawRow) ? rawRow : [rawRow];
      if (values.length > maxCol) {
        maxCol = values.length;
      }
      var cells = "";
      for (var col = 0; col < values.length; col += 1) {
        cells += cellXml(values[col], rowIdx + 1, col + 1);
      }
      body += "<row r='" + String(rowIdx + 1) + "'>" + cells + "</row>";
    });

    var dimRef = "A1:" + columnName(maxCol) + String(lastRow);
    return (
      "<?xml version='1.0' encoding='UTF-8' standalone='yes'?>" +
      "<worksheet xmlns='http://schemas.openxmlformats.org/spreadsheetml/2006/main'>" +
      "<dimension ref='" + dimRef + "'/>" +
      "<sheetViews><sheetView workbookViewId='0'/></sheetViews>" +
      "<sheetFormatPr defaultRowHeight='15'/>" +
      "<sheetData>" + body + "</sheetData>" +
      "</worksheet>"
    );
  }

  function ensureXlsxFilename(filename) {
    var name = String(filename || "export.xlsx").trim();
    if (!name) {
      name = "export.xlsx";
    }
    if (/\.xlsx$/i.test(name)) {
      return name;
    }
    name = name.replace(/\.[^\/\\\.]+$/, "");
    return name + ".xlsx";
  }

  function buildXlsx(rows, sheetName) {
    var finalSheetName = sanitizeSheetName(sheetName);
    var wsXml = worksheetXml(rows);
    var wbXml =
      "<?xml version='1.0' encoding='UTF-8' standalone='yes'?>" +
      "<workbook xmlns='http://schemas.openxmlformats.org/spreadsheetml/2006/main' " +
      "xmlns:r='http://schemas.openxmlformats.org/officeDocument/2006/relationships'>" +
      "<sheets><sheet name='" + escapeXml(finalSheetName) + "' sheetId='1' r:id='rId1'/></sheets>" +
      "</workbook>";
    var wbRelsXml =
      "<?xml version='1.0' encoding='UTF-8' standalone='yes'?>" +
      "<Relationships xmlns='http://schemas.openxmlformats.org/package/2006/relationships'>" +
      "<Relationship Id='rId1' Type='http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet' Target='worksheets/sheet1.xml'/>" +
      "<Relationship Id='rId2' Type='http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles' Target='styles.xml'/>" +
      "</Relationships>";
    var relsXml =
      "<?xml version='1.0' encoding='UTF-8' standalone='yes'?>" +
      "<Relationships xmlns='http://schemas.openxmlformats.org/package/2006/relationships'>" +
      "<Relationship Id='rId1' Type='http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument' Target='xl/workbook.xml'/>" +
      "</Relationships>";
    var stylesXml =
      "<?xml version='1.0' encoding='UTF-8' standalone='yes'?>" +
      "<styleSheet xmlns='http://schemas.openxmlformats.org/spreadsheetml/2006/main'>" +
      "<fonts count='1'><font><sz val='11'/><name val='Calibri'/><family val='2'/></font></fonts>" +
      "<fills count='2'><fill><patternFill patternType='none'/></fill><fill><patternFill patternType='gray125'/></fill></fills>" +
      "<borders count='1'><border><left/><right/><top/><bottom/><diagonal/></border></borders>" +
      "<cellStyleXfs count='1'><xf numFmtId='0' fontId='0' fillId='0' borderId='0'/></cellStyleXfs>" +
      "<cellXfs count='1'><xf numFmtId='0' fontId='0' fillId='0' borderId='0' xfId='0'/></cellXfs>" +
      "<cellStyles count='1'><cellStyle name='Normal' xfId='0' builtinId='0'/></cellStyles>" +
      "</styleSheet>";
    var contentTypesXml =
      "<?xml version='1.0' encoding='UTF-8' standalone='yes'?>" +
      "<Types xmlns='http://schemas.openxmlformats.org/package/2006/content-types'>" +
      "<Default Extension='rels' ContentType='application/vnd.openxmlformats-package.relationships+xml'/>" +
      "<Default Extension='xml' ContentType='application/xml'/>" +
      "<Override PartName='/xl/workbook.xml' ContentType='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml'/>" +
      "<Override PartName='/xl/worksheets/sheet1.xml' ContentType='application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml'/>" +
      "<Override PartName='/xl/styles.xml' ContentType='application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml'/>" +
      "</Types>";

    return createZip([
      { name: "[Content_Types].xml", data: contentTypesXml },
      { name: "_rels/.rels", data: relsXml },
      { name: "xl/workbook.xml", data: wbXml },
      { name: "xl/_rels/workbook.xml.rels", data: wbRelsXml },
      { name: "xl/styles.xml", data: stylesXml },
      { name: "xl/worksheets/sheet1.xml", data: wsXml }
    ]);
  }

  function downloadXlsx(filename, rows, sheetName) {
    var xlsxBytes = buildXlsx(rows, sheetName || "Sheet1");
    var blob = new Blob([xlsxBytes], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    });
    var url = URL.createObjectURL(blob);
    var link = document.createElement("a");
    link.href = url;
    link.download = ensureXlsxFilename(filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function escapeCsvValue(value) {
    var text = value == null ? "" : String(value);
    if (/[",\n]/.test(text)) {
      return '"' + text.replace(/"/g, '""') + '"';
    }
    return text;
  }

  function toCsv(rows) {
    if (!Array.isArray(rows) || rows.length === 0) {
      return "";
    }

    var lines = rows.map(function (row) {
      return row.map(escapeCsvValue).join(",");
    });
    return lines.join("\n");
  }

  function downloadCsv(filename, rows) {
    // Tetap disediakan untuk kompatibilitas lama.
    var csv = toCsv(rows);
    var blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    var url = URL.createObjectURL(blob);
    var link = document.createElement("a");
    link.href = url;
    link.download = filename || "export.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  window.SWStorage = {
    STORAGE_KEY: STORAGE_KEY,
    DEFAULT_DATA: clone(DEFAULT_DATA),
    loadData: loadData,
    saveData: saveData,
    updateData: updateData,
    resetData: resetData,
    exportJson: exportJson,
    importJsonFile: importJsonFile,
    downloadXlsx: downloadXlsx,
    toCsv: toCsv,
    downloadCsv: downloadCsv
  };
})();
