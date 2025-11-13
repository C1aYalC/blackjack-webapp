(async function () {
    'use strict';

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
