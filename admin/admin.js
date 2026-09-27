document.addEventListener('DOMContentLoaded', function () {
    const statusEl = document.getElementById('admin-status');
    const loginForm = document.getElementById('admin-login');
    const pinInput = document.getElementById('admin-pin');
    const submitButton = document.getElementById('admin-submit');
    const dashboard = document.getElementById('admin-dashboard');
    const dashboardTitle = document.getElementById('admin-dashboard-title');
    const recordingEl = document.getElementById('admin-recording');
    const emptyEl = document.getElementById('admin-empty');
    const figuresEl = document.getElementById('admin-figures');
    const logoutButton = document.getElementById('admin-logout');
    const linkNote = document.getElementById('admin-link-note');

    const labels = {
        linkedin: 'LinkedIn',
        resume: 'Résumé',
        direct: 'Direct',
        other: 'Other'
    };

    function setStatus(message) {
        statusEl.textContent = message;
    }

    function showLogin(message) {
        dashboard.hidden = true;
        loginForm.hidden = false;
        submitButton.disabled = false;
        setStatus(message);
        pinInput.focus();
    }

    function fillPeriod(list, counts, emptyMessage) {
        list.replaceChildren();
        if (!counts || counts.total < 1) {
            const item = document.createElement('li');
            item.textContent = emptyMessage;
            list.appendChild(item);
            return;
        }
        Object.keys(labels).forEach(function (key) {
            const item = document.createElement('li');
            let text = labels[key] + ': ' + String(counts[key]);
            if (counts.showShares) {
                text += ' (' + Math.round((counts[key] / counts.total) * 100) + '%)';
            }
            item.textContent = text;
            list.appendChild(item);
        });
        const totalItem = document.createElement('li');
        totalItem.textContent = 'Total: ' + String(counts.total);
        list.appendChild(totalItem);
    }

    function fillRecent(list, days) {
        list.replaceChildren();
        if (!days.length) {
            const item = document.createElement('li');
            item.textContent = 'No single day to list yet.';
            list.appendChild(item);
            return;
        }
        days.forEach(function (day) {
            const item = document.createElement('li');
            item.textContent =
                day.day +
                ': ' +
                day.total +
                ' (LinkedIn ' +
                day.linkedin +
                ', Résumé ' +
                day.resume +
                ', Direct ' +
                day.direct +
                ', Other ' +
                day.other +
                ')';
            list.appendChild(item);
        });
    }

    function showLinks() {
        const origin = window.location.origin;
        document.getElementById('admin-link-linkedin').textContent =
            origin + '/?utm_source=linkedin';
        document.getElementById('admin-link-resume').textContent = origin + '/?utm_source=resume';
        document.getElementById('admin-link-direct').textContent = origin + '/';
        const host = window.location.hostname;
        if (host === 'localhost' || host === '127.0.0.1' || host === '[::1]') {
            linkNote.textContent =
                'These links use this browser address. Open admin on the public site to copy the live URLs.';
            return;
        }
        linkNote.textContent =
            'The tagged LinkedIn URL and the plain portfolio URL both count as LinkedIn when the visit comes from LinkedIn. Use the résumé URL as the website link inside the résumé PDF.';
    }

    function showDashboard(payload) {
        loginForm.hidden = true;
        dashboard.hidden = false;
        showLinks();
        if (!payload.recording) {
            recordingEl.hidden = false;
            recordingEl.textContent =
                'This deployment does not record new visits. Counts below are the stored visits.';
        } else {
            recordingEl.hidden = true;
            recordingEl.textContent = '';
        }
        if (!payload.hasVisits) {
            emptyEl.hidden = false;
            figuresEl.hidden = true;
            setStatus('Signed in. No visits recorded yet.');
        } else {
            emptyEl.hidden = true;
            figuresEl.hidden = false;
            fillPeriod(
                document.getElementById('admin-all-time'),
                payload.allTime,
                'No visits recorded yet.'
            );
            fillPeriod(
                document.getElementById('admin-last-7'),
                payload.last7Days,
                'No visits in the last 7 days.'
            );
            fillPeriod(
                document.getElementById('admin-last-30'),
                payload.last30Days,
                'No visits in the last 30 days.'
            );
            fillRecent(document.getElementById('admin-recent'), payload.recentDays || []);
            setStatus('Signed in.');
        }
        dashboardTitle.focus();
    }

    function loadCounts() {
        setStatus('Loading visit counts.');
        return fetch('/api/analytics', {
            method: 'GET',
            headers: { Accept: 'application/json' },
            credentials: 'same-origin'
        })
            .then(function (response) {
                return response.json().then(function (payload) {
                    return { ok: response.ok, status: response.status, payload: payload };
                });
            })
            .then(function (result) {
                if (result.status === 401) {
                    showLogin('Enter the admin PIN.');
                    return;
                }
                if (!result.ok || !result.payload || result.payload.ready !== true) {
                    const message =
                        result.payload && result.payload.error
                            ? result.payload.error
                            : 'Visit counts could not be loaded. Nothing is shown in their place.';
                    loginForm.hidden = true;
                    dashboard.hidden = false;
                    emptyEl.hidden = true;
                    figuresEl.hidden = true;
                    recordingEl.hidden = true;
                    showLinks();
                    setStatus(message);
                    dashboardTitle.focus();
                    return;
                }
                showDashboard(result.payload);
            })
            .catch(function (err) {
                console.error(
                    'Visit counts could not be loaded.',
                    err && err.message ? err.message : err
                );
                loginForm.hidden = true;
                dashboard.hidden = false;
                emptyEl.hidden = true;
                figuresEl.hidden = true;
                recordingEl.hidden = true;
                showLinks();
                setStatus('Visit counts could not be loaded. Nothing is shown in their place.');
                dashboardTitle.focus();
            });
    }

    loginForm.addEventListener('submit', function (event) {
        event.preventDefault();
        const pin = pinInput.value;
        pinInput.value = '';
        submitButton.disabled = true;
        setStatus('Checking PIN.');
        fetch('/api/admin', {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json'
            },
            credentials: 'same-origin',
            body: JSON.stringify({ pin: pin })
        })
            .then(function (response) {
                return response.json().then(function (payload) {
                    return { ok: response.ok, payload: payload };
                });
            })
            .then(function (result) {
                if (!result.ok) {
                    const message =
                        result.payload && result.payload.error
                            ? result.payload.error
                            : 'That PIN is not correct.';
                    showLogin(message);
                    return;
                }
                return loadCounts();
            })
            .catch(function (err) {
                console.error(
                    'Sign-in could not be completed.',
                    err && err.message ? err.message : err
                );
                showLogin('Sign-in could not be completed. Try again.');
            });
    });

    logoutButton.addEventListener('click', function () {
        fetch('/api/admin', {
            method: 'DELETE',
            credentials: 'same-origin'
        })
            .catch(function (err) {
                console.error(
                    'Sign-out could not be completed.',
                    err && err.message ? err.message : err
                );
            })
            .finally(function () {
                showLogin('Signed out. Enter the admin PIN.');
            });
    });

    fetch('/api/admin', {
        method: 'GET',
        headers: { Accept: 'application/json' },
        credentials: 'same-origin'
    })
        .then(function (response) {
            if (response.status === 401) {
                showLogin('Enter the admin PIN.');
                return null;
            }
            if (!response.ok) {
                return response.json().then(function (payload) {
                    const message =
                        payload && payload.error
                            ? payload.error
                            : 'Sign-in could not be checked. Try again later.';
                    loginForm.hidden = true;
                    dashboard.hidden = true;
                    setStatus(message);
                    return null;
                });
            }
            return loadCounts();
        })
        .catch(function (err) {
            console.error('Sign-in could not be checked.', err && err.message ? err.message : err);
            loginForm.hidden = true;
            dashboard.hidden = true;
            setStatus('Sign-in could not be checked. Try again later.');
        });
});
