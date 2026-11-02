/* ==========================================================================
   Chicago Holiday Hope — generative ambient music (Web Audio)
   A warm, license-free piece: soft FM bells, detuned pads, gentle bass.
   Usage: Music.start() / Music.stop() / Music.duck(bool) / Music.toggle()
   ========================================================================== */
(function () {
  'use strict';

  var Music = {
    ctx: null,
    master: null,
    duckGain: null,
    delaySend: null,
    playing: false,
    userEnabled: false, // true only when the visitor turned music on via the toggle
    timer: null,
    nextTime: 0,
    beat: 0,
    bpm: 64,
    volume: 0.5
  };

  var CHORDS = [
    { pad: [53, 57, 60, 64], bass: 41 }, // Fmaj7
    { pad: [50, 53, 57, 60], bass: 38 }, // Dm7
    { pad: [46, 50, 53, 57], bass: 34 }, // Bbmaj7
    { pad: [48, 52, 55, 60], bass: 36 }  // Cadd9-ish
  ];
  var MELODY = [77, 79, 81, 84, 86, 89]; // F pentatonic, high register

  function mtof(m) { return 440 * Math.pow(2, (m - 69) / 12); }

  function buildGraph() {
    var AC = window.AudioContext || window.webkitAudioContext;
    Music.ctx = new AC();

    Music.master = Music.ctx.createGain();
    Music.master.gain.value = 0;

    var tone = Music.ctx.createBiquadFilter();
    tone.type = 'lowpass';
    tone.frequency.value = 4200;

    Music.duckGain = Music.ctx.createGain();
    Music.duckGain.gain.value = 1;

    // gentle feedback delay for warmth
    var delay = Music.ctx.createDelay(1.0);
    delay.delayTime.value = 0.31;
    var feedback = Music.ctx.createGain();
    feedback.gain.value = 0.34;
    var wet = Music.ctx.createGain();
    wet.gain.value = 0.28;
    Music.delaySend = Music.ctx.createGain();
    Music.delaySend.gain.value = 1;

    Music.delaySend.connect(delay);
    delay.connect(feedback);
    feedback.connect(delay);
    delay.connect(wet);
    wet.connect(Music.duckGain);

    Music.duckGain.connect(tone);
    tone.connect(Music.master);
    Music.master.connect(Music.ctx.destination);
  }

  /* Soft FM bell */
  function bell(midi, time, vel) {
    var ctx = Music.ctx;
    var freq = mtof(midi);
    var carrier = ctx.createOscillator();
    var mod = ctx.createOscillator();
    var modGain = ctx.createGain();
    var g = ctx.createGain();

    carrier.type = 'sine';
    carrier.frequency.value = freq;
    mod.type = 'sine';
    mod.frequency.value = freq * 2.001;
    modGain.gain.setValueAtTime(freq * 1.6, time);
    modGain.gain.exponentialRampToValueAtTime(freq * 0.02, time + 1.4);
    mod.connect(modGain);
    modGain.connect(carrier.frequency);

    g.gain.setValueAtTime(0, time);
    g.gain.linearRampToValueAtTime(vel, time + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, time + 2.4);

    carrier.connect(g);
    g.connect(Music.duckGain);
    g.connect(Music.delaySend);
    carrier.start(time);
    mod.start(time);
    carrier.stop(time + 2.5);
    mod.stop(time + 2.5);
  }

  /* Warm detuned pad chord */
  function pad(notes, time, dur) {
    var ctx = Music.ctx;
    notes.forEach(function (m) {
      [-5, 5].forEach(function (cents) {
        var osc = ctx.createOscillator();
        var filt = ctx.createBiquadFilter();
        var g = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = mtof(m);
        osc.detune.value = cents;
        filt.type = 'lowpass';
        filt.frequency.value = 850;
        g.gain.setValueAtTime(0, time);
        g.gain.linearRampToValueAtTime(0.028, time + 1.4);
        g.gain.setValueAtTime(0.028, time + dur - 1.6);
        g.gain.linearRampToValueAtTime(0, time + dur);
        osc.connect(filt);
        filt.connect(g);
        g.connect(Music.duckGain);
        osc.start(time);
        osc.stop(time + dur + 0.1);
      });
    });
  }

  /* Soft bass note */
  function bass(midi, time, dur) {
    var ctx = Music.ctx;
    var osc = ctx.createOscillator();
    var g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = mtof(midi);
    g.gain.setValueAtTime(0, time);
    g.gain.linearRampToValueAtTime(0.11, time + 0.25);
    g.gain.setValueAtTime(0.11, time + dur - 0.8);
    g.gain.linearRampToValueAtTime(0, time + dur);
    osc.connect(g);
    g.connect(Music.duckGain);
    osc.start(time);
    osc.stop(time + dur + 0.1);
  }

  function scheduleBeat(beat, time) {
    var beatsPerBar = 4;
    var chordIdx = Math.floor(beat / (beatsPerBar * 2)) % CHORDS.length;
    var chord = CHORDS[chordIdx];
    var beatInChord = beat % (beatsPerBar * 2);
    var beatDur = 60 / Music.bpm;

    // New chord: pad + bass
    if (beatInChord === 0) {
      pad(chord.pad, time, beatDur * beatsPerBar * 2);
      bass(chord.bass, time, beatDur * beatsPerBar * 2);
    }

    // Sparse bell melody, denser on downbeats
    var chance = beat % beatsPerBar === 0 ? 0.55 : 0.3;
    if (Math.random() < chance) {
      var note = MELODY[Math.floor(Math.random() * MELODY.length)];
      // favor chord tones occasionally
      if (Math.random() < 0.35) note = chord.pad[chord.pad.length - 1] + 12;
      bell(note, time + (Math.random() * 0.12), 0.05 + Math.random() * 0.03);
    }
  }

  function scheduler() {
    while (Music.nextTime < Music.ctx.currentTime + 0.45) {
      scheduleBeat(Music.beat, Music.nextTime);
      Music.nextTime += 60 / Music.bpm;
      Music.beat++;
    }
  }

  Music.start = function () {
    if (!Music.ctx) buildGraph();
    if (Music.ctx.state === 'suspended') {
      Music.ctx.resume().catch(function () {});
    }
    if (Music.playing) return;
    Music.playing = true;
    Music.nextTime = Music.ctx.currentTime + 0.15;
    Music.beat = 0;
    Music.master.gain.cancelScheduledValues(Music.ctx.currentTime);
    Music.master.gain.setTargetAtTime(Music.volume, Music.ctx.currentTime, 0.8);
    Music.timer = setInterval(scheduler, 120);
  };

  Music.stop = function () {
    if (!Music.ctx || !Music.playing) return;
    Music.playing = false;
    clearInterval(Music.timer);
    Music.timer = null;
    Music.master.gain.cancelScheduledValues(Music.ctx.currentTime);
    Music.master.gain.setTargetAtTime(0, Music.ctx.currentTime, 0.6);
  };

  /* Duck under narration: on = quieter */
  Music.duck = function (on) {
    if (!Music.ctx || !Music.duckGain) return;
    Music.duckGain.gain.cancelScheduledValues(Music.ctx.currentTime);
    Music.duckGain.gain.setTargetAtTime(on ? 0.32 : 1, Music.ctx.currentTime, 0.35);
  };

  /* Returns true if the audio context is (or can immediately be) running */
  Music.canPlay = function () {
    if (!Music.ctx) buildGraph();
    if (Music.ctx.state === 'suspended') {
      Music.ctx.resume().catch(function () {});
    }
    return Music.ctx.state === 'running';
  };

  Music.isEnabled = function () { return Music.playing; };

  window.Music = Music;
})();
