let balance = 10000;
let currentBet = 0;
let deck = [];
let playerHand = [];
let dealerHand = [];
let gameActive = false;
let dealerHidden = true;

let stats = {
    wins: 0,
    losses: 0,
    busts: 0,
    blackjacks: 0,
    pushes: 0,
    totalWon: 0,
    totalLost: 0
};

// Pending balance delta applied after toast dismiss or when Play Again is pressed
let pendingBalanceDelta = 0;
let _pendingBalanceApplied = false;

// Timer used to hide the slide-confirm after its slide-down transition completes
let _deleteHideTimer = null;

function loadGameData() {
    try {
        const savedBalance = localStorage.getItem('blackjack_balance');
        const savedStats = localStorage.getItem('blackjack_stats');
        
        if (savedBalance !== null) {
            balance = parseInt(savedBalance);
        }
        
        if (savedStats !== null) {
            stats = JSON.parse(savedStats);
        }
    } catch (e) {
        console.log('Could not load saved game data');
    }
}

function saveGameData() {
    try {
        localStorage.setItem('blackjack_balance', balance.toString());
        localStorage.setItem('blackjack_stats', JSON.stringify(stats));
    } catch (e) {
        console.log('Could not save game data');
    }
}

// Format numbers consistently for display (thousands separators)
function formatNumber(n) {
    if (n === null || n === undefined) return '';
    const num = Number(n);
    if (Number.isNaN(num)) return String(n);
    return num.toLocaleString();
}

const suits = [
    { symbol: 'spadeIcon', name: 'spade' },
    { symbol: 'heartIcon', name: 'heart' },
    { symbol: 'diamondIcon', name: 'diamond' },
    { symbol: 'clubIcon', name: 'club' }
];
const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

function createDeck() {
    deck = [];
    for (let suit of suits) {
        for (let rank of ranks) {
            deck.push({ 
                rank, 
                suitIcon: suit.symbol,
                suitName: suit.name,
                color: (suit.name === 'heart' || suit.name === 'diamond') ? 'red' : 'black' 
            });
        }
    }
    shuffleDeck();
}

function shuffleDeck() {
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
}

function drawCard() {
    return deck.pop();
}

function getCardValue(card) {
    if (card.rank === 'A') return 11;
    if (['J', 'Q', 'K'].includes(card.rank)) return 10;
    return parseInt(card.rank);
}

function calculateHandValue(hand) {
    let value = 0;
    let aces = 0;

    for (let card of hand) {
        value += getCardValue(card);
        if (card.rank === 'A') aces++;
    }

    while (value > 21 && aces > 0) {
        value -= 10;
        aces--;
    }

    return value;
}

function displayCards(hand, elementId, hideSecond = false) {
    const container = document.getElementById(elementId);
    container.innerHTML = '';

    if (hand.length === 0) {
        for (let i = 0; i < 2; i++) {
            const cardDiv = document.createElement('div');
            cardDiv.className = 'card hidden';
            cardDiv.innerHTML = '<div class="playingCard blankCard"></div>';
            container.appendChild(cardDiv);
        }
        return;
    }

    hand.forEach((card, index) => {
        const cardDiv = document.createElement('div');
        if (hideSecond && index === 1) {
            cardDiv.className = 'card hidden';
            cardDiv.innerHTML = '<div class="playingCard blankCard"></div>';
        } else {
            cardDiv.className = `card ${card.color}`;
            cardDiv.innerHTML = `<div class="playingCard inPlay"><p>${card.rank}</p><span class="${card.suitIcon}"></span></div>`;
        }
        container.appendChild(cardDiv);
    });

    if (container.scrollWidth > container.clientWidth) {
        container.scrollTo({
            left: container.scrollWidth,
            behavior: 'smooth'
        });
    }
}

function updateDisplay() {
    document.getElementById('balance').textContent = formatNumber(balance);
    document.getElementById('bet-modal-balance').textContent = formatNumber(balance);

    displayCards(dealerHand, 'dealer-cards', dealerHidden);
    displayCards(playerHand, 'player-cards');

    const playerValue = calculateHandValue(playerHand);
    document.getElementById('player-value').textContent = `${playerValue}`;

    if (dealerHidden && dealerHand.length > 0) {
        const visibleCard = dealerHand[0];
        const visibleValue = getCardValue(visibleCard);
    document.getElementById('dealer-value').textContent = `${visibleValue}`;
    } else if (dealerHand.length > 0) {
        const dealerValue = calculateHandValue(dealerHand);
    document.getElementById('dealer-value').textContent = `${dealerValue}`;
    } else {
        document.getElementById('dealer-value').textContent = '';
    }
}

