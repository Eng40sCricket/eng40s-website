document.addEventListener("DOMContentLoaded", () => {
    // Function to load HTML content into a target element
    const loadComponent = async (url, targetId) => {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const html = await response.text();
            document.getElementById(targetId).innerHTML = html;
            
            // Re-run path highlighting after header is loaded
            if (targetId === "header-placeholder") {
                highlightActiveNav();
            }
        } catch (error) {
            console.error(`Failed to load component from ${url}:`, error);
        }
    };

    // Load header and footer
    loadComponent("/components/header.html", "header-placeholder");
    loadComponent("/components/footer.html", "footer-placeholder");

    // Path highlighting function
    const highlightActiveNav = () => {
        const currentPath = window.location.pathname;
        const navLinks = document.querySelectorAll(".nav ul li a");
        navLinks.forEach(link => {
            const href = link.getAttribute("href");
            const cleanedCurrentPath = currentPath.endsWith("/") ? currentPath.slice(0, -1) : currentPath;
            const cleanedHref = href.endsWith("/") ? href.slice(0, -1) : href;

            if (cleanedHref === cleanedCurrentPath) {
                link.classList.add("active");
            }
        });
    };

    // Mobile navigation toggle (using event delegation for dynamic header)
    document.addEventListener("click", (e) => {
        if (e.target.classList.contains("hamburger-menu")) {
            const navMenu = document.querySelector(".nav ul");
            if (navMenu) {
                navMenu.classList.toggle("open");
            }
        }
    });

    // Dynamic Data Rendering for Fixtures and Results
    const fixtureListContainer = document.getElementById("fixture-list-container");
    const nextMatchHighlight = document.getElementById("next-match-highlight");
    const resultList = document.getElementById("result-list");

    // Homepage specific elements
    const homepageNextFixture = document.getElementById("homepage-next-fixture");
    const homepageLatestResult = document.getElementById("homepage-latest-result");
    const homepageLatestNews = document.getElementById("homepage-latest-news");
    const homepageWorldCupPreview = document.getElementById("homepage-world-cup-preview");

    // Fetch all data for homepage if relevant elements exist
    if (homepageNextFixture || homepageLatestResult || homepageLatestNews || homepageWorldCupPreview) {
        Promise.all([
            fetch("/assets/data/fixtures.json").then(res => res.json()).catch(() => []),
            fetch("/assets/data/results.json").then(res => res.json()).catch(() => []),
            fetch("/assets/data/news.json").then(res => res.json()).catch(() => []),
            fetch("/assets/data/worldcup.json").then(res => res.json()).catch(() => ({})),
        ]).then(([fixtures, results, news, worldCupData]) => {
            renderHomepagePreviews(fixtures, results, news, worldCupData);
        }).catch(err => console.error("Error loading homepage data:", err));
    }

    // Other page specific data loading
    if (fixtureListContainer || nextMatchHighlight) {
        fetch("/assets/data/fixtures.json")
            .then(res => res.json())
            .then(data => renderFixtures(data))
            .catch(err => console.error("Error loading fixtures:", err));
    }

    if (resultList) {
        fetch("/assets/data/results.json")
            .then(res => res.json())
            .then(data => {
                window.allResults = data; // Store for filtering
                renderResults(data);
                setupResultFilters();
            })
            .catch(err => console.error("Error loading results:", err));
    }

    const worldCupOverview = document.getElementById("world-cup-overview");
    const worldCupSquad = document.getElementById("world-cup-squad");
    const worldCupGroups = document.getElementById("world-cup-groups");
    const worldCupNews = document.getElementById("world-cup-news");
    const worldCupPressReleases = document.getElementById("world-cup-press-releases");

    if (worldCupOverview || worldCupSquad || worldCupGroups || worldCupNews || worldCupPressReleases) {
        fetch("/assets/data/worldcup.json")
            .then(res => res.json())
            .then(data => renderWorldCupPage(data))
            .catch(err => console.error("Error loading World Cup data:", err));
    }

    const featuredStoryContainer = document.getElementById("featured-story-container");
    const latestNewsGrid = document.getElementById("latest-news-grid");

    if (featuredStoryContainer || latestNewsGrid) {
        fetch("/assets/data/news.json")
            .then(res => res.json())
            .then(data => renderNewsPage(data))
            .catch(err => console.error("Error loading news data:", err));
    }

    function renderMatchCard(f, isHighlight = false) {
        const dateOptions = isHighlight ? { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' } : { day: 'numeric', month: 'short', year: 'numeric' };
        return `
            <div class="card match-card ${isHighlight ? 'highlight-card' : ''}">
                <div class="match-header">
                    <span class="match-date">${new Date(f.date).toLocaleDateString('en-GB', dateOptions)}</span>
                    <span class="match-badge ${f.isWorldCup ? 'badge-wc' : 'badge-odi'}">${f.matchType}</span>
                </div>
                <div class="match-teams">
                    <div class="team-info">
                        <div class="team-logo"><i class="fas fa-shield-alt"></i></div>
                        <span class="team-name">${f.homeTeam}</span>
                    </div>
                    <div class="match-vs">VS</div>
                    <div class="team-info">
                        <div class="team-logo"><i class="fas fa-shield-alt"></i></div>
                        <span class="team-name">${f.awayTeam}</span>
                    </div>
                </div>
                <div class="match-details">
                    <div class="detail-item"><i class="far fa-clock"></i> ${f.time}</div>
                    <div class="detail-item"><i class="fas fa-map-marker-alt"></i> <a href="${f.venueLink}" target="_blank">${f.venue}</a></div>
                </div>
                <div class="match-footer">
                    <a href="${f.playCricketUrl}" target="_blank" class="btn btn-primary"><i class="fas fa-external-link-alt"></i> Play Cricket</a>
                     ${f.isWorldCup ? `<a href="/world-cup/index.html" class="btn btn-orange"><i class="fas fa-trophy"></i> World Cup Info</a>` : ''}
                </div>
            </div>
        `;
    }

    function renderFixtures(fixtures) {
        const now = new Date();
        const upcomingFixtures = fixtures
            .filter(f => {
                if (!f.date || !f.time || f.time === 'TBC') return false;
                const fixtureDate = new Date(`${f.date}T${f.time}`);
                return !isNaN(fixtureDate.getTime()) && fixtureDate > now;
            })
            .sort((a, b) => new Date(`${a.date}T${a.time}`) - new Date(`${b.date}T${b.time}`));

        if (nextMatchHighlight && upcomingFixtures.length > 0) {
            const nextMatch = upcomingFixtures[0];
            nextMatchHighlight.innerHTML = renderMatchCard(nextMatch, true);
        } else if (nextMatchHighlight) {
            nextMatchHighlight.innerHTML = `<div class="text-center">No upcoming fixtures found.</div>`;
        }

        if (fixtureListContainer) {
            const remainingFixtures = upcomingFixtures.slice(nextMatchHighlight && upcomingFixtures.length > 0 ? 1 : 0);
            if (remainingFixtures.length > 0) {
                fixtureListContainer.innerHTML = remainingFixtures.map(f => renderMatchCard(f)).join('');
            } else if (!nextMatchHighlight || upcomingFixtures.length === 0) {
                fixtureListContainer.innerHTML = `<div class="text-center">No further upcoming fixtures.</div>`;
            }
        }
    }

    function renderResults(results) {
        if (!resultList) return;
        resultList.innerHTML = results.map(r => `
            <div class="card result-card expandable" data-id="${r.id}">
                <div class="match-header">
                    <span class="match-date">${new Date(r.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                    <span class="match-badge badge-odi">${r.matchType}</span>
                </div>
                <div class="match-teams">
                    <div class="team-info">
                        <span class="team-name">${r.homeTeam}</span>
                        <span class="result-score">${r.homeScore}</span>
                    </div>
                    <div class="match-vs">VS</div>
                    <div class="team-info">
                        <span class="team-name">${r.awayTeam}</span>
                        <span class="result-score">${r.awayScore}</span>
                    </div>
                </div>
                <div class="text-center">
                    <div class="result-outcome">${r.result}</div>
                    <div class="match-details" style="max-height: 0; overflow: hidden; transition: max-height 0.5s ease-in-out;">
                        <p><strong>Competition:</strong> ${r.competition}</p>
                        <p><strong>Venue:</strong> <a href="${r.venueLink}" target="_blank">${r.venue}</a></p>
                        <a href="${r.playCricketUrl}" target="_blank" class="btn btn-primary"><i class="fas fa-external-link-alt"></i> View Scorecard</a>
                    </div>
                </div>
            </div>
        `).join('');

        // Add click event to expand/collapse result details
        resultList.querySelectorAll('.expandable').forEach(card => {
            card.addEventListener('click', () => {
                const details = card.querySelector('.match-details');
                if (details.style.maxHeight && details.style.maxHeight !== '0px') {
                    details.style.maxHeight = '0px';
                } else {
                    details.style.maxHeight = details.scrollHeight + 'px';
                }
            });
        });
    }

    function renderNewsPage(news) {
        if (!featuredStoryContainer || !latestNewsGrid) return;

        const sortedNews = news
            .filter(n => n.date && !isNaN(new Date(n.date).getTime()))
            .sort((a, b) => new Date(b.date) - new Date(a.date));

        if (sortedNews.length > 0) {
            const featuredStory = sortedNews[0];
            featuredStoryContainer.innerHTML = `
                <div class="card story-card featured-story">
                    <img src="${featuredStory.imageUrl}" alt="${featuredStory.title}" class="story-image">
                    <div class="story-content">
                        <h2 class="story-title">${featuredStory.title}</h2>
                        <p class="story-date">${new Date(featuredStory.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                        <p class="story-summary">${featuredStory.summary}</p>
                        <a href="/news/story.html?id=${story.id}" class="btn btn-primary">Read More</a>
                    </div>
                </div>
            `;

            const latestNews = sortedNews.slice(1, 5); // Display next 4 latest news
            if (latestNews.length > 0) {
                latestNewsGrid.innerHTML = latestNews.map(story => `
                    <div class="card story-card">
                        <img src="${story.imageUrl}" alt="${story.title}" class="story-image">
                        <div class="story-content">
                            <h3 class="story-title">${story.title}</h3>
                            <p class="story-date">${new Date(story.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                            <p class="story-summary">${story.summary}</p>
                            <a href="/news/story.html?id=${story.id}" class="btn btn-secondary">Read More</a>
                        </div>
                    </div>
                `).join('');
            } else {
                latestNewsGrid.innerHTML = '<p>No other news available.</p>';
            }
        } else {
            featuredStoryContainer.innerHTML = '<p>No news available.</p>';
            latestNewsGrid.innerHTML = '';
        }
    }

    function renderHomepagePreviews(fixtures, results, news, worldCupData) {
        const now = new Date();

        // Next Fixture Preview
        const upcomingFixtures = fixtures
            .filter(f => {
                if (!f.date || !f.time || f.time === 'TBC') return false;
                const fixtureDate = new Date(`${f.date}T${f.time}`);
                return !isNaN(fixtureDate.getTime()) && fixtureDate > now;
            })
            .sort((a, b) => new Date(`${a.date}T${a.time}`) - new Date(`${b.date}T${b.time}`));

        if (homepageNextFixture) {
            if (upcomingFixtures.length > 0) {
                const nextFixture = upcomingFixtures[0];
                homepageNextFixture.innerHTML = `
                    <h3>Next Match</h3>
                    <p>${new Date(nextFixture.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} - ${nextFixture.matchType}</p>
                    <p>${nextFixture.homeTeam} vs ${nextFixture.awayTeam}</p>
                    <p>${nextFixture.venue}</p>
                    <a href="/fixtures/index.html" class="btn btn-primary">View Details</a>
                `;
            } else {
                homepageNextFixture.innerHTML = `
                    <h3>Next Match</h3>
                    <p>No upcoming fixtures.</p>
                    <a href="/fixtures/index.html" class="btn btn-primary">View All Fixtures</a>
                `;
            }
        }

        // Latest Result Preview
        const latestResult = results
            .filter(r => r.date && !isNaN(new Date(r.date).getTime()))
            .sort((a, b) => new Date(b.date) - new Date(a.date));

        if (homepageLatestResult) {
            if (latestResult.length > 0) {
                const lastResult = latestResult[0];
                homepageLatestResult.innerHTML = `
                    <h3>Latest Result</h3>
                    <p>${new Date(lastResult.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} - ${lastResult.matchType}</p>
                    <p>${lastResult.homeTeam} ${lastResult.homeScore} vs ${lastResult.awayTeam} ${lastResult.awayScore}</p>
                    <p>${lastResult.result}</p>
                    <a href="/results/index.html" class="btn btn-primary">View Details</a>
                `;
            } else {
                homepageLatestResult.innerHTML = `
                    <h3>Latest Result</h3>
                    <p>No results available.</p>
                    <a href="/results/index.html" class="btn btn-primary">View All Results</a>
                `;
            }
        }

        // Latest News Preview
        const latestNews = news
            .filter(n => n.date && !isNaN(new Date(n.date).getTime()))
            .sort((a, b) => new Date(b.date) - new Date(a.date));

        if (homepageLatestNews) {
            if (latestNews.length > 0) {
                const story = latestNews[0];
                homepageLatestNews.innerHTML = `
                    <h3>Latest News</h3>
                    <h5>${story.title}</h5>
                    <p>${new Date(story.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                    <p>${story.summary}</p>
                    <a href="/news/story.html?id=${story.id}" class="btn btn-secondary">Read More</a>
                `;
            } else {
                homepageLatestNews.innerHTML = `
                    <h3>Latest News</h3>
                    <p>No news available.</p>
                    <a href="/news/index.html" class="btn btn-primary">View All News</a>
                `;
            }
        }

        // World Cup Preview
        if (homepageWorldCupPreview && worldCupData && worldCupData.overview) {
            homepageWorldCupPreview.innerHTML = `
                <h3>${worldCupData.overview.title}</h3>
                <p>${worldCupData.overview.description}</p>
                <a href="/world-cup/index.html" class="btn btn-orange">Learn More</a>
            `;
        }
    }

    function setupResultFilters() {
        const yearFilter = document.getElementById('year-filter');
        const opponentFilter = document.getElementById('opponent-filter');
        const competitionFilter = document.getElementById('competition-filter');
        const resultFilter = document.getElementById('result-filter');
        const applyFiltersBtn = document.getElementById('apply-filters');
        const resetFiltersBtn = document.getElementById('reset-filters');

        if (!yearFilter) return; // Filters not on this page

        const allResults = window.allResults;
        const opponents = [...new Set(allResults.flatMap(r => [r.homeTeam, r.awayTeam]))].sort();
        const competitions = [...new Set(allResults.map(r => r.competition))].sort();
        const years = [...new Set(allResults.map(r => new Date(r.date).getFullYear()))].sort((a, b) => b - a);

        opponents.forEach(o => opponentFilter.innerHTML += `<option value="${o}">${o}</option>`);
        competitions.forEach(c => competitionFilter.innerHTML += `<option value="${c}">${c}</option>`);
        years.forEach(y => yearFilter.innerHTML += `<option value="${y}">${y}</option>`);

        const applyFilters = () => {
            const selectedYear = yearFilter.value;
            const selectedOpponent = opponentFilter.value;
            const selectedCompetition = competitionFilter.value;
            const selectedResult = resultFilter.value;

            let filteredResults = allResults;

            if (selectedYear !== 'all') {
                filteredResults = filteredResults.filter(r => new Date(r.date).getFullYear().toString() === selectedYear);
            }

            if (selectedOpponent !== 'all') {
                filteredResults = filteredResults.filter(r => r.homeTeam === selectedOpponent || r.awayTeam === selectedOpponent);
            }

            if (selectedCompetition !== 'all') {
                filteredResults = filteredResults.filter(r => r.competition === selectedCompetition);
            }

            if (selectedResult !== 'all') {
                filteredResults = filteredResults.filter(r => r.result === selectedResult);
            }

            renderResults(filteredResults);
        };

        applyFiltersBtn.addEventListener('click', applyFilters);
        resetFiltersBtn.addEventListener('click', () => {
            yearFilter.value = 'all';
            opponentFilter.value = 'all';
            competitionFilter.value = 'all';
            resultFilter.value = 'all';
            applyFilters();
        });
    }
});
