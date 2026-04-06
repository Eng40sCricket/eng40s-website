document.addEventListener("DOMContentLoaded", () => {
    // Determine base path for GitHub Pages project sites.
    // On GitHub Pages, a project site is served under /<repo-name>/
    // so all absolute paths must be prefixed with /<repo-name>.
    // On a custom domain or local dev, the base path is empty.
    const getBasePath = () => {
        const path = window.location.pathname;
        const repoName = "eng40s-website";
        if (path.startsWith("/" + repoName + "/") || path === "/" + repoName) {
            return "/" + repoName;
        }
        return "";
    };
    const basePath = getBasePath();

    // Function to load HTML content into a target element
    const loadComponent = async (componentPath, targetId) => {
        try {
            const fullUrl = basePath + componentPath;
            const response = await fetch(fullUrl);
            if (!response.ok) {
                throw new Error("HTTP error! status: " + response.status);
            }
            const html = await response.text();
            const target = document.getElementById(targetId);
            if (target) {
                target.innerHTML = html;

                // After injecting header/footer, fix root-relative paths inside them
                fixComponentPaths(target);

                // Re-run path highlighting after header is loaded
                if (targetId === "header-placeholder") {
                    highlightActiveNav();
                }
            }
        } catch (error) {
            console.error("Failed to load component from " + componentPath + ":", error);
        }
    };

    // Fix root-relative paths in dynamically loaded components (header/footer)
    // The header.html and footer.html use root-relative paths like /index.html, /assets/img/...
    // We need to prefix them with basePath for GitHub Pages.
    const fixComponentPaths = (container) => {
        if (!basePath) return; // No fix needed if basePath is empty

        // Fix all <a href="/..."> links
        container.querySelectorAll("a[href^='/']").forEach(el => {
            const href = el.getAttribute("href");
            if (!href.startsWith(basePath)) {
                el.setAttribute("href", basePath + href);
            }
        });

        // Fix all <img src="/..."> images
        container.querySelectorAll("img[src^='/']").forEach(el => {
            const src = el.getAttribute("src");
            if (!src.startsWith(basePath)) {
                el.setAttribute("src", basePath + src);
            }
        });
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
            if (!href) return;

            // Normalize both paths for comparison: remove trailing /index.html and trailing /
            const normalize = (p) => p.replace(/\/index\.html$/, "").replace(/\/$/, "") || "/";
            const normalizedCurrent = normalize(currentPath);
            const normalizedHref = normalize(href);

            if (normalizedCurrent === normalizedHref) {
                link.classList.add("active");
            } else if (normalizedHref !== normalize(basePath) && normalizedCurrent.startsWith(normalizedHref + "/")) {
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
            fetch(basePath + "/assets/data/fixtures.json").then(res => res.json()).catch(() => []),
            fetch(basePath + "/assets/data/results.json").then(res => res.json()).catch(() => []),
            fetch(basePath + "/assets/data/news.json").then(res => res.json()).catch(() => []),
            fetch(basePath + "/assets/data/worldcup.json").then(res => res.json()).catch(() => ({})),
        ]).then(([fixtures, results, news, worldCupData]) => {
            renderHomepagePreviews(fixtures, results, news, worldCupData);
        }).catch(err => {
            console.error("Error loading homepage data:", err);
        });
    }

    // Fixtures page data loading
    if (fixtureListContainer || nextMatchHighlight) {
        fetch(basePath + "/assets/data/fixtures.json")
            .then(res => res.json())
            .then(data => renderFixtures(data))
            .catch(err => console.error("Error loading fixtures:", err));
    }

    // Results page data loading
    if (resultList) {
        fetch(basePath + "/assets/data/results.json")
            .then(res => res.json())
            .then(data => {
                window.allResults = data;
                renderResults(data);
                setupResultFilters();
            })
            .catch(err => console.error("Error loading results:", err));
    }

    // World Cup page data loading
    const worldCupOverview = document.getElementById("world-cup-overview");
    const worldCupSquad = document.getElementById("world-cup-squad");
    const worldCupGroups = document.getElementById("world-cup-groups");
    const worldCupNews = document.getElementById("world-cup-news");
    const worldCupPressReleases = document.getElementById("world-cup-press-releases");

    if (worldCupOverview || worldCupSquad || worldCupGroups || worldCupNews || worldCupPressReleases) {
        fetch(basePath + "/assets/data/worldcup.json")
            .then(res => res.json())
            .then(data => renderWorldCupPage(data))
            .catch(err => console.error("Error loading World Cup data:", err));
    }

    // News page data loading
    const featuredStoryContainer = document.getElementById("featured-story-container");
    const latestNewsGrid = document.getElementById("latest-news-grid");

    if (featuredStoryContainer || latestNewsGrid) {
        fetch(basePath + "/assets/data/news.json")
            .then(res => res.json())
            .then(data => renderNewsPage(data))
            .catch(err => console.error("Error loading news data:", err));
    }

    // ========== RENDER FUNCTIONS ==========

    function renderMatchCard(f, isHighlight) {
        isHighlight = isHighlight || false;
        const dateOptions = isHighlight
            ? { weekday: "long", day: "numeric", month: "long", year: "numeric" }
            : { day: "numeric", month: "short", year: "numeric" };
        return '<div class="card match-card ' + (isHighlight ? "highlight-card" : "") + '">'
            + '<div class="match-header">'
            + '<span class="match-date">' + new Date(f.date).toLocaleDateString("en-GB", dateOptions) + '</span>'
            + '<span class="match-badge ' + (f.isWorldCup ? "badge-wc" : "badge-odi") + '">' + f.matchType + '</span>'
            + '</div>'
            + '<div class="match-teams">'
            + '<div class="team-info"><div class="team-logo"><i class="fas fa-shield-alt"></i></div><span class="team-name">' + f.homeTeam + '</span></div>'
            + '<div class="match-vs">VS</div>'
            + '<div class="team-info"><div class="team-logo"><i class="fas fa-shield-alt"></i></div><span class="team-name">' + f.awayTeam + '</span></div>'
            + '</div>'
            + '<div class="match-details">'
            + '<div class="detail-item"><i class="far fa-clock"></i> ' + f.time + '</div>'
            + '<div class="detail-item"><i class="fas fa-map-marker-alt"></i> <a href="' + f.venueLink + '" target="_blank">' + f.venue + '</a></div>'
            + '</div>'
            + '<div class="match-footer">'
            + '<a href="' + f.playCricketUrl + '" target="_blank" class="btn btn-primary"><i class="fas fa-external-link-alt"></i> Play Cricket</a>'
            + (f.isWorldCup ? ' <a href="' + basePath + '/world-cup/index.html" class="btn btn-orange"><i class="fas fa-trophy"></i> World Cup Info</a>' : '')
            + '</div>'
            + '</div>';
    }

    function renderFixtures(fixtures) {
        var now = new Date();
        var upcomingFixtures = fixtures
            .filter(function(f) {
                if (!f.date || !f.time || f.time === "TBC") return false;
                var fixtureDate = new Date(f.date + "T" + f.time);
                return !isNaN(fixtureDate.getTime()) && fixtureDate > now;
            })
            .sort(function(a, b) {
                return new Date(a.date + "T" + a.time) - new Date(b.date + "T" + b.time);
            });

        if (nextMatchHighlight && upcomingFixtures.length > 0) {
            nextMatchHighlight.innerHTML = renderMatchCard(upcomingFixtures[0], true);
        } else if (nextMatchHighlight) {
            nextMatchHighlight.innerHTML = '<div class="text-center">No upcoming fixtures found.</div>';
        }

        if (fixtureListContainer) {
            var startIndex = (nextMatchHighlight && upcomingFixtures.length > 0) ? 1 : 0;
            var remainingFixtures = upcomingFixtures.slice(startIndex);
            if (remainingFixtures.length > 0) {
                fixtureListContainer.innerHTML = remainingFixtures.map(function(f) { return renderMatchCard(f); }).join("");
            } else if (!nextMatchHighlight || upcomingFixtures.length === 0) {
                fixtureListContainer.innerHTML = '<div class="text-center">No further upcoming fixtures.</div>';
            }
        }
    }

    function renderResults(results) {
        if (!resultList) return;
        resultList.innerHTML = results.map(function(r) {
            return '<div class="card result-card expandable" data-id="' + r.id + '">'
                + '<div class="match-header">'
                + '<span class="match-date">' + new Date(r.date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) + '</span>'
                + '<span class="match-badge badge-odi">' + r.matchType + '</span>'
                + '</div>'
                + '<div class="match-teams">'
                + '<div class="team-info"><span class="team-name">' + r.homeTeam + '</span><span class="result-score">' + r.homeScore + '</span></div>'
                + '<div class="match-vs">VS</div>'
                + '<div class="team-info"><span class="team-name">' + r.awayTeam + '</span><span class="result-score">' + r.awayScore + '</span></div>'
                + '</div>'
                + '<div class="text-center">'
                + '<div class="result-outcome">' + r.result + '</div>'
                + '<div class="match-details" style="max-height: 0; overflow: hidden; transition: max-height 0.5s ease-in-out;">'
                + '<p><strong>Competition:</strong> ' + (r.competition || "N/A") + '</p>'
                + '<p><strong>Venue:</strong> <a href="' + (r.venueLink || "#") + '" target="_blank">' + r.venue + '</a></p>'
                + '<a href="' + r.playCricketUrl + '" target="_blank" class="btn btn-primary"><i class="fas fa-external-link-alt"></i> View Scorecard</a>'
                + '</div>'
                + '</div>'
                + '</div>';
        }).join("");

        // Add click event to expand/collapse result details
        resultList.querySelectorAll(".expandable").forEach(function(card) {
            card.addEventListener("click", function() {
                var details = card.querySelector(".match-details");
                if (details.style.maxHeight && details.style.maxHeight !== "0px") {
                    details.style.maxHeight = "0px";
                } else {
                    details.style.maxHeight = details.scrollHeight + "px";
                }
            });
        });
    }

    function renderNewsPage(news) {
        if (!featuredStoryContainer || !latestNewsGrid) return;

        var sortedNews = news
            .filter(function(n) { return n.date && !isNaN(new Date(n.date).getTime()); })
            .sort(function(a, b) { return new Date(b.date) - new Date(a.date); });

        if (sortedNews.length > 0) {
            var featuredStory = sortedNews[0];
            var imgUrl = featuredStory.imageUrl || "";
            // Fix relative image URLs from JSON: if they start with ./ prefix with basePath
            if (imgUrl.startsWith("./")) {
                imgUrl = basePath + "/" + imgUrl.substring(2);
            } else if (imgUrl.startsWith("/")) {
                imgUrl = basePath + imgUrl;
            }

            featuredStoryContainer.innerHTML = '<div class="card story-card featured-story">'
                + '<img src="' + imgUrl + '" alt="' + featuredStory.title + '" class="story-image">'
                + '<div class="story-content">'
                + '<h2 class="story-title">' + featuredStory.title + '</h2>'
                + '<p class="story-date">' + new Date(featuredStory.date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) + '</p>'
                + '<p class="story-summary">' + featuredStory.summary + '</p>'
                + '<a href="' + basePath + '/news/story.html?id=' + featuredStory.id + '" class="btn btn-primary">Read More</a>'
                + '</div>'
                + '</div>';

            var latestNews = sortedNews.slice(1, 5);
            if (latestNews.length > 0) {
                latestNewsGrid.innerHTML = latestNews.map(function(story) {
                    var sImgUrl = story.imageUrl || "";
                    if (sImgUrl.startsWith("./")) {
                        sImgUrl = basePath + "/" + sImgUrl.substring(2);
                    } else if (sImgUrl.startsWith("/")) {
                        sImgUrl = basePath + sImgUrl;
                    }
                    return '<div class="card story-card">'
                        + '<img src="' + sImgUrl + '" alt="' + story.title + '" class="story-image">'
                        + '<div class="story-content">'
                        + '<h3 class="story-title">' + story.title + '</h3>'
                        + '<p class="story-date">' + new Date(story.date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) + '</p>'
                        + '<p class="story-summary">' + story.summary + '</p>'
                        + '<a href="' + basePath + '/news/story.html?id=' + story.id + '" class="btn btn-secondary">Read More</a>'
                        + '</div>'
                        + '</div>';
                }).join("");
            } else {
                latestNewsGrid.innerHTML = "<p>No other news available.</p>";
            }
        } else {
            featuredStoryContainer.innerHTML = "<p>No news available.</p>";
            latestNewsGrid.innerHTML = "";
        }
    }

    function renderHomepagePreviews(fixtures, results, news, worldCupData) {
        var now = new Date();

        // Next Fixture Preview
        var upcomingFixtures = fixtures
            .filter(function(f) {
                if (!f.date || !f.time || f.time === "TBC") return false;
                var fixtureDate = new Date(f.date + "T" + f.time);
                return !isNaN(fixtureDate.getTime()) && fixtureDate > now;
            })
            .sort(function(a, b) {
                return new Date(a.date + "T" + a.time) - new Date(b.date + "T" + b.time);
            });

        if (homepageNextFixture) {
            if (upcomingFixtures.length > 0) {
                var nextFixture = upcomingFixtures[0];
                homepageNextFixture.innerHTML = '<h3>Next Match</h3>'
                    + '<p>' + new Date(nextFixture.date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) + ' - ' + nextFixture.matchType + '</p>'
                    + '<p>' + nextFixture.homeTeam + ' vs ' + nextFixture.awayTeam + '</p>'
                    + '<p>' + nextFixture.venue + '</p>'
                    + '<a href="' + basePath + '/fixtures/index.html" class="btn btn-primary">View Details</a>';
            } else {
                homepageNextFixture.innerHTML = '<h3>Next Match</h3>'
                    + '<p>No upcoming fixtures.</p>'
                    + '<a href="' + basePath + '/fixtures/index.html" class="btn btn-primary">View All Fixtures</a>';
            }
        }

        // Latest Result Preview
        var sortedResults = results
            .filter(function(r) { return r.date && !isNaN(new Date(r.date).getTime()); })
            .sort(function(a, b) { return new Date(b.date) - new Date(a.date); });

        if (homepageLatestResult) {
            if (sortedResults.length > 0) {
                var lastResult = sortedResults[0];
                homepageLatestResult.innerHTML = '<h3>Latest Result</h3>'
                    + '<p>' + new Date(lastResult.date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) + ' - ' + lastResult.matchType + '</p>'
                    + '<p>' + lastResult.homeTeam + ' ' + lastResult.homeScore + ' vs ' + lastResult.awayTeam + ' ' + lastResult.awayScore + '</p>'
                    + '<p>' + lastResult.result + '</p>'
                    + '<a href="' + basePath + '/results/index.html" class="btn btn-primary">View Details</a>';
            } else {
                homepageLatestResult.innerHTML = '<h3>Latest Result</h3>'
                    + '<p>No results available.</p>'
                    + '<a href="' + basePath + '/results/index.html" class="btn btn-primary">View All Results</a>';
            }
        }

        // Latest News Preview
        var sortedNews = news
            .filter(function(n) { return n.date && !isNaN(new Date(n.date).getTime()); })
            .sort(function(a, b) { return new Date(b.date) - new Date(a.date); });

        if (homepageLatestNews) {
            if (sortedNews.length > 0) {
                var story = sortedNews[0];
                homepageLatestNews.innerHTML = '<h3>Latest News</h3>'
                    + '<h5>' + story.title + '</h5>'
                    + '<p>' + new Date(story.date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) + '</p>'
                    + '<p>' + story.summary + '</p>'
                    + '<a href="' + basePath + '/news/story.html?id=' + story.id + '" class="btn btn-secondary">Read More</a>';
            } else {
                homepageLatestNews.innerHTML = '<h3>Latest News</h3>'
                    + '<p>No news available.</p>'
                    + '<a href="' + basePath + '/news/index.html" class="btn btn-primary">View All News</a>';
            }
        }

        // World Cup Preview - worldcup.json uses "tournament" not "overview" at top level
        if (homepageWorldCupPreview && worldCupData && worldCupData.tournament) {
            homepageWorldCupPreview.innerHTML = '<h3>' + worldCupData.tournament.title + '</h3>'
                + '<p>' + worldCupData.tournament.overview + '</p>'
                + '<a href="' + basePath + '/world-cup/index.html" class="btn btn-orange">Learn More</a>';
        }
    }

    function renderWorldCupPage(data) {
        // Overview
        if (worldCupOverview && data.tournament) {
            worldCupOverview.innerHTML = '<h2 class="section-title">' + data.tournament.title + '</h2>'
                + '<p><strong>Location:</strong> ' + data.tournament.location + '</p>'
                + '<p><strong>Dates:</strong> ' + data.tournament.dates + '</p>'
                + '<p>' + data.tournament.overview + '</p>';
        }

        // Squad
        if (worldCupSquad && data.squad && data.squad.length > 0) {
            worldCupSquad.innerHTML = '<h2 class="section-title">England Squad</h2>'
                + '<div class="squad-grid">'
                + data.squad.map(function(p) {
                    var pImg = p.imageUrl || "";
                    if (pImg.startsWith("/")) pImg = basePath + pImg;
                    return '<div class="squad-card">'
                        + '<div class="squad-name">' + p.name + '</div>'
                        + '<div class="squad-role">' + p.role + '</div>'
                        + '</div>';
                }).join("")
                + '</div>';
        } else if (worldCupSquad) {
            worldCupSquad.innerHTML = '<h2 class="section-title">England Squad</h2><p>Squad to be announced.</p>';
        }

        // Groups
        if (worldCupGroups && data.groups && data.groups.length > 0) {
            worldCupGroups.innerHTML = '<h2 class="section-title">Group Standings</h2>'
                + data.groups.map(function(group) {
                    return '<h3>' + group.name + '</h3>'
                        + '<table class="standings-table"><thead><tr><th>Team</th><th>P</th><th>W</th><th>L</th><th>NRR</th><th>Pts</th></tr></thead><tbody>'
                        + group.teams.map(function(t) {
                            return '<tr><td>' + t.name + '</td><td>' + t.played + '</td><td>' + t.won + '</td><td>' + t.lost + '</td><td>' + t.nrr + '</td><td>' + t.points + '</td></tr>';
                        }).join("")
                        + '</tbody></table>';
                }).join("");
        } else if (worldCupGroups) {
            worldCupGroups.innerHTML = '<h2 class="section-title">Group Standings</h2><p>Groups to be announced.</p>';
        }

        // World Cup News
        if (worldCupNews && data.news && data.news.length > 0) {
            worldCupNews.innerHTML = '<h2 class="section-title">World Cup News</h2>'
                + data.news.map(function(n) {
                    return '<div class="card"><h4>' + n.title + '</h4>'
                        + '<p class="story-date">' + new Date(n.date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) + '</p>'
                        + '<p>' + n.summary + '</p></div>';
                }).join("");
        } else if (worldCupNews) {
            worldCupNews.innerHTML = '<h2 class="section-title">World Cup News</h2><p>No World Cup news yet.</p>';
        }

        // Press Releases
        if (worldCupPressReleases && data.pressReleases && data.pressReleases.length > 0) {
            worldCupPressReleases.innerHTML = '<h2 class="section-title">Press Releases</h2>'
                + '<ul>' + data.pressReleases.map(function(pr) {
                    return '<li><strong>' + pr.title + '</strong> - ' + new Date(pr.date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) + '</li>';
                }).join("") + '</ul>';
        } else if (worldCupPressReleases) {
            worldCupPressReleases.innerHTML = '<h2 class="section-title">Press Releases</h2><p>No press releases yet.</p>';
        }
    }

    function setupResultFilters() {
        var yearFilter = document.getElementById("season-filter");
        var opponentFilter = document.getElementById("opponent-filter");
        var competitionFilter = document.getElementById("competition-filter");
        var resultFilter = document.getElementById("result-filter");
        var searchFilter = document.getElementById("search-filter");

        if (!yearFilter) return;

        var allResults = window.allResults;
        var opponents = [];
        var opponentSet = {};
        var competitions = [];
        var competitionSet = {};
        var years = [];
        var yearSet = {};

        allResults.forEach(function(r) {
            if (!opponentSet[r.homeTeam]) { opponentSet[r.homeTeam] = true; opponents.push(r.homeTeam); }
            if (!opponentSet[r.awayTeam]) { opponentSet[r.awayTeam] = true; opponents.push(r.awayTeam); }
            if (r.competition && !competitionSet[r.competition]) { competitionSet[r.competition] = true; competitions.push(r.competition); }
            var yr = new Date(r.date).getFullYear();
            if (!isNaN(yr) && !yearSet[yr]) { yearSet[yr] = true; years.push(yr); }
        });

        opponents.sort();
        competitions.sort();
        years.sort(function(a, b) { return b - a; });

        opponents.forEach(function(o) { yearFilter.parentElement && (opponentFilter.innerHTML += '<option value="' + o + '">' + o + '</option>'); });
        competitions.forEach(function(c) { competitionFilter.innerHTML += '<option value="' + c + '">' + c + '</option>'; });
        years.forEach(function(y) { yearFilter.innerHTML += '<option value="' + y + '">' + y + '</option>'; });

        var applyFilters = function() {
            var selectedYear = yearFilter.value;
            var selectedOpponent = opponentFilter.value;
            var selectedCompetition = competitionFilter.value;
            var selectedResult = resultFilter.value;
            var searchText = searchFilter ? searchFilter.value.toLowerCase() : "";

            var filteredResults = allResults;

            if (selectedYear !== "all") {
                filteredResults = filteredResults.filter(function(r) { return new Date(r.date).getFullYear().toString() === selectedYear; });
            }
            if (selectedOpponent !== "all") {
                filteredResults = filteredResults.filter(function(r) { return r.homeTeam === selectedOpponent || r.awayTeam === selectedOpponent; });
            }
            if (selectedCompetition !== "all") {
                filteredResults = filteredResults.filter(function(r) { return r.competition === selectedCompetition; });
            }
            if (selectedResult !== "all") {
                filteredResults = filteredResults.filter(function(r) { return r.result && r.result.toLowerCase().indexOf(selectedResult.toLowerCase()) !== -1; });
            }
            if (searchText) {
                filteredResults = filteredResults.filter(function(r) {
                    return (r.homeTeam && r.homeTeam.toLowerCase().indexOf(searchText) !== -1)
                        || (r.awayTeam && r.awayTeam.toLowerCase().indexOf(searchText) !== -1)
                        || (r.venue && r.venue.toLowerCase().indexOf(searchText) !== -1);
                });
            }

            renderResults(filteredResults);
        };

        // Listen for changes on all filter elements
        [yearFilter, opponentFilter, competitionFilter, resultFilter].forEach(function(el) {
            if (el) el.addEventListener("change", applyFilters);
        });
        if (searchFilter) {
            searchFilter.addEventListener("input", applyFilters);
        }
    }
});
