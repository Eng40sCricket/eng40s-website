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

        // Fix all <a href="/..."> links (but not external links starting with http)
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
            if (!href || href.startsWith("http")) return; // Skip external links

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

    // ========== NEWS PAGE RENDERING ==========
    // News is driven from assets/data/news.json.
    // Items support: pinned (bool), archived (bool), category (string).

    const featuredStoryContainer = document.getElementById("featured-story-container");
    const latestNewsGrid = document.getElementById("latest-news-grid");

    if (featuredStoryContainer || latestNewsGrid) {
        fetch(basePath + "/assets/data/news.json")
            .then(res => res.json())
            .then(data => {
                renderNewsPage(data);
                // Mark last-visited timestamp so the nav badge clears
                try { localStorage.setItem("eo40s_news_last_seen", new Date().toISOString()); } catch(e) {}
            })
            .catch(err => console.error("Error loading news data:", err));
    }

    // --- Helpers ---

    function resolveImgUrl(url) {
        if (!url) return "";
        if (url.startsWith("./")) return basePath + "/" + url.substring(2);
        if (url.startsWith("/")) return basePath + url;
        return url;
    }

    function fmtDate(d) {
        return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
    }

    var CATEGORY_LABELS = { "team": "Team", "fixture": "Fixture", "world-cup": "World Cup", "general": "General", "partnerships": "Partnerships" };
    var CATEGORY_CLASSES = { "team": "cat-team", "fixture": "cat-fixture", "world-cup": "cat-world-cup", "general": "cat-general", "partnerships": "cat-partnerships" };

    function categoryBadge(cat) {
        if (!cat) return "";
        var label = CATEGORY_LABELS[cat] || cat;
        var cls = CATEGORY_CLASSES[cat] || "";
        return '<span class="category-badge ' + cls + '">' + label + '</span>';
    }

    function storyUrl(id) {
        return basePath + "/news/story.html?id=" + id;
    }

    // --- Featured card HTML ---
    function featuredCardHtml(story) {
        var img = resolveImgUrl(story.imageUrl);
        var pinHtml = story.pinned ? '<span class="pin-badge"><i class="fas fa-thumbtack"></i> Pinned</span>' : "";
        return '<div class="card story-card featured-story">'
            + '<img src="' + img + '" alt="' + story.title + '" class="story-image">'
            + '<div class="story-content">'
            + pinHtml
            + categoryBadge(story.category)
            + '<h2 class="story-title">' + story.title + '</h2>'
            + '<p class="story-date">' + fmtDate(story.date) + '</p>'
            + '<p class="story-summary">' + story.summary + '</p>'
            + '<a href="' + storyUrl(story.id) + '" class="btn btn-primary">Read More</a>'
            + '</div>'
            + '</div>';
    }

    // --- Grid card HTML ---
    function gridCardHtml(story) {
        var img = resolveImgUrl(story.imageUrl);
        var pinHtml = story.pinned ? '<span class="pin-badge"><i class="fas fa-thumbtack"></i> Pinned</span>' : "";
        return '<div class="card story-card">'
            + (img ? '<img src="' + img + '" alt="' + story.title + '" class="story-image">' : "")
            + '<div class="story-content">'
            + pinHtml
            + categoryBadge(story.category)
            + '<h3 class="story-title">' + story.title + '</h3>'
            + '<p class="story-date">' + fmtDate(story.date) + '</p>'
            + '<p class="story-summary">' + story.summary + '</p>'
            + '<a href="' + storyUrl(story.id) + '" class="btn btn-secondary">Read More</a>'
            + '</div>'
            + '</div>';
    }

    // --- Filter tabs ---
    function renderFilterTabs(categories, activeFilter, onSelect) {
        var tabs = [{ key: "all", label: "All" }];
        categories.forEach(function(c) {
            if (CATEGORY_LABELS[c]) tabs.push({ key: c, label: CATEGORY_LABELS[c] });
        });
        var wrap = document.createElement("div");
        wrap.className = "news-filter-tabs";
        tabs.forEach(function(t) {
            var btn = document.createElement("button");
            btn.className = "news-filter-tab" + (t.key === activeFilter ? " active" : "");
            btn.textContent = t.label;
            btn.addEventListener("click", function() {
                window.location.hash = t.key === "all" ? "" : t.key;
                onSelect(t.key);
            });
            wrap.appendChild(btn);
        });
        return wrap;
    }

    // --- Main render ---
    function renderNewsPage(news) {
        if (!featuredStoryContainer || !latestNewsGrid) return;

        var valid = news.filter(function(n) { return n.date && !isNaN(new Date(n.date).getTime()); });

        var pinned   = valid.filter(function(n) { return n.pinned && !n.archived; })
                            .sort(function(a, b) { return new Date(b.date) - new Date(a.date); });
        var active   = valid.filter(function(n) { return !n.pinned && !n.archived; })
                            .sort(function(a, b) { return new Date(b.date) - new Date(a.date); });
        var archived = valid.filter(function(n) { return n.archived; })
                            .sort(function(a, b) { return new Date(b.date) - new Date(a.date); });

        // Determine available categories across pinned + active
        var allActive = pinned.concat(active);
        var seenCats = {};
        allActive.forEach(function(n) { if (n.category) seenCats[n.category] = true; });
        var availCats = Object.keys(seenCats);

        // Active filter from URL hash
        var hashFilter = window.location.hash.replace("#", "") || "all";
        var currentFilter = (hashFilter === "all" || CATEGORY_LABELS[hashFilter]) ? hashFilter : "all";

        function applyFilter(filter) {
            currentFilter = filter;
            redraw();
        }

        function filterItems(items) {
            if (currentFilter === "all") return items;
            return items.filter(function(n) { return n.category === currentFilter; });
        }

        function redraw() {
            var filteredPinned = filterItems(pinned);
            var filteredActive = filterItems(active);

            // --- Pinned section ---
            featuredStoryContainer.innerHTML = "";

            // Inject filter tabs before pinned section
            var tabsEl = renderFilterTabs(availCats, currentFilter, applyFilter);
            featuredStoryContainer.parentNode.insertBefore(tabsEl, featuredStoryContainer);

            if (filteredPinned.length > 0) {
                var pinnedWrap = document.createElement("div");
                pinnedWrap.className = "pinned-news-section";
                var pinnedLabel = document.createElement("div");
                pinnedLabel.className = "pinned-section-label";
                pinnedLabel.innerHTML = '<i class="fas fa-thumbtack"></i> Pinned';
                pinnedWrap.appendChild(pinnedLabel);
                var pinnedGrid = document.createElement("div");
                pinnedGrid.className = "news-grid";
                filteredPinned.forEach(function(s) {
                    pinnedGrid.innerHTML += gridCardHtml(s);
                });
                pinnedWrap.appendChild(pinnedGrid);
                featuredStoryContainer.appendChild(pinnedWrap);
            }

            // --- Featured + grid ---
            if (filteredActive.length > 0) {
                var featured = filteredActive[0];
                var featuredDiv = document.createElement("div");
                featuredDiv.innerHTML = featuredCardHtml(featured);
                featuredStoryContainer.appendChild(featuredDiv);

                var rest = filteredActive.slice(1, 5);
                if (rest.length > 0) {
                    var heading = document.createElement("h2");
                    heading.className = "section-title";
                    heading.textContent = "More Updates";
                    latestNewsGrid.parentNode.insertBefore(heading, latestNewsGrid);
                    latestNewsGrid.innerHTML = rest.map(gridCardHtml).join("");
                } else {
                    latestNewsGrid.innerHTML = "";
                }
            } else if (filteredPinned.length === 0) {
                featuredStoryContainer.innerHTML += "<p>No news in this category yet.</p>";
                latestNewsGrid.innerHTML = "";
            } else {
                latestNewsGrid.innerHTML = "";
            }

            // Re-attach tabs (remove stale duplicate if redrawing)
            var existingTabs = document.querySelectorAll(".news-filter-tabs");
            existingTabs.forEach(function(el, i) { if (i > 0) el.remove(); });

            // Update active tab highlight
            document.querySelectorAll(".news-filter-tab").forEach(function(btn) {
                btn.classList.toggle("active", btn.textContent === (CATEGORY_LABELS[currentFilter] || "All"));
            });
        }

        redraw();

        // --- Archive section ---
        if (archived.length > 0) {
            var archiveSection = document.createElement("details");
            archiveSection.className = "news-archive-section";
            var summary = document.createElement("summary");
            summary.innerHTML = 'Archive <span style="color:#999;font-weight:400;font-size:0.9em;">(' + archived.length + ' item' + (archived.length !== 1 ? 's' : '') + ')</span>';
            archiveSection.appendChild(summary);

            var archiveList = document.createElement("div");
            archiveList.className = "news-archive-list";
            archived.forEach(function(s) {
                var link = document.createElement("a");
                link.className = "archive-item";
                link.href = storyUrl(s.id);
                link.innerHTML = '<span class="archive-item-date">' + fmtDate(s.date) + '</span>'
                    + '<span class="archive-item-title">' + s.title + '</span>';
                archiveList.appendChild(link);
            });
            archiveSection.appendChild(archiveList);

            // Append after the latest-news-grid's parent section
            latestNewsGrid.parentNode.appendChild(archiveSection);
        }
    }
});
