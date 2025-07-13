document.addEventListener('DOMContentLoaded', () => {
    const cities = ['New York', 'Los Angeles', 'San Francisco', 'Paris', 'Delhi', 'Perth'];
    const container = document.getElementById('cities');
    const searchForm = document.getElementById('search-form');
    const searchInput = document.getElementById('search-input');
    const toggle = document.getElementById('theme-toggle');
    const compareBtn = document.getElementById('compareBtn');
    let savedCities = JSON.parse(localStorage.getItem('savedCities') || '[]');
    let searchedCities = [];
    const alerts = JSON.parse(localStorage.getItem('alerts') || '{}');
    let chartType = 'line';
    let detailChart = null;
    let currentCity = '';
    const socket = io();
    const map = L.map('map').setView([20, 0], 2);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19
    }).addTo(map);
    const markers = {};
    let loadingToast = null;

    function showToast(message, type='info', delay=4000, autohide=true) {
        const container = document.getElementById('toast-container');
        const div = document.createElement('div');
        div.className = `toast align-items-center text-bg-${type} border-0`;
        div.role = 'alert';
        div.innerHTML = `<div class="d-flex"><div class="toast-body">${message}</div>` +
            `<button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button></div>`;
        container.appendChild(div);
        const toast = new bootstrap.Toast(div, { delay: delay, autohide: autohide });
        toast.show();
        div.addEventListener('hidden.bs.toast', () => div.remove());
        return toast;
    }

    function showLoading(city) {
        loadingToast = showToast('Adding ' + city + '... please wait', 'secondary', 5000, false);
    }

    function hideLoading() {
        if (loadingToast) {
            loadingToast.hide();
            loadingToast = null;
        }
    }

    function applyTheme(theme) {
        if (theme === 'light') {
            document.body.classList.add('light-mode');
        } else {
            document.body.classList.remove('light-mode');
        }
    }

    applyTheme(localStorage.getItem('theme'));

    savedCities.forEach(c => fetchCityData(c, false));

    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(t => new bootstrap.Tooltip(t));

    function addCityToList(city) {
        if (!cities.includes(city)) {
            cities.push(city);
            
            setInterval(() => fetchCityData(city), 1800000);
            
            searchedCities.push(city);
            
            fetch('/api/coords/' + encodeURIComponent(city))
                .then(r => r.json())
                .then(coords => {
                    if (!coords.error && !markers[city]) {
                        markers[city] = L.circleMarker([coords.lat, coords.lon], {color: markerColor(null)})
                            .addTo(map);
                        
                        
                        markers[city].on('click', () => openDetail(city));
                        
                        
                        markers[city].bindPopup(() => {
                            const content = createPopupContent(city, markers[city].aqi);
                            setTimeout(() => {
                                onPopupOpen(markers[city].getPopup(), city, markers[city].aqi);
                            }, 0);
                            return content;
                        });
                    }
                });
        }
    }

    function fetchWithTimeout(url, options = {}, timeout = 8000) {
        return Promise.race([
            fetch(url, options),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeout))
        ]);
    }

    function fetchCityData(city, scroll=false) {
        document.getElementById('loading').style.display = 'inline-block';
        return fetchWithTimeout(`/data/${encodeURIComponent(city)}`)
            .then(r => r.json())
            .then(data => {
                if (data.error) {
                    console.error(data.error);
                    fetchCoords(city, null);
                    document.getElementById('loading').style.display = 'none';
                    return Promise.reject(data.error);
                }
                
                renderCityCard(city, data, scroll);
                
                fetchCoords(city, data.aqi);
                document.getElementById('loading').style.display = 'none';
                return data;
            })
            .catch(err => {
                console.error(err);
                document.getElementById('loading').style.display = 'none';
                showToast('Failed to fetch data for ' + city, 'danger', 4000);
                fetchCoords(city, null);
                return Promise.reject(err);
            });
    }

    let previousAdviceText = '';

    function fetchCityHistory(city, hrs = 48) {
        
        const advice = document.querySelector('#advice');
        if (advice) previousAdviceText = advice.textContent;

        fetch(`/data/history/${encodeURIComponent(city)}?hours=${hrs}`)
            .then(r => r.json())
            .then(history => {
                const cardCanvas = document.querySelector(`canvas[data-city="${city}"]`);
                const labels = history.map(h => new Date(h.timestamp).toLocaleTimeString());
                const data = history.map(h => h.aqi);

                if (cardCanvas) {
                    const ctx = cardCanvas.getContext('2d');
                    new Chart(ctx, {
                        type: 'line',
                        data: {
                            labels: labels,
                            datasets: [{
                                label: 'AQI',
                                data: data,
                                borderColor: 'rgba(75,192,192,1)',
                                backgroundColor: 'rgba(75,192,192,0.2)',
                                fill: true
                            }]
                        },
                        options: { responsive: true,
                                   scales: { y: { beginAtZero: true } },
                                   animation: { duration: 1000, easing: 'easeOutQuart' },
                                   interaction: { mode: 'index', intersect: false } }
                    });
                }

                const detailCanvas = document.getElementById('historyChart');
                if (detailCanvas) {
                    const ctx2 = detailCanvas.getContext('2d');
                    if (detailChart) detailChart.destroy();
                    detailChart = new Chart(ctx2, {
                        type: chartType,
                        data: {
                            labels: labels,
                            datasets: [{
                                label: 'AQI',
                                data: data,
                                borderColor: 'rgba(75,192,192,1)',
                                backgroundColor: 'rgba(75,192,192,0.2)',
                                fill: true
                            }]
                        },
                        options: { responsive: true,
                                   scales: { y: { beginAtZero: true } },
                                   animation: { duration: 1000, easing: 'easeOutQuart' },
                                   interaction: { mode: 'index', intersect: false } }
                    });
                }

                updatePieChart(city, history);
                showPollutantBreakdown(city, history);
            });
    }

    function renderCityCard(city, data, scroll) {
        const slug = city.toLowerCase().replace(/\s+/g, '');
        let card = document.querySelector(`[data-card="${city}"]`);
        if (!card) {
            const col = document.createElement('div');
            col.className = 'col-sm-6 col-md-4 fade-in';
            col.innerHTML = `
                <div class="card card-hover" data-card="${city}">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-start">
                          <h5 class="card-title">${city}</h5>
                          <div>
                            <input class="form-check-input compare-check" type="checkbox" data-city="${city}">
                            <button class="btn btn-sm btn-outline-primary ms-2 save-btn" data-city="${city}">Save</button>
                          </div>
                        </div>
                        <p class="card-text">AQI: <span class="aqi">${data.aqi}</span></p>
                        <p class="small">PM2.5: <span class="pm25">${data.pm25 ?? 'N/A'}</span></p>
                        <p class="small">CO: <span class="co">${data.co ?? 'N/A'}</span></p>
                        <p class="small">NO2: <span class="no2">${data.no2 ?? 'N/A'}</span></p>
                        <canvas data-city="${city}"></canvas>
                    </div>
                </div>`;
            container.appendChild(col);
            card = col.querySelector('.card');
            
            
            card.addEventListener('click', (e) => {
                
                if (!e.target.classList.contains('save-btn')) {
                    openDetail(city);
                }
            });
            
            col.querySelector('.save-btn').addEventListener('click', e => {
                e.stopPropagation();
                saveCity(city);
            });
            
            
            highlightCard(col);
            
            
            if (alerts[city] && data.aqi >= alerts[city]) {
                col.querySelector('.card').classList.add('neon-warning');
                showToast(`${city} AQI exceeds ${alerts[city]}`, 'warning', 5000);
            }
            
            
            if (scroll) {
                card.scrollIntoView({ behavior: 'smooth' });
                showToast(`Done! See the pollution levels for ${city}`, 'success', 4000);
            }
            
            
            fetchCityHistory(city, 48);
        } else {
            card.querySelector('.aqi').textContent = data.aqi;
            card.querySelector('.pm25').textContent = data.pm25 ?? 'N/A';
            card.querySelector('.co').textContent = data.co ?? 'N/A';
            card.querySelector('.no2').textContent = data.no2 ?? 'N/A';
            highlightCard(card.parentElement);
            if (alerts[city] && data.aqi >= alerts[city]) {
                card.classList.add('neon-warning');
                showToast(`${city} AQI exceeds ${alerts[city]}`, 'warning', 5000);
            } else {
                card.classList.remove('neon-warning');
            }
        }
        fetchCityHistory(city, 48);
    }

    function highlightCard(element) {
        element.classList.add('highlight');
        setTimeout(() => element.classList.remove('highlight'), 2000);
    }

    function updatePieChart(city, history) {
        
        const latest = history[history.length - 1]?.aqi || 0;
        
        
        const categories = {
            'Good': { max: 50, color: '#009966' },
            'Moderate': { max: 100, color: '#ffde33' },
            'Unhealthy for Sensitive Groups': { max: 150, color: '#ff9933' },
            'Unhealthy': { max: 200, color: '#cc0033' },
            'Very Unhealthy': { max: 300, color: '#660099' },
            'Hazardous': { max: Infinity, color: '#7e0023' }
        };

        // Count readings in each category
        const counts = {};
        Object.keys(categories).forEach(cat => counts[cat] = 0);
        
        history.forEach(h => {
            for (const [category, values] of Object.entries(categories)) {
                if (h.aqi <= values.max) {
                    counts[category]++;
                    break;
                }
            }
        });

        // Prepare chart data
        const labels = Object.keys(counts);
        const data = Object.values(counts);
        const backgroundColor = Object.values(categories).map(c => c.color);
        
        // Restore the previous advice text and color if they exist
        if (previousAdviceText) {
            const advice = document.querySelector('#advice');
            if (advice) {
                if (advice.textContent !== previousAdviceText) {
                    advice.textContent = previousAdviceText;
                }
                // Get the current card's AQI to set the correct color
                const card = document.querySelector(`[data-card="${city}"]`);
                if (card) {
                    const currentAqi = parseFloat(card.querySelector('.aqi').textContent);
                    advice.style.color = getAQIColor(currentAqi);
                }
            }
        }
        
        // Destroy previous chart if it exists
        if (window.historyPieChart) {
            window.historyPieChart.destroy();
        }

        // Create new chart
        const ctx = document.getElementById('pieChart').getContext('2d');
        window.historyPieChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: backgroundColor
                }]
            },
            options: {
                animation: { animateScale: true, animateRotate: true, duration: 1000, easing: 'easeOutQuart' },
                plugins: { 
                    tooltip: { enabled: true },
                    legend: {
                        display: true,
                        position: 'bottom'
                    }
                }
            }
        });

        // Update progress bars with detailed categories
        const total = Object.values(counts).reduce((a, b) => a + b, 0);
        Object.entries(counts).forEach(([category, count]) => {
            const barEl = document.getElementById(`bar-${category.toLowerCase().replace(/\s+/g, '-')}`);
            if (barEl) {
                barEl.style.width = `${(count/total)*100}%`;
                barEl.style.backgroundColor = categories[category].color;
            }
        });

        // Update advice text with proper AQI message
        const advice = document.querySelector('#advice');
        advice.classList.remove('neon-warning');
        if (latest > 150) { // Add warning class for unhealthy and worse
            advice.classList.add('neon-warning');
        }
        typeAdvice(getAQIMessage(latest));
    }

    function showPollutantBreakdown(city, history) {
        const pm25 = { good: 0, moderate: 0, bad: 0 };
        const co = { good: 0, moderate: 0, bad: 0 };
        const no2 = { good: 0, moderate: 0, bad: 0 };
        history.forEach(h => {
            categorize(h.pm25, pm25, 12, 35);
            categorize(h.co, co, 4, 9);
            categorize(h.no2, no2, 53, 100);
        });
        const ctx = document.getElementById('pollutantChart').getContext('2d');
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Good', 'Moderate', 'Bad'],
                datasets: [
                    { label: 'PM2.5', backgroundColor: 'rgba(75,192,192,0.6)', data: [pm25.good, pm25.moderate, pm25.bad] },
                    { label: 'CO', backgroundColor: 'rgba(255,99,132,0.6)', data: [co.good, co.moderate, co.bad] },
                    { label: 'NO2', backgroundColor: 'rgba(255,206,86,0.6)', data: [no2.good, no2.moderate, no2.bad] }
                ]
            },
            options: {
                responsive: true,
                scales: { y: { beginAtZero: true } },
                animation: { duration: 1000, easing: 'easeOutQuart' },
                plugins: { tooltip: { enabled: true } },
                interaction: { mode: 'index', intersect: false }
            }
        });
    }

    function categorize(value, obj, good, moderate) {
        if (value == null) return;
        if (value <= good) obj.good++; else if (value <= moderate) obj.moderate++; else obj.bad++;
    }

    function saveCity(city) {
        if (!savedCities.includes(city)) {
            savedCities.push(city);
            localStorage.setItem('savedCities', JSON.stringify(savedCities));
        } else {
            savedCities = savedCities.filter(c => c !== city);
            localStorage.setItem('savedCities', JSON.stringify(savedCities));
        }
        const current = alerts[city] || 150;
        const val = prompt('Alert threshold for ' + city, current);
        if (val) {
            alerts[city] = parseInt(val, 10);
            localStorage.setItem('alerts', JSON.stringify(alerts));
        }
    }


    function animateValue(el, to, duration) {
        const element = typeof el === 'string' ? document.getElementById(el) : el;
        if (!element) return;
        const start = 0;
        const increment = to / (duration / 20);
        let current = start;
        element.textContent = current.toFixed(0);
        const timer = setInterval(() => {
            current += increment;
            if (current >= to) {
                current = to;
                clearInterval(timer);
            }
            element.textContent = current.toFixed(0);
        }, 20);
    }

    function typeAdvice(text) {
        const el = document.querySelector('#advice');
        if (!el) return;
        el.textContent = text;
        el.style.animation = 'none';
        void el.offsetWidth;
        el.style.animation = '';
    }

    let detailDrawer;
    function openDetail(city) {
        if (!detailDrawer) {
            detailDrawer = new bootstrap.Offcanvas('#detailDrawer');
        }

        // First ensure we have the city's data
        const card = document.querySelector(`[data-card="${city}"]`);
        if (!card) {
            // If we don't have a card yet, fetch the data first
            fetchCityData(city, false).then(() => {
                // After data is fetched, try opening detail again
                openDetail(city);
            });
            return;
        }

        const title = document.getElementById('detailTitle');
        title.textContent = city;
        currentCity = city;

        // Get all the metric values
        const metrics = {
            aqi: parseFloat(card.querySelector('.aqi').textContent) || 0,
            pm25: parseFloat(card.querySelector('.pm25').textContent) || 0,
            co: parseFloat(card.querySelector('.co').textContent) || 0,
            no2: parseFloat(card.querySelector('.no2').textContent) || 0
        };

        // Update the advice message and color immediately based on current AQI
        const advice = document.querySelector('#advice');
        if (advice) {
            // Remove all previous color classes
            advice.className = 'neon-text mb-3';
            
            // Set the text content and color
            advice.textContent = getAQIMessage(metrics.aqi);
            advice.style.color = getAQIColor(metrics.aqi);
            previousAdviceText = advice.textContent;
        }
        
        // Update pie chart colors immediately
        const ctx = document.getElementById('pieChart').getContext('2d');
        if (window.historyPieChart) {
            window.historyPieChart.destroy();
        }
        window.historyPieChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: ['Current AQI'],
                datasets: [{
                    data: [metrics.aqi, 500 - metrics.aqi],
                    backgroundColor: [getAQIColor(metrics.aqi), '#e0e0e0']
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });

        // Animate the metrics
        Object.entries(metrics).forEach(([key, value]) => {
            animateValue(`detail-${key}`, value, 800);
        });

        // Initialize tooltips
        const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.map(t => new bootstrap.Tooltip(t));

        // Reset progress bars
        ['good', 'moderate', 'unhealthy-for-sensitive-groups', 'unhealthy', 'very-unhealthy', 'hazardous'].forEach(category => {
            const bar = document.getElementById(`bar-${category}`);
            if (bar) bar.style.width = '0%';
        });

        // Fetch and show history
        fetchCityHistory(city, 168);
        detailDrawer.show();
    }

    initAutocomplete('#search-input');

    async function submitSearch() {
        const city = searchInput.value.trim();
        if (!city) return;
        if (searchInput.disabled) return;
        searchInput.disabled = true;
        showLoading(city);
        const enableTimer = setTimeout(() => {
            searchInput.disabled = false;
        }, 12000);
        try {
            await fetchCityData(city, true);
            addCityToList(city);
        } finally {
            clearTimeout(enableTimer);
            hideLoading();
            searchInput.disabled = false;
            searchInput.value = '';
        }
    }

    searchForm.addEventListener('submit', e => {
        e.preventDefault();
        submitSearch();
    });

    searchInput.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
            e.preventDefault();
            submitSearch();
        }
    });

    toggle.addEventListener('click', () => {
        const light = document.body.classList.toggle('light-mode');
        localStorage.setItem('theme', light ? 'light' : 'dark');
    });

    const toggleBtn = document.getElementById('chartToggle');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            chartType = chartType === 'line' ? 'bar' : 'line';
            if (currentCity) {
                fetchCityHistory(currentCity, 168);
            }
        });
    }

    document.getElementById('advice').addEventListener('click', () => {
        alert('See more tips on reducing exposure to air pollution.');
    });

    if (compareBtn) {
        compareBtn.addEventListener('click', () => {
            const selected = Array.from(document.querySelectorAll('.compare-check:checked')).map(c => c.dataset.city);
            if (selected.length < 2) { alert('Select at least two cities'); return; }
            const params = selected.map(c => 'city=' + encodeURIComponent(c)).join('&');
            fetch(`/data/history_multi?${params}&hours=24`)
                .then(r => r.json())
                .then(data => {
                    const labels = data[selected[0]].map(h => new Date(h.timestamp).toLocaleTimeString());
                    const datasets = selected.map((city,i) => ({
                        label: city,
                        data: data[city].map(h => h.aqi),
                        borderColor: ['red','blue','green','orange','purple'][i%5],
                        fill:false
                    }));
                    const ctx = document.getElementById('compareChart').getContext('2d');
                    if (window.compareChart) window.compareChart.destroy();
                    window.compareChart = new Chart(ctx, {
                        type: 'line',
                        data: { labels, datasets },
                        options: {
                            responsive: true,
                            animation: { duration: 1000, easing: 'easeOutQuart' },
                            interaction: { mode: 'index', intersect: false }
                        }
                    });

                    // Build pollutant comparison
                    const barLabels = ['PM2.5', 'CO', 'NO2'];
                    const barData = selected.map((city,i) => {
                        const avgPm = data[city].reduce((s,h)=>s+(h.pm25||0),0)/data[city].length;
                        const avgCo = data[city].reduce((s,h)=>s+(h.co||0),0)/data[city].length;
                        const avgNo2 = data[city].reduce((s,h)=>s+(h.no2||0),0)/data[city].length;
                        return {
                            label: city,
                            data: [avgPm, avgCo, avgNo2],
                            backgroundColor: ['rgba(75,192,192,0.5)','rgba(255,99,132,0.5)','rgba(255,206,86,0.5)'][i%3]
                        };
                    });
                    const ctx2 = document.getElementById('comparePollutantChart').getContext('2d');
                    if (window.comparePollutantChart) window.comparePollutantChart.destroy();
                    window.comparePollutantChart = new Chart(ctx2, {
                        type: 'bar',
                        data: { labels: barLabels, datasets: barData },
                        options: {
                            responsive: true,
                            animation: { duration: 1000, easing: 'easeOutQuart' },
                            interaction: { mode: 'index', intersect: false },
                            scales: { y: { beginAtZero: true } }
                        }
                    });
                    new bootstrap.Modal(document.getElementById('compareModal')).show();
                });
        });
    }

    socket.on('update', data => {
        renderCityCard(data.city, data);
        fetchCoords(data.city, data.aqi);
    });

    function initMarkers() {
        fetch('/api/all_coords')
            .then(r => r.json())
            .then(coordMap => {
                [...cities, ...searchedCities].forEach(city => {
                    const coords = coordMap[city];
                    if (coords && !markers[city]) {
                        markers[city] = L.circleMarker([coords[0], coords[1]], {color: markerColor(null)}).addTo(map).bindPopup(`${city} AQI: N/A`);
                        markers[city].on('click', () => openDetail(city));
                    }
                });
            });
    }

    // Maximum AQI value used for the pie chart
    const maximumAQI = 500;

    // Create a popup content with AQI information and pie chart
    function createPopupContent(city, aqi) {
        const container = L.DomUtil.create('div', 'aqi-popup');
        const title = L.DomUtil.create('h4', '', container);
        title.textContent = `${city}`;
        
        const aqiContainer = L.DomUtil.create('div', 'aqi-value', container);
        aqiContainer.textContent = `AQI: ${aqi}`;
        
        const category = L.DomUtil.create('div', 'aqi-category', container);
        category.textContent = getAQICategory(aqi);
        
        const canvas = L.DomUtil.create('canvas', 'aqi-chart', container);
        canvas.style.width = '150px';
        canvas.style.height = '150px';
        
        const message = L.DomUtil.create('p', 'aqi-message', container);
        message.textContent = getAQIMessage(aqi);
        
        return container;
    }

    // Handle popup open event and create/update the chart
    function onPopupOpen(popup, city, aqi) {
        // Destroy any existing chart instance
        if (window.currentChart) {
            window.currentChart.destroy();
            window.currentChart = null;
        }
        
        const canvas = popup.getElement().querySelector('.aqi-chart');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        window.currentChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                datasets: [{
                    data: [aqi, maximumAQI - aqi],
                    backgroundColor: [getAQIColor(aqi), '#e0e0e0']
                }]
            },
            options: {
                cutout: '70%',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    }

    function fetchCoords(city, aqi) {
        fetch(`/api/coords/${encodeURIComponent(city)}`)
            .then(r => r.json())
            .then(coords => {
                if (coords.error) return;

                // Update or create marker
                if (markers[city]) {
                    markers[city].setLatLng([coords.lat, coords.lon]);
                } else {
                    markers[city] = L.circleMarker([coords.lat, coords.lon], {color: getAQIColor(aqi)})
                        .addTo(map);
                    // Set up click handler for the detail view
                    markers[city].on('click', () => openDetail(city));
                }

                // Update marker properties
                markers[city].setStyle({color: getAQIColor(aqi)});
                markers[city].aqi = aqi;

                // Remove any existing popup events to prevent duplicates
                markers[city].off('popupopen');

                // Create popup with dynamic content generation
                const popup = L.popup({
                    maxWidth: 300,
                    className: 'aqi-popup-wrapper'
                });

                // Bind popup with dynamic content
                markers[city].bindPopup(() => {
                    const content = createPopupContent(city, markers[city].aqi);
                    // Schedule the chart creation for after the popup is added to DOM
                    setTimeout(() => {
                        onPopupOpen(markers[city].getPopup(), city, markers[city].aqi);
                    }, 0);
                    return content;
                });
            });
    }

    initMarkers();
    cities.forEach(city => {
        fetchCoords(city, null);
        fetchCityData(city, false);
        setInterval(() => fetchCityData(city), 1800000);
    });
});