function placeBet() {
    const betInput = document.getElementById('bet-modal-input');
    const bet = parseInt(betInput.value);

    if (bet < 100) {
        showToast('dealer-wins', `<span class="chipIcon"></span><p>The minimum bet is 100 chips!</p>`);
        return;
    }

    if (bet > balance) {
        showToast('dealer-wins', `<span class="skullIcon"></span><p>You don't have enough chips!</p>`);
        return;
    }

    const toast = document.getElementById('toast');
    toast.classList.remove('show');

    const betModal = document.getElementById('bet-modal');
    betModal.classList.add('closing');

    setTimeout(() => {
        betModal.classList.remove('active');
        betModal.classList.remove('closing');
    }, 500);

    document.getElementById('bet-modal').classList.remove('active');

    createDeck();

    balance -= bet;
    currentBet = bet;
    gameActive = true;
    dealerHidden = true;

    playerHand = [drawCard(), drawCard()];
    dealerHand = [drawCard(), drawCard()];

    // Ensure Play Again is disabled while a hand is active
    try {
        const playBtn = document.getElementById('playAgainButton');
        if (playBtn) {
            playBtn.disabled = true;
            try { playBtn.style.display = 'none'; } catch (e) {}
        }

        // Ensure the in-round action buttons are visible when a hand begins
        const inRoundBtns = document.querySelector('.playerActions .buttonContainer');
        if (inRoundBtns) inRoundBtns.style.display = '';
    } catch (e) {}

    updateDisplay();

    (async function loadRandomTip() {
        const tipEl = document.querySelector('.randomQuickTip');
        if (!tipEl) return;

        try {
            const res = await fetch('assets/scripts/tips.json', { cache: 'no-cache' });
            if (!res.ok) throw new Error('HTTP ' + res.status);
            const tips = await res.json();
            if (!Array.isArray(tips) || tips.length === 0) throw new Error('No tips in JSON');
            tipEl.innerHTML = tips[Math.floor(Math.random() * tips.length)];
        } catch (err) {
            console.warn('Could not load tips.', err);
        }
    })();

    const playerValue = calculateHandValue(playerHand);
    const dealerValue = calculateHandValue(dealerHand);
    
    const playerBlackjack = playerValue === 21 && playerHand.length === 2;
    const dealerBlackjack = dealerValue === 21 && dealerHand.length === 2;
    
    if (dealerBlackjack || playerBlackjack) {
        if (playerBlackjack) {
            stats.blackjacks++;
        }
        
        gameActive = false;
        
        setTimeout(() => {
            dealerHidden = false;
            updateDisplay();
            
            setTimeout(() => {
                if (dealerBlackjack && playerBlackjack) {
                    stats.pushes++;
                    updateStatsDisplay();
                    endGame('push', currentBet, '<span class="flagIcon"></span><p>Two natural blackjacks!? That is crazy.</p>');
                } else if (dealerBlackjack) {
                    stats.losses++;
                    stats.totalLost += currentBet;
                    updateStatsDisplay();
                    endGame('dealer-wins', 0, '<span class="heartBreakIcon"></span><p>Bummer! Dealer has a natural blackjack.</p>');
                } else {
                    const winAmount = currentBet + Math.floor(currentBet * 1.5);
                    stats.wins++;
                    stats.totalWon += Math.floor(currentBet * 1.5);
                    updateStatsDisplay();
                    endGame('victory', winAmount, '<span class="blackjackIcon"></span><p>A natural blackjack?! Big winner over here!</p>');
                }
            }, 500);
        }, 500);
        return;
    }

    document.getElementById('hitButton').disabled = false;
    document.getElementById('standButton').disabled = false;
    document.getElementById('doubleButton').disabled = false;
}

