document.addEventListener("DOMContentLoaded", () => {
    // Determine base path for GitHub Pages
    const getBasePath = () => {
        const path = window.location.pathname;
        const parts = path.split("/");
        // If hosted at https://<username>.github.io/<repository-name>/, parts[1] will be <repository-name>
        // If hosted at https://<username>.github.io/, parts[1] will be empty
        if (parts.length > 1 && parts[1] === "eng40s-website") { // Explicitly check for repository name
            return "/" + parts[1];
        }
        return "";
    };
    const basePath = getBasePath();

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

    // Load header and footer with repository-aware paths
    loadComponent(`${basePath}/components/header.html`, "header-placeholder");
    loadComponent(`${basePath}/components/footer.html`, "footer-placeholder");

    // Path highlighting function
    const highlightActiveNav = () => {
        const currentPath = window.location.pathname;
        const navLinks = document.querySelectorAll(".nav ul li a");
        navLinks.forEach(link => {
            const href = link.getAttribute("href");
            // Adjust href for GitHub Pages subpath
            const adjustedHref = `${basePath}${href}`.replace(/\/index\.html$/, ""); // Remove /index.html for comparison

            const cleanedCurrentPath = currentPath.endsWith("/") ? currentPath.slice(0, -1) : currentPath;
            const cleanedAdjustedHref = adjustedHref.endsWith("/") ? adjustedHref.slice(0, -1) : adjustedHref;

            if (cleanedAdjustedHref === cleanedCurrentPath || (cleanedCurrentPath === basePath && cleanedAdjustedHref === basePath) || (cleanedCurrentPath === `${basePath}/` && cleanedAdjustedHref === basePath)) { // Match root or base path
                link.classList.add("active");
            } else if (cleanedCurrentPath.startsWith(cleanedAdjustedHref) && cleanedAdjustedHref !== basePath && cleanedAdjustedHref !== `${basePath}/`) {
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
            fetch(`${basePath}/assets/data/fixtures.json`).then(res => res.json()).catch(() => []),
            fetch(`${basePath}/assets/data/results.json`).then(res => res.json()).catch(() => []),
            fetch(`${basePath}/assets/data/news.json`).then(res => res.json()).catch(() => []),
            fetch(`${basePath}/assets/data/worldcup.json`).then(res => res.json()).catch(() => ({})),
        ]).then(([fixtures, results, news, worldCupData]) => {
            renderHomepagePreviews(fixtures, results, news, worldCupData);
        }).catch(err => console.error("Error loading homepage data:", err));
    }

    // Other page specific data loading
    if (fixtureListContainer || nextMatchHighlight) {
        fetch(`${basePath}/assets/data/fixtures.json`)
            .then(res => res.json())
            .then(data => renderFixtures(data))
            .catch(err => console.error("Error loading fixtures:", err));
    }

    if (resultList) {
        fetch(`${basePath}/assets/data/results.json`)
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
        fetch(`${basePath}/assets/data/worldcup.json`)
            .then(res => res.json())
            .then(data => renderWorldCupPage(data))
            .catch(err => console.error("Error loading World Cup data:", err));
    }

    const featuredStoryContainer = document.getElementById("featured-story-container");
    const latestNewsGrid = document.getElementById("latest-news-grid");

    if (featuredStoryContainer || latestNewsGrid) {
        fetch(`${basePath}/assets/data/news.json`)
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
                     ${f.isWorldCup ? `<a href="${basePath}/world-cup/index.html" class="btn btn-orange"><i class="fas fa-trophy"></i> World Cup Info</a>` : ''}
                </div>
            </div>
        `;
    }

    function renderFixtures(fixtures) {
        const now = new Date();
        const upcomingFixtures = fixtures
            .filter(f => {
                const fixtureDate = new Date(f.date + ' ' + f.time);
                return !isNaN(fixtureDate.getTime()) && f.time !== 'TBC' && fixtureDate > now;
            })
            .sort((a, b) => new Date(a.date + ' ' + a.time) - new Date(b.date + ' ' + b.time));

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
                    <div class="match-details" style="margin-top: 8px;">
                        <div class="detail-item" style="justify-content: center;"><i class="fas fa-map-marker-alt"></i> ${r.venue}</div>
                    </div>
                </div>
                <div class="match-footer" style="justify-content: center; margin-top: 16px;">
                    <a href="${r.playCricketUrl}" target="_blank" class="btn btn-secondary"><i class="fas fa-file-alt"></i> Full Scorecard</a>
                </div>
                ${r.reportUrl || (r.highlights && r.highlights.length > 0) || (r.photos && r.photos.length > 0) ? `
                <div class="expanded-content">
                    ${r.reportUrl ? `<h4>Match Report</h4><p><a href="${r.reportUrl}" target="_blank">Read Full Report</a></p>` : ''}
                    ${r.highlights && r.highlights.length > 0 ? `<h4>Highlights</h4><ul>${r.highlights.map(h => `<li><a href="${h.url}" target="_blank">${h.title}</a></li>`).join('')}</ul>` : ''}
                    ${r.photos && r.photos.length > 0 ? `<h4>Photos</h4><div class="media-gallery">${r.photos.map(p => `<img src="${p}" alt="Match Photo">`).join('')}</div>` : ''}
                </div>
                ` : ''}
            </div>
        `).join('');

        document.querySelectorAll('.result-card.expandable').forEach(card => {
            card.addEventListener('click', (event) => {
                // Prevent card click from triggering if a link inside is clicked
                if (event.target.tagName === 'A' || event.target.closest('a')) {
                    return; // Do nothing if a link was clicked
                }
                card.classList.toggle('expanded');
            });
        });
    }

    function renderWorldCupPage(data) {
        const { overview, squad, groups, news, pressReleases } = data;

        // Render Overview
        const worldCupOverview = document.getElementById("world-cup-overview");
        if (worldCupOverview && overview) {
            worldCupOverview.innerHTML = `
                <h2>${overview.title}</h2>
                <p>${overview.description}</p>
                ${overview.imageUrl ? `<img src="${overview.imageUrl}" alt="${overview.title}" class="img-fluid">` : ''}
                ${overview.link ? `<a href="${overview.link}" target="_blank" class="btn btn-primary mt-3">Learn More</a>` : ''}
            `;
        }

        // Render Squad
        const worldCupSquad = document.getElementById("world-cup-squad");
        if (worldCupSquad && squad && squad.length > 0) {
            worldCupSquad.innerHTML = `
                <h3>Squad</h3>
                <div class="squad-grid">
                    ${squad.map(player => `
                        <div class="player-card">
                            ${player.imageUrl ? `<img src="${player.imageUrl}" alt="${player.name}">` : ''}
                            <h4>${player.name}</h4>
                            <p>${player.role}</p>
                        </div>
                    `).join('')}
                </div>
            `;
        }

        // Render Groups
        const worldCupGroups = document.getElementById("world-cup-groups");
        if (worldCupGroups && groups && groups.length > 0) {
            worldCupGroups.innerHTML = `
                <h3>Groups</h3>
                <div class="groups-container">
                    ${groups.map(group => `
                        <div class="group-card">
                            <h4>${group.name}</h4>
                            <ul>
                                ${group.teams.map(team => `<li>${team}</li>`).join('')}
                            </ul>
                        </div>
                    `).join('')}
                </div>
            `;
        }

        // Render News
        const worldCupNews = document.getElementById("world-cup-news");
        if (worldCupNews && news && news.length > 0) {
            worldCupNews.innerHTML = `
                <h3>News</h3>
                <div class="news-list">
                    ${news.map(item => `
                        <div class="news-item">
                            <h4><a href="${item.link}" target="_blank">${item.title}</a></h4>
                            <span class="date">${new Date(item.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                            <p>${item.summary}</p>
                        </div>
                    `).join('')}
                </div>
            `;
        }

        // Render Press Releases
        const worldCupPressReleases = document.getElementById("world-cup-press-releases");
        if (worldCupPressReleases && pressReleases && pressReleases.length > 0) {
            worldCupPressReleases.innerHTML = `
                <h3>Press Releases</h3>
                <div class="press-releases-list">
                    ${pressReleases.map(item => `
                        <div class="press-release-item">
                            <h4><a href="${item.link}" target="_blank">${item.title}</a></h4>
                            <span class="date">${new Date(item.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                            <p>${item.summary}</p>
                        </div>
                    `).join('')}
                </div>
            `;
        }
    }

    function renderNewsPage(data) {
        const { featured, otherNews } = data;

        const featuredStoryContainer = document.getElementById("featured-story-container");
        if (featuredStoryContainer && featured) {
            featuredStoryContainer.innerHTML = `
                <div class="featured-card">
                    ${featured.imageUrl ? `<img src="${featured.imageUrl}" alt="${featured.title}">` : ''}
                    ${featured.category ? `<span class="category-badge">${featured.category}</span>` : ''}
                    <h2>${featured.title}</h2>
                    <span class="date">${new Date(featured.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                    <p>${featured.summary}</p>
                    <a href="${featured.link}" target="_blank" class="btn btn-primary">Read More</a>
                </div>
            `;
        }

        const latestNewsGrid = document.getElementById("latest-news-grid");
        if (latestNewsGrid && otherNews.length > 0) {
            latestNewsGrid.innerHTML = otherNews.map(story => `
                <div class="news-card">
                    ${story.imageUrl ? `<img src="${story.imageUrl}" alt="${story.title}">` : ''}
                    ${story.category ? `<span class="category-badge">${story.category}</span>` : ''}
                    <h3>${story.title}</h3>
                    <span class="date">${new Date(story.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                    <p>${story.summary}</p>               </div>
            `).join('');
        } else if (latestNewsGrid) {
            latestNewsGrid.innerHTML = `<div class="text-center">No other news available.</div>`;
        }
    }

    function renderHomepagePreviews(fixtures, results, news, worldCupData) {
        const now = new Date();

        // Next Fixture Preview
        const upcomingFixtures = fixtures
            .filter(f => {
                const fixtureDate = new Date(f.date + ' ' + f.time);
                return !isNaN(fixtureDate.getTime()) && f.time !== 'TBC' && fixtureDate > now;
            })
            .sort((a, b) => new Date(a.date + ' ' + a.time) - new Date(b.date + ' ' + b.time));

        const homepageNextFixture = document.getElementById("homepage-next-fixture");
        if (homepageNextFixture) {
            const nextFixture = upcomingFixtures[0];
            if (nextFixture) {
                homepageNextFixture.innerHTML = `
                    <div class="card">
                        <h4>Next Match</h4>
                        <p>${new Date(nextFixture.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} - ${nextFixture.matchType}</p>
                        <p>${nextFixture.homeTeam} vs ${nextFixture.awayTeam}</p>
                        <p>${nextFixture.venue}</p>
                        <a href="${basePath}/fixtures/index.html" class="btn btn-sm btn-primary">View Details</a>
                    </div>
                `;
            } else {
                homepageNextFixture.innerHTML = `<div class="card"><h4>Next Match</h4><p>No upcoming fixtures.</p></div>`;
            }
        }

        // Latest Result Preview
        const latestResult = results
            .filter(r => !isNaN(new Date(r.date).getTime())) // Filter out invalid dates
            .sort((a, b) => new Date(b.date) - new Date(a.date))[0];

        const homepageLatestResult = document.getElementById("homepage-latest-result");
        if (homepageLatestResult) {
            const latestResultEntry = latestResult;
            if (latestResultEntry) {
                homepageLatestResult.innerHTML = `
                    <div class="card">
                        <h4>Latest Result</h4>
                        <p>${new Date(latestResultEntry.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} - ${latestResultEntry.matchType}</p>
                        <p>${latestResultEntry.homeTeam} ${latestResultEntry.homeScore} vs ${latestResultEntry.awayTeam} ${latestResultEntry.awayScore}</p>
                        <p>${latestResultEntry.result}</p>
                        <a href="${basePath}/results/index.html" class="btn btn-sm btn-primary">View Details</a>
                    </div>
                `;
            } else {
                homepageLatestResult.innerHTML = `<div class="card"><h4>Latest Result</h4><p>No results available.</p></div>`;
            }
        }

        // Latest News Preview
        const latestNews = news
            .filter(n => !isNaN(new Date(n.date).getTime())) // Filter out invalid dates
            .sort((a, b) => new Date(b.date) - new Date(a.date))[0];

        const homepageLatestNews = document.getElementById("homepage-latest-news");
        if (homepageLatestNews) {
            const latestNewsEntry = latestNews;
            if (latestNewsEntry) {
                homepageLatestNews.innerHTML = `
                    <div class="card">
                        <h4>Latest News</h4>
                        <h5>${latestNewsEntry.title}</h5>
                        <p>${new Date(latestNewsEntry.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                        <p>${latestNewsEntry.summary.substring(0, 100)}...</p>
                        <a href="${basePath}/news/index.html" class="btn btn-sm btn-primary">Read More</a>
                    </div>
                `;
            } else {
                homepageLatestNews.innerHTML = `<div class="card"><h4>Latest News</h4><p>No news available.</p></div>`;
            }
        }

        // World Cup Preview
        const homepageWorldCupPreview = document.getElementById("homepage-world-cup-preview");
        if (homepageWorldCupPreview && worldCupData && worldCupData.overview) {
            homepageWorldCupPreview.innerHTML = `
                <div class="card">
                    <h4>${worldCupData.overview.title}</h4>
                    <p>${worldCupData.overview.description.substring(0, 150)}...</p>
                    <a href="${basePath}/world-cup/index.html" class="btn btn-sm btn-primary">Learn More</a>
                </div>
            `;
        } else if (homepageWorldCupPreview) {
            homepageWorldCupPreview.innerHTML = `<div class="card"><h4>World Cup</h4><p>World Cup information not available.</p></div>`;
        }
    }

    // Filter functionality for results page
    function setupResultFilters() {
        const yearFilter = document.getElementById('year-filter');
        const opponentFilter = document.getElementById('opponent-filter');
        const competitionFilter = document.getElementById('competition-filter');
        const resultFilter = document.getElementById('result-filter');
        const applyFiltersBtn = document.getElementById('apply-filters-btn');
        const resetFiltersBtn = document.getElementById('reset-filters-btn');

        if (!yearFilter || !opponentFilter || !competitionFilter || !resultFilter || !applyFiltersBtn || !resetFiltersBtn) return;

        const populateFilters = () => {
            const years = [...new Set(window.allResults.map(r => new Date(r.date).getFullYear()))].sort((a, b) => b - a);
            yearFilter.innerHTML = '<option value="all">All Years</option>' + years.map(year => `<option value="${year}">${year}</option>`).join('');

            const opponents = [...new Set(window.allResults.flatMap(r => [r.homeTeam, r.awayTeam]))].filter(team => team !== 'England Over 40s').sort();
            opponentFilter.innerHTML = '<option value="all">All Opponents</option>' + opponents.map(opp => `<option value="${opp}">${opp}</option>`).join('');

            const competitions = [...new Set(window.allResults.map(r => r.competition))].sort();
            competitionFilter.innerHTML = '<option value="all">All Competitions</option>' + competitions.map(comp => `<option value="${comp}">${comp}</option>`).join('');

            const results = [...new Set(window.allResults.map(r => r.result))].sort();
            resultFilter.innerHTML = '<option value="all">All Results</option>' + results.map(res => `<option value="${res}">${res}</option>`).join('');
        };

        populateFilters();

        const applyFilters = () => {
            const selectedYear = yearFilter.value;
            const selectedOpponent = opponentFilter.value;
            const selectedCompetition = competitionFilter.value;
            const selectedResult = resultFilter.value;

            let filteredResults = window.allResults;

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
