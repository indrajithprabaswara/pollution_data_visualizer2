document.addEventListener('DOMContentLoaded', () => {
    const cities = ['New York', 'Los Angeles', 'San Francisco'];
    const container = document.getElementById('cities');
    const searchForm = document.getElementById('search-form');
    const searchInput = document.getElementById('search-input');
    const suggestions = document.getElementById('suggestions');
    const toggle = document.getElementById('theme-toggle');

    function applyTheme(theme) {
        if (theme === 'light') {
            document.body.classList.add('light-mode');
        } else {
            document.body.classList.remove('light-mode');
        }
    }

    applyTheme(localStorage.getItem('theme'));

    function fetchCityData(city) {
        fetch(`/data/${encodeURIComponent(city)}`)
            .then(r => r.json())
            .then(data => {
                if (data.error) {
                    console.error(data.error);
                    return;
                }
                renderCityCard(city, data);
            })
            .catch(err => console.error(err));
    }

    function fetchCityHistory(city) {
        fetch(`/data/history/${encodeURIComponent(city)}`)
            .then(r => r.json())
            .then(history => {
                const canvas = document.querySelector(`canvas[data-city="${city}"]`);
                if (!canvas) return;
                const ctx = canvas.getContext('2d');
                const labels = history.map(h => new Date(h.timestamp).toLocaleTimeString());
                const data = history.map(h => h.aqi);
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
                    options: { responsive: true, scales: { y: { beginAtZero: true } } }
                });
                updatePieChart(city, history);
            });
    }

    function renderCityCard(city, data) {
        let card = document.querySelector(`[data-card="${city}"]`);
        if (!card) {
            const col = document.createElement('div');
            col.className = 'col-md-4 fade-in';
            col.innerHTML = `
                <div class="card" data-card="${city}">
                    <div class="card-body">
                        <h5 class="card-title">${city}</h5>
                        <p class="card-text">AQI: <span class="aqi">${data.aqi}</span></p>
                        <p class="small">PM2.5: <span class="pm25">${data.pm25 ?? 'N/A'}</span></p>
                        <p class="small">CO: <span class="co">${data.co ?? 'N/A'}</span></p>
                        <p class="small">NO2: <span class="no2">${data.no2 ?? 'N/A'}</span></p>
                        <canvas data-city="${city}"></canvas>
                    </div>
                </div>`;
            container.appendChild(col);
            card = col.querySelector('.card');
            card.addEventListener('click', () => openDetail(city));
            highlightCard(col);
            card.scrollIntoView({ behavior: 'smooth' });
        } else {
            card.querySelector('.aqi').textContent = data.aqi;
            card.querySelector('.pm25').textContent = data.pm25 ?? 'N/A';
            card.querySelector('.co').textContent = data.co ?? 'N/A';
            card.querySelector('.no2').textContent = data.no2 ?? 'N/A';
            highlightCard(card.parentElement);
        }
        fetchCityHistory(city);
    }

    function highlightCard(element) {
        element.classList.add('highlight');
        setTimeout(() => element.classList.remove('highlight'), 2000);
    }

    function updatePieChart(city, history) {
        const counts = { good: 0, moderate: 0, bad: 0 };
        history.forEach(h => {
            if (h.aqi <= 50) counts.good++; else if (h.aqi <= 100) counts.moderate++; else counts.bad++;
        });
        const total = counts.good + counts.moderate + counts.bad;
        const ctx = document.querySelector(`canvas[data-pie="${city}"]`).getContext('2d');
        new Chart(ctx, {
            type: 'pie',
            data: {
                labels: ['Good', 'Moderate', 'Bad'],
                datasets: [{
                    data: [counts.good, counts.moderate, counts.bad],
                    backgroundColor: ['green', 'yellow', 'red']
                }]
            }
        });
        document.getElementById('bar-good').style.width = `${(counts.good/total)*100}%`;
        document.getElementById('bar-moderate').style.width = `${(counts.moderate/total)*100}%`;
        document.getElementById('bar-bad').style.width = `${(counts.bad/total)*100}%`;
        const advice = document.querySelector('#advice');
        let text = 'Nice! Your area is not polluted.';
        if (counts.bad > counts.moderate && counts.bad > counts.good) text = 'Your air quality is poor! Stay indoors or wear a mask!';
        else if (counts.moderate >= counts.good && counts.moderate >= counts.bad) text = 'Consider public transport to help the environment.';
        typeAdvice(text);
    }

    function typeAdvice(text) {
        const el = document.querySelector('#advice');
        if (!el) return;
        el.textContent = '';
        let i = 0;
        const interval = setInterval(() => {
            el.textContent += text[i];
            i++;
            if (i >= text.length) clearInterval(interval);
        }, 50);
    }

    let detailDrawer;
    function openDetail(city) {
        if (!detailDrawer) {
            detailDrawer = new bootstrap.Offcanvas('#detailDrawer');
        }
        const title = document.getElementById('detailTitle');
        const content = document.getElementById('detail-content');
        title.textContent = city;
        content.innerHTML = `
            <canvas data-pie="${city}"></canvas>
            <div class="progress mt-3">
              <div class="progress-bar bg-success" role="progressbar" id="bar-good" style="width:0%"></div>
            </div>
            <div class="progress mt-2">
              <div class="progress-bar bg-warning" role="progressbar" id="bar-moderate" style="width:0%"></div>
            </div>
            <div class="progress mt-2">
              <div class="progress-bar bg-danger" role="progressbar" id="bar-bad" style="width:0%"></div>
            </div>
            <p id="advice" class="mt-3 neon-text"></p>
        `;
        fetchCityHistory(city);
        detailDrawer.show();
    }

    searchInput.addEventListener('input', () => {
        showSuggestions(searchInput, suggestions);
    });

    searchForm.addEventListener('submit', e => {
        e.preventDefault();
        const city = searchInput.value.trim();
        if (city) {
            fetchCityData(city);
            searchInput.value = '';
            suggestions.innerHTML = '';
        }
    });

    toggle.addEventListener('click', () => {
        const light = document.body.classList.toggle('light-mode');
        localStorage.setItem('theme', light ? 'light' : 'dark');
    });

    cities.forEach(city => {
        fetchCityData(city);
        setInterval(() => fetchCityData(city), 60000);
    });
});