function hit() {
    if (!gameActive) return;

    playerHand.push(drawCard());
    updateDisplay();

    const playerValue = calculateHandValue(playerHand);
    if (playerValue > 21) {
        endGame('bust');
    } else if (playerValue === 21) {
        stand();
    }

    document.getElementById('doubleButton').disabled = true;
    
}

function stand() {
    if (!gameActive) return;

    dealerHidden = false;
    document.getElementById('hitButton').disabled = true;
    document.getElementById('standButton').disabled = true;
    document.getElementById('doubleButton').disabled = true;

    dealerPlay();
}

function doubleDown() {
    if (!gameActive || balance < currentBet) {
        showToast('dealer-wins', `<p>Insufficient Chips to double down!</p>`);
        return;
    }

    balance -= currentBet;
    currentBet *= 2;

    playerHand.push(drawCard());
    updateDisplay();

    const playerValue = calculateHandValue(playerHand);
    if (playerValue > 21) {
        endGame('bust');
    } else {
        stand();
    }
}

function split() {
    if (!gameActive || balance < currentBet) {
        showToast('dealer-wins', `<p>Insufficient Chips to split!</p>`);
        return;
    }

    if (playerHand[0].rank !== playerHand[1].rank) {
        showToast('dealer-wins', `<p>Can only split matching cards!</p>`);
        return;
    }

    balance -= currentBet;
    
    isSplit = true;
    splitHand = [playerHand.pop()];
    
    playerHand.push(drawCard());
    splitHand.push(drawCard());
    
    currentHandIndex = 0;
    
    updateDisplay();
    
    document.getElementById('split-btn').disabled = true;
    document.getElementById('split-btn').classList.remove('show');
    document.getElementById('doubleButton').disabled = true;
}

function dealerPlay() {
    updateDisplay();

    function dealerTurn() {
        const dealerValue = calculateHandValue(dealerHand);

        if (dealerValue < 17) {
            dealerHand.push(drawCard());
            updateDisplay();
            setTimeout(dealerTurn, 800);
        } else {
            determineWinner();
        }
    }

    setTimeout(dealerTurn, 800);
}

function determineWinner() {
    const dealerValue = calculateHandValue(dealerHand);
    const playerValue = calculateHandValue(playerHand);

    if (dealerValue > 21) {
        stats.wins++;
        stats.totalWon += currentBet;
        endGame('victory', currentBet * 2);
    } else if (playerValue > dealerValue) {
        const isBlackjack = playerHand.length === 2 && playerValue === 21;
        if (isBlackjack) {
            const winAmount = currentBet + Math.floor(currentBet * 1.5);
            stats.wins++;
            stats.totalWon += Math.floor(currentBet * 1.5);
            endGame('victory', winAmount, '<span class="blackjackIcon"></span><p>Natural Blackjack?! Big winner here!</p>');
        } else {
            stats.wins++;
            stats.totalWon += currentBet;
            endGame('victory', currentBet * 2);
        }
    } else if (playerValue === dealerValue) {
        stats.pushes++;
        endGame('push', currentBet);
    } else {
        stats.losses++;
        stats.totalLost += currentBet;
        endGame('dealer-wins');
    }

    updateStatsDisplay();
}

