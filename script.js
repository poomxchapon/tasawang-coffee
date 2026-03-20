/* ============================================
   TA-SA-WANG — Script v2
   Cart + Payment + OCR Slip Verification
   ============================================ */

(function () {
  'use strict';

  // === CONFIG ===
  const PROMPTPAY_ID = '0812345678'; // TODO: เปลี่ยนเป็นเบอร์จริง
  const SHOP_NAME = 'TA-SA-WANG Coffee';

  // === STATE ===
  let cart = [];

  // === SCROLL REVEAL ===
  function initScrollReveal() {
    const els = document.querySelectorAll('.reveal, .reveal-left, .reveal-right');
    if (!els.length) return;
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); } });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    els.forEach((el) => obs.observe(el));
    setTimeout(() => els.forEach((el) => el.classList.add('visible')), 3000);
  }

  function initStagger() {
    document.querySelectorAll('.stagger').forEach((p) => {
      Array.from(p.children).forEach((c, i) => c.style.setProperty('--i', i));
    });
  }

  // === NAV ===
  function initNav() {
    const nav = document.querySelector('.nav');
    if (!nav) return;
    let ticking = false;
    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          nav.classList.toggle('scrolled', window.scrollY > 60);
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });
  }

  function initMobileMenu() {
    const toggle = document.querySelector('.nav__toggle');
    const links = document.querySelector('.nav__links');
    if (!toggle || !links) return;
    toggle.addEventListener('click', () => { toggle.classList.toggle('active'); links.classList.toggle('open'); });
    links.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => { toggle.classList.remove('active'); links.classList.remove('open'); }));
  }

  function initActiveNav() {
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav__links a[href^="#"]');
    if (!sections.length) return;
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          const id = e.target.getAttribute('id');
          navLinks.forEach((l) => { l.classList.toggle('active', l.getAttribute('href') === '#' + id); });
        }
      });
    }, { threshold: 0.3, rootMargin: '-80px 0px -40% 0px' });
    sections.forEach((s) => obs.observe(s));
  }

  function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
      anchor.addEventListener('click', (e) => {
        const id = anchor.getAttribute('href');
        if (id === '#') return;
        const target = document.querySelector(id);
        if (!target) return;
        e.preventDefault();
        const navH = document.querySelector('.nav')?.offsetHeight || 0;
        window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - navH, behavior: 'smooth' });
      });
    });
  }

  // === CART ===
  window.addToOrder = function (name, price) {
    const existing = cart.find((i) => i.name === name);
    if (existing) { existing.qty++; } else { cart.push({ name, price, qty: 1 }); }
    renderCart();
    showFloatingCart();
    // brief animation on the button
    event.target.textContent = '✓ เพิ่มแล้ว';
    setTimeout(() => { event.target.textContent = '+ เพิ่มในรายการ'; }, 1000);
  };

  function renderCart() {
    const container = document.getElementById('cartItems');
    const totalEl = document.getElementById('cartTotal');
    const btnPay = document.getElementById('btnProceedPay');
    const countEl = document.getElementById('cartCount');

    if (!cart.length) {
      container.innerHTML = '<p class="cart-empty">ยังไม่มีสินค้า — เลือกจากด้านบนได้เลย!</p>';
      totalEl.style.display = 'none';
      btnPay.style.display = 'none';
      document.getElementById('floatingCart').style.display = 'none';
      return;
    }

    let html = '';
    let total = 0;
    cart.forEach((item, idx) => {
      const subtotal = item.price * item.qty;
      total += subtotal;
      html += `
        <div class="cart-item">
          <span class="cart-item__name">${item.name}</span>
          <div class="cart-item__qty">
            <button onclick="changeQty(${idx}, -1)">-</button>
            <span>${item.qty}</span>
            <button onclick="changeQty(${idx}, 1)">+</button>
          </div>
          <span class="cart-item__price">฿${subtotal.toLocaleString()}</span>
          <button class="cart-item__remove" onclick="removeItem(${idx})">&times;</button>
        </div>`;
    });
    container.innerHTML = html;
    document.getElementById('totalAmount').textContent = '฿' + total.toLocaleString();
    totalEl.style.display = 'flex';
    btnPay.style.display = 'block';

    const totalQty = cart.reduce((s, i) => s + i.qty, 0);
    countEl.textContent = totalQty;
  }

  window.changeQty = function (idx, delta) {
    cart[idx].qty += delta;
    if (cart[idx].qty <= 0) cart.splice(idx, 1);
    renderCart();
  };

  window.removeItem = function (idx) {
    cart.splice(idx, 1);
    renderCart();
  };

  function showFloatingCart() {
    const fc = document.getElementById('floatingCart');
    fc.style.display = 'flex';
  }

  window.scrollToOrder = function () {
    document.getElementById('order')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // === PAYMENT FLOW ===
  window.proceedToPayment = function () {
    document.getElementById('orderCart').style.display = 'none';
    document.getElementById('orderPayment').style.display = 'block';

    const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
    document.getElementById('qrAmount').textContent = '฿' + total.toLocaleString();

    generatePromptPayQR(PROMPTPAY_ID, total);
  };

  window.backToCart = function () {
    document.getElementById('orderPayment').style.display = 'none';
    document.getElementById('orderCart').style.display = 'block';
  };

  window.proceedToSlip = function () {
    document.getElementById('orderPayment').style.display = 'none';
    document.getElementById('orderVerify').style.display = 'block';
  };

  window.backToPayment = function () {
    document.getElementById('orderVerify').style.display = 'none';
    document.getElementById('orderPayment').style.display = 'block';
  };

  // === QR GENERATION (PromptPay) ===
  function generatePromptPayQR(id, amount) {
    const payload = generatePromptPayPayload(id, amount);
    const canvas = document.getElementById('qrCanvas');
    if (typeof QRCode !== 'undefined') {
      QRCode.toCanvas(canvas, payload, {
        width: 196,
        margin: 0,
        color: { dark: '#000000', light: '#ffffff' },
        errorCorrectionLevel: 'M'
      });
    }
  }

  function generatePromptPayPayload(id, amount) {
    // EMVCo PromptPay QR payload
    const sanitized = id.replace(/\D/g, '');
    let idType, formattedId;

    if (sanitized.length === 13) {
      // National ID
      idType = '02';
      formattedId = sanitized;
    } else {
      // Phone number (add 66 prefix)
      idType = '01';
      formattedId = '0066' + sanitized.substring(1);
    }

    const merchantId = tlv('00', 'A000000677010111') + tlv(idType, formattedId);
    const merchant = tlv('29', merchantId);

    let payload = '';
    payload += tlv('00', '01'); // Payload format
    payload += tlv('01', '11'); // Static QR (one-time = 12)
    payload += merchant;
    payload += tlv('53', '764'); // THB
    if (amount > 0) payload += tlv('54', amount.toFixed(2));
    payload += tlv('58', 'TH'); // Country
    payload += tlv('62', tlv('05', SHOP_NAME)); // Additional data

    payload += '6304'; // CRC placeholder
    const crc = crc16(payload);
    payload += crc;

    return payload;
  }

  function tlv(tag, value) {
    const len = value.length.toString().padStart(2, '0');
    return tag + len + value;
  }

  function crc16(str) {
    let crc = 0xFFFF;
    for (let i = 0; i < str.length; i++) {
      crc ^= str.charCodeAt(i) << 8;
      for (let j = 0; j < 8; j++) {
        crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
        crc &= 0xFFFF;
      }
    }
    return crc.toString(16).toUpperCase().padStart(4, '0');
  }

  // === SLIP UPLOAD ===
  function initSlipUpload() {
    const input = document.getElementById('slipInput');
    const dropzone = document.getElementById('slipDropzone');
    if (!input || !dropzone) return;

    input.addEventListener('change', (e) => {
      if (e.target.files?.[0]) handleSlipFile(e.target.files[0]);
    });

    dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('dragover'); });
    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
      if (e.dataTransfer.files?.[0]) handleSlipFile(e.dataTransfer.files[0]);
    });
  }

  function handleSlipFile(file) {
    if (!file.type.startsWith('image/')) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      document.getElementById('slipImage').src = e.target.result;
      document.getElementById('slipUpload').style.display = 'none';
      document.getElementById('slipPreview').style.display = 'block';
      document.getElementById('btnVerifySlip').style.display = 'block';
      document.getElementById('slipResult').style.display = 'none';
    };
    reader.readAsDataURL(file);
  }

  window.removeSlip = function () {
    document.getElementById('slipInput').value = '';
    document.getElementById('slipPreview').style.display = 'none';
    document.getElementById('slipUpload').style.display = 'block';
    document.getElementById('btnVerifySlip').style.display = 'none';
    document.getElementById('slipResult').style.display = 'none';
  };

  // === OCR VERIFICATION ===
  window.verifySlip = async function () {
    const img = document.getElementById('slipImage');
    if (!img.src) return;

    document.getElementById('btnVerifySlip').style.display = 'none';
    document.getElementById('slipProcessing').style.display = 'block';
    const progressBar = document.getElementById('ocrProgress');

    try {
      const result = await Tesseract.recognize(img.src, 'tha+eng', {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            progressBar.style.width = Math.round(m.progress * 100) + '%';
          }
        }
      });

      const text = result.data.text;
      displaySlipResult(text);
    } catch (err) {
      console.error('OCR Error:', err);
      displaySlipResult('');
    } finally {
      document.getElementById('slipProcessing').style.display = 'none';
    }
  };

  function displaySlipResult(text) {
    const resultEl = document.getElementById('slipResult');
    const gridEl = document.getElementById('resultGrid');
    resultEl.style.display = 'block';

    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

    // Parse common Thai bank slip patterns
    const parsed = {
      amount: extractAmount(text),
      date: extractDate(text),
      time: extractTime(text),
      bank: extractBank(text),
      ref: extractRef(text),
    };

    const expectedTotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
    const amountMatch = parsed.amount && Math.abs(parsed.amount - expectedTotal) < 1;

    let html = '';

    if (parsed.amount) {
      html += resultRow('จำนวนเงิน', '฿' + parsed.amount.toLocaleString(undefined, { minimumFractionDigits: 2 }), amountMatch);
    }
    if (amountMatch !== null && parsed.amount) {
      html += resultRow('ตรงกับยอดสั่งซื้อ', amountMatch ? 'ตรงกัน' : 'ไม่ตรง (ยอด ฿' + expectedTotal + ')', amountMatch);
    }
    if (parsed.date) html += resultRow('วันที่', parsed.date, null);
    if (parsed.time) html += resultRow('เวลา', parsed.time, null);
    if (parsed.bank) html += resultRow('ธนาคาร', parsed.bank, null);
    if (parsed.ref) html += resultRow('เลขอ้างอิง', parsed.ref, null);

    if (!parsed.amount && !parsed.bank) {
      html += `<div class="result-row"><span class="result-row__label">สถานะ</span><span class="result-row__value result-mismatch">ไม่สามารถอ่านสลิปได้ชัดเจน กรุณาถ่ายใหม่</span></div>`;
    }

    // Show confirm button if amount matches
    if (amountMatch) {
      html += `<button class="btn btn--primary btn--full" style="margin-top:1rem" onclick="completeOrder()">ยืนยันคำสั่งซื้อ</button>`;
    } else if (parsed.amount) {
      html += `<button class="btn btn--glass btn--full" style="margin-top:1rem" onclick="completeOrder()">ยืนยันต่อ (ตรวจสอบด้วยตนเอง)</button>`;
    }

    gridEl.innerHTML = html;
  }

  function resultRow(label, value, match) {
    const cls = match === true ? 'result-match' : match === false ? 'result-mismatch' : '';
    return `<div class="result-row"><span class="result-row__label">${label}</span><span class="result-row__value ${cls}">${value}</span></div>`;
  }

  // === TEXT PARSING ===
  function extractAmount(text) {
    // Match Thai slip amount patterns
    const patterns = [
      /(?:จำนวนเงิน|amount|ยอดโอน|ยอดเงิน|total)[:\s]*(?:THB|฿|บาท)?\s*([\d,]+\.?\d*)/i,
      /(?:THB|฿)\s*([\d,]+\.?\d*)/i,
      /([\d,]+\.\d{2})\s*(?:THB|฿|บาท)/i,
      /([\d,]+\.\d{2})/,
    ];
    for (const p of patterns) {
      const m = text.match(p);
      if (m) {
        const val = parseFloat(m[1].replace(/,/g, ''));
        if (val > 0 && val < 1000000) return val;
      }
    }
    return null;
  }

  function extractDate(text) {
    const m = text.match(/(\d{1,2}[\s/-]\s*(?:ม\.?ค|ก\.?พ|มี\.?ค|เม\.?ย|พ\.?ค|มิ\.?ย|ก\.?ค|ส\.?ค|ก\.?ย|ต\.?ค|พ\.?ย|ธ\.?ค|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\.?\s*\d{2,4})/i)
      || text.match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/);
    return m ? m[1] : null;
  }

  function extractTime(text) {
    const m = text.match(/(\d{1,2}:\d{2}(?::\d{2})?(?:\s*น\.?)?)/);
    return m ? m[1] : null;
  }

  function extractBank(text) {
    const banks = [
      [/กสิกร|kbank|kasikorn/i, 'ธนาคารกสิกรไทย'],
      [/กรุงเทพ|bangkok\s*bank|bbl/i, 'ธนาคารกรุงเทพ'],
      [/ไทยพาณิชย์|scb|siam\s*commercial/i, 'ธนาคารไทยพาณิชย์'],
      [/กรุงไทย|ktb|krungthai/i, 'ธนาคารกรุงไทย'],
      [/กรุงศรี|krungsri|bay/i, 'ธนาคารกรุงศรีอยุธยา'],
      [/ทหารไทยธนชาต|ttb|tmb/i, 'ธนาคารทหารไทยธนชาต'],
      [/ออมสิน|gsb/i, 'ธนาคารออมสิน'],
      [/promptpay|พร้อมเพย์/i, 'PromptPay'],
    ];
    for (const [regex, name] of banks) {
      if (regex.test(text)) return name;
    }
    return null;
  }

  function extractRef(text) {
    const m = text.match(/(?:เลขที่รายการ|ref|reference|อ้างอิง|transaction)[:\s#]*([A-Za-z0-9]{6,})/i)
      || text.match(/([A-Z0-9]{10,})/);
    return m ? m[1] : null;
  }

  // === ORDER COMPLETE ===
  window.completeOrder = function () {
    document.getElementById('orderVerify').style.display = 'none';
    document.getElementById('orderDone').style.display = 'block';
    cart = [];
    renderCart();
    document.getElementById('floatingCart').style.display = 'none';
  };

  // === INIT ===
  function init() {
    initScrollReveal();
    initStagger();
    initNav();
    initActiveNav();
    initMobileMenu();
    initSmoothScroll();
    initSlipUpload();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
