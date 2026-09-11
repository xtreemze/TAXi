(() => {
  'use strict';

  const CONFIG = Object.freeze({
    version: 2,
    days: 5,
    targetCash: 3000,
    startMinute: 7 * 60,
    closeMinute: 19 * 60,
    tickMs: 600,
    minutesPerTick: 2,
    refuelCost: 90,
    refuelAmount: 25,
    mealCost: 55,
    nightlyCost: 110,
    saveKey: 'taxi.street-shift.save.v2',
    highScoreKey: 'taxi.street-shift.highscore.v2',
    soundKey: 'taxi.street-shift.sound.v2'
  });

  const DESTINATIONS = Object.freeze([
    { name: 'Centro', min: 2.2, max: 4.4, rate: 22, weight: 5 },
    { name: 'Mercado', min: 1.6, max: 3.3, rate: 20, weight: 5 },
    { name: 'Estación', min: 3.0, max: 5.6, rate: 24, weight: 4 },
    { name: 'Hospital', min: 3.8, max: 6.8, rate: 25, weight: 3 },
    { name: 'Colonia Norte', min: 4.5, max: 7.8, rate: 27, weight: 3 },
    { name: 'Aeropuerto', min: 7.0, max: 11.5, rate: 31, weight: 2 }
  ]);

  const PASSENGERS = Object.freeze([
    'Ana', 'Beto', 'Camila', 'Diego', 'Elena', 'Fabián', 'Gabriela', 'Hugo',
    'Iris', 'Jorge', 'Karla', 'Luis', 'Marta', 'Nico', 'Olga', 'Pablo'
  ]);

  const WEATHER = Object.freeze([
    { id: 'clear', label: 'Clear', description: 'Clear streets', speed: 1, fuel: 1, energy: 1, fare: 1 },
    { id: 'rain', label: 'Rain', description: 'Rain — slower traffic, better fares', speed: 0.82, fuel: 1.08, energy: 1, fare: 1.16 },
    { id: 'heat', label: 'Heat', description: 'Heat — energy drains faster', speed: 0.96, fuel: 1.04, energy: 1.45, fare: 1.08 }
  ]);

  const byId = (id) => document.getElementById(id);
  const dom = {
    app: byId('app'),
    game: byId('game'),
    cityStrip: byId('cityStrip'),
    streetFurniture: byId('streetFurniture'),
    laneMarks: byId('laneMarks'),
    taxi: byId('taxi'),
    passengerLane: byId('passengerLane'),
    destinationMarker: byId('destinationMarker'),
    serviceSign: byId('serviceSign'),
    dayValue: byId('dayValue'),
    timeValue: byId('timeValue'),
    cashValue: byId('cashValue'),
    fuelValue: byId('fuelValue'),
    fuelBar: byId('fuelBar'),
    energyValue: byId('energyValue'),
    energyBar: byId('energyBar'),
    mealValue: byId('mealValue'),
    ratingValue: byId('ratingValue'),
    weatherValue: byId('weatherValue'),
    sceneTitle: byId('sceneTitle'),
    sceneMessage: byId('sceneMessage'),
    dispatchTitle: byId('dispatchTitle'),
    statusChip: byId('statusChip'),
    tripEmpty: byId('tripEmpty'),
    tripActive: byId('tripActive'),
    tripPassenger: byId('tripPassenger'),
    tripDestination: byId('tripDestination'),
    tripFare: byId('tripFare'),
    tripProgress: byId('tripProgress'),
    tripDistance: byId('tripDistance'),
    tripPatience: byId('tripPatience'),
    driveButton: byId('driveButton'),
    driveLabel: byId('driveLabel'),
    actionButton: byId('actionButton'),
    actionLabel: byId('actionLabel'),
    refuelButton: byId('refuelButton'),
    mealButton: byId('mealButton'),
    buyMealButton: byId('buyMealButton'),
    goalValue: byId('goalValue'),
    goalBar: byId('goalBar'),
    goalCopy: byId('goalCopy'),
    soundButton: byId('soundButton'),
    pauseButton: byId('pauseButton'),
    helpButton: byId('helpButton'),
    toastStack: byId('toastStack'),
    modalDialog: byId('modalDialog'),
    modalEyebrow: byId('modalEyebrow'),
    modalTitle: byId('modalTitle'),
    modalBody: byId('modalBody'),
    modalActions: byId('modalActions')
  };

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const random = (min, max) => min + Math.random() * (max - min);
  const choose = (items) => items[Math.floor(Math.random() * items.length)];
  const money = (value) => `L ${Math.round(value).toLocaleString('en-US')}`;
  const formatTime = (minutes) => {
    const safe = Math.max(0, Math.floor(minutes));
    const hour = Math.floor(safe / 60) % 24;
    const minute = safe % 60;
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  };

  function weightedDestination() {
    const pool = [];
    DESTINATIONS.forEach((destination) => {
      for (let i = 0; i < destination.weight; i += 1) pool.push(destination);
    });
    return choose(pool);
  }

  function weatherForDay(day) {
    return WEATHER[(day - 1) % WEATHER.length];
  }

  function newState() {
    return {
      version: CONFIG.version,
      mode: 'playing',
      day: 1,
      minute: CONFIG.startMinute,
      cash: 450,
      dayStartCash: 450,
      fuel: 75,
      energy: 90,
      meals: 2,
      rating: 3.2,
      score: 0,
      streak: 0,
      totalFares: 0,
      dayFares: 0,
      dayRevenue: 0,
      driving: false,
      paused: false,
      world: 0,
      offers: [],
      trip: null,
      nextOfferMinute: CONFIG.startMinute + 4,
      weather: weatherForDay(1).id,
      lastSave: Date.now()
    };
  }

  let state = newState();
  let buildings = [];
  let trees = [];
  let resumeAfterHelp = false;

  class SoundEngine {
    constructor() {
      this.enabled = safeRead(CONFIG.soundKey, '1') !== '0';
      this.context = null;
      this.hum = null;
      this.humGain = null;
    }

    ensure() {
      if (!this.enabled) return null;
      if (!this.context) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return null;
        this.context = new AudioContext();
      }
      if (this.context.state === 'suspended') this.context.resume().catch(() => {});
      return this.context;
    }

    tone(frequency, duration = 0.08, type = 'sine', volume = 0.05, delay = 0) {
      const context = this.ensure();
      if (!context) return;
      const start = context.currentTime + delay;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(volume, start + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(start);
      oscillator.stop(start + duration + 0.02);
    }

    cue(name) {
      if (!this.enabled) return;
      if (name === 'pickup') {
        this.tone(520, 0.08, 'square', 0.035);
        this.tone(760, 0.1, 'square', 0.03, 0.09);
      } else if (name === 'cash') {
        this.tone(840, 0.07, 'triangle', 0.045);
        this.tone(1180, 0.11, 'triangle', 0.04, 0.07);
      } else if (name === 'arrive') {
        this.tone(660, 0.1, 'sine', 0.035);
        this.tone(880, 0.16, 'sine', 0.035, 0.11);
      } else if (name === 'error') {
        this.tone(150, 0.14, 'sawtooth', 0.025);
      } else if (name === 'service') {
        this.tone(300, 0.07, 'triangle', 0.03);
        this.tone(450, 0.09, 'triangle', 0.03, 0.08);
      } else if (name === 'day') {
        this.tone(420, 0.1, 'triangle', 0.03);
        this.tone(560, 0.1, 'triangle', 0.03, 0.1);
        this.tone(720, 0.16, 'triangle', 0.03, 0.2);
      }
    }

    stopHum() {
      if (!this.hum || !this.context || !this.humGain) return;
      const oldHum = this.hum;
      const oldGain = this.humGain;
      const now = this.context.currentTime;
      oldGain.gain.cancelScheduledValues(now);
      oldGain.gain.setValueAtTime(Math.max(0.0001, oldGain.gain.value), now);
      oldGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
      oldHum.stop(now + 0.09);
      this.hum = null;
      this.humGain = null;
    }

    setDriving(driving) {
      if (!driving) {
        this.stopHum();
        return;
      }
      if (!this.enabled || this.hum) return;
      const context = this.ensure();
      if (!context) return;
      this.hum = context.createOscillator();
      this.humGain = context.createGain();
      this.hum.type = 'sawtooth';
      this.hum.frequency.value = 62;
      this.humGain.gain.value = 0.012;
      this.hum.connect(this.humGain).connect(context.destination);
      this.hum.start();
    }

    toggle() {
      if (this.enabled) this.stopHum();
      this.enabled = !this.enabled;
      safeWrite(CONFIG.soundKey, this.enabled ? '1' : '0');
      if (this.enabled) {
        this.ensure();
        if (state.mode === 'playing' && state.driving && !state.paused) this.setDriving(true);
      }
      renderSound();
    }
  }

  const sound = new SoundEngine();

  function safeRead(key, fallback = null) {
    try {
      const value = window.localStorage.getItem(key);
      return value === null ? fallback : value;
    } catch (_) {
      return fallback;
    }
  }

  function safeWrite(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch (_) {
      // Local storage is an enhancement, not a runtime requirement.
    }
  }

  function safeRemove(key) {
    try {
      window.localStorage.removeItem(key);
    } catch (_) {}
  }

  function saveGame() {
    if (state.mode !== 'playing') return;
    state.lastSave = Date.now();
    safeWrite(CONFIG.saveKey, JSON.stringify(state));
  }

  function readSave() {
    try {
      const raw = safeRead(CONFIG.saveKey);
      if (!raw) return null;
      const saved = JSON.parse(raw);
      if (!saved || saved.version !== CONFIG.version || saved.mode !== 'playing') return null;
      saved.driving = false;
      saved.paused = false;
      if (!Number.isFinite(saved.dayStartCash)) saved.dayStartCash = saved.cash - (saved.dayRevenue || 0);
      return saved;
    } catch (_) {
      return null;
    }
  }

  function buildWorld() {
    dom.cityStrip.replaceChildren();
    dom.streetFurniture.replaceChildren();
    buildings = [];
    trees = [];

    const labels = ['Mercado', 'Hotel', 'Banco', 'Oficinas', 'Café', 'Clínica', 'Taller', 'Terminal'];
    const colors = ['#557f8e', '#aa6f66', '#6777a7', '#6d9471', '#a2805b', '#826a9e'];

    for (let i = 0; i < 16; i += 1) {
      const building = document.createElement('div');
      building.className = 'building';
      const width = 120 + ((i * 37) % 95);
      const height = 150 + ((i * 71) % 150);
      const x = i * 250 + (i % 3) * 70;
      const z = -160 - (i % 4) * 65;
      building.style.setProperty('--w', `${width}px`);
      building.style.setProperty('--h', `${height}px`);
      building.style.setProperty('--z', `${z}px`);
      building.style.setProperty('--c', colors[i % colors.length]);
      building.innerHTML = `<div class="face front" data-label="${labels[i % labels.length]}"></div><div class="face side"></div><div class="face roof"></div>`;
      dom.cityStrip.appendChild(building);
      buildings.push({ element: building, x });
    }

    for (let i = 0; i < 18; i += 1) {
      const tree = document.createElement('div');
      tree.className = 'tree';
      const x = i * 220 + 100;
      dom.streetFurniture.appendChild(tree);
      trees.push({ element: tree, x });
    }
    renderWorld();
  }

  function renderWorld() {
    const width = Math.max(window.innerWidth, 900);
    const loop = Math.max(4200, width + 2500);
    const shift = state.world * 52;
    buildings.forEach(({ element, x }) => {
      const wrapped = ((x - shift + loop) % loop) - 260;
      element.style.setProperty('--x', `${wrapped}px`);
    });
    trees.forEach(({ element, x }) => {
      const wrapped = ((x - shift * 1.18 + loop) % loop) - 140;
      element.style.setProperty('--x', `${wrapped}px`);
    });
    dom.laneMarks.style.setProperty('--road-shift', `${-(state.world * 88) % 235}px`);
  }

  function currentWeather() {
    return WEATHER.find((weather) => weather.id === state.weather) || WEATHER[0];
  }

  function trafficFactor() {
    const minute = state.minute;
    const rush = (minute >= 7 * 60 + 30 && minute <= 9 * 60) || (minute >= 16 * 60 + 30 && minute <= 18 * 60);
    return rush ? 0.76 : 1;
  }

  function generateOffer() {
    const destination = weightedDestination();
    const weather = currentWeather();
    const distance = Number(random(destination.min, destination.max).toFixed(1));
    const premium = random(0.92, 1.25);
    const rushBonus = trafficFactor() < 1 ? 1.12 : 1;
    const fare = Math.round(distance * destination.rate * premium * weather.fare * rushBonus / 5) * 5;
    const tier = distance < 3.5 ? 'low' : distance < 6.5 ? 'mid' : 'high';
    const deadline = state.minute + Math.ceil(distance * 6.5 + 18);
    return {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      passenger: choose(PASSENGERS),
      destination: destination.name,
      distance,
      fare,
      tier,
      deadline,
      expiresAt: state.minute + Math.floor(random(22, 40)),
      skin: choose(['#8a5e43', '#b37c58', '#d8a67b', '#6d4938']),
      coat: choose(['#c65b55', '#527aa2', '#4f8c6a', '#9b6ca4', '#d18b43'])
    };
  }

  function maybeSpawnOffer() {
    if (state.trip || state.offers.length >= 3 || state.minute < state.nextOfferMinute) return;
    state.offers.push(generateOffer());
    state.nextOfferMinute = state.minute + Math.floor(random(7, 14));
    renderOffers();
  }

  function expireOffers() {
    const before = state.offers.length;
    state.offers = state.offers.filter((offer) => offer.expiresAt > state.minute);
    if (state.offers.length !== before) renderOffers();
  }

  function pickOffer(offer) {
    sound.ensure();
    if (state.mode !== 'playing' || state.paused) return;
    if (state.driving) {
      toast('Stop first', 'Passengers only board a stopped taxi.');
      sound.cue('error');
      return;
    }
    if (state.trip) {
      toast('Taxi occupied', 'Finish the current fare first.');
      sound.cue('error');
      return;
    }
    state.trip = {
      passenger: offer.passenger,
      destination: offer.destination,
      distance: offer.distance,
      progress: 0,
      fare: offer.fare,
      deadline: offer.deadline,
      startedAt: state.minute,
      arrived: false,
      tier: offer.tier
    };
    state.offers = [];
    state.nextOfferMinute = state.minute + 5;
    sound.cue('pickup');
    toast('Passenger aboard', `${offer.passenger} is headed to ${offer.destination}.`);
    saveGame();
    render();
  }

  function bestOffer() {
    if (!state.offers.length) return null;
    return [...state.offers].sort((a, b) => (b.fare / b.distance) - (a.fare / a.distance))[0];
  }

  function toggleDrive() {
    sound.ensure();
    if (state.mode !== 'playing' || state.paused) return;
    if (state.trip?.arrived) {
      toast('At destination', 'Drop off the passenger before driving again.');
      sound.cue('error');
      return;
    }
    if (state.fuel <= 0.5) {
      handleFuelEmergency();
      return;
    }
    state.driving = !state.driving;
    sound.setDriving(state.driving);
    saveGame();
    render();
  }

  function primaryAction() {
    sound.ensure();
    if (state.mode !== 'playing' || state.paused) return;
    if (state.trip?.arrived) {
      completeTrip();
      return;
    }
    if (!state.trip) {
      const offer = bestOffer();
      if (offer) pickOffer(offer);
      else {
        toast('No fare yet', 'Keep an eye on the sidewalk.');
        sound.cue('error');
      }
    }
  }

  function completeTrip() {
    if (!state.trip?.arrived) return;
    const trip = state.trip;
    const lateMinutes = Math.max(0, state.minute - trip.deadline);
    const lateFactor = clamp(1 - lateMinutes / 90, 0.62, 1);
    const tipChance = clamp(0.08 + state.rating * 0.035 + state.energy * 0.001, 0.08, 0.38);
    const tip = Math.random() < tipChance ? Math.round(trip.fare * random(0.08, 0.24) / 5) * 5 : 0;
    const payout = Math.max(25, Math.round(trip.fare * lateFactor / 5) * 5) + tip;
    const ratingDelta = lateMinutes === 0 ? 0.08 : lateMinutes < 15 ? 0.02 : -0.13;

    state.cash += payout;
    state.dayRevenue += payout;
    state.rating = clamp(state.rating + ratingDelta, 0, 5);
    state.streak = lateMinutes < 15 ? state.streak + 1 : 0;
    state.totalFares += 1;
    state.dayFares += 1;
    state.score += payout + Math.round(state.rating * 12) + state.streak * 6;
    state.trip = null;
    state.nextOfferMinute = state.minute + 3;

    sound.cue('cash');
    toast(`${money(payout)} collected`, tip ? `Includes a ${money(tip)} tip.` : lateMinutes ? `${lateMinutes} minutes late.` : 'Clean, on-time fare.');
    maybeStreetEvent();
    saveGame();
    render();
    checkEndOfDay();
  }

  function maybeStreetEvent() {
    if (Math.random() > 0.22) return;
    const event = Math.floor(Math.random() * 4);
    if (event === 0) {
      state.cash += 25;
      state.score += 20;
      toast('Dispatch bonus', 'A repeat customer adds L 25.');
    } else if (event === 1 && state.cash >= 20) {
      state.cash -= 20;
      toast('Road toll', 'A detour costs L 20.');
    } else if (event === 2) {
      state.rating = clamp(state.rating + 0.06, 0, 5);
      toast('Good review', 'The passenger leaves a five-star note.');
    } else {
      state.energy = clamp(state.energy + 6, 0, 100);
      toast('Easy stretch', 'A quiet route gives you a little energy back.');
    }
  }

  function service(kind) {
    sound.ensure();
    if (state.mode !== 'playing' || state.paused) return;
    if (state.driving) {
      toast('Stop to use services', 'Pull over before refueling or eating.');
      sound.cue('error');
      return;
    }
    if (kind === 'refuel') {
      if (state.cash < CONFIG.refuelCost || state.fuel >= 99) {
        sound.cue('error');
        return;
      }
      state.cash -= CONFIG.refuelCost;
      state.fuel = clamp(state.fuel + CONFIG.refuelAmount, 0, 100);
      state.minute += 12;
      toast('Refueled', `+${CONFIG.refuelAmount}% fuel for ${money(CONFIG.refuelCost)}.`);
    } else if (kind === 'eat') {
      if (state.meals < 1 || state.energy >= 98) {
        sound.cue('error');
        return;
      }
      state.meals -= 1;
      state.energy = clamp(state.energy + 30, 0, 100);
      state.minute += 18;
      toast('Meal break', '+30 energy. The clock keeps moving.');
    } else if (kind === 'buy') {
      if (state.cash < CONFIG.mealCost || state.meals >= 5) {
        sound.cue('error');
        return;
      }
      state.cash -= CONFIG.mealCost;
      state.meals += 1;
      state.minute += 8;
      toast('Meal stocked', `One meal added for ${money(CONFIG.mealCost)}.`);
    }
    sound.cue('service');
    saveGame();
    checkFailure();
    checkEndOfDay();
    render();
  }

  function handleFuelEmergency() {
    state.driving = false;
    sound.setDriving(false);
    if (state.cash >= 120) {
      state.cash -= 120;
      state.fuel = 18;
      state.minute += 25;
      state.rating = clamp(state.rating - 0.08, 0, 5);
      toast('Emergency fuel', 'Roadside assistance costs L 120 and 25 minutes.');
      sound.cue('error');
      render();
      saveGame();
    } else {
      endGame('Stranded', 'The taxi ran dry and there is not enough cash for roadside fuel.');
    }
  }

  function tick() {
    if (state.mode !== 'playing' || state.paused) return;
    state.minute += CONFIG.minutesPerTick;

    if (state.driving) {
      const weather = currentWeather();
      const traffic = trafficFactor();
      const speed = 0.38 * weather.speed * traffic;
      state.world += 0.115 * weather.speed;
      state.fuel = clamp(state.fuel - 0.45 * weather.fuel, 0, 100);
      state.energy = clamp(state.energy - 0.2 * weather.energy, 0, 100);

      if (state.trip && !state.trip.arrived) {
        state.trip.progress = Math.min(state.trip.distance, state.trip.progress + speed);
        if (state.trip.progress >= state.trip.distance) arriveAtDestination();
      }
    } else {
      state.energy = clamp(state.energy - 0.012 * currentWeather().energy, 0, 100);
    }

    maybeSpawnOffer();
    expireOffers();
    checkNightVisual();
    checkFailure();
    checkEndOfDay();
    render();
    if (state.minute % 10 === 0) saveGame();
  }

  function arriveAtDestination() {
    if (!state.trip) return;
    state.trip.arrived = true;
    state.trip.progress = state.trip.distance;
    state.driving = false;
    sound.setDriving(false);
    sound.cue('arrive');
    toast('Destination reached', `Drop off ${state.trip.passenger} to collect the fare.`);
  }

  function checkFailure() {
    if (state.mode !== 'playing') return;
    if (state.fuel <= 0 && state.driving) {
      handleFuelEmergency();
      return;
    }
    if (state.energy <= 0) {
      endGame('Shift exhausted', 'You pushed through without enough rest or food.');
    } else if (state.rating <= 0.5) {
      endGame('License suspended', 'Your passenger rating fell too low to keep receiving fares.');
    } else if (state.cash < -100) {
      endGame('Out of business', 'Operating costs exceeded the cash available to keep the taxi running.');
    }
  }

  function checkEndOfDay() {
    if (state.mode !== 'playing') return;
    if (state.minute >= CONFIG.closeMinute && !state.trip) finishDay();
  }

  function finishDay() {
    if (state.mode !== 'playing') return;
    state.mode = 'summary';
    state.driving = false;
    sound.setDriving(false);

    state.cash -= CONFIG.nightlyCost;
    let mealNote = 'Dinner restored your energy';
    if (state.meals > 0) {
      state.meals -= 1;
      state.energy = 92;
    } else {
      state.energy = 58;
      state.rating = clamp(state.rating - 0.12, 0, 5);
      mealNote = 'No meal — energy and rating were penalized';
    }

    const profit = state.cash - state.dayStartCash;
    const body = `
      <p>Shift ${state.day} is closed. Operating costs are deducted every night, so revenue alone is not enough — keep enough cash for tomorrow.</p>
      <div class="summary-grid">
        <div><span>Fares</span><strong>${state.dayFares}</strong></div>
        <div><span>Revenue</span><strong>${money(state.dayRevenue)}</strong></div>
        <div><span>Night cost</span><strong>−${money(CONFIG.nightlyCost)}</strong></div>
        <div><span>Cash</span><strong>${money(state.cash)}</strong></div>
        <div><span>Rating</span><strong>${state.rating.toFixed(1)} ★</strong></div>
        <div><span>Streak</span><strong>${state.streak}</strong></div>
      </div>
      <p>${mealNote}. Net shift result including service purchases and nightly cost: <strong>${money(profit)}</strong>.</p>`;

    sound.cue('day');

    if (state.cash < -100) {
      endGame('Out of business', 'Nightly operating costs pushed the taxi beyond its available credit.');
      return;
    }
    if (state.rating <= 0.5) {
      endGame('License suspended', 'Your end-of-day passenger rating fell below the level required to receive new fares.');
      return;
    }

    if (state.day >= CONFIG.days) {
      finishCampaign(body);
      return;
    }

    showModal(`Day ${state.day} complete`, 'Shift closed', body, [
      { label: 'Start next day', primary: true, action: startNextDay }
    ]);
  }

  function startNextDay() {
    hideModal();
    state.day += 1;
    state.minute = CONFIG.startMinute;
    state.dayRevenue = 0;
    state.dayFares = 0;
    state.dayStartCash = state.cash;
    state.offers = [];
    state.trip = null;
    state.nextOfferMinute = CONFIG.startMinute + 3;
    state.weather = weatherForDay(state.day).id;
    state.mode = 'playing';
    state.paused = false;
    state.world += 1.5;
    toast(`Day ${state.day}`, `${currentWeather().description}. Dispatch opens at 07:00.`);
    saveGame();
    render();
  }

  function finishCampaign(summaryBody) {
    state.mode = 'ended';
    const reachedTarget = state.cash >= CONFIG.targetCash;
    const previousHigh = Number(safeRead(CONFIG.highScoreKey, '0')) || 0;
    const finalScore = Math.max(0, Math.round(state.score + state.cash + state.rating * 100));
    if (finalScore > previousHigh) safeWrite(CONFIG.highScoreKey, String(finalScore));
    safeRemove(CONFIG.saveKey);

    const result = reachedTarget
      ? `<p>You cleared the ${money(CONFIG.targetCash)} target and finished the week as an independent driver.</p>`
      : `<p>You completed the week, but finished below the ${money(CONFIG.targetCash)} target. A tighter fare mix and fewer empty kilometers can close the gap.</p>`;

    showModal('Five-day week complete', reachedTarget ? 'You made it' : 'Week complete', `${result}${summaryBody}<div class="summary-grid"><div><span>Final score</span><strong>${finalScore.toLocaleString('en-US')}</strong></div><div><span>Best score</span><strong>${Math.max(previousHigh, finalScore).toLocaleString('en-US')}</strong></div></div>`, [
      { label: 'Play another week', primary: true, action: startNewGame }
    ]);
    render();
  }

  function endGame(title, message) {
    if (state.mode === 'ended') return;
    state.mode = 'ended';
    state.driving = false;
    sound.setDriving(false);
    const finalScore = Math.max(0, Math.round(state.score + Math.max(0, state.cash)));
    const previousHigh = Number(safeRead(CONFIG.highScoreKey, '0')) || 0;
    if (finalScore > previousHigh) safeWrite(CONFIG.highScoreKey, String(finalScore));
    safeRemove(CONFIG.saveKey);
    showModal('Shift over', title, `<p>${message}</p><div class="summary-grid"><div><span>Day reached</span><strong>${state.day}</strong></div><div><span>Fares</span><strong>${state.totalFares}</strong></div><div><span>Cash</span><strong>${money(state.cash)}</strong></div><div><span>Score</span><strong>${finalScore.toLocaleString('en-US')}</strong></div></div>`, [
      { label: 'Try again', primary: true, action: startNewGame }
    ]);
    render();
  }

  function checkNightVisual() {
    document.body.classList.toggle('weather-night', state.minute >= 18 * 60 + 15);
  }

  function render() {
    const weather = currentWeather();
    dom.dayValue.textContent = `${state.day} / ${CONFIG.days}`;
    dom.timeValue.textContent = formatTime(state.minute);
    dom.cashValue.textContent = money(state.cash);
    dom.fuelValue.textContent = `${Math.round(state.fuel)}%`;
    dom.fuelBar.style.width = `${state.fuel}%`;
    dom.fuelBar.style.background = state.fuel < 22 ? 'var(--red)' : state.fuel < 45 ? 'var(--orange)' : 'var(--green)';
    dom.energyValue.textContent = `${Math.round(state.energy)}%`;
    dom.energyBar.style.width = `${state.energy}%`;
    dom.energyBar.style.background = state.energy < 22 ? 'var(--red)' : state.energy < 45 ? 'var(--orange)' : 'var(--green)';
    dom.mealValue.textContent = String(state.meals);
    dom.ratingValue.textContent = `${state.rating.toFixed(1)} ★`;
    dom.weatherValue.textContent = `${weather.description}${trafficFactor() < 1 ? ' · rush hour' : ''}`;
    dom.goalValue.textContent = money(CONFIG.targetCash);
    dom.goalBar.value = clamp((state.cash / CONFIG.targetCash) * 100, 0, 100);
    dom.goalCopy.textContent = `Five shifts. ${state.totalFares} fares completed · score ${Math.round(state.score).toLocaleString('en-US')}.`;

    document.body.classList.toggle('weather-rain', weather.id === 'rain');
    document.body.classList.toggle('weather-heat', weather.id === 'heat');
    document.body.classList.toggle('is-paused', state.paused && state.mode === 'playing');
    checkNightVisual();

    dom.taxi.classList.toggle('is-driving', state.driving);
    dom.statusChip.textContent = state.paused ? 'Paused' : state.trip?.arrived ? 'At destination' : state.driving ? 'Driving' : 'Stopped';
    dom.statusChip.style.color = state.trip?.arrived ? 'var(--yellow)' : state.driving ? 'var(--cyan)' : 'var(--green)';
    dom.driveLabel.textContent = state.driving ? 'Stop' : 'Drive';
    dom.driveButton.disabled = state.mode !== 'playing' || state.paused || Boolean(state.trip?.arrived);

    if (state.trip) {
      const trip = state.trip;
      const remaining = Math.max(0, trip.distance - trip.progress);
      const percent = trip.distance ? clamp((trip.progress / trip.distance) * 100, 0, 100) : 0;
      dom.tripEmpty.hidden = true;
      dom.tripActive.hidden = false;
      dom.tripPassenger.textContent = trip.passenger;
      dom.tripDestination.textContent = trip.destination;
      dom.tripFare.textContent = `${money(trip.fare)} fare`;
      dom.tripProgress.value = percent;
      dom.tripDistance.textContent = trip.arrived ? 'Destination reached' : `${remaining.toFixed(1)} km left`;
      const late = state.minute - trip.deadline;
      dom.tripPatience.textContent = late > 0 ? `${late} min late` : `${Math.max(0, trip.deadline - state.minute)} min buffer`;
      dom.dispatchTitle.textContent = trip.arrived ? 'Ready to drop off' : `To ${trip.destination}`;
      dom.actionLabel.textContent = trip.arrived ? 'Drop off' : 'Passenger aboard';
      dom.actionButton.disabled = !trip.arrived || state.paused;
      dom.destinationMarker.classList.toggle('is-visible', trip.arrived || percent > 78);
      dom.sceneTitle.textContent = trip.arrived ? 'You are here' : state.driving ? 'Make the fare count' : 'Passenger aboard';
      dom.sceneMessage.textContent = trip.arrived
        ? `Drop off ${trip.passenger} to collect ${money(trip.fare)} plus any tip.`
        : state.driving
          ? `${trip.destination} is ${remaining.toFixed(1)} km away. Fuel and energy drain while the taxi moves.`
          : `Drive toward ${trip.destination}. Stopping pauses distance, but not the shift clock.`;
    } else {
      dom.tripEmpty.hidden = false;
      dom.tripActive.hidden = true;
      dom.tripProgress.value = 0;
      dom.destinationMarker.classList.remove('is-visible');
      dom.dispatchTitle.textContent = state.offers.length ? `${state.offers.length} fare${state.offers.length > 1 ? 's' : ''} waiting` : 'Looking for fares';
      dom.actionLabel.textContent = state.offers.length ? 'Pick best fare' : 'Pick a fare';
      dom.actionButton.disabled = state.offers.length === 0 || state.driving || state.paused;
      dom.sceneTitle.textContent = state.driving ? 'Scan the curb' : state.offers.length ? 'Choose your next fare' : 'Start your shift';
      dom.sceneMessage.textContent = state.driving
        ? 'Empty kilometers cost fuel. Stop when a worthwhile passenger appears.'
        : state.offers.length
          ? 'Click a passenger card, or press Enter to take the best cash-per-kilometer offer.'
          : 'Fares arrive throughout the day. Balance revenue against fuel, energy, meals and closing time.';
    }

    dom.refuelButton.disabled = state.mode !== 'playing' || state.paused || state.driving || state.cash < CONFIG.refuelCost || state.fuel >= 99;
    dom.mealButton.disabled = state.mode !== 'playing' || state.paused || state.driving || state.meals < 1 || state.energy >= 98;
    dom.buyMealButton.disabled = state.mode !== 'playing' || state.paused || state.driving || state.cash < CONFIG.mealCost || state.meals >= 5;
    dom.pauseButton.disabled = state.mode !== 'playing';
    dom.helpButton.disabled = state.mode !== 'playing';
    dom.pauseButton.setAttribute('aria-pressed', String(state.paused));
    dom.pauseButton.textContent = state.paused ? 'Resume' : 'Pause';
    dom.serviceSign.textContent = state.minute >= CONFIG.closeMinute - 60 ? 'LAST HOUR' : trafficFactor() < 1 ? 'RUSH HOUR' : 'OPEN STREET';

    renderOffers();
    renderWorld();
    renderSound();
  }

  function renderOffers() {
    dom.passengerLane.replaceChildren();
    if (state.trip) return;
    const positions = state.offers.length === 1 ? [56] : state.offers.length === 2 ? [37, 67] : [27, 52, 75];
    state.offers.forEach((offer, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `fare fare-${offer.tier}`;
      button.style.left = `${positions[index] || 50}%`;
      button.style.setProperty('--skin', offer.skin);
      button.style.setProperty('--coat', offer.coat);
      button.setAttribute('aria-label', `${offer.passenger} to ${offer.destination}, ${offer.distance.toFixed(1)} kilometers, fare ${money(offer.fare)}`);
      button.innerHTML = `<span class="fare-person"></span><span class="fare-card"><strong>${offer.destination}</strong><span><em>${offer.distance.toFixed(1)} km</em><b>${money(offer.fare)}</b></span></span>`;
      button.addEventListener('click', () => pickOffer(offer));
      dom.passengerLane.appendChild(button);
    });
  }

  function renderSound() {
    dom.soundButton.textContent = sound.enabled ? 'Sound' : 'Muted';
    dom.soundButton.setAttribute('aria-pressed', String(!sound.enabled));
  }

  function toast(title, message) {
    const item = document.createElement('div');
    item.className = 'toast';
    item.innerHTML = `<strong>${title}</strong><span>${message}</span>`;
    dom.toastStack.appendChild(item);
    window.setTimeout(() => item.remove(), 3600);
  }

  function showModal(eyebrow, title, body, actions) {
    dom.modalEyebrow.textContent = eyebrow;
    dom.modalTitle.textContent = title;
    dom.modalBody.innerHTML = body;
    dom.modalActions.replaceChildren();
    actions.forEach((descriptor) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = descriptor.label;
      if (descriptor.primary) button.classList.add('primary');
      button.addEventListener('click', descriptor.action);
      dom.modalActions.appendChild(button);
    });
    if (!dom.modalDialog.open) dom.modalDialog.showModal();
    window.setTimeout(() => dom.modalActions.querySelector('button')?.focus(), 0);
  }

  function hideModal() {
    if (dom.modalDialog.open) dom.modalDialog.close();
    dom.game.focus({ preventScroll: true });
  }

  function closeHelpModal() {
    hideModal();
    if (resumeAfterHelp) {
      state.paused = false;
      sound.setDriving(state.driving);
    }
    resumeAfterHelp = false;
    render();
  }

  function openHelp() {
    if (state.mode !== 'playing') return;
    resumeAfterHelp = !state.paused;
    state.paused = true;
    sound.setDriving(false);
    render();
    showModal('How to play', 'Drive smart, not just fast', `
      <p><strong>TAXi</strong> is a five-day resource game. Passengers pay by distance, but empty driving still burns fuel and the clock never stops.</p>
      <ul>
        <li><strong>Choose fares:</strong> click a rider, or press Enter for the best cash-per-kilometer offer.</li>
        <li><strong>Drive / stop:</strong> Space toggles movement. Trips only advance while driving.</li>
        <li><strong>Drop off:</strong> when the destination marker appears, press Enter to collect the fare.</li>
        <li><strong>Manage resources:</strong> R refuels, E eats a stored meal, B buys a meal. Services cost time.</li>
        <li><strong>Protect rating:</strong> late fares reduce payout and rating; good service builds streaks and tips.</li>
        <li><strong>Win the week:</strong> finish day five with at least ${money(CONFIG.targetCash)} after nightly operating costs.</li>
      </ul>
      <p>Weather changes each day. Rain slows traffic but lifts fares; heat drains energy faster. Rush hour also slows trips.</p>`, [
      {
        label: 'Close',
        primary: true,
        action: closeHelpModal
      }
    ]);
  }

  function startNewGame() {
    hideModal();
    safeRemove(CONFIG.saveKey);
    state = newState();
    sound.ensure();
    toast('Dispatch open', 'Day 1 starts with clear streets. Watch the sidewalk for fares.');
    saveGame();
    render();
  }

  function continueGame(saved) {
    hideModal();
    state = saved;
    state.mode = 'playing';
    state.paused = false;
    sound.ensure();
    toast('Shift resumed', `Day ${state.day}, ${formatTime(state.minute)}.`);
    render();
  }

  function startMenu() {
    const saved = readSave();
    const best = Number(safeRead(CONFIG.highScoreKey, '0')) || 0;
    state.mode = 'menu';
    state.paused = true;
    render();
    const savedCopy = saved ? `<p>A saved shift is available from day ${saved.day} at ${formatTime(saved.minute)} with ${money(saved.cash)}.</p>` : '<p>No active shift is saved. A new five-day week starts at 07:00.</p>';
    const actions = [];
    if (saved) actions.push({ label: 'Continue shift', primary: true, action: () => continueGame(saved) });
    actions.push({ label: saved ? 'New week' : 'Start shift', primary: !saved, action: startNewGame });
    showModal('TAXi', 'Street Shift', `<p>A compact survival-management game inside a tiny CSS 3D city. Pick profitable fares, limit empty kilometers, manage resources and make it through five shifts.</p>${savedCopy}<div class="summary-grid"><div><span>Week target</span><strong>${money(CONFIG.targetCash)}</strong></div><div><span>Best score</span><strong>${best.toLocaleString('en-US')}</strong></div></div><p><strong>Quick controls:</strong> Space drives/stops, Enter chooses a fare or drops off, R refuels, E eats, B buys a meal, and H opens the full help while playing.</p>`, actions);
  }

  function togglePause() {
    if (state.mode !== 'playing') return;
    state.paused = !state.paused;
    if (state.paused) sound.setDriving(false);
    else sound.setDriving(state.driving);
    render();
    saveGame();
  }

  function bindEvents() {
    dom.driveButton.addEventListener('click', toggleDrive);
    dom.actionButton.addEventListener('click', primaryAction);
    dom.refuelButton.addEventListener('click', () => service('refuel'));
    dom.mealButton.addEventListener('click', () => service('eat'));
    dom.buyMealButton.addEventListener('click', () => service('buy'));
    dom.soundButton.addEventListener('click', () => sound.toggle());
    dom.pauseButton.addEventListener('click', togglePause);
    dom.helpButton.addEventListener('click', openHelp);

    dom.modalDialog.addEventListener('cancel', (event) => {
      event.preventDefault();
      if (state.mode === 'playing') closeHelpModal();
    });

    window.addEventListener('keydown', (event) => {
      if (event.repeat) return;
      const target = event.target;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return;
      if (dom.modalDialog.open) return;
      if (event.code === 'Space') {
        event.preventDefault();
        toggleDrive();
      } else if (event.key === 'Enter') {
        primaryAction();
      } else if (event.key.toLowerCase() === 'r') {
        service('refuel');
      } else if (event.key.toLowerCase() === 'e') {
        service('eat');
      } else if (event.key.toLowerCase() === 'b') {
        service('buy');
      } else if (event.key.toLowerCase() === 'm') {
        sound.toggle();
      } else if (event.key.toLowerCase() === 'p') {
        togglePause();
      } else if (event.key.toLowerCase() === 'h') {
        openHelp();
      }
    });

    window.addEventListener('resize', renderWorld, { passive: true });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && state.mode === 'playing' && !state.paused) {
        state.paused = true;
        sound.setDriving(false);
        render();
        saveGame();
      }
    });
  }

  buildWorld();
  bindEvents();
  renderSound();
  render();
  startMenu();
  window.setInterval(tick, CONFIG.tickMs);
})();