/* /home/ubuntu/assets/js/main.js */

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
    loadComponent("../components/header.html", "header-placeholder");
    loadComponent("../components/footer.html", "footer-placeholder");

    // Path highlighting function
    const highlightActiveNav = () => {
        const currentPath = window.location.pathname;
        const navLinks = document.querySelectorAll(".nav ul li a");
        navLinks.forEach(link => {
            const href = link.getAttribute("href");
            if (href === currentPath || (currentPath === "/" && href === "/index.html") || (currentPath.includes(href.replace("index.html", "")) && href !== "/index.html")) {
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
             fetch("./assets/data/fixtures.json").then(res => res.json()).catch(() => []),
            fetch("./assets/data/results.json").then(res => res.json()).catch(() => []),
            fetch("./assets/data/news.json").then(res => res.json()).catch(() => []),
            fetch("./assets/data/worldcup.json").then(res => res.json()).catch(() => ({})),
        ]).then(([fixtures, results, news, worldCupData]) => {
            renderHomepagePreviews(fixtures, results, news, worldCupData);
        }).catch(err => console.error("Error loading homepage data:", err));
    }

    // Other page specific data loading
    if (fixtureListContainer || nextMatchHighlight) {
        fetch("../assets/data/fixtures.json")
            .then(res => res.json())
            .then(data => renderFixtures(data))
            .catch(err => console.error("Error loading fixtures:", err));
    }

    if (resultList) {
        fetch("../assets/data/results.json")
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
        fetch("../assets/data/worldcup.json")
            .then(res => res.json())
            .then(data => renderWorldCupPage(data))
            .catch(err => console.error("Error loading World Cup data:", err));
    }

    const featuredStoryContainer = document.getElementById("featured-story-container");
    const latestNewsGrid = document.getElementById("latest-news-grid");

    if (featuredStoryContainer || latestNewsGrid) {
        fetch("../assets/data/news.json")
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
                     ${f.isWorldCup ? `<a href="./world-cup/index.html" class="btn btn-orange"><i class="fas fa-trophy"></i> World Cup Info</a>` : ''}
                </div>
            </div>
        `;
    }

    function renderFixtures(fixtures) {
        const now = new Date();
        const upcomingFixtures = fixtures.filter(f => new Date(f.date + ' ' + f.time) > now).sort((a, b) => new Date(a.date + ' ' + a.time) - new Date(b.date + ' ' + b.time));

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
                    return;
                }
                const expandedContent = card.querySelector('.expanded-content');
                if (expandedContent) {
                    expandedContent.classList.toggle('open');
                }
            });
        });
    }

    function setupResultFilters() {
        const yearFilter = document.getElementById("year-filter");
        const opponentFilter = document.getElementById("opponent-filter");
        const competitionFilter = document.getElementById("competition-filter");
        const resultFilter = document.getElementById("result-filter");
        const searchInput = document.getElementById("search-input");

        const applyFilters = () => {
            let filteredResults = window.allResults;

            const selectedYear = yearFilter.value;
            if (selectedYear !== "all") {
                filteredResults = filteredResults.filter(r => new Date(r.date).getFullYear().toString() === selectedYear);
            }

            const selectedOpponent = opponentFilter.value;
            if (selectedOpponent !== "all") {
                filteredResults = filteredResults.filter(r => r.homeTeam === selectedOpponent || r.awayTeam === selectedOpponent);
            }

            const selectedCompetition = competitionFilter.value;
            if (selectedCompetition !== "all") {
                filteredResults = filteredResults.filter(r => r.matchType === selectedCompetition);
            }

            const selectedResult = resultFilter.value;
            if (selectedResult !== "all") {
                filteredResults = filteredResults.filter(r => r.result.toLowerCase().includes(selectedResult.toLowerCase()));
            }

            const searchTerm = searchInput.value.toLowerCase();
            if (searchTerm) {
                filteredResults = filteredResults.filter(r => 
                    r.homeTeam.toLowerCase().includes(searchTerm) ||
                    r.awayTeam.toLowerCase().includes(searchTerm) ||
                    r.venue.toLowerCase().includes(searchTerm) ||
                    r.result.toLowerCase().includes(searchTerm)
                );
            }

            renderResults(filteredResults);
        };

        if (yearFilter) yearFilter.addEventListener("change", applyFilters);
        if (opponentFilter) opponentFilter.addEventListener("change", applyFilters);
        if (competitionFilter) competitionFilter.addEventListener("change", applyFilters);
        if (resultFilter) resultFilter.addEventListener("change", applyFilters);
        if (searchInput) searchInput.addEventListener("input", applyFilters);

        // Populate filter options dynamically
        const populateFilters = () => {
            if (window.allResults) {
                if (yearFilter) {
                    const years = [...new Set(window.allResults.map(r => new Date(r.date).getFullYear().toString()))].sort((a, b) => b - a);
                    years.forEach(year => {
                        const option = document.createElement('option');
                        option.value = year;
                        option.textContent = year;
                        yearFilter.appendChild(option);
                    });
                }

                if (opponentFilter) {
                    const opponents = [...new Set(window.allResults.reduce((acc, r) => acc.concat([r.homeTeam, r.awayTeam]), []))].sort();
                    opponents.forEach(opponent => {
                        const option = document.createElement('option');
                        option.value = opponent;
                        option.textContent = opponent;
                        opponentFilter.appendChild(option);
                    });
                }

                if (competitionFilter) {
                    const competitions = [...new Set(window.allResults.map(r => r.matchType))].sort();
                    competitions.forEach(comp => {
                        const option = document.createElement('option');
                        option.value = comp;
                        option.textContent = comp;
                        competitionFilter.appendChild(option);
                    });
                }
            }
        };
        populateFilters();
    }

    function renderWorldCupPage(data) {
        if (!data) return;

        // Render Tournament Overview
        if (worldCupOverview) {
            worldCupOverview.innerHTML = `
                <h2 class="section-title">${data.tournament.title}</h2>
                <p class="text-center">${data.tournament.overview}</p>
                <p class="text-center"><strong>Location:</strong> ${data.tournament.location} | <strong>Dates:</strong> ${data.tournament.dates}</p>
            `;
        }

        // Render Squad Profiles
        if (worldCupSquad && data.squad && data.squad.length > 0) {
            worldCupSquad.innerHTML = `
                <h2 class="section-title">England Squad</h2>
                <div class="squad-grid">
                    ${data.squad.map(player => `
                        <div class="player-card">
                            <img src="${player.imageUrl}" alt="${player.name}">
                            <h3>${player.name}</h3>
                            <p class="role">${player.role}</p>
                        </div>
                    `).join('')}
                </div>
            `;
        }

        // Render Group Tables
        if (worldCupGroups && data.groups && data.groups.length > 0) {
            worldCupGroups.innerHTML = `
                <h2 class="section-title">Group Standings</h2>
                ${data.groups.map(group => `
                    <h3>${group.name}</h3>
                    <table class="group-table">
                        <thead>
                            <tr>
                                <th>Team</th>
                                <th>P</th>
                                <th>W</th>
                                <th>L</th>
                                <th>NRR</th>
                                <th>Pts</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${group.teams.map(team => `
                                <tr>
                                    <td class="team-name-col">${team.name}</td>
                                    <td>${team.played}</td>
                                    <td>${team.won}</td>
                                    <td>${team.lost}</td>
                                    <td>${team.nrr}</td>
                                    <td>${team.points}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                `).join('')}
            `;
        }

        // Render News Bulletins
        if (worldCupNews && data.news && data.news.length > 0) {
            worldCupNews.innerHTML = `
                <h2 class="section-title">Latest World Cup News</h2>
                <div class="world-cup-news-grid">
                    ${data.news.map(item => `
                        <div class="card world-cup-news-card">
                            <h3>${item.title}</h3>
                            <span class="date">${new Date(item.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                            <p>${item.summary}<                    </div>
                    `).join('')}
                </div>
            `;
        }

        // Render Press Releases
        if (worldCupPressReleases && data.pressReleases && data.pressReleases.length > 0) {
            worldCupPressReleases.innerHTML = `
                <h2 class="section-title">Official Press Releases</h2>
                <div class="world-cup-news-grid">
                    ${data.pressReleases.map(item => `
                        <div class="card world-cup-news-card">
                            <h3>${item.title}</h3>
                            <span class="date">${new Date(item.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                            <a href="${item.link}" class="btn btn-secondary">View Release</a>
                        </div>
                    `).join('')}
                </div>
            `;
        }
    }

    function renderNewsPage(newsData) {
        if (!newsData) return;

        const featuredStory = newsData.find(story => story.featured);
        const otherNews = newsData.filter(story => !story.featured);

        if (featuredStoryContainer && featuredStory) {
            featuredStoryContainer.innerHTML = `
                <div class="featured-story">
                    <h2>${featuredStory.title}</h2>
                    <p>${featuredStory.summary}</p>
                    <a href="${featuredStory.link}" class="btn">Read More</a>
                </div>
            `;
        } else if (featuredStoryContainer) {
            featuredStoryContainer.innerHTML = `<div class="text-center">No featured story available.</div>`;
        }

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
        if (homepageNextFixture) {
            const upcomingFixtures = fixtures.filter(f => new Date(f.date + ' ' + f.time) > now).sort((a, b) => new Date(a.date + ' ' + a.time) - new Date(b.date + ' ' + b.time));
            if (upcomingFixtures.length > 0) {
                homepageNextFixture.innerHTML = `
                    <h3>Next Match</h3>
                    ${renderMatchCard(upcomingFixtures[0])}
                    <a href="/fixtures/index.html" class="btn btn-primary">View All Fixtures</a>
                `;
            } else {
                homepageNextFixture.innerHTML = `<h3>Next Match</h3><p>No upcoming fixtures.</p><a href="/fixtures/index.html" class="btn btn-primary">View All Fixtures</a>`;
            }
        }

        // Latest Result Preview
        if (homepageLatestResult) {
            const latestResult = results.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
            if (latestResult) {
                homepageLatestResult.innerHTML = `
                    <h3>Latest Result</h3>
                    <div class="card result-card">
                        <div class="match-header">
                            <span class="match-date">${new Date(latestResult.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                            <span class="match-badge badge-odi">${latestResult.matchType}</span>
                        </div>
                        <div class="match-teams">
                            <div class="team-info">
                                <span class="team-name">${latestResult.homeTeam}</span>
                                <span class="result-score">${latestResult.homeScore}</span>
                            </div>
                            <div class="match-vs">VS</div>
                            <div class="team-info">
                                <span class="team-name">${latestResult.awayTeam}</span>
                                <span class="result-score">${latestResult.awayScore}</span>
                            </div>
                        </div>
                        <div class="text-center">
                            <div class="result-outcome">${latestResult.result}</div>
                            <div class="match-details" style="margin-top: 8px;">
                                <div class="detail-item" style="justify-content: center;"><i class="fas fa-map-marker-alt"></i> ${latestResult.venue}</div>
                            </div>
                        </div>
                        <div class="match-footer" style="justify-content: center; margin-top: 16px;">
                            <a href="${latestResult.playCricketUrl}" target="_blank" class="btn btn-secondary"><i class="fas fa-file-alt"></i> Full Scorecard</a>
                        </div>
                                         <!-- No dedicated news detail page, content displayed directly -->All Results</a>
                `;
            } else {
                homepageLatestResult.innerHTML = `<h3>Latest Result</h3><p>No results available.</p><a href="/results/index.html" class="btn btn-primary">View All Results</a>`;
            }
        }

        // Latest News Preview
        if (homepageLatestNews) {
            const latestNews = news.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
            if (latestNews) {
                homepageLatestNews.innerHTML = `
                    <h3>Latest News</h3>
                    <div class="news-card">
                        ${latestNews.imageUrl ? `<img src="${latestNews.imageUrl}" alt="${latestNews.title}">` : ''}
                        ${latestNews.category ? `<span class="category-badge">${latestNews.category}</span>` : ''}
                        <h3>${latestNews.title}</h3>
                        <span class="date">${new Date(latestNews.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                        <p>${latestNews.summary}</p
                                        <!-- No dedicated news detail page, content displayed directly -->
                `;
            } else {
                homepageLatestNews.innerHTML = `<h3>Latest News</h3><p>No news available.</p><a href="./news/index.html" class="btn btn-primary">View All News</a>`;
            }
        }

        // World Cup Preview
        if (homepageWorldCupPreview && worldCupData.tournament) {
            homepageWorldCupPreview.innerHTML = `
                <h3>${worldCupData.tournament.title}</h3>
                <p>${worldCupData.tournament.overview}</p>
                <a href="/world-cup/index.html" class="btn btn-orange">Learn More</a>
            `;
        } else if (homepageWorldCupPreview) {
            homepageWorldCupPreview.innerHTML = `<h3>World Cup</h3><p>World Cup information coming soon.</p><a href="/world-cup/index.html" class="btn btn-orange">Learn More</a>`;
        }
    }
});
