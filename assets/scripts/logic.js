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

    if (bet < 500) {
        alert('Minimum bet is 500 Chips!');
        return;
    }

    if (bet > balance) {
        alert('Insufficient Chips!');
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
                    endGame('push', currentBet, '<span class="pushIcon"></span><p>Two natural blackjacks!? That is crazy.</p>');
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
        alert('Insufficient Chips to double down!');
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
        alert('Insufficient Chips to split!');
        return;
    }

    if (playerHand[0].rank !== playerHand[1].rank) {
        alert('Can only split matching cards!');
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

    if (outcome === 'victory') {
        balance += winAmount;
        toastClass = 'victory';
        toastMessage = extraMessage || `<span class="trophyIcon"></span><p>Nice job! You won ${formatNumber(winAmount)} chips!</p>`;
    } else if (outcome === 'bust') {
        toastClass = 'bust';
        toastMessage = extraMessage || `<span class="bustIcon"></span><p>Oh no! You busted & lost ${formatNumber(currentBet)} chips.</p>`;
    } else if (outcome === 'dealer-wins') {
        if (winAmount > 0) {
            balance += winAmount;
        }
        toastClass = 'dealer-wins';
        toastMessage = extraMessage || `<span class="heartBreakIcon"></span><p>Tough luck! You lost ${formatNumber(currentBet - winAmount)} chips.</p>`;
    } else if (outcome === 'push') {
        balance += winAmount;
        toastClass = 'push';
        toastMessage = extraMessage || `<span class="flagIcon"></span>Push! You get to keep your ${formatNumber(currentBet)} chips!`;
    }

    updateDisplay();
    setTimeout(() => {
        _complexToast(toastClass, toastMessage, 5000);
        resetGame();
    }, 1000);
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

    updateDisplay();

    if (balance < 500) {
        alert('You ran out of Chips! Resetting to 10,000.');
        balance = 10000;
        saveGameData();
        updateDisplay();
    }

    document.getElementById('bet-modal').classList.add('active');
    document.getElementById('bet-modal-input').value = 500;
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
    const slideConfirm = document.getElementById('slide-confirm');
    if (slideConfirm) {
        slideConfirm.classList.remove('active');
    }
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


function showToast(toastClass, toastMessage, duration = 5000) {
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
function _complexToast(toastClass, toastMessage, duration = 5000) {
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
// - max 10 clicks per 30 minutes (tracked in localStorage)
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
    const LIMIT_WINDOW_MS = 15 * 60 * 1000; // 30 minutes

    // If balance is over cap, show toast and refuse
    if (balance > MAX_BALANCE) {
        showToast('dealer-wins', `<span class="skullIcon"></span><p>C'mon. Your balance is over ${MAX_BALANCE.toLocaleString()}.</p>`);
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

// Attach to a button with id "add-chips" if present in the DOM
const addChipsBtn = document.getElementById('add-chips');
if (addChipsBtn) {
    addChipsBtn.addEventListener('click', () => addChips(10000));
}

/* ===== DELETE PLAYER DATA FUNCTIONS - START ===== */
function showDeleteConfirm() {
    const el = document.getElementById('slide-confirm');
    if (!el) return;
    el.classList.remove('hidden');
    el.classList.add('active');
}

function cancelDelete() {
    const el = document.getElementById('slide-confirm');
    if (el) {
        el.classList.remove('active');
        el.classList.add('hidden');
    }
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
        }, 320);
    }
} catch (e) {
    // do nothing if DOM not available or removal fails
}