function endGame(outcome, winAmount = 0, extraMessage = '') {
    gameActive = false;
    // reset module-level pending delta and mark as not applied yet
    pendingBalanceDelta = 0;
    _pendingBalanceApplied = false;
    if (outcome === 'victory') {
        pendingBalanceDelta = winAmount;
        toastClass = 'victory';
        toastMessage = extraMessage || `<span class="trophyIcon"></span><p>Nice job! You won ${formatNumber(winAmount)} chips!</p>`;
    } else if (outcome === 'bust') {
        toastClass = 'bust';
        toastMessage = extraMessage || `<span class="bustIcon"></span><p>Oh no! You busted & lost ${formatNumber(currentBet)} chips.</p>`;
    } else if (outcome === 'dealer-wins') {
        if (winAmount > 0) {
            pendingBalanceDelta = winAmount;
        }
        toastClass = 'dealer-wins';
        toastMessage = extraMessage || `<span class="heartBreakIcon"></span><p>Tough luck! You lost ${formatNumber(currentBet - winAmount)} chips.</p>`;
    } else if (outcome === 'push') {
        pendingBalanceDelta = winAmount;
        toastClass = 'push';
        toastMessage = extraMessage || `<span class="flagIcon"></span>Push! You keep your ${formatNumber(currentBet)} chips!`;
    }
    // show the toast and immediately swap the UI so the player can inspect
    // the final hands and manually start the next round via Play Again.
    const duration = 2500;
    const playBtn = document.getElementById('playAgainButton');

    // If there's a pending balance change, apply it only after the toast is dismissed
    const onToastDismiss = () => {
        if (pendingBalanceDelta && pendingBalanceDelta !== 0 && !_pendingBalanceApplied) {
            const oldBalance = balance;
            balance += pendingBalanceDelta;
            // animate the visible balance so it counts up to the new total
            animateBalance(oldBalance, balance, 800, () => {
                // persist new balance and update stats display once animation finishes
                saveGameData();
                updateStatsDisplay();
                _pendingBalanceApplied = true;
                pendingBalanceDelta = 0;
            });
        }
    };

    _complexToast(toastClass, toastMessage, duration, onToastDismiss);

    if (playBtn) {
        // enable Play Again so the player can start a new round manually
        playBtn.disabled = false;
        try { playBtn.style.display = ''; } catch (e) {}
    }
    // Hide the in-round action buttons (Hit/Stand/Double) so player sees final hand
    try {
        const inRoundBtns = document.querySelector('.playerActions .buttonContainer');
        if (inRoundBtns) inRoundBtns.style.display = 'none';
    } catch (e) {}
}

// Smoothly animate the balance number from `fromVal` to `toVal` over `durationMs`.
function animateBalance(fromVal, toVal, durationMs = 800, onComplete) {
    const balanceEl = document.getElementById('balance');
    const statBalanceEl = document.getElementById('stat-balance');
    const betModalEl = document.getElementById('bet-modal-balance');

    const start = performance.now();
    const diff = toVal - fromVal;
    if (!balanceEl && !statBalanceEl && !betModalEl) return;

    function step(now) {
        const elapsed = Math.min(now - start, durationMs);
        const progress = elapsed / durationMs;
        const current = Math.round(fromVal + diff * progress);
        if (balanceEl) balanceEl.textContent = formatNumber(current);
        if (statBalanceEl) statBalanceEl.textContent = formatNumber(current);
        if (betModalEl) betModalEl.textContent = formatNumber(current);

        if (elapsed < durationMs) {
            requestAnimationFrame(step);
        } else {
            // ensure final value is exact
            if (balanceEl) balanceEl.textContent = formatNumber(toVal);
            if (statBalanceEl) statBalanceEl.textContent = formatNumber(toVal);
            if (betModalEl) betModalEl.textContent = formatNumber(toVal);
            if (typeof onComplete === 'function') {
                try { onComplete(); } catch (e) { console.warn('animateBalance onComplete failed', e); }
            }
        }
    }

    requestAnimationFrame(step);
}

function closeOutcome() {
    resetGame();
}

function resetGame() {
    playerHand = [];
    dealerHand = [];
    currentBet = 0;
    gameActive = false;
    dealerHidden = true;

    document.getElementById('hitButton').disabled = true;
    document.getElementById('standButton').disabled = true;
    document.getElementById('doubleButton').disabled = true;

    // Ensure Play Again is disabled when preparing for a new hand
    try {
        const playBtn = document.getElementById('playAgainButton');
        if (playBtn) playBtn.disabled = true;
    } catch (e) {}

    updateDisplay();

    if (balance < 100) {
        // Inform the player via toast and reset balance
        showToast('chips-added', `<span class="coinIcon"></span><p>You ran out of Chips! Resetting to 10,000.</p>`);
        balance = 10000;
        saveGameData();
        updateDisplay();
    }

    document.getElementById('bet-modal').classList.add('active');
    document.getElementById('bet-modal-input').value = 100;
}

