/* Lelap - White Noise Sleep | HTML + CSS + JS */
(function () {
  'use strict';

  var SOUNDS = [
    { id: 'hujan', name: 'Hujan', desc: 'Rintik lembut di jendela',  color: '#B9A7D6', src: 'audio/hujan.mp3',
      icon: '<path d="M12 3.5c3 3.8 5 6.4 5 9a5 5 0 0 1-10 0c0-2.6 2-5.2 5-9z"/>' },
    { id: 'ombak', name: 'Ombak', desc: 'Datang dan pergi perlahan', color: '#A9C4D9', src: 'audio/ombak.mp3',
      icon: '<path d="M2.5 9c2-2.5 3.5-2.5 5.5 0s3.5 2.5 5.5 0 3.5-2.5 5.5 0"/><path d="M2.5 15c2-2.5 3.5-2.5 5.5 0s3.5 2.5 5.5 0 3.5-2.5 5.5 0"/>' },
    { id: 'badai', name: 'Badai', desc: 'Gemuruh jauh yang hangat',  color: '#9E92B8', src: 'audio/badai.mp3',
      icon: '<path d="M13 3 6 13.5h5L10 21l8-11h-5.2z"/>' },
    { id: 'angin', name: 'Angin', desc: 'Desir di sela dedaunan',    color: '#E4B9C7', src: 'audio/angin.mp3',
      icon: '<path d="M3 9h10a2.5 2.5 0 1 0-2.5-2.5"/><path d="M3 14h15a2.5 2.5 0 1 1-2.5 2.5"/>' }
  ];
  var TIMERS = [0, 15, 30, 45, 60, 90]; // menit, 0 = tanpa timer
  var FADE_MS = 6000;


  var current = SOUNDS[0], volume = 0.7, fade = 1, playing = false;
  var timerMin = 0, endAt = 0, tick = null, fadeTimer = null;
  var audioEl = null, ctx = null, master = null, synthNodes = [];

  var $ = function (id) { return document.getElementById(id); };
  var playBtn = $('playBtn'), nowName = $('nowName'), nowStatus = $('nowStatus');
  var soundsEl = $('sounds'), timersEl = $('timers'), timerInfo = $('timerInfo'), volEl = $('vol');

  function applyVolume() {
    var v = volume * fade;
    if (audioEl) audioEl.volume = v;
    if (master) master.gain.value = v;
  }

  function noiseBuffer(type) {
    var len = ctx.sampleRate * 4, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    var last = 0, b0 = 0, b1 = 0, b2 = 0;
    for (var i = 0; i < len; i++) {
      var w = Math.random() * 2 - 1;
      if (type === 'brown') { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; }
      else if (type === 'pink') { b0 = 0.99765 * b0 + w * 0.099; b1 = 0.963 * b1 + w * 0.2965; b2 = 0.57 * b2 + w * 1.0526; d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.2; }
      else d[i] = w * 0.5;
    }
    return buf;
  }
  function src(type) {
    var s = ctx.createBufferSource(); s.buffer = noiseBuffer(type); s.loop = true; s.start(); synthNodes.push(s); return s;
  }
  function filt(type, freq, q) { var f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; if (q) f.Q.value = q; return f; }
  function lfo(rate, depth, target) {
    var o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = rate; g.gain.value = depth;
    o.connect(g); g.connect(target); o.start(); synthNodes.push(o);
  }
  function level(v) { var g = ctx.createGain(); g.gain.value = v; return g; }

  function startSynth(id) {
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) { nowStatus.textContent = 'Audio tidak didukung perangkat ini'; return; }
    if (!ctx) ctx = new AC();
    if (ctx.state === 'suspended') ctx.resume();
    stopSynth();
    master = ctx.createGain(); master.connect(ctx.destination);
    var g;
    if (id === 'hujan') {
      src('pink').connect(filt('highpass', 700)).connect(level(0.9)).connect(master);
      src('white').connect(filt('highpass', 4000)).connect(level(0.12)).connect(master);
    } else if (id === 'ombak') {
      g = level(0.5); src('brown').connect(filt('lowpass', 800)).connect(g).connect(master); lfo(0.11, 0.4, g.gain);
    } else if (id === 'badai') {
      g = level(0.7); src('brown').connect(filt('lowpass', 450)).connect(g).connect(master); lfo(0.05, 0.3, g.gain);
      src('pink').connect(filt('highpass', 1200)).connect(level(0.35)).connect(master);
    } else {
      var bp = filt('bandpass', 500, 0.8); g = level(1.2);
      src('pink').connect(bp).connect(g).connect(master); lfo(0.14, 300, bp.frequency);
    }
    applyVolume();
  }
  function stopSynth() {
    synthNodes.forEach(function (n) { try { n.stop(); } catch (e) {} });
    synthNodes = [];
    if (master) { master.disconnect(); master = null; }
  }

  function stopAll() {
    if (audioEl) { audioEl.pause(); audioEl.removeAttribute('src'); audioEl.load(); audioEl = null; }
    stopSynth();
  }
  function startSound() {
    stopAll();
    var useFallback = function () { if (audioEl) { audioEl.pause(); audioEl = null; } if (playing) startSynth(current.id); };
    audioEl = new Audio(current.src);
    audioEl.loop = true;                       // <-- fitur looping
    audioEl.addEventListener('error', useFallback);
    applyVolume();
    var p = audioEl.play();
    if (p && p.catch) p.catch(useFallback);
  }

  function setPlaying(on) {
    playing = on;
    playBtn.classList.toggle('on', on);
    playBtn.setAttribute('aria-pressed', on);
    playBtn.setAttribute('aria-label', on ? 'Jeda suara' : 'Putar suara');
    if (on) { fade = 1; clearInterval(fadeTimer); startSound(); startTimer(); }
    else { stopAll(); stopTimer(); }
    renderStatus();
  }
  function renderStatus() {
    nowStatus.textContent = playing ? 'Sedang diputar, berulang terus' : 'Siap diputar';
  }

  function startTimer() {
    stopTimer();
    if (!timerMin) { renderTimer(); return; }
    endAt = Date.now() + timerMin * 60000;
    tick = setInterval(onTick, 500);
    onTick();
  }
  function stopTimer() { clearInterval(tick); tick = null; endAt = 0; renderTimer(); }
  function onTick() {
    var left = endAt - Date.now();
    if (left <= 0) { clearInterval(tick); tick = null; fadeOutAndStop(); return; }
    renderTimer(left);
  }
  function renderTimer(left) {
    if (!timerMin) timerInfo.textContent = '';
    else if (!playing || left == null) timerInfo.textContent = 'Timer ' + timerMin + ' menit';
    else {
      var s = Math.ceil(left / 1000), m = Math.floor(s / 60);
      timerInfo.textContent = 'Berhenti dalam ' + m + ':' + ('0' + (s % 60)).slice(-2);
    }
  }
  function fadeOutAndStop() {
    timerInfo.textContent = 'Memudar pelan…';
    var start = Date.now();
    fadeTimer = setInterval(function () {
      fade = Math.max(0, 1 - (Date.now() - start) / FADE_MS);
      applyVolume();
      if (fade <= 0) { clearInterval(fadeTimer); fade = 1; setPlaying(false); timerInfo.textContent = 'Timer selesai. Selamat tidur.'; }
    }, 100);
  }

  function renderSounds() {
    soundsEl.innerHTML = '';
    SOUNDS.forEach(function (s) {
      var b = document.createElement('button');
      b.className = 'sound'; b.setAttribute('role', 'radio'); b.style.setProperty('--c', s.color);
      b.setAttribute('aria-checked', s.id === current.id);
      b.innerHTML =
        '<span class="ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + s.icon + '</svg></span>' +
        '<span class="txt"><b>' + s.name + '</b><small>' + s.desc + '</small></span>';
      b.onclick = function () {
        current = s; nowName.textContent = s.name; renderSounds();
        if (playing) startSound();
      };
      soundsEl.appendChild(b);
    });
  }
  function renderTimers() {
    timersEl.innerHTML = '';
    TIMERS.forEach(function (m) {
      var b = document.createElement('button');
      b.className = 'chip'; b.setAttribute('role', 'radio');
      b.setAttribute('aria-checked', m === timerMin);
      b.textContent = m ? m + ' menit' : 'Tanpa timer';
      b.onclick = function () { timerMin = m; renderTimers(); if (playing) startTimer(); else renderTimer(); };
      timersEl.appendChild(b);
    });
  }

  playBtn.onclick = function () { setPlaying(!playing); };
  volEl.oninput = function () { volume = volEl.value / 100; applyVolume(); };

  function init() { renderSounds(); renderTimers(); renderTimer(); renderStatus(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();