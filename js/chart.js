(function () {
  "use strict";

  function getCanvasContext(canvas) {
    // Sinkronkan ukuran canvas dengan ukuran elemen aktual (responsive).
    var rect = canvas.getBoundingClientRect();
    var width = Math.max(300, Math.floor(rect.width || canvas.width || 900));
    var height = Math.max(240, Math.floor(rect.height || canvas.height || 320));
    var dpr = window.devicePixelRatio || 1;

    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);

    var ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    return {
      ctx: ctx,
      width: width,
      height: height
    };
  }

  function drawAxes(ctx, width, height, padding) {
    ctx.strokeStyle = "#91a1ae";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top);
    ctx.lineTo(padding.left, height - padding.bottom);
    ctx.lineTo(width - padding.right, height - padding.bottom);
    ctx.stroke();
  }

  function drawGrid(ctx, width, height, padding, steps) {
    var gridSteps = steps || 5;
    var usableHeight = height - padding.top - padding.bottom;
    ctx.strokeStyle = "rgba(100, 122, 138, 0.22)";
    ctx.lineWidth = 1;

    for (var i = 1; i <= gridSteps; i += 1) {
      var y = padding.top + (usableHeight * i) / gridSteps;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
    }
  }

  function drawLegend(ctx, series, startX, y) {
    var x = startX;
    ctx.font = "12px Bahnschrift, Segoe UI, sans-serif";

    series.forEach(function (item) {
      ctx.fillStyle = item.color;
      ctx.fillRect(x, y - 10, 12, 12);
      ctx.fillStyle = "#243443";
      ctx.fillText(item.name, x + 18, y);
      x += ctx.measureText(item.name).width + 40;
    });
  }

  function drawLineChart(canvas, labels, series, options) {
    if (!canvas) {
      return;
    }

    var prepared = getCanvasContext(canvas);
    var ctx = prepared.ctx;
    var width = prepared.width;
    var height = prepared.height;
    var padding = {
      top: 40,
      right: 30,
      bottom: 50,
      left: 56
    };

    if (!Array.isArray(labels) || labels.length === 0 || !Array.isArray(series) || series.length === 0) {
      ctx.fillStyle = "#566775";
      ctx.font = "14px Bahnschrift, Segoe UI, sans-serif";
      ctx.fillText("Data chart belum tersedia.", 22, 30);
      return;
    }

    // Cari nilai tertinggi untuk skala sumbu Y.
    var maxValue = 0;
    series.forEach(function (row) {
      (row.values || []).forEach(function (value) {
        maxValue = Math.max(maxValue, Number(value) || 0);
      });
    });
    maxValue = Math.max(maxValue, Number((options && options.minMax) || 0), 1);

    drawGrid(ctx, width, height, padding, 5);
    drawAxes(ctx, width, height, padding);
    drawLegend(ctx, series, padding.left, 24);

    var chartWidth = width - padding.left - padding.right;
    var chartHeight = height - padding.top - padding.bottom;
    var count = labels.length;
    var xStep = count > 1 ? chartWidth / (count - 1) : chartWidth;

    ctx.fillStyle = "#435564";
    ctx.font = "11px Bahnschrift, Segoe UI, sans-serif";

    for (var t = 0; t <= 5; t += 1) {
      var yValue = maxValue - (maxValue * t) / 5;
      var y = padding.top + (chartHeight * t) / 5;
      ctx.fillText(String(Math.round(yValue)), 10, y + 4);
    }

    labels.forEach(function (label, i) {
      var x = padding.left + i * xStep;
      var text = String(label);
      ctx.save();
      ctx.translate(x, height - padding.bottom + 14);
      ctx.rotate(-0.35);
      ctx.fillText(text.length > 12 ? text.slice(0, 12) + "…" : text, 0, 0);
      ctx.restore();
    });

    series.forEach(function (item) {
      var values = item.values || [];
      ctx.strokeStyle = item.color;
      ctx.fillStyle = item.color;
      ctx.lineWidth = 2;
      ctx.beginPath();

      values.forEach(function (value, i) {
        var x = padding.left + i * xStep;
        var safeValue = Number(value) || 0;
        var y = padding.top + chartHeight - (safeValue / maxValue) * chartHeight;
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.stroke();

      values.forEach(function (value, i) {
        var x = padding.left + i * xStep;
        var safeValue = Number(value) || 0;
        var y = padding.top + chartHeight - (safeValue / maxValue) * chartHeight;
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
      });
    });
  }

  function drawYamazumiChart(canvas, bars, taktTime) {
    if (!canvas) {
      return;
    }

    var prepared = getCanvasContext(canvas);
    var ctx = prepared.ctx;
    var width = prepared.width;
    var height = prepared.height;
    var padding = {
      top: 32,
      right: 30,
      bottom: 64,
      left: 56
    };

    if (!Array.isArray(bars) || bars.length === 0) {
      ctx.fillStyle = "#566775";
      ctx.font = "14px Bahnschrift, Segoe UI, sans-serif";
      ctx.fillText("Data Yamazumi belum tersedia.", 22, 30);
      return;
    }

    var maxBar = 1;
    bars.forEach(function (bar) {
      maxBar = Math.max(maxBar, Number(bar.value) || 0);
    });
    var safeTakt = Math.max(1, Number(taktTime) || 0);
    maxBar = Math.max(maxBar, safeTakt);

    drawGrid(ctx, width, height, padding, 5);
    drawAxes(ctx, width, height, padding);

    var chartWidth = width - padding.left - padding.right;
    var chartHeight = height - padding.top - padding.bottom;
    // Lebar bar dihitung dinamis agar tetap terbaca untuk jumlah data kecil/besar.
    var barWidth = Math.max(18, chartWidth / (bars.length * 1.55));
    var gap = Math.max(10, (chartWidth - barWidth * bars.length) / Math.max(1, bars.length + 1));

    for (var i = 0; i <= 5; i += 1) {
      var yValue = maxBar - (maxBar * i) / 5;
      var y = padding.top + (chartHeight * i) / 5;
      ctx.fillStyle = "#435564";
      ctx.font = "11px Bahnschrift, Segoe UI, sans-serif";
      ctx.fillText(String(Math.round(yValue)), 10, y + 4);
    }

    bars.forEach(function (bar, index) {
      var value = Number(bar.value) || 0;
      var heightRatio = value / maxBar;
      var barHeight = heightRatio * chartHeight;
      var x = padding.left + gap + index * (barWidth + gap);
      var y = padding.top + chartHeight - barHeight;
      var isOver = value > safeTakt;

      var gradient = ctx.createLinearGradient(0, y, 0, y + barHeight);
      gradient.addColorStop(0, isOver ? "#d8705e" : "#0a6d72");
      gradient.addColorStop(1, isOver ? "#f2b89f" : "#67b8bc");

      ctx.fillStyle = gradient;
      ctx.fillRect(x, y, barWidth, barHeight);

      ctx.fillStyle = "#243443";
      ctx.font = "11px Bahnschrift, Segoe UI, sans-serif";
      ctx.fillText(String(Math.round(value)), x + 2, y - 6);

      ctx.save();
      ctx.translate(x + barWidth / 2, height - padding.bottom + 14);
      ctx.rotate(-0.35);
      var labelText = String(bar.label || "");
      ctx.fillText(labelText.length > 12 ? labelText.slice(0, 12) + "…" : labelText, 0, 0);
      ctx.restore();
    });

    var taktY = padding.top + chartHeight - (safeTakt / maxBar) * chartHeight;
    ctx.strokeStyle = "#f08c38";
    ctx.setLineDash([6, 5]);
    ctx.beginPath();
    ctx.moveTo(padding.left, taktY);
    ctx.lineTo(width - padding.right, taktY);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = "#94531a";
    ctx.font = "12px Bahnschrift, Segoe UI, sans-serif";
    ctx.fillText("Takt Time: " + Math.round(safeTakt) + " detik", width - 170, taktY - 8);
  }

  window.SWCharts = {
    drawLineChart: drawLineChart,
    drawYamazumiChart: drawYamazumiChart
  };
})();