// Called by the Play Again button once the player wants to start a new hand
function startNewHand() {
    // Dismiss any visible toast
    const toast = document.getElementById('toast');
    if (toast) toast.classList.remove('show');

    // Reset the UI and show the bet modal so the player can place a new bet
    resetGame();
    // If there's a pending balance change, apply it now since player chose to start a new hand
    try {
        if (pendingBalanceDelta && pendingBalanceDelta !== 0 && !_pendingBalanceApplied) {
            const oldBalance = balance;
            balance += pendingBalanceDelta;
            animateBalance(oldBalance, balance, 800, () => {
                saveGameData();
                updateStatsDisplay();
                _pendingBalanceApplied = true;
                pendingBalanceDelta = 0;
            });
        }
    } catch (e) {}
    // Hide Play Again and restore the in-round action buttons
    try {
        const playBtn = document.getElementById('playAgainButton');
        if (playBtn) {
            playBtn.disabled = true;
            try { playBtn.style.display = 'none'; } catch (e) {}
        }

        const inRoundBtns = document.querySelector('.playerActions .buttonContainer');
        if (inRoundBtns) inRoundBtns.style.display = '';
    } catch (e) {}
}

function updateStatsDisplay() {
    document.getElementById('stat-wins').textContent = formatNumber(stats.wins);
    document.getElementById('stat-losses').textContent = formatNumber(stats.losses);
    document.getElementById('stat-busts').textContent = formatNumber(stats.busts);
    document.getElementById('stat-blackjacks').textContent = formatNumber(stats.blackjacks);
    document.getElementById('stat-pushes').textContent = formatNumber(stats.pushes);
    document.getElementById('stat-won').textContent = formatNumber(stats.totalWon);
    document.getElementById('stat-lost').textContent = formatNumber(stats.totalLost);
    document.getElementById('stat-balance').textContent = formatNumber(balance);

    saveGameData();
}

function showStatsFromBet() {
    updateStatsDisplay();
    document.getElementById('stats-modal').classList.add('active');
}

function closeStats() {
    document.getElementById('stats-modal').classList.remove('active');
    // Also ensure the delete confirmation slide is closed and reset
    const el = document.getElementById('slide-confirm');
    if (!el) {
        if (typeof resetSlider === 'function') resetSlider();
        return;
    }

    // Clear any pending hide timer so we don't race
    if (_deleteHideTimer) {
        clearTimeout(_deleteHideTimer);
        _deleteHideTimer = null;
    }

    // Remove active so the SCSS transition can move it down
    el.classList.remove('active');

    // After the CSS transition completes (500ms), add the hidden marker and remove from layout
    _deleteHideTimer = setTimeout(() => {
        try { el.classList.add('hidden'); el.style.display = 'none'; } catch (e) {}
        _deleteHideTimer = null;
    }, 500);

    // Reset slider UI so it's not left half-dragged
    if (typeof resetSlider === 'function') resetSlider();
}

function showRulesFromBet() {
    document.getElementById('rules-modal').classList.add('active');
}

function showRules() {
    document.getElementById('rules-modal').classList.add('active');
}

function closeRules() {
    document.getElementById('rules-modal').classList.remove('active');
}


function showToast(toastClass, toastMessage, duration = 2500) {
    const toast = document.getElementById('toast');
    if (!toast) return;

    // reset
    toast.className = `toast ${toastClass}`;
    toast.innerHTML = toastMessage;
    toast.classList.add('show');

    // allow manual dismissal on click
    const handleClick = () => {
        toast.classList.remove('show');
        toast.removeEventListener('click', handleClick);
    };
    toast.addEventListener('click', handleClick);

    // auto hide — remove `show` to trigger CSS fade, then remove listener after transition
    setTimeout(() => {
        toast.classList.remove('show');
        // wait for the CSS transition to finish before cleaning up
        setTimeout(() => toast.removeEventListener('click', handleClick), 500);
    }, duration);
}

