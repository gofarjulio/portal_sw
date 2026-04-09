(function () {
  "use strict";

  var page = document.body.getAttribute("data-page") || "";

  document.addEventListener("DOMContentLoaded", function () {
    activateMenu();
    bindGlobalActions();
    initCurrentPage();
  });

  function initCurrentPage() {
    if (page === "home") initHomePage();
    if (page === "observasi") initObservasiPage();
    if (page === "tskk") initTskkPage();
    if (page === "tsk") initTskPage();
    if (page === "tskp") initTskpPage();
    if (page === "yamazumi") initYamazumiPage();
  }

  function byId(id) {
    return document.getElementById(id);
  }

  function showMessage(text, isError) {
    var el = byId("globalMessage");
    if (!el) return;
    el.textContent = text || "";
    el.classList.toggle("error", Boolean(isError));
  }

  function sanitize(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function activateMenu() {
    var current = window.location.pathname.split("/").pop() || "index.html";
    document.querySelectorAll(".menu a").forEach(function (a) {
      if ((a.getAttribute("href").split("/").pop() || "") === current) {
        a.classList.add("active");
      }
    });
  }

  function bindGlobalActions() {
    // Tombol global tersedia di semua halaman (export/import/reset).
    var exportBtn = byId("exportJsonBtn");
    var importInput = byId("importJsonInput");
    var resetBtn = byId("resetDataBtn");

    if (exportBtn) {
      exportBtn.addEventListener("click", function () {
        SWStorage.exportJson();
        showMessage("Data berhasil diexport ke JSON.");
      });
    }

    if (importInput) {
      importInput.addEventListener("change", function (event) {
        var file = event.target.files && event.target.files[0];
        SWStorage.importJsonFile(file)
          .then(function () {
            showMessage("Import berhasil. Halaman akan dimuat ulang.");
            setTimeout(function () { window.location.reload(); }, 500);
          })
          .catch(function (err) {
            showMessage(err.message, true);
          })
          .finally(function () {
            importInput.value = "";
          });
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener("click", function () {
        if (!window.confirm("Yakin ingin menghapus semua data?")) return;
        SWStorage.resetData();
        showMessage("Data dihapus. Halaman akan dimuat ulang.");
        setTimeout(function () { window.location.reload(); }, 450);
      });
    }
  }

  function parseSamples(text) {
    if (!text) return [];
    return String(text)
      .split(/[,;\s]+/)
      .map(function (x) { return Number(x); })
      .filter(function (x) { return !Number.isNaN(x) && x >= 0; });
  }

  function getStats(samples) {
    if (!samples.length) return { avg: 0, min: 0, max: 0 };
    var sum = samples.reduce(function (a, b) { return a + b; }, 0);
    return {
      avg: sum / samples.length,
      min: Math.min.apply(null, samples),
      max: Math.max.apply(null, samples)
    };
  }

  function cycleTime(observation) {
    if (!observation || !Array.isArray(observation.elements)) return 0;
    return observation.elements.reduce(function (sum, row) {
      return sum + (Number(row.avg) || 0);
    }, 0);
  }

  function fixed2(value) {
    return (Number(value) || 0).toFixed(2);
  }

  function formatDate(iso) {
    if (!iso) return "-";
    return new Date(iso).toLocaleString("id-ID");
  }

  function setActiveObservation(id) {
    SWStorage.updateData(function (data) {
      data.activeObservationId = id;
      return data;
    });
  }

  function initHomePage() {
    // Dashboard menampilkan ringkasan data terbaru.
    var data = SWStorage.loadData();
    var observations = data.observations || [];
    var pSet = {};
    var oSet = {};
    var totalCycle = 0;

    observations.forEach(function (obs) {
      pSet[obs.processName] = true;
      oSet[obs.operatorName] = true;
      totalCycle += cycleTime(obs);
    });

    byId("homeProcessCount").textContent = String(Object.keys(pSet).length);
    byId("homeOperatorCount").textContent = String(Object.keys(oSet).length);
    byId("homeAvgCycle").textContent = observations.length ? fixed2(totalCycle / observations.length) + " detik" : "0 detik";

    var active = observations.find(function (o) { return o.id === data.activeObservationId; }) || observations[observations.length - 1];
    byId("homeActiveData").textContent = active ? active.processName + " / " + active.operatorName : "Belum dipilih";

    var body = byId("homeLatestBody");
    body.innerHTML = "";
    if (!observations.length) {
      body.innerHTML = '<tr><td colspan="5" class="placeholder">Belum ada data observasi.</td></tr>';
      return;
    }

    observations.slice(-6).reverse().forEach(function (obs) {
      var tr = document.createElement("tr");
      var isActive = obs.id === data.activeObservationId;
      tr.innerHTML =
        "<td>" + sanitize(obs.processName) + "</td>" +
        "<td>" + sanitize(obs.operatorName) + "</td>" +
        "<td>" + fixed2(cycleTime(obs)) + "</td>" +
        "<td>" + formatDate(obs.createdAt) + "</td>" +
        "<td><span class='status-badge " + (isActive ? "active" : "normal") + "'>" + (isActive ? "Aktif" : "Normal") + "</span></td>";
      body.appendChild(tr);
    });
  }

  function initObservasiPage() {
    // Halaman input utama: format tabel observasi dengan 10 sample.
    var lineInput = byId("lineName");
    var tanggalInput = byId("obsTanggal");
    var shiftInput = byId("shiftJam");
    var observerInput = byId("observerName");
    var productInput = byId("productType");
    var taktInput = byId("taktTimeInput");
    var noFormValueEl = byId("noFormValue");
    var NO_FORM_CODE = "Form-ISD-ISD-001";
    var processInput = byId("processName");
    var operatorInput = byId("operatorName");
    var rowsBody = byId("observasiRows");
    var totalRow = byId("observasiTotalRow");
    var listBody = byId("observationListBody");
    var addBtn = byId("addObservasiRowBtn");
    var clearDraftBtn = byId("clearObservasiDraftBtn");
    var saveBtn = byId("saveObservasiBtn");
    var totalElementEl = byId("observasiTotalElemen");
    var totalCycleEl = byId("observasiTotalCycle");
    var savedDetailSection = byId("savedDetailSection");
    var savedDetailTitle = byId("savedDetailTitle");
    var detailNoForm = byId("detailNoForm");
    var detailLine = byId("detailLine");
    var detailTanggal = byId("detailTanggal");
    var detailProses = byId("detailProses");
    var detailShift = byId("detailShift");
    var detailProduct = byId("detailProduct");
    var detailObserver = byId("detailObserver");
    var detailOperator = byId("detailOperator");
    var detailTakt = byId("detailTakt");
    var savedDetailRows = byId("savedDetailRows");
    var savedDetailTotalRow = byId("savedDetailTotalRow");
    var detailPrintBtn = byId("detailPrintBtn");
    var detailExportXlsxBtn = byId("detailExportXlsxBtn");

    var state = { rows: [] };
    var selectedDetailId = null;
    var editingObservationId = null;

    function newRow() {
      return {
        id: "row_" + Date.now() + "_" + Math.random().toString(16).slice(2),
        name: "",
        category: "Manual",
        samples: ["", "", "", "", "", "", "", "", "", ""],
        qty: "1",
        unit: "Battery",
        note: ""
      };
    }

    function normalizeRow(raw) {
      var source = raw || {};
      var samples = [];
      if (Array.isArray(source.samples) && source.samples.length) {
        samples = source.samples.slice(0, 10);
      } else if (source.samplesText) {
        samples = parseSamples(source.samplesText);
      }

      var sampleText = [];
      for (var i = 0; i < 10; i += 1) {
        var value = samples[i];
        sampleText.push(value == null ? "" : String(value));
      }

      return {
        id: source.id || ("row_" + Date.now() + "_" + Math.random().toString(16).slice(2)),
        name: source.name || "",
        category: source.category || source.type || "Manual",
        samples: sampleText,
        qty: source.qty == null ? "1" : String(source.qty),
        unit: source.unit || "Battery",
        note: source.note || ""
      };
    }

    function toNumber(value) {
      if (value == null || value === "") {
        return null;
      }
      var numeric = Number(String(value).replace(",", "."));
      if (Number.isNaN(numeric) || numeric < 0) {
        return null;
      }
      return numeric;
    }

    function mode(samples) {
      if (!samples.length) {
        return 0;
      }
      var freq = {};
      var bestCount = 0;
      var bestValue = samples[0];
      samples.forEach(function (value) {
        var key = String(value);
        freq[key] = (freq[key] || 0) + 1;
        var count = freq[key];
        if (count > bestCount || (count === bestCount && Number(key) < bestValue)) {
          bestCount = count;
          bestValue = Number(key);
        }
      });
      return bestValue;
    }

    function getRowStats(row) {
      var numericSamples = row.samples.map(toNumber).filter(function (value) { return value != null; });
      var modeValue = mode(numericSamples);
      var minValue = numericSamples.length ? Math.min.apply(null, numericSamples) : 0;
      var maxValue = numericSamples.length ? Math.max.apply(null, numericSamples) : 0;
      var qtyValue = Math.max(0, toNumber(row.qty) || 0);
      var ctValue = qtyValue > 0 ? modeValue / qtyValue : 0;

      return {
        numericSamples: numericSamples,
        mode: modeValue,
        min: minValue,
        max: maxValue,
        qty: qtyValue,
        ct: ctValue
      };
    }

    function displayNumber(value) {
      if (!Number.isFinite(value)) {
        return "0";
      }
      var rounded = Math.round(value * 100) / 100;
      if (Math.abs(rounded - Math.round(rounded)) < 0.0001) {
        return String(Math.round(rounded));
      }
      return rounded.toFixed(2);
    }

    function inferType(category) {
      var text = String(category || "").toLowerCase();
      if (text.indexOf("walk") >= 0 || text.indexOf("jalan") >= 0 || text.indexOf("dorong") >= 0) {
        return "Walking";
      }
      if (text.indexOf("wait") >= 0 || text.indexOf("tunggu") >= 0 || text.indexOf("idle") >= 0) {
        return "Waiting";
      }
      if (text.indexOf("mach") >= 0 || text.indexOf("mesin") >= 0 || text.indexOf("machine") >= 0) {
        return "Machine";
      }
      return "Manual";
    }

    function todayValue() {
      return new Date().toISOString().slice(0, 10);
    }

    function saveDraft() {
      SWStorage.updateData(function (data) {
        data.drafts.observasi = {
          lineName: lineInput.value.trim(),
          obsTanggal: tanggalInput.value,
          shiftJam: shiftInput.value.trim(),
          observerName: observerInput.value.trim(),
          productType: productInput.value.trim(),
          taktTime: taktInput.value,
          noForm: NO_FORM_CODE,
          editingObservationId: editingObservationId,
          processName: processInput.value.trim(),
          operatorName: operatorInput.value.trim(),
          rows: state.rows
        };
        return data;
      });
    }

    function renderRows() {
      rowsBody.innerHTML = "";

      state.rows.forEach(function (rawRow, index) {
        var row = normalizeRow(rawRow);
        state.rows[index] = row;
        var selectedCategory = String(row.category || "Manual");
        var categoryOptions =
          "<option value='Manual'" + (selectedCategory === "Manual" ? " selected" : "") + ">Manual</option>" +
          "<option value='Walking'" + (selectedCategory === "Walking" ? " selected" : "") + ">Walking</option>" +
          "<option value='Waiting'" + (selectedCategory === "Waiting" ? " selected" : "") + ">Waiting</option>" +
          "<option value='Machine'" + (selectedCategory === "Machine" ? " selected" : "") + ">Machine</option>";

        var tr = document.createElement("tr");
        tr.setAttribute("data-row-id", row.id);

        var sampleCells = "";
        for (var i = 0; i < 10; i += 1) {
          var dividerClass = i === 9 ? " class='obs-divider-right'" : "";
          sampleCells +=
            "<td" + dividerClass + "><input class='obs-detail-input sample' data-field='sample' data-sample-index='" + i + "' type='text' value='" + sanitize(row.samples[i]) + "'></td>";
        }

        tr.innerHTML =
          "<td class='obs-cell-center'>" + (index + 1) + "</td>" +
          "<td><input class='obs-detail-input' data-field='name' type='text' value='" + sanitize(row.name) + "' placeholder='Contoh: Ambil dan pasang styrophore'></td>" +
          "<td class='obs-divider-right'><select class='obs-detail-input obs-cell-center' data-field='category'>" + categoryOptions + "</select></td>" +
          sampleCells +
          "<td class='obs-stat-value' data-output='mode'>0</td>" +
          "<td class='obs-stat-value' data-output='min'>0</td>" +
          "<td class='obs-stat-value obs-divider-right' data-output='max'>0</td>" +
          "<td><input class='obs-detail-input sample' data-field='qty' type='number' min='0' step='1' value='" + sanitize(row.qty) + "'></td>" +
          "<td class='obs-divider-right'><input class='obs-detail-input obs-cell-center' data-field='unit' type='text' value='" + sanitize(row.unit) + "'></td>" +
          "<td class='obs-stat-value obs-divider-right' data-output='ct'>0.00</td>" +
          "<td><input class='obs-detail-input' data-field='note' type='text' value='" + sanitize(row.note) + "'></td>";
        rowsBody.appendChild(tr);
      });

      refreshComputedCells();
    }

    function refreshComputedCells() {
      var totalSamples = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
      var totalMode = 0;
      var totalQty = 0;
      var totalCt = 0;
      var minPool = [];
      var maxPool = [];
      var domRows = {};

      rowsBody.querySelectorAll("tr[data-row-id]").forEach(function (tr) {
        domRows[tr.getAttribute("data-row-id")] = tr;
      });

      state.rows.forEach(function (rawRow, index) {
        var row = normalizeRow(rawRow);
        state.rows[index] = row;
        var stats = getRowStats(row);
        var tr = domRows[row.id];

        if (tr) {
          var modeCell = tr.querySelector("[data-output='mode']");
          var minCell = tr.querySelector("[data-output='min']");
          var maxCell = tr.querySelector("[data-output='max']");
          var ctCell = tr.querySelector("[data-output='ct']");
          if (modeCell) modeCell.textContent = displayNumber(stats.mode);
          if (minCell) minCell.textContent = displayNumber(stats.min);
          if (maxCell) maxCell.textContent = displayNumber(stats.max);
          if (ctCell) ctCell.textContent = fixed2(stats.ct);
        }

        for (var s = 0; s < 10; s += 1) {
          var sampleValue = toNumber(row.samples[s]);
          if (sampleValue != null) {
            totalSamples[s] += sampleValue;
          }
        }
        totalMode += stats.mode;
        totalQty += stats.qty;
        totalCt += stats.ct;
        if (stats.numericSamples.length) {
          minPool.push(stats.min);
          maxPool.push(stats.max);
        }
      });

      totalElementEl.textContent = String(state.rows.length);
      totalCycleEl.textContent = fixed2(totalCt);

      if (!totalRow) {
        return;
      }

      var minValue = minPool.length ? Math.min.apply(null, minPool) : 0;
      var maxValue = maxPool.length ? Math.max.apply(null, maxPool) : 0;
      var sampleTotals = totalSamples.map(function (value, idx) {
        var className = idx === 9 ? "obs-total-number obs-divider-right" : "obs-total-number";
        return "<td class='" + className + "'>" + displayNumber(value) + "</td>";
      }).join("");

      totalRow.innerHTML =
        "<td colspan='2' class='obs-total-label'>TOTAL / CYCLE</td>" +
        "<td class='obs-total-muted obs-divider-right'>-</td>" +
        sampleTotals +
        "<td class='obs-total-number'>" + displayNumber(totalMode) + "</td>" +
        "<td class='obs-total-number'>" + displayNumber(minValue) + "</td>" +
        "<td class='obs-total-number obs-divider-right'>" + displayNumber(maxValue) + "</td>" +
        "<td class='obs-total-number'>" + displayNumber(totalQty) + "</td>" +
        "<td class='obs-total-unit obs-divider-right'>Battery</td>" +
        "<td class='obs-total-number obs-divider-right'>" + fixed2(totalCt) + "</td>" +
        "<td class='obs-total-muted'>-</td>";
    }

    function updateRowFromInput(target) {
      var tr = target.closest("tr[data-row-id]");
      if (!tr) {
        return false;
      }
      var row = state.rows.find(function (item) {
        return item.id === tr.getAttribute("data-row-id");
      });
      if (!row) {
        return false;
      }

      var field = target.getAttribute("data-field");
      if (!field) {
        return false;
      }

      if (field === "sample") {
        var sampleIndex = Number(target.getAttribute("data-sample-index"));
        if (!Number.isNaN(sampleIndex) && sampleIndex >= 0 && sampleIndex < 10) {
          row.samples[sampleIndex] = target.value;
          return true;
        }
        return false;
      }

      row[field] = target.value;
      return true;
    }

    function toInputDate(value) {
      if (!value) {
        return todayValue();
      }
      if (/^\d{4}-\d{2}-\d{2}$/.test(String(value))) {
        return String(value);
      }
      var parsed = new Date(value);
      if (Number.isNaN(parsed.getTime())) {
        return todayValue();
      }
      var yyyy = parsed.getFullYear();
      var mm = String(parsed.getMonth() + 1).padStart(2, "0");
      var dd = String(parsed.getDate()).padStart(2, "0");
      return yyyy + "-" + mm + "-" + dd;
    }

    function formatDateForDisplay(value) {
      if (!value) {
        return "-";
      }
      var parsed = new Date(value);
      if (Number.isNaN(parsed.getTime())) {
        return String(value);
      }
      return parsed.toLocaleDateString("id-ID");
    }

    function setText(el, value) {
      if (!el) {
        return;
      }
      el.textContent = value == null || value === "" ? "-" : String(value);
    }

    function buildDetailRows(observation) {
      return (observation.elements || []).map(function (element) {
        return normalizeRow({
          id: element.id,
          name: element.name,
          category: element.category || element.type || "Manual",
          samples: element.samples || [],
          qty: element.qty == null ? "1" : String(element.qty),
          unit: element.unit || "Battery",
          note: element.note || ""
        });
      });
    }

    function setEditMode(observation) {
      editingObservationId = observation ? observation.id : null;
      if (!saveBtn) {
        return;
      }
      saveBtn.textContent = observation ? "Update Observasi" : "Simpan Observasi";
    }

    function openObservationForEdit(observationId) {
      var data = SWStorage.loadData();
      var obs = (data.observations || []).find(function (item) {
        return item.id === observationId;
      });
      if (!obs) {
        showMessage("Data observasi untuk edit tidak ditemukan.", true);
        return;
      }

      lineInput.value = obs.lineName || "";
      tanggalInput.value = toInputDate(obs.obsTanggal || obs.createdAt);
      shiftInput.value = obs.shiftJam || "";
      observerInput.value = obs.observerName || "";
      productInput.value = obs.productType || "";
      taktInput.value = obs.taktTime == null ? "" : String(obs.taktTime);
      processInput.value = obs.processName || "";
      operatorInput.value = obs.operatorName || "";
      state.rows = buildDetailRows(obs);
      if (!state.rows.length) {
        state.rows = [newRow()];
      }

      if (noFormValueEl) {
        noFormValueEl.textContent = NO_FORM_CODE;
      }

      setEditMode(obs);
      setActiveObservation(obs.id);
      renderRows();
      renderObservationList();
      saveDraft();
      showMessage("Mode edit aktif. Ubah data lalu klik Update Observasi.");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }

    function renderSavedDetail(observation) {
      if (!savedDetailRows || !savedDetailTotalRow) {
        return;
      }

      var rows = buildDetailRows(observation);
      savedDetailRows.innerHTML = "";
      var totalSamples = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
      var totalMode = 0;
      var totalQty = 0;
      var totalCt = 0;
      var minPool = [];
      var maxPool = [];

      rows.forEach(function (row, idx) {
        var stats = getRowStats(row);
        for (var i = 0; i < 10; i += 1) {
          var sampleValue = toNumber(row.samples[i]);
          if (sampleValue != null) {
            totalSamples[i] += sampleValue;
          }
        }
        totalMode += stats.mode;
        totalQty += stats.qty;
        totalCt += stats.ct;
        if (stats.numericSamples.length) {
          minPool.push(stats.min);
          maxPool.push(stats.max);
        }

        var sampleCells = "";
        for (var s = 0; s < 10; s += 1) {
          var cls = s === 9 ? "obs-cell-center obs-divider-right" : "obs-cell-center";
          sampleCells += "<td class='" + cls + "'>" + sanitize(row.samples[s]) + "</td>";
        }

        var tr = document.createElement("tr");
        tr.innerHTML =
          "<td class='obs-cell-center'>" + (idx + 1) + "</td>" +
          "<td>" + sanitize(row.name) + "</td>" +
          "<td class='obs-cell-center obs-divider-right'>" + sanitize(row.category) + "</td>" +
          sampleCells +
          "<td class='obs-cell-center'>" + displayNumber(stats.mode) + "</td>" +
          "<td class='obs-cell-center'>" + displayNumber(stats.min) + "</td>" +
          "<td class='obs-cell-center obs-divider-right'>" + displayNumber(stats.max) + "</td>" +
          "<td class='obs-cell-center'>" + displayNumber(stats.qty) + "</td>" +
          "<td class='obs-cell-center obs-divider-right'>" + sanitize(row.unit) + "</td>" +
          "<td class='obs-cell-center obs-divider-right'>" + fixed2(stats.ct) + "</td>" +
          "<td>" + sanitize(row.note) + "</td>";
        savedDetailRows.appendChild(tr);
      });

      if (!rows.length) {
        savedDetailRows.innerHTML = "<tr><td colspan='20' class='placeholder'>Data elemen belum tersedia.</td></tr>";
      }

      var minValue = minPool.length ? Math.min.apply(null, minPool) : 0;
      var maxValue = maxPool.length ? Math.max.apply(null, maxPool) : 0;
      var sampleTotals = totalSamples.map(function (value, idx2) {
        var className = idx2 === 9 ? "obs-total-number obs-divider-right" : "obs-total-number";
        return "<td class='" + className + "'>" + displayNumber(value) + "</td>";
      }).join("");

      savedDetailTotalRow.innerHTML =
        "<td colspan='2' class='obs-total-label'>TOTAL / CYCLE</td>" +
        "<td class='obs-total-muted obs-divider-right'>-</td>" +
        sampleTotals +
        "<td class='obs-total-number'>" + displayNumber(totalMode) + "</td>" +
        "<td class='obs-total-number'>" + displayNumber(minValue) + "</td>" +
        "<td class='obs-total-number obs-divider-right'>" + displayNumber(maxValue) + "</td>" +
        "<td class='obs-total-number'>" + displayNumber(totalQty) + "</td>" +
        "<td class='obs-total-unit obs-divider-right'>Battery</td>" +
        "<td class='obs-total-number obs-divider-right'>" + fixed2(totalCt) + "</td>" +
        "<td class='obs-total-muted'>-</td>";
    }

    function exportDetailXlsx(observation) {
      var rows = buildDetailRows(observation);
      var xlsxRows = [];
      xlsxRows.push(["LEMBAR OBSERVASI"]);
      xlsxRows.push(["NO FORM", NO_FORM_CODE, "LINE", observation.lineName || "", "TANGGAL", formatDateForDisplay(observation.obsTanggal || observation.createdAt)]);
      xlsxRows.push(["PROSES", observation.processName || "", "SHIFT / JAM", observation.shiftJam || "", "TIPE PRODUK", observation.productType || ""]);
      xlsxRows.push(["NAMA OBSERVER", observation.observerName || "", "NAMA OPERATOR", observation.operatorName || "", "TAKT TIME", observation.taktTime == null ? "" : observation.taktTime]);
      xlsxRows.push([]);
      xlsxRows.push(["NO", "Elemen Kerja", "Kategori", "Sample1", "Sample2", "Sample3", "Sample4", "Sample5", "Sample6", "Sample7", "Sample8", "Sample9", "Sample10", "Modus", "Min", "Max", "Qty", "Unit", "CT(sec/batt)", "NOTE"]);

      rows.forEach(function (row, idx) {
        var stats = getRowStats(row);
        var sampleValues = [];
        for (var i = 0; i < 10; i += 1) {
          sampleValues.push(row.samples[i] || "");
        }
        xlsxRows.push([
          idx + 1,
          row.name,
          row.category,
          sampleValues[0], sampleValues[1], sampleValues[2], sampleValues[3], sampleValues[4],
          sampleValues[5], sampleValues[6], sampleValues[7], sampleValues[8], sampleValues[9],
          displayNumber(stats.mode),
          displayNumber(stats.min),
          displayNumber(stats.max),
          displayNumber(stats.qty),
          row.unit,
          fixed2(stats.ct),
          row.note
        ]);
      });

      var filenameSafeProcess = (observation.processName || "observasi").replace(/[^\w\-]+/g, "_");
      SWStorage.downloadXlsx("observasi-detail-" + filenameSafeProcess + ".xlsx", xlsxRows, "Lembar Observasi");
    }

    function openObservationDetail(observationId) {
      var data = SWStorage.loadData();
      var obs = (data.observations || []).find(function (item) {
        return item.id === observationId;
      });
      if (!obs) {
        showMessage("Detail observasi tidak ditemukan.", true);
        return;
      }

      selectedDetailId = obs.id;
      if (savedDetailSection) {
        savedDetailSection.classList.remove("hidden");
      }
      setText(savedDetailTitle, "Detail Observasi: " + (obs.processName || "-") + " / " + (obs.operatorName || "-"));
      setText(detailNoForm, NO_FORM_CODE);
      setText(detailLine, obs.lineName);
      setText(detailTanggal, formatDateForDisplay(obs.obsTanggal || obs.createdAt));
      setText(detailProses, obs.processName);
      setText(detailShift, obs.shiftJam);
      setText(detailProduct, obs.productType);
      setText(detailObserver, obs.observerName);
      setText(detailOperator, obs.operatorName);
      setText(detailTakt, obs.taktTime == null ? "-" : String(obs.taktTime));
      renderSavedDetail(obs);
      showMessage("Detail observasi ditampilkan di bagian bawah.");
      if (savedDetailSection && savedDetailSection.scrollIntoView) {
        savedDetailSection.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }

    function renderObservationList() {
      var data = SWStorage.loadData();
      var observations = data.observations || [];
      listBody.innerHTML = "";

      if (!observations.length) {
        listBody.innerHTML = '<tr><td colspan="6" class="placeholder">Belum ada data.</td></tr>';
        return;
      }

      observations.slice().reverse().forEach(function (obs) {
        var active = obs.id === data.activeObservationId;
        var tr = document.createElement("tr");
        tr.innerHTML =
          "<td>" + sanitize(obs.processName) + "</td>" +
          "<td>" + sanitize(obs.operatorName) + "</td>" +
          "<td>" + fixed2(cycleTime(obs)) + "</td>" +
          "<td>" + formatDate(obs.createdAt) + "</td>" +
          "<td><span class='status-badge " + (active ? "active" : "normal") + "'>" + (active ? "Aktif" : "Normal") + "</span></td>" +
          "<td><div class='obs-action-group'><button class='btn ghost js-view-detail' data-id='" + obs.id + "'>Detail</button><button class='btn ghost js-edit-observation' data-id='" + obs.id + "'>Edit</button><button class='btn js-set-active' data-id='" + obs.id + "'>Pakai</button></div></td>";
        listBody.appendChild(tr);
      });
    }

    function loadDraftOrDefault() {
      var draft = SWStorage.loadData().drafts.observasi;
      if (draft) {
        lineInput.value = draft.lineName || "";
        tanggalInput.value = draft.obsTanggal || todayValue();
        shiftInput.value = draft.shiftJam || "";
        observerInput.value = draft.observerName || "";
        productInput.value = draft.productType || "";
        taktInput.value = draft.taktTime || "";
        processInput.value = draft.processName || "";
        operatorInput.value = draft.operatorName || "";
        state.rows = Array.isArray(draft.rows) && draft.rows.length
          ? draft.rows.map(normalizeRow)
          : [newRow()];
        if (draft.editingObservationId) {
          var editObs = (SWStorage.loadData().observations || []).find(function (item) {
            return item.id === draft.editingObservationId;
          });
          setEditMode(editObs || null);
        } else {
          setEditMode(null);
        }
      } else {
        lineInput.value = "";
        tanggalInput.value = todayValue();
        shiftInput.value = "";
        observerInput.value = "";
        productInput.value = "";
        taktInput.value = "";
        processInput.value = "";
        operatorInput.value = "";
        state.rows = [newRow()];
        setEditMode(null);
      }
      if (noFormValueEl) {
        noFormValueEl.textContent = NO_FORM_CODE;
      }
      renderRows();
      renderObservationList();
    }

    rowsBody.addEventListener("input", function (event) {
      if (updateRowFromInput(event.target)) {
        refreshComputedCells();
        saveDraft();
      }
    });

    rowsBody.addEventListener("change", function (event) {
      if (updateRowFromInput(event.target)) {
        refreshComputedCells();
        saveDraft();
      }
    });

    rowsBody.addEventListener("keydown", function (event) {
      if (event.key !== "Tab") {
        return;
      }
      var activeInput = event.target.closest(".obs-detail-input");
      if (!activeInput) {
        return;
      }

      var inputs = Array.prototype.slice.call(rowsBody.querySelectorAll(".obs-detail-input"));
      var index = inputs.indexOf(activeInput);
      if (index < 0) {
        return;
      }

      event.preventDefault();
      var nextIndex = event.shiftKey ? index - 1 : index + 1;

      if (nextIndex < 0) {
        inputs[0].focus();
        return;
      }

      if (nextIndex >= inputs.length) {
        state.rows.push(newRow());
        renderRows();
        saveDraft();
        var lastRow = state.rows[state.rows.length - 1];
        var firstCell = rowsBody.querySelector("tr[data-row-id='" + lastRow.id + "'] .obs-detail-input[data-field='name']");
        if (firstCell) {
          firstCell.focus();
        }
        return;
      }

      var nextInput = inputs[nextIndex];
      if (nextInput) {
        nextInput.focus();
        if (nextInput.select) {
          nextInput.select();
        }
      }
    });

    listBody.addEventListener("click", function (event) {
      var detailBtn = event.target.closest(".js-view-detail");
      if (detailBtn) {
        openObservationDetail(detailBtn.getAttribute("data-id"));
        return;
      }
      var editBtn = event.target.closest(".js-edit-observation");
      if (editBtn) {
        openObservationForEdit(editBtn.getAttribute("data-id"));
        return;
      }
      var btn = event.target.closest(".js-set-active");
      if (!btn) return;
      setActiveObservation(btn.getAttribute("data-id"));
      renderObservationList();
      showMessage("Data aktif diubah.");
    });

    addBtn.addEventListener("click", function () {
      state.rows.push(newRow());
      renderRows();
      saveDraft();
    });

    if (detailPrintBtn) {
      detailPrintBtn.addEventListener("click", function () {
        if (!selectedDetailId) {
          showMessage("Pilih detail observasi terlebih dahulu.", true);
          return;
        }
        window.print();
      });
    }

    if (detailExportXlsxBtn) {
      detailExportXlsxBtn.addEventListener("click", function () {
        if (!selectedDetailId) {
          showMessage("Pilih detail observasi terlebih dahulu.", true);
          return;
        }
        var data = SWStorage.loadData();
        var obs = (data.observations || []).find(function (item) {
          return item.id === selectedDetailId;
        });
        if (!obs) {
          showMessage("Data detail tidak ditemukan.", true);
          return;
        }
        exportDetailXlsx(obs);
        showMessage("Detail observasi diexport ke Excel (.xlsx).");
      });
    }

    clearDraftBtn.addEventListener("click", function () {
      if (!window.confirm("Bersihkan draft observasi?")) return;
      lineInput.value = "";
      tanggalInput.value = todayValue();
      shiftInput.value = "";
      observerInput.value = "";
      productInput.value = "";
      taktInput.value = "";
      processInput.value = "";
      operatorInput.value = "";
      state.rows = [newRow()];
      setEditMode(null);
      if (noFormValueEl) {
        noFormValueEl.textContent = NO_FORM_CODE;
      }
      SWStorage.updateData(function (data) {
        data.drafts.observasi = null;
        return data;
      });
      renderRows();
      showMessage("Draft dibersihkan.");
    });

    processInput.addEventListener("input", saveDraft);
    operatorInput.addEventListener("input", saveDraft);
    lineInput.addEventListener("input", saveDraft);
    tanggalInput.addEventListener("input", saveDraft);
    shiftInput.addEventListener("input", saveDraft);
    observerInput.addEventListener("input", saveDraft);
    productInput.addEventListener("input", saveDraft);
    taktInput.addEventListener("input", saveDraft);

    saveBtn.addEventListener("click", function () {
      var isEditMode = Boolean(editingObservationId);
      var targetObservationId = editingObservationId || ("obs_" + Date.now());
      var lineName = lineInput.value.trim();
      var obsTanggal = tanggalInput.value || todayValue();
      var shiftJam = shiftInput.value.trim();
      var observerName = observerInput.value.trim();
      var productType = productInput.value.trim();
      var taktTime = Number(taktInput.value) || 0;
      var noForm = NO_FORM_CODE;
      var processName = processInput.value.trim();
      var operatorName = operatorInput.value.trim();
      if (!processName || !operatorName) {
        showMessage("Nama proses dan operator wajib diisi.", true);
        return;
      }

      var elements = state.rows.map(function (row) {
        var normalized = normalizeRow(row);
        var stats = getRowStats(normalized);
        return {
          id: normalized.id,
          name: normalized.name.trim(),
          type: inferType(normalized.category),
          category: normalized.category.trim(),
          samples: stats.numericSamples,
          avg: stats.mode,
          mode: stats.mode,
          min: stats.min,
          max: stats.max,
          qty: stats.qty,
          unit: (normalized.unit || "Battery").trim() || "Battery",
          ct: stats.ct,
          note: normalized.note.trim()
        };
      }).filter(function (row) {
        return row.name && row.samples.length;
      });

      if (!elements.length) {
        showMessage("Isi minimal 1 elemen dengan sample valid.", true);
        return;
      }

      var obs = {
        id: targetObservationId,
        lineName: lineName,
        obsTanggal: obsTanggal,
        shiftJam: shiftJam,
        observerName: observerName,
        productType: productType,
        taktTime: taktTime,
        noForm: noForm,
        processName: processName,
        operatorName: operatorName,
        createdAt: new Date().toISOString(),
        elements: elements
      };

      SWStorage.updateData(function (data) {
        if (isEditMode) {
          var existingIndex = (data.observations || []).findIndex(function (item) {
            return item.id === targetObservationId;
          });
          if (existingIndex >= 0) {
            obs.createdAt = data.observations[existingIndex].createdAt || obs.createdAt;
            data.observations[existingIndex] = obs;
          } else {
            data.observations.push(obs);
          }
        } else {
          data.observations.push(obs);
        }
        data.activeObservationId = obs.id;
        data.drafts.observasi = null;
        return data;
      });

      lineInput.value = "";
      tanggalInput.value = todayValue();
      shiftInput.value = "";
      observerInput.value = "";
      productInput.value = "";
      taktInput.value = "";
      processInput.value = "";
      operatorInput.value = "";
      state.rows = [newRow()];
      setEditMode(null);
      if (noFormValueEl) {
        noFormValueEl.textContent = NO_FORM_CODE;
      }
      renderRows();
      renderObservationList();
      showMessage(isEditMode ? "Observasi berhasil diperbarui." : "Observasi disimpan.");
    });

    loadDraftOrDefault();
  }

  function buildTskkRows(observation) {
    return (observation.elements || []).map(function (el, i) {
      var avg = Number(el.avg) || 0;
      return {
        no: i + 1,
        name: el.name,
        type: el.type,
        avg: avg,
        manual: el.type === "Manual" ? avg : 0,
        walking: el.type === "Walking" ? avg : 0,
        waiting: el.type === "Waiting" ? avg : 0,
        machine: el.type === "Machine" ? avg : 0
      };
    });
  }

  function initTskkPage() {
    // TSKK digenerate dari data observasi yang dipilih.
    var select = byId("tskkObservationSelect");
    var generateBtn = byId("generateTskkBtn");
    var exportBtn = byId("exportTskkCsvBtn");
    var body = byId("tskkBody");
    var chart = byId("tskkChart");
    var rowsCache = [];

    function renderOptions() {
      var data = SWStorage.loadData();
      var observations = data.observations || [];
      select.innerHTML = "";

      if (!observations.length) {
        select.innerHTML = "<option value=''>Belum ada data observasi</option>";
        return;
      }

      observations.forEach(function (obs) {
        var opt = document.createElement("option");
        opt.value = obs.id;
        opt.textContent = obs.processName + " - " + obs.operatorName + " (" + formatDate(obs.createdAt) + ")";
        if (obs.id === data.activeObservationId) opt.selected = true;
        select.appendChild(opt);
      });
    }

    function renderTSKK() {
      var data = SWStorage.loadData();
      var obs = (data.observations || []).find(function (x) { return x.id === select.value; });
      body.innerHTML = "";

      if (!obs) {
        body.innerHTML = '<tr><td colspan="8" class="placeholder">Data tidak ditemukan.</td></tr>';
        SWCharts.drawLineChart(chart, [], []);
        return;
      }

      rowsCache = buildTskkRows(obs);
      var total = { avg: 0, manual: 0, walking: 0, waiting: 0, machine: 0 };

      rowsCache.forEach(function (row) {
        total.avg += row.avg;
        total.manual += row.manual;
        total.walking += row.walking;
        total.waiting += row.waiting;
        total.machine += row.machine;

        var tr = document.createElement("tr");
        tr.innerHTML =
          "<td>" + row.no + "</td>" +
          "<td>" + sanitize(row.name) + "</td>" +
          "<td>" + row.type + "</td>" +
          "<td>" + fixed2(row.avg) + "</td>" +
          "<td>" + fixed2(row.manual) + "</td>" +
          "<td>" + fixed2(row.walking) + "</td>" +
          "<td>" + fixed2(row.waiting) + "</td>" +
          "<td>" + fixed2(row.machine) + "</td>";
        body.appendChild(tr);
      });

      var trTotal = document.createElement("tr");
      trTotal.innerHTML =
        "<td colspan='3'><strong>Total</strong></td>" +
        "<td><strong>" + fixed2(total.avg) + "</strong></td>" +
        "<td><strong>" + fixed2(total.manual) + "</strong></td>" +
        "<td><strong>" + fixed2(total.walking) + "</strong></td>" +
        "<td><strong>" + fixed2(total.waiting) + "</strong></td>" +
        "<td><strong>" + fixed2(total.machine) + "</strong></td>";
      body.appendChild(trTotal);

      var labels = rowsCache.map(function (r) { return r.name; });
      var cm = [], cw = [], cwt = [], cma = [], ctot = [];
      var m = 0, w = 0, wt = 0, ma = 0, tt = 0;
      rowsCache.forEach(function (r) {
        m += r.manual; w += r.walking; wt += r.waiting; ma += r.machine; tt += r.avg;
        cm.push(m); cw.push(w); cwt.push(wt); cma.push(ma); ctot.push(tt);
      });

      SWCharts.drawLineChart(chart, labels, [
        { name: "Manual", color: "#0a6d72", values: cm },
        { name: "Walking", color: "#2f80c0", values: cw },
        { name: "Waiting", color: "#f08c38", values: cwt },
        { name: "Machine", color: "#7a6ac8", values: cma },
        { name: "Total", color: "#39434d", values: ctot }
      ]);

      setActiveObservation(obs.id);
      showMessage("TSKK berhasil digenerate.");
    }

    generateBtn.addEventListener("click", renderTSKK);
    exportBtn.addEventListener("click", function () {
      if (!rowsCache.length) {
        showMessage("Generate dulu sebelum export.", true);
        return;
      }
      var rows = [["No", "Elemen", "Kategori", "Rata-rata", "Manual", "Walking", "Waiting", "Machine"]];
      rowsCache.forEach(function (r) {
        rows.push([r.no, r.name, r.type, fixed2(r.avg), fixed2(r.manual), fixed2(r.walking), fixed2(r.waiting), fixed2(r.machine)]);
      });
      SWStorage.downloadXlsx("tskk-export.xlsx", rows, "TSKK");
      showMessage("TSKK diexport ke Excel (.xlsx).");
    });

    renderOptions();
    renderTSKK();
  }

  function initTskPage() {
    // Layout TSK menggunakan div draggable + SVG untuk jalur operator.
    var select = byId("tskObservationSelect");
    var addBtn = byId("addMachineBtn");
    var autoBtn = byId("autoArrangeBtn");
    var saveBtn = byId("saveTskLayoutBtn");
    var area = byId("tskLayoutArea");
    var svg = byId("tskPathSvg");
    var state = { obsId: null, machines: [] };

    function renderOptions() {
      var data = SWStorage.loadData();
      select.innerHTML = "";
      if (!data.observations.length) {
        select.innerHTML = "<option value=''>Belum ada data observasi</option>";
        return;
      }
      data.observations.forEach(function (obs) {
        var opt = document.createElement("option");
        opt.value = obs.id;
        opt.textContent = obs.processName + " - " + obs.operatorName;
        if (obs.id === data.activeObservationId) opt.selected = true;
        select.appendChild(opt);
      });
    }

    function defaultLayout(obs) {
      var names = (obs.elements || []).map(function (e) { return e.name; }).filter(Boolean);
      if (!names.length) names = ["Mesin A", "Mesin B", "Mesin C"];
      return names.slice(0, 8).map(function (name, i) {
        return {
          id: "mach_" + Date.now() + "_" + i,
          name: name,
          x: 90 + (i % 4) * 200,
          y: 80 + Math.floor(i / 4) * 190
        };
      });
    }

    function saveLayout(manual) {
      if (!state.obsId) return;
      SWStorage.updateData(function (data) {
        data.tskLayouts[state.obsId] = { machines: state.machines };
        return data;
      });
      if (manual) showMessage("Layout disimpan.");
    }

    function drawPath() {
      var box = area.getBoundingClientRect();
      var w = Math.max(300, Math.floor(box.width));
      var h = Math.max(240, Math.floor(box.height));
      svg.setAttribute("viewBox", "0 0 " + w + " " + h);

      var defs = "<defs><marker id='a' markerWidth='8' markerHeight='8' refX='5' refY='3' orient='auto'><path d='M0,0 L0,6 L6,3 z' fill='#174b70'></path></marker></defs>";
      var lines = "";
      for (var i = 0; i < state.machines.length - 1; i += 1) {
        var m1 = state.machines[i];
        var m2 = state.machines[i + 1];
        lines += "<line x1='" + (m1.x + 65) + "' y1='" + (m1.y + 26) + "' x2='" + (m2.x + 65) + "' y2='" + (m2.y + 26) + "' stroke='#174b70' stroke-width='2.2' marker-end='url(#a)'></line>";
      }
      svg.innerHTML = defs + lines;
    }

    function enableDrag(node, m) {
      var drag = false;
      var ox = 0, oy = 0;

      node.addEventListener("pointerdown", function (e) {
        drag = true;
        var r = node.getBoundingClientRect();
        ox = e.clientX - r.left;
        oy = e.clientY - r.top;
        node.setPointerCapture(e.pointerId);
      });

      node.addEventListener("pointermove", function (e) {
        if (!drag) return;
        var pr = area.getBoundingClientRect();
        var x = e.clientX - pr.left - ox;
        var y = e.clientY - pr.top - oy;
        var mx = pr.width - node.offsetWidth;
        var my = pr.height - node.offsetHeight;
        m.x = Math.max(0, Math.min(mx, x));
        m.y = Math.max(0, Math.min(my, y));
        node.style.left = m.x + "px";
        node.style.top = m.y + "px";
        drawPath();
      });

      node.addEventListener("pointerup", function (e) {
        if (!drag) return;
        drag = false;
        node.releasePointerCapture(e.pointerId);
        saveLayout(false);
      });
    }

    function renderMachines() {
      area.querySelectorAll(".machine-node").forEach(function (n) { n.remove(); });
      state.machines.forEach(function (m) {
        var node = document.createElement("div");
        node.className = "machine-node";
        node.style.left = m.x + "px";
        node.style.top = m.y + "px";
        node.innerHTML = "<div class='machine-title'>" + sanitize(m.name) + "</div><div class='machine-sub'>Drag untuk pindah</div>";

        node.addEventListener("dblclick", function () {
          var name = window.prompt("Ubah nama mesin:", m.name);
          if (!name) return;
          m.name = name.trim() || "Mesin";
          renderMachines();
          saveLayout(false);
        });

        enableDrag(node, m);
        area.appendChild(node);
      });
      drawPath();
    }

    function loadObs(obsId) {
      var data = SWStorage.loadData();
      var obs = data.observations.find(function (x) { return x.id === obsId; });
      if (!obs) return;
      state.obsId = obsId;
      state.machines = (data.tskLayouts[obsId] && data.tskLayouts[obsId].machines) ? data.tskLayouts[obsId].machines : defaultLayout(obs);
      renderMachines();
      setActiveObservation(obsId);
    }

    select.addEventListener("change", function () {
      if (!select.value) return;
      loadObs(select.value);
    });

    addBtn.addEventListener("click", function () {
      if (!state.obsId) {
        showMessage("Pilih observasi dulu.", true);
        return;
      }
      state.machines.push({
        id: "mach_" + Date.now(),
        name: "Mesin Baru",
        x: 40 + (state.machines.length * 25) % 320,
        y: 40 + (state.machines.length * 25) % 260
      });
      renderMachines();
      saveLayout(false);
    });

    autoBtn.addEventListener("click", function () {
      state.machines.forEach(function (m, i) {
        m.x = 90 + (i % 4) * 200;
        m.y = 80 + Math.floor(i / 4) * 190;
      });
      renderMachines();
      saveLayout(false);
      showMessage("Posisi mesin diatur otomatis.");
    });

    saveBtn.addEventListener("click", function () {
      saveLayout(true);
    });

    renderOptions();
    if (select.value) loadObs(select.value);
  }

  function initTskpPage() {
    // Hitung kapasitas per proses, line capacity, dan bottleneck.
    var body = byId("tskpBody");
    var totalMpEl = byId("tskpTotalManpower");
    var lineCapEl = byId("tskpLineCapacity");
    var bottleneckEl = byId("tskpBottleneck");
    var exportBtn = byId("exportTskpCsvBtn");
    var csvRows = [];

    function render() {
      var data = SWStorage.loadData();
      var observations = data.observations || [];
      body.innerHTML = "";
      csvRows = [["Proses", "Operator", "Cycle Time (detik)", "Man Power", "Kapasitas (unit/jam)"]];

      if (!observations.length) {
        body.innerHTML = '<tr><td colspan="5" class="placeholder">Belum ada data observasi.</td></tr>';
        totalMpEl.textContent = "0";
        lineCapEl.textContent = "0 unit/jam";
        bottleneckEl.textContent = "Belum ada data";
        return;
      }

      var totalMp = 0;
      var lineCap = Infinity;
      var bottleneck = "";
      var bottleneckCycle = -1;

      observations.forEach(function (obs) {
        var cycle = cycleTime(obs);
        var mp = Math.max(1, Number(data.manPowerMap[obs.id] || 1));
        var effectiveCycle = cycle / mp;
        var capacity = effectiveCycle > 0 ? 3600 / effectiveCycle : 0;

        totalMp += mp;
        lineCap = Math.min(lineCap, capacity);
        if (effectiveCycle > bottleneckCycle) {
          bottleneckCycle = effectiveCycle;
          bottleneck = obs.processName + " (" + obs.operatorName + ")";
        }

        var tr = document.createElement("tr");
        tr.innerHTML =
          "<td>" + sanitize(obs.processName) + "</td>" +
          "<td>" + sanitize(obs.operatorName) + "</td>" +
          "<td>" + fixed2(cycle) + "</td>" +
          "<td><input class='js-manpower' type='number' min='1' step='1' value='" + mp + "' data-id='" + obs.id + "'></td>" +
          "<td>" + fixed2(capacity) + "</td>";
        body.appendChild(tr);

        csvRows.push([obs.processName, obs.operatorName, fixed2(cycle), mp, fixed2(capacity)]);
      });

      totalMpEl.textContent = String(totalMp);
      lineCapEl.textContent = (lineCap === Infinity ? "0" : fixed2(lineCap)) + " unit/jam";
      bottleneckEl.textContent = bottleneck || "Belum ada data";
    }

    body.addEventListener("input", function (event) {
      var input = event.target.closest(".js-manpower");
      if (!input) return;
      var obsId = input.getAttribute("data-id");
      var value = Math.max(1, Number(input.value) || 1);
      SWStorage.updateData(function (data) {
        data.manPowerMap[obsId] = value;
        return data;
      });
      render();
      showMessage("Man Power diperbarui.");
    });

    exportBtn.addEventListener("click", function () {
      if (csvRows.length <= 1) {
        showMessage("Belum ada data untuk export.", true);
        return;
      }
      SWStorage.downloadXlsx("tskp-export.xlsx", csvRows, "TSKP");
      showMessage("TSKP diexport ke Excel (.xlsx).");
    });

    render();
  }

  function initYamazumiPage() {
    // Yamazumi: agregasi beban kerja dan garis takt time.
    var mode = byId("yamazumiMode");
    var taktInput = byId("yamazumiTaktInput");
    var refreshBtn = byId("refreshYamazumiBtn");
    var exportBtn = byId("exportYamazumiCsvBtn");
    var body = byId("yamazumiBody");
    var chart = byId("yamazumiChart");
    var barsCache = [];

    function computeBars(groupBy) {
      var map = {};
      (SWStorage.loadData().observations || []).forEach(function (obs) {
        var key = groupBy === "process" ? obs.processName : obs.operatorName;
        map[key] = (map[key] || 0) + cycleTime(obs);
      });
      return Object.keys(map).map(function (k) {
        return { label: k, value: map[k] };
      });
    }

    function renderTable(takt) {
      body.innerHTML = "";
      if (!barsCache.length) {
        body.innerHTML = '<tr><td colspan="3" class="placeholder">Belum ada data observasi.</td></tr>';
        return;
      }

      barsCache.forEach(function (b) {
        var over = b.value > takt;
        var tr = document.createElement("tr");
        tr.innerHTML =
          "<td>" + sanitize(b.label) + "</td>" +
          "<td>" + fixed2(b.value) + "</td>" +
          "<td><span class='status-badge " + (over ? "warning" : "active") + "'>" + (over ? "Di atas takt" : "Aman") + "</span></td>";
        body.appendChild(tr);
      });
    }

    function render() {
      var takt = Math.max(1, Number(taktInput.value) || 1);
      barsCache = computeBars(mode.value);
      SWCharts.drawYamazumiChart(chart, barsCache, takt);
      renderTable(takt);

      SWStorage.updateData(function (data) {
        data.settings.taktTime = takt;
        return data;
      });
      showMessage("Yamazumi chart diperbarui.");
    }

    refreshBtn.addEventListener("click", render);

    exportBtn.addEventListener("click", function () {
      if (!barsCache.length) {
        showMessage("Belum ada data untuk export.", true);
        return;
      }
      var takt = Math.max(1, Number(taktInput.value) || 1);
      var rows = [["Nama", "Beban Kerja (detik)", "Takt Time (detik)"]];
      barsCache.forEach(function (b) {
        rows.push([b.label, fixed2(b.value), takt]);
      });
      SWStorage.downloadXlsx("yamazumi-export.xlsx", rows, "Yamazumi");
      showMessage("Yamazumi diexport ke Excel (.xlsx).");
    });

    var storedTakt = SWStorage.loadData().settings.taktTime || 60;
    taktInput.value = String(storedTakt);
    render();
  }
})();
