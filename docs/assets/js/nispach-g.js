/*
 * נספח ג׳ דיגיטלי – מילוי, תצוגה מקדימה והפקת PDF בדפדפן בלבד.
 * פרטיות: הנתונים נשמרים רק במשתנים בזיכרון הדף. אין שליחה לרשת, אין localStorage/sessionStorage,
 * אין כתיבה לכתובת הדף ואין console.log של ערכי הטופס.
 * הספריות (pdf-lib, fontkit, bidi-js) והגופן (Alef, OFL) נטענים מנכסי האתר עצמו.
 */
(function () {
  'use strict';

  // נוסח ההוראה – לעדכן כאן אם יוצא נוסח חדש של נספח ג׳
  var ANNEX = {
    version: '29/04/2025',
    title: 'נספח ג׳ – הצהרה על היעדרות',
    subtitle: 'הצהרה זו תמולא על ידי העובד עבור כל היעדרות',
    instruction: 'הוראה 80-36 – הורה לילד עם מוגבלות',
    note: 'אם ההיעדרות נעשית לצרכי ליווי, סיוע או השגחה שלא בקשר לטיפול רפואי או פארא-רפואי יש להגיש הצהרה זו בלבד.'
  };
  var FILE_NAME = 'נספח-ג-הצהרת-היעדרות.pdf';

  var form = document.getElementById('annex-c-form');
  if (!form) return;
  form.addEventListener('submit', function (e) { e.preventDefault(); });

  var $ = function (id) { return document.getElementById(id); };
  var FIELDS = [
    { key: 'status', label: 'מעמד ההורה או המטפל', focusId: 'status-parent', errorId: 'status-error' },
    { key: 'empName', id: 'emp-name', label: 'שם העובד', errorId: 'emp-name-error' },
    { key: 'empId', id: 'emp-id', label: 'מספר הזהות של העובד', errorId: 'emp-id-error' },
    { key: 'absDate', id: 'abs-date', label: 'תאריך ההיעדרות', errorId: 'abs-date-error' },
    { key: 'absFrom', id: 'abs-from', label: 'משעה', errorId: 'abs-from-error' },
    { key: 'absTo', id: 'abs-to', label: 'עד שעה', errorId: 'abs-to-error' },
    { key: 'childName', id: 'child-name', label: 'שם האדם עם המוגבלות', errorId: 'child-name-error' },
    { key: 'childId', id: 'child-id', label: 'מספר הזהות של האדם עם המוגבלות', errorId: 'child-id-error' },
    { key: 'childDob', id: 'child-dob', label: 'תאריך הלידה', errorId: 'child-dob-error' },
    { key: 'declDate', id: 'decl-date', label: 'תאריך ההצהרה', errorId: 'decl-date-error' }
  ];

  // ברירת מחדל: תאריך ההצהרה הוא היום
  function todayIso() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  $('decl-date').value = todayIso();

  // הצגת הערה על נספח ה׳ לאפוטרופוס/אומנה
  var radios = form.querySelectorAll('input[name="status"]');
  Array.prototype.forEach.call(radios, function (r) {
    r.addEventListener('change', function () {
      $('status-extra').hidden = !(r.checked && r.value !== 'הורה');
    });
  });

  // ספרות בלבד בשדות ת״ז
  ['emp-id', 'child-id'].forEach(function (id) {
    $(id).addEventListener('input', function (e) {
      var v = e.target.value.replace(/\D+/g, '').slice(0, 9);
      if (v !== e.target.value) e.target.value = v;
    });
  });

  function read() {
    var checked = form.querySelector('input[name="status"]:checked');
    var data = { status: checked ? checked.value : '' };
    FIELDS.forEach(function (f) { if (f.id) data[f.key] = $(f.id).value.trim(); });
    return data;
  }

  function validIsraeliId(id) {
    if (!/^\d{5,9}$/.test(id)) return false;
    id = id.padStart(9, '0');
    var sum = 0;
    for (var i = 0; i < 9; i++) {
      var n = Number(id[i]) * ((i % 2) + 1);
      sum += n > 9 ? n - 9 : n;
    }
    return sum % 10 === 0;
  }
  function validDate(v) { return /^\d{4}-\d{2}-\d{2}$/.test(v) && !isNaN(new Date(v + 'T00:00:00').getTime()); }

  function validate(d) {
    var errors = {};
    if (!d.status) errors.status = 'בחרו את המעמד שלכם: הורה, אפוטרופוס או הורה במשפחת אומנה.';
    if (!d.empName) errors.empName = 'כתבו שם ושם משפחה.';
    if (!d.empId) errors.empId = 'כתבו מספר זהות.';
    else if (!validIsraeliId(d.empId)) errors.empId = 'מספר הזהות אינו תקין. בדקו את הספרות ואת ספרת הביקורת.';
    if (!d.absDate) errors.absDate = 'בחרו את תאריך ההיעדרות.';
    else if (!validDate(d.absDate)) errors.absDate = 'התאריך אינו תקין.';
    if (!d.absFrom) errors.absFrom = 'כתבו את שעת תחילת ההיעדרות.';
    if (!d.absTo) errors.absTo = 'כתבו את שעת סיום ההיעדרות.';
    else if (d.absFrom && d.absTo <= d.absFrom) errors.absTo = 'שעת הסיום צריכה להיות אחרי שעת ההתחלה.';
    if (!d.childName) errors.childName = 'כתבו את השם ושם המשפחה של האדם עם המוגבלות.';
    if (!d.childId) errors.childId = 'כתבו מספר זהות.';
    else if (!validIsraeliId(d.childId)) errors.childId = 'מספר הזהות אינו תקין. בדקו את הספרות ואת ספרת הביקורת.';
    if (!d.childDob) errors.childDob = 'בחרו תאריך לידה.';
    else if (!validDate(d.childDob)) errors.childDob = 'התאריך אינו תקין.';
    if (!d.declDate) errors.declDate = 'בחרו את תאריך ההצהרה.';
    else if (!validDate(d.declDate)) errors.declDate = 'התאריך אינו תקין.';
    return errors;
  }

  function showErrors(errors) {
    var list = $('error-list');
    list.textContent = '';
    var first = null;
    FIELDS.forEach(function (f) {
      var msg = errors[f.key] || '';
      $(f.errorId).textContent = msg;
      var targets = f.id ? [$(f.id)] : Array.prototype.slice.call(radios);
      targets.forEach(function (el) { if (msg) el.setAttribute('aria-invalid', 'true'); else el.removeAttribute('aria-invalid'); });
      if (msg) {
        var li = document.createElement('li');
        var a = document.createElement('a');
        var target = f.id || f.focusId;
        a.href = '#' + target;
        a.textContent = f.label + ': ' + msg;
        a.addEventListener('click', function (e) { e.preventDefault(); $(target).focus(); });
        li.appendChild(a);
        list.appendChild(li);
        if (!first) first = target;
      }
    });
    var box = $('error-summary');
    box.hidden = !first;
    if (first) box.focus();
    return !first;
  }

  function fmtDate(iso) { var p = iso.split('-'); return p[2] + '/' + p[1] + '/' + p[0]; }
  function idOut(id) { return id.padStart(9, '0'); }

  // בניית הנוסח המלא – משמש גם לתצוגה וגם ל-PDF
  function buildText(d) {
    return {
      declaration: 'אני הח"מ ' + d.empName + ', מס\' זהות ' + idOut(d.empId) + ', ' + d.status +
        ' של אדם עם מוגבלות הנזקק לסיוע אישי בשל מוגבלותו, מודיע בזה כי נעדרתי מעבודתי בתאריך ' +
        fmtDate(d.absDate) + ' משעה: ' + d.absFrom + ' עד שעה: ' + d.absTo +
        ' לפי סעיפים 1ב או 1ג לחוק, לשם מתן סיוע אישי, שמחייב היעדרות, לאותו אדם.',
      child: [
        ['שם ושם משפחה', d.childName],
        ['מס\' זהות', idOut(d.childId)],
        ['תאריך לידה', fmtDate(d.childDob)]
      ],
      sign: [
        ['תאריך', fmtDate(d.declDate)],
        ['שם העובד', d.empName]
      ]
    };
  }

  function el(tag, text, cls) {
    var e = document.createElement(tag);
    if (text != null) e.textContent = text;
    if (cls) e.className = cls;
    return e;
  }

  function renderPreview(d) {
    var t = buildText(d);
    var box = $('preview');
    box.textContent = '';
    var doc = el('div', null, 'declaration-text');
    doc.appendChild(el('p', ANNEX.instruction + ' · נוסח מעודכן לתאריך ' + ANNEX.version, 'hint'));
    doc.appendChild(el('h3', ANNEX.title));
    doc.appendChild(el('p', ANNEX.subtitle));
    doc.appendChild(el('p', t.declaration));
    doc.appendChild(el('p', 'פרטי האדם עם מוגבלות:'));
    var ul = el('ul');
    t.child.forEach(function (r) { ul.appendChild(el('li', r[0] + ': ' + r[1])); });
    doc.appendChild(ul);
    var ul2 = el('ul');
    t.sign.forEach(function (r) { ul2.appendChild(el('li', r[0] + ': ' + r[1])); });
    if (sig.hasInk()) {
      var li = el('li', 'חתימה:');
      var img = document.createElement('img');
      img.src = sig.toDataUrl();
      img.alt = 'החתימה שציירתם';
      img.className = 'sig-preview';
      li.appendChild(img);
      ul2.appendChild(li);
    } else {
      ul2.appendChild(el('li', 'חתימה: ____________ (חתמו במסגרת או ידנית על הטופס)'));
    }
    doc.appendChild(ul2);
    doc.appendChild(el('p', ANNEX.note, 'hint'));
    box.appendChild(doc);
  }

  // ---------- משטח חתימה ----------
  // הקווים נשמרים כנקודות יחסיות (0–1) בזיכרון הדף בלבד, כדי לצייר מחדש בשינוי גודל
  // ולייצא תמונה חדה ל-PDF. אין שמירה בדפדפן ואין שליחה.
  var sig = (function () {
    var canvas = $('sig-pad'), stateEl = $('sig-state');
    var ctx = canvas.getContext('2d');
    var strokes = [], current = null;

    function size() {
      var r = canvas.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
      if (!r.width) return;
      canvas.width = Math.round(r.width * dpr);
      canvas.height = Math.round(r.height * dpr);
      redraw();
    }
    function drawStrokes(c, w, h, lineW) {
      c.lineCap = 'round'; c.lineJoin = 'round'; c.strokeStyle = '#0b1f3a'; c.fillStyle = '#0b1f3a'; c.lineWidth = lineW;
      strokes.forEach(function (s) {
        if (s.length === 1) { c.beginPath(); c.arc(s[0][0] * w, s[0][1] * h, lineW / 2, 0, Math.PI * 2); c.fill(); return; }
        c.beginPath(); c.moveTo(s[0][0] * w, s[0][1] * h);
        for (var i = 1; i < s.length; i++) c.lineTo(s[i][0] * w, s[i][1] * h);
        c.stroke();
      });
    }
    function redraw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawStrokes(ctx, canvas.width, canvas.height, 2.6 * (window.devicePixelRatio || 1));
    }
    function point(e) {
      var r = canvas.getBoundingClientRect();
      return [Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), Math.min(1, Math.max(0, (e.clientY - r.top) / r.height))];
    }
    function updateState() { stateEl.textContent = strokes.length ? 'נוספה חתימה' : 'המסגרת ריקה'; }

    canvas.addEventListener('pointerdown', function (e) {
      if (e.button > 0) return;
      e.preventDefault();
      canvas.setPointerCapture(e.pointerId);
      current = [point(e)];
      strokes.push(current);
      redraw();
    });
    canvas.addEventListener('pointermove', function (e) {
      if (!current) return;
      e.preventDefault();
      var evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
      (evs.length ? evs : [e]).forEach(function (ev) { current.push(point(ev)); });
      redraw();
    });
    function end() { if (current) { current = null; updateState(); } }
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointercancel', end);
    window.addEventListener('resize', size);
    size();

    // ייצוא לתמונה שקופה, חתוכה לגבולות החתימה
    function exportCanvas() {
      var r = canvas.getBoundingClientRect();
      var W = 1200, H = Math.round(W * (r.height / (r.width || 1))) || 400;
      var off = document.createElement('canvas'); off.width = W; off.height = H;
      var c = off.getContext('2d'), lw = 7;
      drawStrokes(c, W, H, lw);
      var minX = 1, minY = 1, maxX = 0, maxY = 0;
      strokes.forEach(function (s) { s.forEach(function (p) {
        minX = Math.min(minX, p[0]); minY = Math.min(minY, p[1]); maxX = Math.max(maxX, p[0]); maxY = Math.max(maxY, p[1]);
      }); });
      var pad = lw * 2;
      var x0 = Math.max(0, Math.floor(minX * W - pad)), y0 = Math.max(0, Math.floor(minY * H - pad));
      var x1 = Math.min(W, Math.ceil(maxX * W + pad)), y1 = Math.min(H, Math.ceil(maxY * H + pad));
      var out = document.createElement('canvas'); out.width = Math.max(1, x1 - x0); out.height = Math.max(1, y1 - y0);
      out.getContext('2d').drawImage(off, x0, y0, out.width, out.height, 0, 0, out.width, out.height);
      return out;
    }

    return {
      hasInk: function () { return strokes.length > 0; },
      exportCanvas: exportCanvas,
      clear: function () { strokes = []; current = null; redraw(); updateState(); },
      toDataUrl: function () { return exportCanvas().toDataURL('image/png'); },
      toPng: function () {
        var c = exportCanvas(), b64 = c.toDataURL('image/png').split(',')[1], bin = atob(b64);
        var bytes = new Uint8Array(bin.length);
        for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        return { bytes: bytes, width: c.width, height: c.height };
      }
    };
  })();
  $('sig-clear').addEventListener('click', function () { sig.clear(); say('החתימה נמחקה.'); });

  // ---------- PDF ----------
  var libsPromise = null;
  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = src; s.onload = resolve; s.onerror = function () { reject(new Error('load ' + src)); };
      document.head.appendChild(s);
    });
  }
  function loadLibs() {
    if (!libsPromise) {
      libsPromise = Promise.all([
        loadScript('assets/vendor/pdf-lib.min.js'),
        loadScript('assets/vendor/fontkit.umd.min.js'),
        loadScript('assets/vendor/bidi.min.js'),
        fetch('assets/fonts/Alef-Regular.ttf').then(function (r) { if (!r.ok) throw new Error('font'); return r.arrayBuffer(); }),
        fetch('assets/fonts/Alef-Bold.ttf').then(function (r) { if (!r.ok) throw new Error('font'); return r.arrayBuffer(); })
      ]).then(function (res) { return { regular: res[3], bold: res[4] }; });
      libsPromise.catch(function () { libsPromise = null; });
    }
    return libsPromise;
  }

  async function makePdf(d) {
    var fonts = await loadLibs();
    var PDFLib = window.PDFLib, bidi = window.bidi_js();
    var pdf = await PDFLib.PDFDocument.create();
    pdf.registerFontkit(window.fontkit);
    var reg = await pdf.embedFont(fonts.regular, { subset: false });
    var bold = await pdf.embedFont(fonts.bold, { subset: false });
    pdf.setTitle(ANNEX.title);
    pdf.setSubject(ANNEX.instruction);
    pdf.setLanguage('he');
    pdf.setCreator('מעטפת הולמת');
    pdf.setProducer('מעטפת הולמת');
    pdf.setCreationDate(new Date());

    var page = pdf.addPage([595.28, 841.89]); // A4
    var W = page.getWidth(), H = page.getHeight();
    var M = 62, R = W - M, maxW = W - 2 * M;
    var ink = PDFLib.rgb(0.1, 0.13, 0.18), navy = PDFLib.rgb(0, 0.21, 0.32), grey = PDFLib.rgb(0.35, 0.38, 0.42);

    // סידור חזותי לפי אלגוריתם ה-bidi (מספרים ושעות נשארים משמאל לימין).
    // fontkit הופך בעצמו כל שורה שמכילה עברית, ולכן מעבירים לו את השורה החזותית בסדר הפוך,
    // כך שאחרי ההיפוך שלו הגליפים יוצאים בסדר החזותי הנכון.
    function visual(s) {
      var levels = bidi.getEmbeddingLevels(s, 'rtl');
      var v = bidi.getReorderedString(s, levels);
      return /[֐-׿]/.test(v) ? Array.from(v).reverse().join('') : v;
    }
    // שורה מיושרת לימין (או למרכז)
    function line(text, y, font, size, opts) {
      opts = opts || {};
      var v = visual(text);
      var w = font.widthOfTextAtSize(v, size);
      var x = opts.center ? (W - w) / 2 : (opts.right != null ? opts.right : R) - w;
      page.drawText(v, { x: x, y: y, size: size, font: font, color: opts.color || ink });
      return w;
    }
    // פסקה עם גלישת שורות לפי מילים (לוגית), ואז סידור חזותי לכל שורה
    function paragraph(text, y, font, size, lh, opts) {
      opts = opts || {};
      var width = opts.width || maxW;
      var words = text.split(/\s+/), cur = '', lines = [];
      words.forEach(function (w) {
        var test = cur ? cur + ' ' + w : w;
        if (font.widthOfTextAtSize(test, size) > width && cur) { lines.push(cur); cur = w; } else cur = test;
      });
      if (cur) lines.push(cur);
      lines.forEach(function (l) { line(l, y, font, size, opts); y -= size * lh; });
      return y;
    }

    var y = H - 50;
    line('בלמ"ס', y, bold, 11, { center: true, color: grey });
    y -= 22;
    line(ANNEX.instruction, y, reg, 10, { color: grey });
    line('נוסח מעודכן לתאריך: ' + ANNEX.version, y, reg, 10, { right: M + reg.widthOfTextAtSize(visual('נוסח מעודכן לתאריך: ' + ANNEX.version), 10), color: grey });
    y -= 10;
    page.drawLine({ start: { x: M, y: y }, end: { x: R, y: y }, thickness: 0.6, color: grey });
    y -= 26;
    line('- שמור לאחר מילוי -', y, reg, 10, { center: true, color: grey });
    y -= 30;
    line(ANNEX.title, y, bold, 17, { center: true, color: navy });
    y -= 24;
    line(ANNEX.subtitle, y, reg, 12, { center: true });
    y -= 40;

    var t = buildText(d);
    y = paragraph(t.declaration, y, reg, 12.5, 1.9);
    y -= 18;
    line('פרטי האדם עם מוגבלות:', y, bold, 12.5);
    y -= 26;
    t.child.forEach(function (r) {
      line(r[0] + ': ' + r[1], y, reg, 12.5);
      y -= 22;
    });
    y -= 22;
    t.sign.forEach(function (r) {
      line(r[0] + ': ' + r[1], y, reg, 12.5);
      y -= 22;
    });
    // שדה חתימה: החתימה שצוירה מעל הקו, או קו ריק לחתימה ידנית
    y -= 30; // מקום לחתימה מעל הקו, בלי לגעת בשורות שמעליה
    var lbl = 'חתימה:';
    var lw = line(lbl, y, reg, 12.5);
    var sigRight = R - lw - 8, sigLeft = sigRight - 190;
    if (sig.hasInk()) {
      var png = sig.toPng();
      var img = await pdf.embedPng(png.bytes);
      var scale = Math.min(180 / png.width, 44 / png.height);
      var iw = png.width * scale, ih = png.height * scale;
      page.drawImage(img, { x: sigRight - iw - 5, y: y - 2, width: iw, height: ih });
    }
    page.drawLine({ start: { x: sigLeft, y: y - 3 }, end: { x: sigRight, y: y - 3 }, thickness: 0.8, color: ink });
    if (!sig.hasInk()) line('יש לחתום לפני ההגשה.', y - 18, reg, 9.5, { color: grey });
    y -= 40;
    // הערת הנספח
    page.drawCircle({ x: R - 4, y: y + 4, size: 3, borderColor: ink, borderWidth: 0.8 });
    y = paragraph(ANNEX.note, y, reg, 11, 1.7, { right: R - 14, width: maxW - 14 });

    // תחתית
    page.drawLine({ start: { x: M, y: 64 }, end: { x: R, y: 64 }, thickness: 0.6, color: grey });
    line('שם הוראה: הורה לילד עם מוגבלות · מספר: 80-36 · נספח ג׳', 48, reg, 9, { color: grey });
    line(sig.hasInk() ? 'מולא ונחתם בדפדפן באתר "מעטפת הולמת".' : 'מולא בדפדפן באתר "מעטפת הולמת".', 34, reg, 8.5, { color: grey });

    return pdf.save();
  }

  // ---------- כפתורים ----------
  var status = $('status');
  function say(msg) { status.textContent = ''; window.setTimeout(function () { status.textContent = msg; }, 50); }

  $('btn-preview').addEventListener('click', function () {
    var d = read();
    if (!showErrors(validate(d))) { say('יש שדות שצריך לתקן.'); return; }
    renderPreview(d);
    say('התצוגה המקדימה עודכנה.');
    $('preview').focus();
  });

  // ---------- תמונה (JPEG) להעלאה לדיווח ----------
  // PUNCH IT ולביא WEB מקבלים תמונה ולא PDF. התמונה מצוירת על canvas בדפדפן, שמטפל בעברית מימין לשמאל.
  var IMG_NAME = 'נספח-ג-הצהרת-היעדרות.jpg';
  var imgFontsPromise = null;
  function loadImgFonts() {
    if (!imgFontsPromise) {
      var r = new FontFace('AlefDoc', 'url(assets/fonts/Alef-Regular.ttf)', { weight: '400' });
      var b = new FontFace('AlefDoc', 'url(assets/fonts/Alef-Bold.ttf)', { weight: '700' });
      imgFontsPromise = Promise.all([r.load(), b.load()]).then(function (fs) { fs.forEach(function (f) { document.fonts.add(f); }); });
      imgFontsPromise.catch(function () { imgFontsPromise = null; });
    }
    return imgFontsPromise;
  }
  async function makeImage(d) {
    await loadImgFonts();
    var W = 1240, H = 1754, S = W / 595.28; // A4 ב־150dpi; S ממיר נקודות PDF לפיקסלים
    var c = document.createElement('canvas'); c.width = W; c.height = H; c.dir = 'rtl';
    var ctx = c.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);
    ctx.direction = 'rtl'; ctx.textBaseline = 'alphabetic';
    var M = 62 * S, R = W - M, maxW = W - 2 * M;
    var INK = '#1a2130', NAVY = '#003652', GREY = '#596170';
    function font(size, bold) { return (bold ? '700 ' : '400 ') + Math.round(size * S) + 'px AlefDoc'; }
    function text(t, y, size, opt) {
      opt = opt || {};
      ctx.font = font(size, opt.bold); ctx.fillStyle = opt.color || INK;
      ctx.textAlign = opt.center ? 'center' : (opt.left ? 'left' : 'right');
      ctx.fillText(t, opt.center ? W / 2 : (opt.left ? M : (opt.right || R)), y);
      return ctx.measureText(t).width;
    }
    function para(t, y, size, lh, opt) {
      opt = opt || {};
      ctx.font = font(size, opt.bold);
      var width = opt.width || maxW, words = t.split(/\s+/), cur = '', lines = [];
      words.forEach(function (w) { var test = cur ? cur + ' ' + w : w; if (ctx.measureText(test).width > width && cur) { lines.push(cur); cur = w; } else cur = test; });
      if (cur) lines.push(cur);
      lines.forEach(function (l) { text(l, y, size, opt); y += size * S * lh; });
      return y;
    }
    function hline(y, color, w) { ctx.strokeStyle = color; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(M, y); ctx.lineTo(R, y); ctx.stroke(); }

    var y = 50 * S;
    text('בלמ"ס', y, 11, { center: true, bold: true, color: GREY });
    y += 22 * S;
    text(ANNEX.instruction, y, 10, { color: GREY });
    text('נוסח מעודכן לתאריך: ' + ANNEX.version, y, 10, { left: true, color: GREY });
    y += 10 * S; hline(y, GREY, 1.2);
    y += 26 * S; text('- שמור לאחר מילוי -', y, 10, { center: true, color: GREY });
    y += 30 * S; text(ANNEX.title, y, 17, { center: true, bold: true, color: NAVY });
    y += 24 * S; text(ANNEX.subtitle, y, 12, { center: true });
    y += 40 * S;
    var t = buildText(d);
    y = para(t.declaration, y, 12.5, 1.9);
    y += 18 * S - 12.5 * S * 0.9;
    text('פרטי האדם עם מוגבלות:', y, 12.5, { bold: true });
    y += 26 * S;
    t.child.forEach(function (r) { text(r[0] + ': ' + r[1], y, 12.5); y += 22 * S; });
    y += 22 * S;
    t.sign.forEach(function (r) { text(r[0] + ': ' + r[1], y, 12.5); y += 22 * S; });
    y += 30 * S;
    var lw = text('חתימה:', y, 12.5);
    var sigRight = R - lw - 8 * S, sigLeft = sigRight - 190 * S;
    if (sig.hasInk()) {
      var sc = sig.exportCanvas();
      var k = Math.min(180 * S / sc.width, 44 * S / sc.height);
      ctx.drawImage(sc, sigRight - sc.width * k - 5 * S, y + 2 * S - sc.height * k, sc.width * k, sc.height * k);
    }
    ctx.strokeStyle = INK; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(sigLeft, y + 3 * S); ctx.lineTo(sigRight, y + 3 * S); ctx.stroke();
    if (!sig.hasInk()) text('יש לחתום לפני ההגשה.', y + 18 * S, 9.5, { color: GREY });
    y += 40 * S;
    ctx.strokeStyle = INK; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(R - 4 * S, y - 4 * S, 3 * S, 0, Math.PI * 2); ctx.stroke();
    para(ANNEX.note, y, 11, 1.7, { right: R - 14 * S, width: maxW - 14 * S });
    hline(H - 64 * S, GREY, 1.2);
    text('שם הוראה: הורה לילד עם מוגבלות · מספר: 80-36 · נספח ג׳', H - 48 * S, 9, { color: GREY });
    text(sig.hasInk() ? 'מולא ונחתם בדפדפן באתר "מעטפת הולמת".' : 'מולא בדפדפן באתר "מעטפת הולמת".', H - 34 * S, 8.5, { color: GREY });
    return new Promise(function (res, rej) { c.toBlob(function (b) { b ? res(b) : rej(new Error('image')); }, 'image/jpeg', 0.92); });
  }

  function saveBlob(blob, name) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    window.setTimeout(function () { URL.revokeObjectURL(url); }, 30000);
  }

  async function handleSave(btn, kind) {
    var d = read();
    if (!showErrors(validate(d))) { say('יש שדות שצריך לתקן לפני השמירה.'); return; }
    renderPreview(d);
    btn.disabled = true;
    say('מכין את הקובץ…');
    var name = kind === 'image' ? IMG_NAME : FILE_NAME;
    try {
      var blob = kind === 'image' ? await makeImage(d) : new Blob([await makePdf(d)], { type: 'application/pdf' });
      saveBlob(blob, name);
      var next = kind === 'image'
        ? 'מעלים את התמונה לדיווח ב־PUNCH IT או בלביא WEB, או מעבירים אותה לקצין משא״ן ע״צ.'
        : 'להעלאה לדיווח ב־PUNCH IT או בלביא WEB צריך תמונה: לחצו ״שמירה כתמונה״.';
      say(sig.hasInk()
        ? 'הקובץ ' + name + ' נשמר במכשיר, עם החתימה. ' + next
        : 'הקובץ ' + name + ' נשמר במכשיר. שדה החתימה ריק: חתמו במסגרת ושמרו שוב, או חתמו ידנית על הטופס. ' + next);
    } catch (err) {
      say('לא הצלחנו להפיק את הקובץ. נסו שוב, או הורידו את הטופס הריק ומלאו ידנית.');
    } finally {
      btn.disabled = false;
    }
  }
  $('btn-image').addEventListener('click', function () { handleSave(this, 'image'); });
  $('btn-download').addEventListener('click', function () { handleSave(this, 'pdf'); });

  $('btn-reset').addEventListener('click', function () {
    form.reset();
    $('decl-date').value = todayIso();
    $('status-extra').hidden = true;
    sig.clear();
    showErrors({});
    $('error-summary').hidden = true;
    var box = $('preview');
    box.textContent = '';
    box.appendChild(el('p', 'לחצו ״תצוגה מקדימה״ כדי לראות את נוסח ההצהרה עם הפרטים שמילאתם.', 'preview-empty'));
    say('הטופס אופס והפרטים נמחקו מהדף.');
    $('status-parent').focus();
  });
})();