// Complex toast helper: supports swipe-to-dismiss and richer interactions used by endGame
function _complexToast(toastClass, toastMessage, duration = 2500, onDismiss) {
    const toast = document.getElementById('toast');
    if (!toast) return;

    toast.className = `toast ${toastClass}`;
    toast.innerHTML = toastMessage;

    // Add swipe and click functionality (kept from previous inline implementation)
    let startY = 0;
    let startX = 0;
    let currentY = 0;
    let isDragging = false;
    let autoHideTimeout;
    const TRANSITION_MS = 500;
    let _dismissCalled = false;

    function _cleanupListeners() {
        try {
            toast.removeEventListener('touchstart', handleTouchStart);
            toast.removeEventListener('touchmove', handleTouchMove);
            toast.removeEventListener('touchend', handleTouchEnd);
            toast.removeEventListener('mousedown', handleMouseDown);
            toast.removeEventListener('mousemove', handleMouseMove);
            toast.removeEventListener('mouseup', handleMouseUp);
            toast.removeEventListener('click', handleClick);
        } catch (e) {}
    toast.style.transform = '';
        clearTimeout(autoHideTimeout);
    }

    const dismissToast = () => {
        // remove the visible class to trigger CSS fade
        toast.classList.remove('show');
        // call onDismiss once (before cleanup) so callers can react to dismissal
        try {
            if (typeof onDismiss === 'function' && !_dismissCalled) {
                _dismissCalled = true;
                try { onDismiss(); } catch (e) { console.warn('onDismiss handler failed', e); }
            }
        } catch (e) {}
        // after the CSS transition completes, cleanup listeners and inline styles
        setTimeout(_cleanupListeners, TRANSITION_MS);
    };

    const handleClick = (e) => {
        if (!isDragging) {
            toast.classList.remove('swiping');
            // trigger slide-up & cleanup
            dismissToast();
        }
    };

    const handleTouchStart = (e) => {
        startY = e.touches[0].clientY;
        startX = e.touches[0].clientX;
        currentY = startY;
        isDragging = false;
    };

    const handleTouchMove = (e) => {
        currentY = e.touches[0].clientY;
        const deltaY = currentY - startY;
        const deltaX = Math.abs(e.touches[0].clientX - startX);
        if (Math.abs(deltaY) > 5 || deltaX > 5) {
            isDragging = true;
            toast.classList.add('swiping');
        }
        if (deltaY < 0 && isDragging) {
            e.preventDefault();
            toast.style.transform = `translateX(0) translateY(${deltaY}px)`;
        }
    };

    const handleTouchEnd = () => {
        toast.classList.remove('swiping');
        const deltaY = currentY - startY;
            if (deltaY < -50) {
                toast.style.transform = 'translateX(0) translateY(-100px)';
                // trigger slide-up & cleanup
                dismissToast();
            } else {
                toast.style.transform = 'translateX(0) translateY(0)';
            }
    };

    const handleMouseDown = (e) => {
        startY = e.clientY;
        currentY = startY;
        isDragging = false;
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };

    const handleMouseMove = (e) => {
        currentY = e.clientY;
        const deltaY = currentY - startY;
        if (Math.abs(deltaY) > 5) {
            isDragging = true;
            toast.classList.add('swiping');
        }
        if (deltaY < 0 && isDragging) {
            toast.style.transform = `translateX(0) translateY(${deltaY}px)`;
        }
    };

    const handleMouseUp = () => {
        toast.classList.remove('swiping');
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        const deltaY = currentY - startY;
            if (deltaY < -50) {
                toast.style.transform = 'translateX(0) translateY(-100px)';
                // trigger slide-up & cleanup
                dismissToast();
            } else {
                toast.style.transform = 'translateX(0) translateY(0)';
            }
    };

    toast.addEventListener('touchstart', handleTouchStart, { passive: false });
    toast.addEventListener('touchmove', handleTouchMove, { passive: false });
    toast.addEventListener('touchend', handleTouchEnd);
    toast.addEventListener('mousedown', handleMouseDown);
    toast.addEventListener('click', handleClick);

    // show and auto-hide
    setTimeout(() => toast.classList.add('show'), 100);
    autoHideTimeout = setTimeout(() => {
        dismissToast();
    }, duration);
}

// Add chips helper — increases player's balance by a fixed amount (default 10,000)
// Restrictions:
// - max 10 clicks per 15 minutes (tracked in localStorage)
// - cannot add if balance is over 100,000
function getAddChipsTimestamps() {
    try {
        const raw = localStorage.getItem('add_chips_timestamps');
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        // ensure numeric timestamps
        return parsed.map(Number).filter(n => !Number.isNaN(n)).sort((a,b)=>a-b);
    } catch (e) {
        return [];
    }
}

function saveAddChipsTimestamps(arr) {
    try {
        localStorage.setItem('add_chips_timestamps', JSON.stringify(arr));
    } catch (e) {
        // ignore
    }
}

// Toast coalescing for add-chips: accumulate fast clicks and show single aggregated toast
let _addChipsToastPending = 0;
let _addChipsToastTimer = null;
const ADD_CHIPS_TOAST_DEBOUNCE = 800; // ms to wait for more clicks before showing toast

function _scheduleAddChipsToast(amount) {
    _addChipsToastPending += amount;
    if (_addChipsToastTimer) {
        clearTimeout(_addChipsToastTimer);
    }
    _addChipsToastTimer = setTimeout(() => {
        showToast('chips-added', `<span class="moneyHandsIcon"></span><p>Added ${_addChipsToastPending.toLocaleString()} chips!</p>`);
        _addChipsToastPending = 0;
        _addChipsToastTimer = null;
    }, ADD_CHIPS_TOAST_DEBOUNCE);
}

function addChips(amount = 10000) {
    const MAX_BALANCE = 100000; // user-specified cap
    const LIMIT_COUNT = 10;
    const LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

    // If balance is over cap, show toast and refuse
    if (balance > MAX_BALANCE) {
        showToast('dealer-wins', `<span class="skullIcon"></span><p>Sorry, you have over ${MAX_BALANCE.toLocaleString()} chips.</p>`);
        return;
    }

    const now = Date.now();
    let stamps = getAddChipsTimestamps();
    // only keep timestamps within the window
    stamps = stamps.filter(ts => (now - ts) <= LIMIT_WINDOW_MS);

    if (stamps.length >= LIMIT_COUNT) {
        // compute time until next available slot
        const oldestAllowed = stamps[0] + LIMIT_WINDOW_MS;
        const msLeft = Math.max(0, oldestAllowed - now);
        const minutesLeft = Math.ceil(msLeft / 60000);
        showToast('dealer-wins', `<span class="clockIcon"></span><p>Take a break. Try again in ${minutesLeft} minute${minutesLeft !== 1 ? 's' : ''}.</p>`);
        return;
    }

    // record this click
    stamps.push(now);
    // keep sorted and save
    stamps.sort((a,b)=>a-b);
    saveAddChipsTimestamps(stamps);

    // perform add immediately
    balance += amount;
    saveGameData();
    updateDisplay();
    updateStatsDisplay();

    // schedule a coalesced toast rather than showing immediately
    _scheduleAddChipsToast(amount);
}

// Attach to any element(s) intended to add chips (header and modal).
// Use a shared class `add-chips` (replaces prior duplicate IDs) so both receive the handler.
const addChipsEls = document.querySelectorAll('.add-chips');
if (addChipsEls && addChipsEls.length) {
    addChipsEls.forEach(el => el.addEventListener('click', () => addChips(10000)));
}

/* ===== DELETE PLAYER DATA FUNCTIONS - START ===== */
function showDeleteConfirm() {
    const el = document.getElementById('slide-confirm');
    if (!el) return;
    // If there's a pending hide timeout, cancel it so we stay visible
    if (_deleteHideTimer) {
        clearTimeout(_deleteHideTimer);
        _deleteHideTimer = null;
    }

    // Ensure it's rendered in the layout so the slide animation can run
    el.style.display = 'grid';
    // Remove hidden marker and force a reflow so the transition starts from the correct position
    el.classList.remove('hidden');
    // Force reflow
    // eslint-disable-next-line no-unused-expressions
    el.offsetHeight;
    // Add active to trigger the slide-up transition defined in SCSS
    el.classList.add('active');
}

function cancelDelete() {
    const el = document.getElementById('slide-confirm');
    if (!el) {
        resetSlider();
        return;
    }


    // Remove active so the SCSS transition can move it down
    el.classList.remove('active');
    // Do NOT add the .hidden class immediately — wait until the transition finishes

    // Clear any previous timer
    if (_deleteHideTimer) {
        clearTimeout(_deleteHideTimer);
        _deleteHideTimer = null;
    }

    // After the CSS transition completes (500ms), add the hidden marker and remove from layout
    _deleteHideTimer = setTimeout(() => {
        try { el.classList.add('hidden'); el.style.display = 'none'; } catch (e) {}
        _deleteHideTimer = null;
    }, 500);

    resetSlider();
}

function resetSlider() {
    const button = document.getElementById('slide-button');
    const fill = document.getElementById('slide-fill');
    button.style.left = '0';
    fill.style.width = '0%';
    document.getElementById('slide-text').style.opacity = '1';
}

function deleteAllData() {
    // Show deleting modal
    const deletingModal = document.getElementById('deleting-modal');
    const deletingText = document.getElementById('deleting-text');
    const deletingSpinner = document.getElementById('deleting-spinner');
    
    deletingModal.classList.add('active');
    
    // Simulate deletion process
    setTimeout(() => {
        // Clear localStorage
        localStorage.removeItem('blackjack_balance');
        localStorage.removeItem('blackjack_stats');
        
        // Reset all game data
        balance = 10000;
        stats = {
            wins: 0,
            losses: 0,
            busts: 0,
            blackjacks: 0,
            pushes: 0,
            totalWon: 0,
            totalLost: 0
        };
        
        // Update display
        updateDisplay();
        updateStatsDisplay();
        
        // Show success
        deletingSpinner.style.display = 'none';
        deletingText.innerHTML = '<div class="delete-success">✓</div><div style="color: white; margin-top: 10px;">Data Deleted Successfully</div>';
        
        // Hide modal and reset after delay
        setTimeout(() => {
            deletingModal.classList.remove('active');
            deletingSpinner.style.display = 'block';
            deletingText.innerHTML = 'Deleting player data...';
            document.getElementById('slide-confirm').classList.remove('active');
            resetSlider();
        }, 1500);
    }, 1500);
}

// Slide to delete functionality
(function() {
    let isDragging = false;
    let startX = 0;
    let currentX = 0;
    let buttonStartLeft = 0;

    const button = document.getElementById('slide-button');
    const fill = document.getElementById('slide-fill');
    const track = document.querySelector('.slide-track');
    const slideText = document.getElementById('slide-text');

    function handleStart(e) {
        isDragging = true;
        startX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
        const buttonRect = button.getBoundingClientRect();
        buttonStartLeft = buttonRect.left - track.getBoundingClientRect().left;
        button.style.transition = 'none';
        fill.style.transition = 'none';
    }

    function handleMove(e) {
        if (!isDragging) return;
        
        e.preventDefault();
        currentX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
        const deltaX = currentX - startX;
        const trackWidth = track.offsetWidth;
        const buttonWidth = button.offsetWidth;
        const maxLeft = trackWidth - buttonWidth - 0;
        
        let newLeft = buttonStartLeft + deltaX;
        newLeft = Math.max(4, Math.min(newLeft, maxLeft));
        
        button.style.left = newLeft + 'px';
        
        const percentage = ((newLeft - 0) / (maxLeft - 0)) * 100;
        fill.style.width = percentage + '%';
        slideText.style.opacity = 1 - (percentage / 65);
        
        // If slid all the way
        if (newLeft >= maxLeft - 5) {
            isDragging = false;
            deleteAllData();
        }
    }

    function handleEnd() {
        if (!isDragging) return;
        isDragging = false;
        
        button.style.transition = 'left 0.3s ease';
        fill.style.transition = 'width 0.3s ease';
        
        // Snap back if not completed
        resetSlider();
    }

    button.addEventListener('mousedown', handleStart);
    button.addEventListener('touchstart', handleStart, { passive: false });
    
    document.addEventListener('mousemove', handleMove);
    document.addEventListener('touchmove', handleMove, { passive: false });
    
    document.addEventListener('mouseup', handleEnd);
    document.addEventListener('touchend', handleEnd);
})();
/* ===== DELETE PLAYER DATA FUNCTIONS - END ===== */

loadGameData();
createDeck();
updateDisplay();

// Ensure Play Again is disabled on initial load
try {
    const playBtn = document.getElementById('playAgainButton');
    if (playBtn) {
        playBtn.disabled = true;
        try { playBtn.style.display = 'none'; } catch (e) {}
    }
} catch (e) {}

// Hide and remove the custom splash (if present) after initialization
try {
    const _splash = document.getElementById('splash');
    if (_splash) {
        // small delay to allow initial paint, then fade out
        setTimeout(() => {
            _splash.classList.add('splash--hide');
            setTimeout(() => {
                _splash.remove();
            }, 600);
        }, 640);
    }
} catch (e) {
    // do nothing if DOM not available or removal fails
}